#!/usr/bin/env node

/**
 * 30-Day Token Reset Script
 * 
 * This script should be run via cron job daily
 * to reset free tokens for users whose 30-day cycle has completed.
 * 
 * Usage: node reset-monthly-tokens.js
 * 
 * Required environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetMonthlyTokens() {
  try {
    console.log('Starting 30-day token reset...');
    console.log('Date:', new Date().toISOString());
    
    // Call the database function to reset tokens
    const { data: resetResult, error: resetError } = await supabase.rpc('reset_monthly_tokens_for_all_users');

    if (resetError) {
      console.error('Error resetting 30-day tokens:', resetError);
      process.exit(1);
    }

    const result = resetResult && resetResult.length > 0 ? resetResult[0] : { users_updated: 0, message: 'No users updated' };
    
    console.log('✅ 30-day token reset completed successfully');
    console.log(`📊 Users updated: ${result.users_updated}`);
    console.log(`💬 Message: ${result.message}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error during 30-day token reset:', error);
    process.exit(1);
  }
}

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Run the reset
resetMonthlyTokens(); 