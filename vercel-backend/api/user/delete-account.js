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

    const { step, confirmationCode } = req.body;

    if (step === 'request') {
      return await requestAccountDeletion(userId, res);
    } else if (step === 'confirm') {
      return await confirmAccountDeletion(userId, confirmationCode, res);
    } else {
      return res.status(400).json({ error: 'Invalid step. Use "request" or "confirm"' });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to process account deletion request' });
  }
}

async function requestAccountDeletion(userId, res) {
  try {
    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, name, created_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has recent purchases (within 30 days) - prevent immediate deletion after purchase
    const { data: recentPurchases, error: purchaseError } = await supabase
      .from('purchases')
      .select('created_at, amount_cents')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (purchaseError) {
      console.error('Error checking recent purchases:', purchaseError);
    }

    // Generate a 6-digit confirmation code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store deletion request with expiration (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const { error: requestError } = await supabase
      .from('account_deletion_requests')
      .upsert({
        user_id: userId,
        confirmation_code: confirmationCode,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (requestError) {
      console.error('Error storing deletion request:', requestError);
      return res.status(500).json({ error: 'Failed to create deletion request' });
    }

    // Calculate account age for warning
    const accountAgeInDays = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const hasRecentPurchases = recentPurchases && recentPurchases.length > 0;

    res.status(200).json({
      success: true,
      message: 'Account deletion requested',
      confirmationCode, // In production, this would be sent via email
      expiresAt: expiresAt.toISOString(),
      warnings: {
        accountAge: accountAgeInDays < 7 ? `Account is only ${accountAgeInDays} days old` : null,
        recentPurchases: hasRecentPurchases ? 'You have recent purchases within the last 30 days' : null,
        dataLoss: 'All your data including purchased tokens will be permanently deleted'
      }
    });

  } catch (error) {
    console.error('Error requesting account deletion:', error);
    res.status(500).json({ error: 'Failed to process deletion request' });
  }
}

async function confirmAccountDeletion(userId, confirmationCode, res) {
  try {
    // Verify confirmation code
    const { data: deletionRequest, error: requestError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('confirmation_code', confirmationCode)
      .single();

    if (requestError || !deletionRequest) {
      return res.status(400).json({ error: 'Invalid or expired confirmation code' });
    }

    // Check if request has expired
    if (new Date(deletionRequest.expires_at) < new Date()) {
      // Clean up expired request
      await supabase
        .from('account_deletion_requests')
        .delete()
        .eq('user_id', userId);
      
      return res.status(400).json({ error: 'Confirmation code has expired. Please request deletion again.' });
    }

    // Perform account deletion in transaction-like manner
    const deletionResults = await performAccountDeletion(userId);

    if (deletionResults.success) {
      // Clean up deletion request
      await supabase
        .from('account_deletion_requests')
        .delete()
        .eq('user_id', userId);

      res.status(200).json({
        success: true,
        message: 'Account successfully deleted',
        deletedData: deletionResults.deletedData
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete account completely',
        details: deletionResults.errors
      });
    }

  } catch (error) {
    console.error('Error confirming account deletion:', error);
    res.status(500).json({ error: 'Failed to confirm account deletion' });
  }
}

async function performAccountDeletion(userId) {
  const deletedData = [];
  const errors = [];

  try {
    // 1. Delete API requests
    const { error: apiRequestsError } = await supabase
      .from('api_requests')
      .delete()
      .eq('user_id', userId);
    
    if (apiRequestsError) {
      errors.push('Failed to delete API requests');
    } else {
      deletedData.push('API request history');
    }

    // 2. Delete user_data (tokens, usage)
    const { error: userDataError } = await supabase
      .from('user_data')
      .delete()
      .eq('user_id', userId);
    
    if (userDataError) {
      errors.push('Failed to delete user data');
    } else {
      deletedData.push('Token balances and usage data');
    }

    // 3. Delete purchases (keep for accounting but anonymize)
    const { error: purchasesError } = await supabase
      .from('purchases')
      .update({
        metadata: { deleted_user: true, original_user_id: userId },
        user_id: null // Anonymize but keep for financial records
      })
      .eq('user_id', userId);
    
    if (purchasesError) {
      errors.push('Failed to anonymize purchase records');
    } else {
      deletedData.push('Purchase records (anonymized for compliance)');
    }

    // 4. Finally, delete the user record
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (userError) {
      errors.push('Failed to delete user account');
    } else {
      deletedData.push('User account and profile');
    }

    return {
      success: errors.length === 0,
      deletedData,
      errors
    };

  } catch (error) {
    console.error('Error in account deletion process:', error);
    return {
      success: false,
      deletedData,
      errors: [...errors, 'Unexpected error during deletion process']
    };
  }
} 