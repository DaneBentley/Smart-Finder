import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Verify the access token with Google's userinfo endpoint
    // This is the most reliable method for Chrome extension tokens
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      // Log error without exposing token details
      console.error('Google userinfo API error:', userInfoResponse.status);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: `Google userinfo API returned ${userInfoResponse.status}`
      });
    }

    const userInfo = await userInfoResponse.json();
    // Authentication successful - no token logging

    // Validate that we have the required fields
    if (!userInfo.email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    return await processUserData(userInfo, res);

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}

async function processUserData(userInfo, res) {
  const { id: googleId, email, name, picture } = userInfo;

  console.log('Processing user data for email:', email);

  try {
    // Check if user exists or create new user
    let { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let user;
    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user
      console.log('Creating new user for email:', email);
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email,
          name: name || email.split('@')[0],
          google_id: googleId,
          profile_picture: picture,
          auth_type: 'google'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      user = newUser;

      // Create user_data record with 30-day free tokens
      const { error: userDataError } = await supabase
        .from('user_data')
        .insert({
          user_id: user.id,
          paid_tokens: 0,
          free_tokens: 50, // Give new users 50 free tokens for 30-day cycle
          usage_count: 0,
          monthly_reset_date: new Date().toISOString().split('T')[0], // Current date
          signup_date: new Date().toISOString().split('T')[0] // Track signup date for 30-day cycles
        });

      if (userDataError) {
        console.error('Error creating user data:', userDataError);
      }
    } else if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Database error' });
    } else {
      user = existingUser;
      console.log('Found existing user for email:', email);
      
      // Update Google info if needed
      if (user.google_id !== googleId || user.profile_picture !== picture || user.name !== name) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            google_id: googleId,
            profile_picture: picture,
            name: name || user.name
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user:', updateError);
        }
      }
    }

    // Get user token data using the new function that handles monthly allocation
    const { data: tokenSummary, error: tokenError } = await supabase.rpc('get_user_token_summary', {
      p_user_id: user.id
    });

    const summary = tokenSummary && tokenSummary.length > 0 ? tokenSummary[0] : {
      free_tokens: 0,
      paid_tokens: 0,
      total_tokens: 0,
      usage_count: 0
    };

    // Generate JWT token for API authentication
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return user data and JWT
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile_picture: user.profile_picture
      },
      tokens: summary.total_tokens,
      freeTokens: summary.free_tokens,
      paidTokens: summary.paid_tokens,
      jwt: jwtToken
    });

  } catch (dbError) {
    console.error('Database error:', dbError);
    res.status(500).json({ error: 'Database operation failed' });
  }
} 