# Smart Finder Setup Guide

This guide will help you set up Smart Finder with Google OAuth authentication, Supabase database, and Stripe payments.

## Prerequisites

- Google Cloud Console account
- Supabase account
- Stripe account
- Vercel account
- Chrome Web Store developer account (for publishing)

## 1. Google OAuth Setup

### Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API and Google Identity API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Chrome Extension" as application type
6. Add your extension ID (you'll get this after uploading to Chrome Web Store)

### For Development Testing

1. Create a "Web application" OAuth client temporarily
2. Add `http://localhost:*` and `chrome-extension://*` to authorized origins
3. Copy the Client ID

### Update Extension Files

1. Replace `YOUR_GOOGLE_CLIENT_ID` in `manifest.json` with your actual client ID
2. Update the client ID in your Vercel environment variables

## 2. Supabase Setup

### Database Schema

Your Supabase database should already have these tables (as provided):
- `users` - User authentication data
- `user_data` - Token balances and usage
- `purchases` - Payment transactions

### Environment Variables

Add these to your Vercel project:

```bash
SUPABASE_URL=https://uezkymdgqshcsebndwyv.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
```

### Row Level Security (RLS)

Enable RLS on all tables and create policies:

```sql
-- Users table policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id::text);

-- User_data table policies  
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own user_data" ON user_data
  FOR SELECT USING (auth.uid() = user_id::text);

-- Purchases table policies
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id::text);
```

## 3. Stripe Setup

### Create Stripe Account

1. Sign up at [Stripe](https://stripe.com)
2. Get your API keys from the dashboard
3. Set up webhook endpoint

### Webhook Configuration

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://findr-api-backend.vercel.app/api/payments/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `checkout.session.expired`
4. Copy the webhook secret

### Environment Variables

Add to Vercel:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 4. Vercel Deployment

### Install Dependencies

```bash
cd vercel-backend
npm install
```

### Deploy to Vercel

```bash
npm run deploy
```

### Environment Variables Setup

In Vercel dashboard, add all environment variables:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
YOUR_GOOGLE_CLIENT_ID=123456789...
SUPABASE_URL=https://...
JWT_SECRET=your_random_jwt_secret
SUPABASE_SERVICE_KEY=eyJ...
CEREBRAS_API_KEY=your_cerebras_key
```

## 5. Chrome Extension Setup

### Update API Endpoints

Update the API endpoint in `modules/auth-manager.js` and `modules/ai-service.js`:

```javascript
this.apiBaseUrl = 'https://findr-api-backend.vercel.app/api';
```

### Upload to Chrome Web Store

1. Zip the extension files (excluding node_modules, .git, etc.)
2. Upload to Chrome Web Store Developer Dashboard
3. Get your extension ID from the store
4. Update the OAuth client ID configuration with the actual extension ID

## 6. Testing the Setup

### Test Authentication

1. Load the extension in Chrome
2. Click "Sign In with Google"
3. Verify user data is stored in Supabase

### Test Token Purchase

1. Click "Buy More Tokens"
2. Complete a test purchase with Stripe test cards
3. Verify tokens are added to user account

### Test AI Search

1. Use the find bar on any website
2. Try AI mode with a signed-in user who has tokens
3. Verify token consumption

## 7. Production Checklist

- [ ] Switch Stripe to live mode
- [ ] Update OAuth redirect URIs for production
- [ ] Enable RLS policies in Supabase
- [ ] Set up proper error monitoring
- [ ] Test all payment flows
- [ ] Submit extension for Chrome Web Store review

## Pricing Structure

- **100 tokens = $1.00** (minimum purchase)
- **1 token = 1 AI search** (batch search)
- Users can purchase: 100, 500, 1000, or 2000 tokens at once

## Security Notes

- JWT tokens expire after 30 days
- All API endpoints require authentication for AI features
- Stripe handles all payment processing securely
- User data is encrypted in Supabase
- Extension uses Chrome's identity API for secure OAuth

## Support

For issues:
1. Check browser console for errors
2. Verify all environment variables are set
3. Test with Stripe test cards
4. Check Supabase logs for database issues

## Chrome Web Store Best Practices

- Clear privacy policy explaining data usage
- Detailed description of AI features and token system
- Screenshots showing the authentication flow
- Proper categorization as "Productivity" tool
- Request only necessary permissions in manifest 