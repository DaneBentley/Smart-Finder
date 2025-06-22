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

    // For security: only allow specific admin users (you can add email check here)
    // For now, just add a simple admin key check
    const { adminKey } = req.body;
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`Admin ${userId} requesting monthly token reset`);

    // Call the monthly reset function
    const { data: resetResult, error: resetError } = await supabase.rpc('reset_monthly_tokens_for_all_users');

    if (resetError) {
      console.error('Error resetting monthly tokens:', resetError);
      return res.status(500).json({ error: 'Failed to reset monthly tokens' });
    }

    const result = resetResult && resetResult.length > 0 ? resetResult[0] : { users_updated: 0, message: 'No users updated' };

    res.status(200).json({
      success: true,
      usersUpdated: result.users_updated,
      message: result.message
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Monthly token reset error:', error);
    res.status(500).json({ error: 'Failed to reset monthly tokens' });
  }
} 