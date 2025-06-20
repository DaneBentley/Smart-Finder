# Monthly Token Allocation System

This document explains the implementation of the 50 free tokens per month system for Smart Finder.

## Overview

All users (both free and paid) receive 50 free tokens each month. These tokens:
- Reset to 50 on the 1st of each month
- Do not accumulate (unused tokens are lost)
- Are consumed before paid tokens
- Are separate from purchased tokens

## Database Schema Changes

### New Columns in `user_data` table:
- `free_tokens` (INTEGER): Monthly free token balance (0-50)
- `monthly_reset_date` (DATE): Last date when monthly tokens were reset

### Updated Functions:
- `allocate_monthly_tokens()`: Checks and allocates monthly tokens if needed
- `consume_user_token()`: Consumes free tokens first, then paid tokens
- `get_user_token_summary()`: Returns comprehensive token information
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
  "usageCount": 15
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
Manually trigger monthly token reset for all users.

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
  "message": "Reset monthly tokens for 1250 users"
}
```

## Frontend Changes

### Extension Updates:
- Updated `AuthManager` to track `freeTokens` and `paidTokens`
- Modified popup UI to show token breakdown
- Enhanced local storage to include token breakdown

### Storage Structure:
```javascript
{
  user: { ... },
  tokens: 85,        // Total tokens
  freeTokens: 45,    // Monthly free tokens
  paidTokens: 40,    // Purchased tokens
  jwt: "..."
}
```

## Automated Monthly Reset

### Cron Job Setup:
```bash
# Run on 1st of every month at 2 AM UTC
0 2 1 * * /usr/bin/node /path/to/reset-monthly-tokens.js
```

### Manual Script:
```bash
cd vercel-backend
node scripts/reset-monthly-tokens.js
```

## Token Consumption Logic

1. **Check for monthly allocation**: Automatically allocates 50 tokens if it's a new month
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
   -- Run the database-schema.sql updates
   ALTER TABLE user_data 
   ADD COLUMN IF NOT EXISTS free_tokens INTEGER DEFAULT 50,
   ADD COLUMN IF NOT EXISTS monthly_reset_date DATE DEFAULT CURRENT_DATE;
   ```

2. **Deploy functions**:
   ```sql
   -- Run the database-functions.sql updates
   -- All new functions will be created/updated
   ```

3. **Update existing users**:
   ```sql
   -- Give existing users their monthly tokens
   UPDATE user_data 
   SET 
       free_tokens = 50,
       monthly_reset_date = CURRENT_DATE
   WHERE free_tokens IS NULL;
   ```

4. **Deploy API updates**: Deploy all updated API endpoints

5. **Update extension**: Deploy the updated Chrome extension

## Monitoring

### Key Metrics to Track:
- Monthly active users receiving free tokens
- Token consumption patterns (free vs paid)
- Monthly reset execution success
- Token purchase conversion rates

### Queries:
```sql
-- Users with active monthly tokens
SELECT COUNT(*) FROM user_data 
WHERE free_tokens > 0 AND monthly_reset_date >= date_trunc('month', CURRENT_DATE);

-- Monthly token usage statistics
SELECT 
  COUNT(*) as total_users,
  AVG(free_tokens) as avg_free_tokens,
  AVG(paid_tokens) as avg_paid_tokens
FROM user_data;
```

## Troubleshooting

### Common Issues:

1. **Tokens not resetting**: Check cron job execution and script logs
2. **Incorrect token counts**: Verify database function execution
3. **Race conditions**: All operations use atomic database functions

### Debug Commands:
```bash
# Test monthly reset
curl -X POST https://your-domain/api/admin/reset-monthly-tokens \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your_admin_key"}'

# Check user token status
SELECT user_id, free_tokens, paid_tokens, monthly_reset_date 
FROM user_data WHERE user_id = 'specific_user_id';
```

## Security Considerations

- Monthly reset function requires admin authentication
- All token operations are atomic and secure
- Rate limiting applies to all token-related endpoints
- JWT validation required for all user operations