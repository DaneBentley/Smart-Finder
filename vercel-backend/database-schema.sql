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