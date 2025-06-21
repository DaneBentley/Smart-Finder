-- ============================================
-- ACCOUNT DELETION REQUEST TRACKING
-- ============================================

-- Table to store account deletion requests with confirmation codes
CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmation_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one active request per user
    UNIQUE(user_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON account_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_expires_at ON account_deletion_requests (expires_at);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_code ON account_deletion_requests (user_id, confirmation_code);

-- Enable Row Level Security
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own deletion requests
CREATE POLICY deletion_requests_user_policy ON account_deletion_requests
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions to service role
GRANT ALL ON account_deletion_requests TO service_role;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to clean up expired deletion requests
CREATE OR REPLACE FUNCTION cleanup_expired_deletion_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM account_deletion_requests 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_deletion_requests() TO service_role;

-- ============================================
-- ACCOUNT DELETION AUDIT LOG
-- ============================================

-- Table to log account deletions for compliance
CREATE TABLE IF NOT EXISTS account_deletion_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL, -- Don't reference users table since it will be deleted
    user_email VARCHAR(255) NOT NULL,
    deletion_reason VARCHAR(500),
    deleted_data JSONB,
    deletion_errors JSONB,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_by_user BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deletion_log_user_id ON account_deletion_log (user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_log_deleted_at ON account_deletion_log (deleted_at);
CREATE INDEX IF NOT EXISTS idx_deletion_log_email ON account_deletion_log (user_email);

-- Enable Row Level Security (only admins can view)
ALTER TABLE account_deletion_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (for admin purposes)
CREATE POLICY deletion_log_admin_policy ON account_deletion_log
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to service role
GRANT ALL ON account_deletion_log TO service_role;

-- ============================================
-- ENHANCED ACCOUNT DELETION FUNCTION
-- ============================================

-- Function to perform complete account deletion with logging
CREATE OR REPLACE FUNCTION delete_user_account(
    p_user_id UUID,
    p_confirmation_code VARCHAR(6),
    p_deletion_reason VARCHAR(500) DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    deleted_data JSONB,
    errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_email VARCHAR(255);
    v_user_name VARCHAR(255);
    v_deleted_data JSONB := '[]'::jsonb;
    v_errors JSONB := '[]'::jsonb;
    v_deletion_request RECORD;
    v_temp_result RECORD;
BEGIN
    -- Verify confirmation code and check expiration
    SELECT * INTO v_deletion_request
    FROM account_deletion_requests
    WHERE user_id = p_user_id 
    AND confirmation_code = p_confirmation_code
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid or expired confirmation code'::TEXT, '[]'::jsonb, '["Invalid confirmation code"]'::jsonb;
        RETURN;
    END IF;
    
    -- Get user info for logging
    SELECT email, name INTO v_user_email, v_user_name
    FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found'::TEXT, '[]'::jsonb, '["User not found"]'::jsonb;
        RETURN;
    END IF;
    
    -- Start deletion process
    BEGIN
        -- 1. Delete API requests
        DELETE FROM api_requests WHERE user_id = p_user_id;
        v_deleted_data := v_deleted_data || '["API request history"]'::jsonb;
        
        -- 2. Delete user_data
        DELETE FROM user_data WHERE user_id = p_user_id;
        v_deleted_data := v_deleted_data || '["Token balances and usage data"]'::jsonb;
        
        -- 3. Anonymize purchases (keep for financial compliance)
        UPDATE purchases 
        SET user_id = NULL,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'deleted_user', true,
                'original_user_id', p_user_id,
                'deletion_date', NOW()
            )
        WHERE user_id = p_user_id;
        v_deleted_data := v_deleted_data || '["Purchase records (anonymized)"]'::jsonb;
        
        -- 4. Delete the user record
        DELETE FROM users WHERE id = p_user_id;
        v_deleted_data := v_deleted_data || '["User account and profile"]'::jsonb;
        
        -- 5. Clean up deletion request
        DELETE FROM account_deletion_requests WHERE user_id = p_user_id;
        
        -- 6. Log the deletion
        INSERT INTO account_deletion_log (
            user_id, 
            user_email, 
            deletion_reason, 
            deleted_data, 
            deletion_errors,
            deleted_by_user
        ) VALUES (
            p_user_id,
            v_user_email,
            p_deletion_reason,
            v_deleted_data,
            v_errors,
            TRUE
        );
        
        RETURN QUERY SELECT TRUE, 'Account successfully deleted'::TEXT, v_deleted_data, v_errors;
        
    EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_array(SQLERRM);
        
        -- Log the failed deletion attempt
        INSERT INTO account_deletion_log (
            user_id, 
            user_email, 
            deletion_reason, 
            deleted_data, 
            deletion_errors,
            deleted_by_user
        ) VALUES (
            p_user_id,
            v_user_email,
            COALESCE(p_deletion_reason, 'Failed deletion attempt'),
            v_deleted_data,
            v_errors,
            TRUE
        );
        
        RETURN QUERY SELECT FALSE, 'Account deletion failed'::TEXT, v_deleted_data, v_errors;
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID, VARCHAR, VARCHAR) TO service_role; 