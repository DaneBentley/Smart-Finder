-- ============================================
-- ATOMIC TOKEN OPERATIONS FOR SECURITY
-- Prevents race conditions in token consumption
-- ============================================

-- Function to allocate monthly free tokens (50 per month for all users)
CREATE OR REPLACE FUNCTION allocate_monthly_tokens(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, free_tokens INTEGER, paid_tokens INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    last_reset_date DATE;
    current_free_tokens INTEGER;
    current_paid_tokens INTEGER;
BEGIN
    -- Get current token data
    SELECT free_tokens, paid_tokens, COALESCE(monthly_reset_date, '1970-01-01'::date)
    INTO current_free_tokens, current_paid_tokens, last_reset_date
    FROM user_data 
    WHERE user_id = p_user_id;
    
    -- Check if user exists, create user_data record if not
    IF NOT FOUND THEN
        -- Create user_data record with initial free tokens
        INSERT INTO user_data (user_id, paid_tokens, free_tokens, usage_count, monthly_reset_date, last_sync_at)
        VALUES (p_user_id, 0, 50, 0, CURRENT_DATE, NOW());
        
        RETURN QUERY SELECT TRUE, 50, 0, 'User data created with monthly tokens'::TEXT;
        RETURN;
    END IF;
    
    -- Check if we need to reset monthly tokens (new month)
    IF last_reset_date < date_trunc('month', current_date)::date THEN
        -- Reset to 50 free tokens for the new month
        UPDATE user_data 
        SET 
            free_tokens = 50,
            monthly_reset_date = current_date,
            last_sync_at = NOW()
        WHERE user_id = p_user_id
        RETURNING free_tokens, paid_tokens INTO current_free_tokens, current_paid_tokens;
        
        RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, 'Monthly tokens allocated'::TEXT;
    ELSE
        -- No reset needed, return current values
        RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, 'No reset needed'::TEXT;
    END IF;
END;
$$;

-- Updated function to atomically consume a user token (free first, then paid)
CREATE OR REPLACE FUNCTION consume_user_token(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, remaining_free_tokens INTEGER, remaining_paid_tokens INTEGER, total_remaining INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_free_tokens INTEGER;
    current_paid_tokens INTEGER;
    updated_usage INTEGER;
    allocation_result RECORD;
BEGIN
    -- First, check and allocate monthly tokens if needed
    SELECT * INTO allocation_result FROM allocate_monthly_tokens(p_user_id);
    
    IF NOT allocation_result.success THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, allocation_result.message;
        RETURN;
    END IF;
    
    -- Lock the row and get current token counts
    SELECT free_tokens, paid_tokens INTO current_free_tokens, current_paid_tokens
    FROM user_data 
    WHERE user_id = p_user_id 
    FOR UPDATE;
    
    -- Check if user has any tokens available
    IF (current_free_tokens + current_paid_tokens) <= 0 THEN
        RETURN QUERY SELECT FALSE, current_free_tokens, current_paid_tokens, (current_free_tokens + current_paid_tokens), 'Insufficient tokens'::TEXT;
        RETURN;
    END IF;
    
    -- Consume free tokens first, then paid tokens
    IF current_free_tokens > 0 THEN
        -- Consume from free tokens
        UPDATE user_data 
        SET 
            free_tokens = free_tokens - 1,
            usage_count = COALESCE(usage_count, 0) + 1,
            last_sync_at = NOW()
        WHERE user_id = p_user_id
        RETURNING free_tokens, paid_tokens, usage_count INTO current_free_tokens, current_paid_tokens, updated_usage;
    ELSE
        -- Consume from paid tokens
        UPDATE user_data 
        SET 
            paid_tokens = paid_tokens - 1,
            usage_count = COALESCE(usage_count, 0) + 1,
            last_sync_at = NOW()
        WHERE user_id = p_user_id
        RETURNING free_tokens, paid_tokens, usage_count INTO current_free_tokens, current_paid_tokens, updated_usage;
    END IF;
    
    RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, (current_free_tokens + current_paid_tokens), 'Token consumed successfully'::TEXT;
END;
$$;

-- Function to refund a user token (refund to the same type that was consumed)
CREATE OR REPLACE FUNCTION refund_user_token(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, new_free_tokens INTEGER, new_paid_tokens INTEGER, total_tokens INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_free_tokens INTEGER;
    current_paid_tokens INTEGER;
    monthly_reset_date DATE;
    new_free INTEGER;
    new_paid INTEGER;
BEGIN
    -- Get current data
    SELECT free_tokens, paid_tokens, COALESCE(user_data.monthly_reset_date, '1970-01-01'::date)
    INTO current_free_tokens, current_paid_tokens, monthly_reset_date
    FROM user_data 
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- Refund logic: if user still has free tokens allocation for this month, refund to free
    -- Otherwise refund to paid tokens
    IF monthly_reset_date >= date_trunc('month', CURRENT_DATE)::date AND current_free_tokens < 50 THEN
        -- Refund to free tokens (up to monthly limit of 50)
        UPDATE user_data 
        SET 
            free_tokens = LEAST(free_tokens + 1, 50),
            usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0),
            last_sync_at = NOW()
        WHERE user_id = p_user_id
        RETURNING free_tokens, paid_tokens INTO new_free, new_paid;
    ELSE
        -- Refund to paid tokens
        UPDATE user_data 
        SET 
            paid_tokens = paid_tokens + 1,
            usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0),
            last_sync_at = NOW()
        WHERE user_id = p_user_id
        RETURNING free_tokens, paid_tokens INTO new_free, new_paid;
    END IF;
    
    RETURN QUERY SELECT TRUE, new_free, new_paid, (new_free + new_paid), 'Token refunded successfully'::TEXT;
END;
$$;

-- Function to safely add tokens (for purchases) - only affects paid tokens
CREATE OR REPLACE FUNCTION add_user_tokens(p_user_id UUID, p_token_amount INTEGER)
RETURNS TABLE(success BOOLEAN, new_free_tokens INTEGER, new_paid_tokens INTEGER, total_tokens INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_free INTEGER;
    new_paid INTEGER;
BEGIN
    -- Validate input
    IF p_token_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, 'Invalid token amount'::TEXT;
        RETURN;
    END IF;
    
    -- Check if user exists, create if not (with monthly tokens allocated)
    INSERT INTO user_data (user_id, paid_tokens, free_tokens, usage_count, monthly_reset_date, last_sync_at)
    VALUES (p_user_id, p_token_amount, 50, 0, CURRENT_DATE, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        paid_tokens = user_data.paid_tokens + p_token_amount,
        last_sync_at = NOW()
    RETURNING free_tokens, paid_tokens INTO new_free, new_paid;
    
    RETURN QUERY SELECT TRUE, new_free, new_paid, (new_free + new_paid), 'Tokens added successfully'::TEXT;
END;
$$;

-- Function to get user token summary (including both free and paid)
CREATE OR REPLACE FUNCTION get_user_token_summary(p_user_id UUID)
RETURNS TABLE(free_tokens INTEGER, paid_tokens INTEGER, total_tokens INTEGER, usage_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    allocation_result RECORD;
BEGIN
    -- Ensure monthly tokens are allocated first
    SELECT * INTO allocation_result FROM allocate_monthly_tokens(p_user_id);
    
    -- If allocation failed, return zeros
    IF NOT allocation_result.success THEN
        RETURN QUERY SELECT 0, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Return current token counts
    RETURN QUERY 
    SELECT 
        COALESCE(ud.free_tokens, 0) as free_tokens,
        COALESCE(ud.paid_tokens, 0) as paid_tokens,
        COALESCE(ud.free_tokens, 0) + COALESCE(ud.paid_tokens, 0) as total_tokens,
        COALESCE(ud.usage_count, 0) as usage_count
    FROM user_data ud
    WHERE ud.user_id = p_user_id;
END;
$$;

-- Function to reset monthly tokens for all users (to be run via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_tokens_for_all_users()
RETURNS TABLE(users_updated INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_count INTEGER;
BEGIN
    -- Reset free tokens to 50 for all users whose last reset was before this month
    UPDATE user_data 
    SET 
        free_tokens = 50,
        monthly_reset_date = CURRENT_DATE,
        last_sync_at = NOW()
    WHERE COALESCE(monthly_reset_date, '1970-01-01'::date) < date_trunc('month', CURRENT_DATE)::date;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    RETURN QUERY SELECT update_count, CONCAT('Reset monthly tokens for ', update_count, ' users')::TEXT;
END;
$$;

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION allocate_monthly_tokens(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION consume_user_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION refund_user_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION add_user_tokens(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_token_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_tokens_for_all_users() TO service_role; 