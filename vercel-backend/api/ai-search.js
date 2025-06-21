import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { rateLimiter } from '../rate-limiter.js';
import { extractAndValidateJWT, handleJWTError, JWTSecurityError } from '../jwt-security.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS for the Chrome extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Security: Enhanced JWT validation
    let decoded;
    try {
      decoded = extractAndValidateJWT(req);
    } catch (error) {
      if (error instanceof JWTSecurityError) {
        return handleJWTError(error, res);
      }
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    const userId = decoded.userId;

    // Security: Check rate limits before processing
    const rateLimitCheck = await rateLimiter.checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: rateLimitCheck.message,
        retryAfter: rateLimitCheck.retryAfter 
      });
    }

    // Check if user has tokens available before making AI call, but don't consume yet
    console.log('🔍 AI Search - Checking token availability for user:', userId);
    
    const { data: tokenCheck, error: tokenError } = await supabase.rpc('get_user_token_summary', {
      p_user_id: userId
    });

    if (tokenError || !tokenCheck || tokenCheck.length === 0 || tokenCheck[0].total_tokens <= 0) {
      console.log('🔍 AI Search - No tokens available for user:', userId);
      return res.status(403).json({ 
        error: 'Insufficient tokens',
        tokens: tokenCheck?.[0]?.total_tokens || 0
      });
    }

    const { query, content, matchesFound } = req.body;

    // Handle token consumption request (when matches are found)
    if (matchesFound !== undefined) {
      console.log('🔍 AI Search - Processing token consumption request, matches found:', matchesFound);
      
      if (matchesFound > 0) {
        // Consume token only when matches were found
        const { data: consumeResult, error: consumeError } = await supabase.rpc('consume_user_token', {
          p_user_id: userId
        });

        if (consumeError || !consumeResult || !consumeResult[0]?.success) {
          console.log('🔍 AI Search - Token consumption failed for user:', userId, consumeResult?.[0]?.message);
          return res.status(403).json({ 
            error: 'Failed to consume token',
            tokens: consumeResult?.[0]?.total_remaining || 0
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Token consumed successfully',
          remainingTokens: consumeResult[0].total_remaining
        });
      } else {
        // No matches found, don't consume token
        console.log('🔍 AI Search - No matches found, not consuming token for user:', userId);
        return res.status(200).json({
          success: true,
          message: 'No token consumed - no matches found',
          remainingTokens: tokenCheck[0].total_tokens
        });
      }
    }

    // Input validation and sanitization
    if (!query || !content) {
      return res.status(400).json({ error: 'Query and content are required' });
    }

    // Security: Validate input types and lengths
    if (typeof query !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ error: 'Query and content must be strings' });
    }

    // Security: Limit input sizes to prevent DoS attacks
    if (query.length > 1000) {
      return res.status(400).json({ error: 'Query too long (max 1000 characters)' });
    }

    if (content.length > 200000) { // 200KB limit - cost-optimized for efficient processing
      return res.status(400).json({ error: 'Content too large (max 200KB)' });
    }

    // Security: Basic sanitization
    const sanitizedQuery = query.trim();
    const sanitizedContent = content.trim();

    if (!sanitizedQuery || !sanitizedContent) {
      return res.status(400).json({ error: 'Query and content cannot be empty' });
    }

    // Make AI API call without consuming tokens first
    console.log('🔍 AI Search - Making AI API call for user:', userId);

    // Use Groq for ultra-fast inference with Llama 3.3 70B
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent content extraction system. Return ONLY a JSON array of strings containing the most relevant text snippets from the provided content. Each string should be exact text from the page - no modifications, no commentary, no explanations. Format: ["exact text snippet 1", "exact text snippet 2", "exact text snippet 3"]. Focus on quality over quantity: extract 3-8 highly relevant snippets that best answer the user\'s query. For "tldr" queries, extract the most important/summary information.'
          },
          {
            role: 'user',
            content: `Search Query: "${sanitizedQuery}"\n\n--- PAGE CONTENT ---\n${sanitizedContent}\n\n--- INSTRUCTIONS ---\nExtract the most relevant text snippets that answer or relate to the search query. Return exact text from the content above as a JSON array of strings. Prioritize complete sentences or meaningful phrases.`
          }
        ],
        temperature: 0.05,  // Lower temperature for more consistent JSON output
        max_tokens: 1500,   // Cost-optimized for efficient processing
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error ${response.status}:`, errorText);
      
      if (response.status >= 500) {
        return res.status(503).json({ 
          error: 'AI service temporarily unavailable',
          details: 'Please try again in a few moments.',
          shouldRetry: true,
          retryAfter: 30 // seconds
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'AI service rate limit exceeded',
          details: 'Please wait before making another request.',
          shouldRetry: true,
          retryAfter: 60
        });
      } else if (response.status === 400) {
        return res.status(400).json({ 
          error: 'Invalid request to AI service',
          details: errorText 
        });
      }
      
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('🤖 Raw AI Response:', aiResponse);

    // Security: Record the successful request for rate limiting
    await rateLimiter.recordRequest(userId, 'ai-search', {
      queryLength: sanitizedQuery.length,
      contentLength: sanitizedContent.length,
      success: true
    });

    // Return the raw AI response - token consumption will be handled by follow-up request
    return res.status(200).json({ 
      rawResponse: aiResponse,
      relevantSnippets: [], // Keep this for backwards compatibility during transition
      tokenConsumed: false // Indicate that token hasn't been consumed yet
    });

  } catch (error) {
    console.error('AI search error:', error);
    return res.status(500).json({ 
      error: 'Failed to process AI search',
      details: error.message 
    });
  }
} 