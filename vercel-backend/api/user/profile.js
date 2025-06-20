import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
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

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, profile_picture')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user token data using the new function that handles monthly allocation
    const { data: tokenSummary, error: tokenError } = await supabase.rpc('get_user_token_summary', {
      p_user_id: userId
    });

    if (tokenError) {
      console.error('Error fetching user token data:', tokenError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    const summary = tokenSummary && tokenSummary.length > 0 ? tokenSummary[0] : {
      free_tokens: 0,
      paid_tokens: 0,
      total_tokens: 0,
      usage_count: 0
    };

    // If the database function didn't return proper breakdown, try direct query
    if (!summary.free_tokens && !summary.paid_tokens && summary.total_tokens === 0) {
      const { data: directData, error: directError } = await supabase
        .from('user_data')
        .select('free_tokens, paid_tokens, usage_count')
        .eq('user_id', userId)
        .single();
        
      if (!directError && directData) {
        summary.free_tokens = directData.free_tokens || 0;
        summary.paid_tokens = directData.paid_tokens || 0;
        summary.total_tokens = (directData.free_tokens || 0) + (directData.paid_tokens || 0);
        summary.usage_count = directData.usage_count || 0;
      }
    }

    res.status(200).json({
      user,
      tokens: summary.total_tokens,
      freeTokens: summary.free_tokens,
      paidTokens: summary.paid_tokens,
      usageCount: summary.usage_count
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
} 