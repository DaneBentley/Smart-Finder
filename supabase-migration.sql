-- ============================================
-- MONTHLY TOKEN SYSTEM MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================

-- Step 1: Add new columns to user_data table
ALTER TABLE public.user_data 
ADD COLUMN IF NOT EXISTS free_tokens INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS monthly_reset_date DATE DEFAULT CURRENT_DATE;

-- Step 2: Update existing users to have monthly tokens
UPDATE public.user_data 
SET 
    free_tokens = COALESCE(free_tokens, 50),
    monthly_reset_date = COALESCE(monthly_reset_date, CURRENT_DATE)
WHERE free_tokens IS NULL OR monthly_reset_date IS NULL;

-- Step 3: Create index for efficient monthly reset queries
CREATE INDEX IF NOT EXISTS idx_user_data_monthly_reset ON public.user_data (monthly_reset_date);

-- Step 4: Add constraints to ensure data integrity
-- Check if constraints exist before adding them
DO $$
BEGIN
    -- Add free tokens non-negative constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_free_tokens_non_negative' 
        AND table_name = 'user_data'
    ) THEN
        ALTER TABLE public.user_data 
        ADD CONSTRAINT chk_free_tokens_non_negative CHECK (free_tokens >= 0);
    END IF;

    -- Add paid tokens non-negative constraint  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_paid_tokens_non_negative' 
        AND table_name = 'user_data'
    ) THEN
        ALTER TABLE public.user_data 
        ADD CONSTRAINT chk_paid_tokens_non_negative CHECK (paid_tokens >= 0);
    END IF;

    -- Add free tokens max limit constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_free_tokens_max_limit' 
        AND table_name = 'user_data'
    ) THEN
        ALTER TABLE public.user_data 
        ADD CONSTRAINT chk_free_tokens_max_limit CHECK (free_tokens <= 50);
    END IF;
END $$;

-- Step 5: Create the monthly token allocation function
CREATE OR REPLACE FUNCTION public.allocate_monthly_tokens(p_user_id UUID)
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
    SELECT user_data.free_tokens, user_data.paid_tokens, COALESCE(user_data.monthly_reset_date, '1970-01-01'::date)
    INTO current_free_tokens, current_paid_tokens, last_reset_date
    FROM public.user_data 
    WHERE user_data.user_id = p_user_id;
    
    -- Check if user exists, create user_data record if not
    IF NOT FOUND THEN
        -- Create user_data record with initial free tokens
        INSERT INTO public.user_data (user_id, paid_tokens, free_tokens, usage_count, monthly_reset_date, last_sync_at, created_at, updated_at)
        VALUES (p_user_id, 0, 50, 0, CURRENT_DATE, NOW(), NOW(), NOW());
        
        RETURN QUERY SELECT TRUE, 50, 0, 'User data created with monthly tokens'::TEXT;
        RETURN;
    END IF;
    
    -- Check if we need to reset monthly tokens (new month)
    IF last_reset_date < date_trunc('month', current_date)::date THEN
        -- Reset to 50 free tokens for the new month
        UPDATE public.user_data 
        SET 
            free_tokens = 50,
            monthly_reset_date = current_date,
            last_sync_at = NOW(),
            updated_at = NOW()
        WHERE user_data.user_id = p_user_id
        RETURNING user_data.free_tokens, user_data.paid_tokens INTO current_free_tokens, current_paid_tokens;
        
        RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, 'Monthly tokens allocated'::TEXT;
    ELSE
        -- No reset needed, return current values
        RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, 'No reset needed'::TEXT;
    END IF;
END;
$$;

-- Step 6: Create the updated token consumption function
CREATE OR REPLACE FUNCTION public.consume_user_token(p_user_id UUID)
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
    SELECT * INTO allocation_result FROM public.allocate_monthly_tokens(p_user_id);
    
    IF NOT allocation_result.success THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, allocation_result.message;
        RETURN;
    END IF;
    
    -- Lock the row and get current token counts
    SELECT user_data.free_tokens, user_data.paid_tokens INTO current_free_tokens, current_paid_tokens
    FROM public.user_data 
    WHERE user_data.user_id = p_user_id 
    FOR UPDATE;
    
    -- Check if user has any tokens available
    IF (current_free_tokens + current_paid_tokens) <= 0 THEN
        RETURN QUERY SELECT FALSE, current_free_tokens, current_paid_tokens, (current_free_tokens + current_paid_tokens), 'Insufficient tokens'::TEXT;
        RETURN;
    END IF;
    
    -- Consume free tokens first, then paid tokens
    IF current_free_tokens > 0 THEN
        -- Consume from free tokens
        UPDATE public.user_data 
        SET 
            free_tokens = free_tokens - 1,
            usage_count = COALESCE(usage_count, 0) + 1,
            last_sync_at = NOW(),
            updated_at = NOW()
        WHERE user_data.user_id = p_user_id
        RETURNING user_data.free_tokens, user_data.paid_tokens, user_data.usage_count INTO current_free_tokens, current_paid_tokens, updated_usage;
    ELSE
        -- Consume from paid tokens
        UPDATE public.user_data 
        SET 
            paid_tokens = paid_tokens - 1,
            usage_count = COALESCE(usage_count, 0) + 1,
            last_sync_at = NOW(),
            updated_at = NOW()
        WHERE user_data.user_id = p_user_id
        RETURNING user_data.free_tokens, user_data.paid_tokens, user_data.usage_count INTO current_free_tokens, current_paid_tokens, updated_usage;
    END IF;
    
    RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, (current_free_tokens + current_paid_tokens), 'Token consumed successfully'::TEXT;
END;
$$;

-- Step 7: Create token refund function
CREATE OR REPLACE FUNCTION public.refund_user_token(p_user_id UUID)
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
    SELECT user_data.free_tokens, user_data.paid_tokens, COALESCE(user_data.monthly_reset_date, '1970-01-01'::date)
    INTO current_free_tokens, current_paid_tokens, monthly_reset_date
    FROM public.user_data 
    WHERE user_data.user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 0, 0, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- Refund logic: if user still has free tokens allocation for this month, refund to free
    -- Otherwise refund to paid tokens
    IF monthly_reset_date >= date_trunc('month', CURRENT_DATE)::date AND current_free_tokens < 50 THEN
        -- Refund to free tokens (up to monthly limit of 50)
        UPDATE public.user_data 
        SET 
            free_tokens = LEAST(free_tokens + 1, 50),
            usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0),
            last_sync_at = NOW(),
            updated_at = NOW()
        WHERE user_data.user_id = p_user_id
        RETURNING user_data.free_tokens, user_data.paid_tokens INTO new_free, new_paid;
    ELSE
        -- Refund to paid tokens
        UPDATE public.user_data 
        SET 
            paid_tokens = paid_tokens + 1,
            usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0),
            last_sync_at = NOW(),
            updated_at = NOW()
        WHERE user_data.user_id = p_user_id
        RETURNING user_data.free_tokens, user_data.paid_tokens INTO new_free, new_paid;
    END IF;
    
    RETURN QUERY SELECT TRUE, new_free, new_paid, (new_free + new_paid), 'Token refunded successfully'::TEXT;
END;
$$;

-- Step 8: Create token addition function (for purchases)
CREATE OR REPLACE FUNCTION public.add_user_tokens(p_user_id UUID, p_token_amount INTEGER)
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
    INSERT INTO public.user_data (user_id, paid_tokens, free_tokens, usage_count, monthly_reset_date, last_sync_at, created_at, updated_at)
    VALUES (p_user_id, p_token_amount, 50, 0, CURRENT_DATE, NOW(), NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        paid_tokens = user_data.paid_tokens + p_token_amount,
        last_sync_at = NOW(),
        updated_at = NOW()
    RETURNING user_data.free_tokens, user_data.paid_tokens INTO new_free, new_paid;
    
    RETURN QUERY SELECT TRUE, new_free, new_paid, (new_free + new_paid), 'Tokens added successfully'::TEXT;
END;
$$;

-- Step 9: Create token summary function
CREATE OR REPLACE FUNCTION public.get_user_token_summary(p_user_id UUID)
RETURNS TABLE(free_tokens INTEGER, paid_tokens INTEGER, total_tokens INTEGER, usage_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    allocation_result RECORD;
BEGIN
    -- Ensure monthly tokens are allocated first
    SELECT * INTO allocation_result FROM public.allocate_monthly_tokens(p_user_id);
    
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
    FROM public.user_data ud
    WHERE ud.user_id = p_user_id;
END;
$$;

-- Step 10: Create monthly reset function for all users
CREATE OR REPLACE FUNCTION public.reset_monthly_tokens_for_all_users()
RETURNS TABLE(users_updated INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_count INTEGER;
BEGIN
    -- Reset free tokens to 50 for all users whose last reset was before this month
    UPDATE public.user_data 
    SET 
        free_tokens = 50,
        monthly_reset_date = CURRENT_DATE,
        last_sync_at = NOW(),
        updated_at = NOW()
    WHERE COALESCE(monthly_reset_date, '1970-01-01'::date) < date_trunc('month', CURRENT_DATE)::date;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    RETURN QUERY SELECT update_count, CONCAT('Reset monthly tokens for ', update_count, ' users')::TEXT;
END;
$$;

-- Step 11: Grant permissions (if using RLS)
-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.allocate_monthly_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_user_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_user_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_tokens(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_token_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_tokens_for_all_users() TO service_role;

-- Also grant to service_role for API usage
GRANT EXECUTE ON FUNCTION public.allocate_monthly_tokens(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_user_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_user_token(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_user_tokens(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_token_summary(UUID) TO service_role;

-- Verification queries (run these after the migration to check everything worked)
-- You can comment these out if you don't want to see the results

-- Check that columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_data' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check that functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%token%';

-- Show current user_data structure
SELECT COUNT(*) as total_users,
       AVG(COALESCE(free_tokens, 0)) as avg_free_tokens,
       AVG(COALESCE(paid_tokens, 0)) as avg_paid_tokens
FROM public.user_data;

COMMIT; 