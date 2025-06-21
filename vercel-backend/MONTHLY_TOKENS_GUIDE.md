# 30-Day Token Allocation System

This document explains the implementation of the 50 free tokens per 30-day cycle system for Smart Finder.

## Overview

All users (both free and paid) receive 50 free tokens every 30 days from their signup date. These tokens:
- Reset to 50 every 30 days from the user's signup date
- Do not accumulate (unused tokens are lost)
- Are consumed before paid tokens
- Are separate from purchased tokens

## Database Schema Changes

### New Columns in `user_data` table:
- `free_tokens` (INTEGER): 30-day free token balance (0-50)
- `monthly_reset_date` (DATE): Last date when 30-day tokens were reset
- `signup_date` (DATE): User's signup date for calculating 30-day cycles

### Updated Functions:
- `allocate_monthly_tokens()`: Checks and allocates 30-day tokens if needed
- `consume_user_token()`: Consumes free tokens first, then paid tokens
- `get_user_token_summary()`: Returns comprehensive token information
- `get_days_until_next_reset()`: Returns days until next free token reset
- `reset_monthly_tokens_for_all_users()`: Bulk reset function for cron jobs

## API Changes

### Updated Endpoints:

#### `/api/user/consume-token` (POST)
**Response:**
```json
{
  "success": true,
  "remainingTokens": 85,
  "freeTokens": 45,
  "paidTokens": 40,
  "message": "Token consumed successfully"
}
```

#### `/api/user/profile` (GET)
**Response:**
```json
{
  "user": { ... },
  "tokens": 85,
  "freeTokens": 45,
  "paidTokens": 40,
  "usageCount": 15,
  "daysUntilReset": 12,
  "nextResetDate": "2024-02-15"
}
```

#### `/api/auth/google` (POST)
**Response:**
```json
{
  "user": { ... },
  "tokens": 50,
  "freeTokens": 50,
  "paidTokens": 0,
  "jwt": "..."
}
```

### New Admin Endpoint:

#### `/api/admin/reset-monthly-tokens` (POST)
Manually trigger 30-day token reset for all users.

**Request:**
```json
{
  "adminKey": "your_admin_secret_key"
}
```

**Response:**
```json
{
  "success": true,
  "usersUpdated": 1250,
  "message": "Reset 30-day tokens for 1250 users"
}
```

## Frontend Changes

### Extension Updates:
- Updated `AuthManager` to track `freeTokens`, `paidTokens`, `daysUntilReset`, and `nextResetDate`
- Modified popup UI to show token breakdown and days until next reset
- Enhanced local storage to include reset information

### Storage Structure:
```javascript
{
  user: { ... },
  tokens: 85,        // Total tokens
  freeTokens: 45,    // 30-day free tokens
  paidTokens: 40,    // Purchased tokens
  daysUntilReset: 12, // Days until next free token reset
  nextResetDate: "2024-02-15", // Next reset date
  jwt: "..."
}
```

## Automated 30-Day Reset

### Cron Job Setup:
```bash
# Run daily at 2 AM UTC to check for users whose 30-day cycle has completed
0 2 * * * /usr/bin/node /path/to/reset-monthly-tokens.js
```

### Manual Script:
```bash
cd vercel-backend
node scripts/reset-monthly-tokens.js
```

## Token Consumption Logic

1. **Check for 30-day allocation**: Automatically allocates 50 tokens if 30 days have passed since signup
2. **Consume free tokens first**: Free tokens are used before paid tokens
3. **Fallback to paid tokens**: When free tokens are exhausted
4. **Atomic operations**: All token operations use database functions to prevent race conditions

## Environment Variables

Add to your Vercel environment:
```bash
ADMIN_SECRET_KEY=your_secure_admin_key_here
```

## Migration Instructions

1. **Deploy database schema**:
   ```sql
   -- Run the 30-day-cycle-migration.sql
   ALTER TABLE user_data 
   ADD COLUMN IF NOT EXISTS signup_date DATE DEFAULT CURRENT_DATE;
   ```

2. **Deploy functions**:
   ```sql
   -- Run the database-functions.sql updates
   -- All new functions will be created/updated
   ```

3. **Update existing users**:
   ```sql
   -- Give existing users their signup date and 30-day tokens
   UPDATE user_data 
   SET 
       signup_date = COALESCE(created_at::DATE, CURRENT_DATE),
       free_tokens = 50,
       monthly_reset_date = CURRENT_DATE
   WHERE signup_date IS NULL;
   ```

4. **Deploy API updates**: Deploy all updated API endpoints

5. **Update extension**: Deploy the updated Chrome extension

## Monitoring

### Key Metrics to Track:
- Users receiving 30-day free tokens
- Token consumption patterns (free vs paid)
- 30-day reset execution success
- Token purchase conversion rates

### Queries:
```sql
-- Users with active 30-day tokens
SELECT COUNT(*) FROM user_data 
WHERE free_tokens > 0;

-- 30-day token usage statistics
SELECT 
  COUNT(*) as total_users,
  AVG(free_tokens) as avg_free_tokens,
  AVG(paid_tokens) as avg_paid_tokens,
  AVG(CURRENT_DATE - signup_date) as avg_days_since_signup
FROM user_data;

-- Users due for reset in next 7 days
SELECT 
  u.email,
  ud.signup_date,
  (SELECT days_remaining FROM get_days_until_next_reset(ud.user_id)) as days_until_reset
FROM users u
JOIN user_data ud ON u.id = ud.user_id
WHERE (SELECT days_remaining FROM get_days_until_next_reset(ud.user_id)) <= 7;
```

## Troubleshooting

### Common Issues:

1. **Tokens not resetting**: Check cron job execution and script logs
2. **Incorrect token counts**: Verify database function execution
3. **Race conditions**: All operations use atomic database functions
4. **Incorrect days calculation**: Verify signup_date is properly set

### Debug Commands:
```bash
# Test 30-day reset
curl -X POST https://your-domain/api/admin/reset-monthly-tokens \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your_admin_key"}'

# Check user token status and reset information
curl -X GET https://your-domain/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT"
```