import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Use the new atomic consume_user_token function
    const { data: consumeResult, error: consumeError } = await supabase.rpc('consume_user_token', {
      p_user_id: userId
    });

    if (consumeError) {
      console.error('Error consuming token:', consumeError);
      return res.status(500).json({ error: 'Failed to consume token' });
    }

    // consumeResult is an array, get the first result
    const result = consumeResult && consumeResult.length > 0 ? consumeResult[0] : null;

    if (!result || !result.success) {
      return res.status(400).json({ 
        error: result?.message || 'Insufficient tokens',
        remainingTokens: result?.total_remaining || 0,
        freeTokens: result?.remaining_free_tokens || 0,
        paidTokens: result?.remaining_paid_tokens || 0
      });
    }

    res.status(200).json({
      success: true,
      remainingTokens: result.total_remaining,
      freeTokens: result.remaining_free_tokens,
      paidTokens: result.remaining_paid_tokens,
      message: result.message
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Token consumption error:', error);
    res.status(500).json({ error: 'Failed to consume token' });
  }
} 