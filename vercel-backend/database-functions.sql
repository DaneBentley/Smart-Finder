-- ============================================
-- ATOMIC TOKEN OPERATIONS FOR SECURITY
-- Prevents race conditions in token consumption
-- ============================================

-- Function to atomically consume a user token
CREATE OR REPLACE FUNCTION consume_user_token(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, remaining_tokens INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_tokens INTEGER;
    updated_usage INTEGER;
BEGIN
    -- Lock the row and get current token count
    SELECT paid_tokens INTO current_tokens 
    FROM user_data 
    WHERE user_id = p_user_id 
    FOR UPDATE;
    
    -- Check if user exists and has tokens
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    IF current_tokens <= 0 THEN
        RETURN QUERY SELECT FALSE, current_tokens, 'Insufficient tokens'::TEXT;
        RETURN;
    END IF;
    
    -- Atomically decrement token and increment usage
    UPDATE user_data 
    SET 
        paid_tokens = paid_tokens - 1,
        usage_count = COALESCE(usage_count, 0) + 1,
        last_sync_at = NOW()
    WHERE user_id = p_user_id
    RETURNING usage_count INTO updated_usage;
    
    RETURN QUERY SELECT TRUE, (current_tokens - 1), 'Token consumed successfully'::TEXT;
END;
$$;

-- Function to refund a user token (for failed requests)
CREATE OR REPLACE FUNCTION refund_user_token(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, new_token_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_tokens INTEGER;
BEGIN
    -- Atomically increment token and decrement usage
    UPDATE user_data 
    SET 
        paid_tokens = paid_tokens + 1,
        usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0),
        last_sync_at = NOW()
    WHERE user_id = p_user_id
    RETURNING paid_tokens INTO new_tokens;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT TRUE, new_tokens, 'Token refunded successfully'::TEXT;
END;
$$;

-- Function to safely add tokens (for purchases)
CREATE OR REPLACE FUNCTION add_user_tokens(p_user_id UUID, p_token_amount INTEGER)
RETURNS TABLE(success BOOLEAN, new_token_count INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_tokens INTEGER;
BEGIN
    -- Validate input
    IF p_token_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 'Invalid token amount'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user exists, create if not
    INSERT INTO user_data (user_id, paid_tokens, usage_count, last_sync_at)
    VALUES (p_user_id, p_token_amount, 0, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        paid_tokens = user_data.paid_tokens + p_token_amount,
        last_sync_at = NOW()
    RETURNING paid_tokens INTO new_tokens;
    
    RETURN QUERY SELECT TRUE, new_tokens, 'Tokens added successfully'::TEXT;
END;
$$;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION consume_user_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION refund_user_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION add_user_tokens(UUID, INTEGER) TO service_role; 