-- ============================================
-- 30-DAY TOKEN CYCLE MIGRATION
-- Run this in your Supabase SQL Editor to upgrade from monthly to 30-day cycles
-- ============================================

-- Step 1: Add signup_date column to user_data table
ALTER TABLE public.user_data 
ADD COLUMN IF NOT EXISTS signup_date DATE DEFAULT CURRENT_DATE;

-- Step 2: Update existing users to have signup_date set to their creation date if available
-- For existing users without signup_date, use current date as fallback
UPDATE public.user_data 
SET signup_date = COALESCE(signup_date, COALESCE(created_at::DATE, CURRENT_DATE))
WHERE signup_date IS NULL;

-- Step 3: Create index for efficient 30-day reset queries
CREATE INDEX IF NOT EXISTS idx_user_data_signup_date ON public.user_data (signup_date);

-- Step 4: Update the token allocation function for 30-day cycles
CREATE OR REPLACE FUNCTION public.allocate_monthly_tokens(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, free_tokens INTEGER, paid_tokens INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    last_reset_date DATE;
    user_signup_date DATE;
    current_free_tokens INTEGER;
    current_paid_tokens INTEGER;
    days_since_signup INTEGER;
    expected_reset_cycles INTEGER;
    next_reset_date DATE;
BEGIN
    -- Get current token data and signup date
    SELECT free_tokens, paid_tokens, COALESCE(monthly_reset_date, '1970-01-01'::date), COALESCE(signup_date, CURRENT_DATE)
    INTO current_free_tokens, current_paid_tokens, last_reset_date, user_signup_date
    FROM public.user_data 
    WHERE user_id = p_user_id;
    
    -- Check if user exists, create user_data record if not
    IF NOT FOUND THEN
        -- Create user_data record with initial free tokens
        INSERT INTO public.user_data (user_id, paid_tokens, free_tokens, usage_count, monthly_reset_date, signup_date, last_sync_at)
        VALUES (p_user_id, 0, 50, 0, CURRENT_DATE, CURRENT_DATE, NOW());
        
        RETURN QUERY SELECT TRUE, 50, 0, 'User data created with 30-day tokens'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate how many 30-day cycles should have passed since signup
    days_since_signup := current_date - user_signup_date;
    expected_reset_cycles := FLOOR(days_since_signup / 30.0);
    next_reset_date := user_signup_date + (expected_reset_cycles * INTERVAL '30 days')::DATE;
    
    -- Check if we need to reset tokens (30 days since last reset)
    IF current_date >= user_signup_date + ((expected_reset_cycles + 1) * INTERVAL '30 days')::DATE 
       AND last_reset_date < next_reset_date + INTERVAL '30 days' THEN
        -- Reset to 50 free tokens for the new 30-day cycle
        UPDATE public.user_data 
        SET 
            free_tokens = 50,
            monthly_reset_date = current_date,
            last_sync_at = NOW()
        WHERE user_id = p_user_id
        RETURNING free_tokens, paid_tokens INTO current_free_tokens, current_paid_tokens;
        
        RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, '30-day tokens allocated'::TEXT;
    ELSE
        -- No reset needed, return current values
        RETURN QUERY SELECT TRUE, current_free_tokens, current_paid_tokens, 'No reset needed'::TEXT;
    END IF;
END;
$$;

-- Step 5: Create function to calculate days until next reset
CREATE OR REPLACE FUNCTION public.get_days_until_next_reset(p_user_id UUID)
RETURNS TABLE(days_remaining INTEGER, next_reset_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    user_signup_date DATE;
    days_since_signup INTEGER;
    expected_reset_cycles INTEGER;
    calculated_next_reset_date DATE;
    days_until_reset INTEGER;
BEGIN
    -- Get user signup date
    SELECT COALESCE(signup_date, CURRENT_DATE)
    INTO user_signup_date
    FROM public.user_data 
    WHERE user_id = p_user_id;
    
    -- If user not found, return 0 days
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, CURRENT_DATE;
        RETURN;
    END IF;
    
    -- Calculate how many 30-day cycles have passed since signup
    days_since_signup := current_date - user_signup_date;
    expected_reset_cycles := FLOOR(days_since_signup / 30.0);
    
    -- Calculate the next reset date
    calculated_next_reset_date := user_signup_date + ((expected_reset_cycles + 1) * INTERVAL '30 days')::DATE;
    
    -- Calculate days remaining
    days_until_reset := calculated_next_reset_date - current_date;
    
    -- Ensure we don't return negative days
    IF days_until_reset < 0 THEN
        days_until_reset := 0;
    END IF;
    
    RETURN QUERY SELECT days_until_reset, calculated_next_reset_date;
END;
$$;

-- Step 6: Update the reset function for 30-day cycles
CREATE OR REPLACE FUNCTION public.reset_monthly_tokens_for_all_users()
RETURNS TABLE(users_updated INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_count INTEGER;
BEGIN
    -- Reset free tokens to 50 for all users whose 30-day cycle has completed
    UPDATE public.user_data 
    SET 
        free_tokens = 50,
        monthly_reset_date = CURRENT_DATE,
        last_sync_at = NOW()
    WHERE CURRENT_DATE >= COALESCE(signup_date, CURRENT_DATE) + (FLOOR((CURRENT_DATE - COALESCE(signup_date, CURRENT_DATE)) / 30.0) + 1) * INTERVAL '30 days'
    AND COALESCE(monthly_reset_date, '1970-01-01'::date) < CURRENT_DATE;
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    RETURN QUERY SELECT update_count, CONCAT('Reset 30-day tokens for ', update_count, ' users')::TEXT;
END;
$$;

-- Step 7: Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION public.get_days_until_next_reset(UUID) TO service_role;

-- Step 8: Verify the migration
-- This query will show you the next reset date for all users
-- SELECT 
--     u.email,
--     ud.signup_date,
--     ud.free_tokens,
--     ud.monthly_reset_date as last_reset,
--     (SELECT days_remaining FROM public.get_days_until_next_reset(ud.user_id)) as days_until_reset,
--     (SELECT next_reset_date FROM public.get_days_until_next_reset(ud.user_id)) as next_reset_date
-- FROM public.users u
-- JOIN public.user_data ud ON u.id = ud.user_id
-- ORDER BY ud.signup_date;

-- Migration completed successfully!
-- Users will now receive 50 free tokens every 30 days from their signup date. 