import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

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

    console.log(`Syncing user data for user ${userId}`);

    // Check if user_data exists
    const { data: existingUserData, error: fetchError } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // User data doesn't exist, create it
      const { data: newUserData, error: createError } = await supabase
        .from('user_data')
        .insert({
          user_id: userId,
          paid_tokens: 0,
          usage_count: 0,
          last_sync_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user data:', createError);
        return res.status(500).json({ error: 'Failed to create user data', details: createError });
      }

      console.log(`Created user data for user ${userId}`);
      return res.status(200).json({
        success: true,
        message: 'User data created successfully',
        data: newUserData
      });
    } else if (fetchError) {
      console.error('Error fetching user data:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user data', details: fetchError });
    }

    // User data exists, update sync timestamp
    const { data: updatedUserData, error: updateError } = await supabase
      .from('user_data')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user data sync:', updateError);
      return res.status(500).json({ error: 'Failed to update sync timestamp', details: updateError });
    }

    console.log(`Synced user data for user ${userId}`);
    res.status(200).json({
      success: true,
      message: 'User data synced successfully',
      data: updatedUserData
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('User sync error:', error);
    res.status(500).json({ 
      error: 'User sync failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 