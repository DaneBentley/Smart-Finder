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

    // Security: Check rate limits before consuming tokens
    const rateLimitCheck = await rateLimiter.checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: rateLimitCheck.message,
        retryAfter: rateLimitCheck.retryAfter 
      });
    }

    // ATOMIC TOKEN CONSUMPTION - Fix race condition vulnerability
    console.log('🔍 AI Search - Atomically consuming token for user:', userId);
    
    // Use PostgreSQL's atomic decrement with a check
    const { data: consumeResult, error: consumeError } = await supabase.rpc('consume_user_token', {
      p_user_id: userId
    });

    if (consumeError || !consumeResult || !consumeResult[0]?.success) {
      console.log('🔍 AI Search - Token consumption failed for user:', userId, consumeResult?.[0]?.message);
      return res.status(403).json({ 
        error: 'Insufficient tokens',
        tokens: consumeResult?.[0]?.total_remaining || 0
      });
    }

    const { query, content } = req.body;

    // Input validation and sanitization
    if (!query || !content) {
      // Refund the token if request validation fails
      await supabase.rpc('refund_user_token', { p_user_id: userId });
      return res.status(400).json({ error: 'Query and content are required' });
    }

    // Security: Validate input types and lengths
    if (typeof query !== 'string' || typeof content !== 'string') {
      await supabase.rpc('refund_user_token', { p_user_id: userId });
      return res.status(400).json({ error: 'Query and content must be strings' });
    }

    // Security: Limit input sizes to prevent DoS attacks
    if (query.length > 1000) {
      await supabase.rpc('refund_user_token', { p_user_id: userId });
      return res.status(400).json({ error: 'Query too long (max 1000 characters)' });
    }

    if (content.length > 500000) { // 500KB limit
      await supabase.rpc('refund_user_token', { p_user_id: userId });
      return res.status(400).json({ error: 'Content too large (max 500KB)' });
    }

    // Security: Basic sanitization
    const sanitizedQuery = query.trim();
    const sanitizedContent = content.trim();

    if (!sanitizedQuery || !sanitizedContent) {
      await supabase.rpc('refund_user_token', { p_user_id: userId });
      return res.status(400).json({ error: 'Query and content cannot be empty' });
    }

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: 'Return only a JSON array of strings. Each string should be exact text from the page. No commentary, no explanations, dont repeat the user query, just snippets: ["text1", "text2", "text3"] from the text. think about what the users searching for and return the most relevant/helpful text found on page. if the query is something like "tldr" return the most useful snippets from the page'
          },
          {
            role: 'user',
            content: `Query: ${sanitizedQuery}\n\nPage text: ${sanitizedContent}\n\nExtract exact phrases, sentinces or paragraphs that satisfy the query based on what you think the user might be searching for. Return format: ["exact text from page", "another exact text"]`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cerebras API error ${response.status}:`, errorText);
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          details: 'Please wait before making another request'
        });
      } else if (response.status === 400) {
        return res.status(400).json({ 
          error: 'Invalid model or request',
          details: errorText 
        });
      }
      
      throw new Error(`Cerebras API error: ${response.status} - ${errorText}`);
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

    // Return the raw AI response to let the frontend handle cleaning
    return res.status(200).json({ 
      rawResponse: aiResponse,
      relevantSnippets: [] // Keep this for backwards compatibility during transition
    });

  } catch (error) {
    console.error('AI search error:', error);
    return res.status(500).json({ 
      error: 'Failed to process AI search',
      details: error.message 
    });
  }
} 