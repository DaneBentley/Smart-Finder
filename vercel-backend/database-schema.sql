-- ============================================
-- API REQUEST TRACKING TABLE FOR RATE LIMITING
-- ============================================

-- Table to track API requests for rate limiting
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_api_requests_user_time ON api_requests (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON api_requests (endpoint);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests (created_at);

-- Enable Row Level Security
ALTER TABLE api_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own API requests
CREATE POLICY api_requests_user_policy ON api_requests
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions to service role for rate limiting
GRANT ALL ON api_requests TO service_role;

-- Automatic cleanup: Delete requests older than 30 days
-- This should be run as a scheduled job
CREATE OR REPLACE FUNCTION cleanup_old_api_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM api_requests 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_api_requests() TO service_role;

-- ============================================
-- MONTHLY TOKEN ALLOCATION SCHEMA UPDATE
-- ============================================

-- Add new columns to user_data table for monthly free tokens
ALTER TABLE user_data 
ADD COLUMN IF NOT EXISTS free_tokens INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS monthly_reset_date DATE DEFAULT CURRENT_DATE;

-- Update existing users to have monthly tokens if they don't already
UPDATE user_data 
SET 
    free_tokens = COALESCE(free_tokens, 50),
    monthly_reset_date = COALESCE(monthly_reset_date, CURRENT_DATE)
WHERE free_tokens IS NULL OR monthly_reset_date IS NULL;

-- Create index for efficient monthly reset queries
CREATE INDEX IF NOT EXISTS idx_user_data_monthly_reset ON user_data (monthly_reset_date);

-- Add constraints to ensure data integrity
ALTER TABLE user_data 
ADD CONSTRAINT chk_free_tokens_non_negative CHECK (free_tokens >= 0),
ADD CONSTRAINT chk_paid_tokens_non_negative CHECK (paid_tokens >= 0),
ADD CONSTRAINT chk_free_tokens_max_limit CHECK (free_tokens <= 50); 