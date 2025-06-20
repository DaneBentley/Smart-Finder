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

    // Get current user data
    const { data: userData, error: userDataError } = await supabase
      .from('user_data')
      .select('paid_tokens, usage_count')
      .eq('user_id', userId)
      .single();

    if (userDataError || !userData) {
      return res.status(404).json({ error: 'User data not found' });
    }

    if (userData.paid_tokens <= 0) {
      return res.status(400).json({ 
        error: 'Insufficient tokens',
        remainingTokens: userData.paid_tokens 
      });
    }

    // Consume one token and increment usage count
    const { data: updatedData, error: updateError } = await supabase
      .from('user_data')
      .update({
        paid_tokens: userData.paid_tokens - 1,
        usage_count: (userData.usage_count || 0) + 1,
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select('paid_tokens, usage_count')
      .single();

    if (updateError) {
      console.error('Error updating user data:', updateError);
      return res.status(500).json({ error: 'Failed to consume token' });
    }

    res.status(200).json({
      success: true,
      remainingTokens: updatedData.paid_tokens,
      totalUsage: updatedData.usage_count
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