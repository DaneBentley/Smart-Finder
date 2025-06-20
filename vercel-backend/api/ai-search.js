
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required for AI features' });
    }

    const token = authHeader.split(' ')[1];
    let userId;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify user has tokens and check rate limits
    const { data: userData, error: userError } = await supabase
      .from('user_data')
      .select('paid_tokens, last_request_at, request_count_today')
      .eq('user_id', userId)
      .single();

    if (userError || !userData || userData.paid_tokens <= 0) {
      return res.status(403).json({ 
        error: 'Insufficient tokens',
        tokens: userData?.paid_tokens || 0
      });
    }

    // Simple server-side rate limiting (100 requests per day)
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastRequestDate = userData.last_request_at ? 
      new Date(userData.last_request_at).toISOString().split('T')[0] : null;
    
    let requestCountToday = userData.request_count_today || 0;
    
    // Reset counter if it's a new day
    if (lastRequestDate !== today) {
      requestCountToday = 0;
    }
    
    // Check daily limit (generous limit to catch only severe abuse)
    if (requestCountToday >= 200) {
      return res.status(429).json({ 
        error: 'Daily rate limit exceeded',
        message: 'Maximum 200 API calls per day. Please try again tomorrow.'
      });
    }

    // Update request tracking
    await supabase
      .from('user_data')
      .update({
        last_request_at: now.toISOString(),
        request_count_today: requestCountToday + 1
      })
      .eq('user_id', userId);

    const { query, content } = req.body;

    if (!query || !content) {
      return res.status(400).json({ error: 'Query and content are required' });
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
            content: `Query: ${query}\n\nPage text: ${content}\n\nExtract exact phrases, sentinces or paragraphs that satisfy the query based on what you think the user might be searching for. Return format: ["exact text from page", "another exact text"]`
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