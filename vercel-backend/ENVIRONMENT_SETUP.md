# Environment Variables Setup for Vercel

## Required Environment Variables

Set these in your Vercel dashboard under Project Settings > Environment Variables:

### 1. GOOGLE_CLIENT_ID
```
148916188620-l2pn60pdkqr8c0dkbe42g1u1sft7ugg5.apps.googleusercontent.com
```

### 2. SUPABASE_URL
```
https://your-project-id.supabase.co
```

### 3. SUPABASE_SERVICE_KEY
```
your_supabase_service_role_key_here
```

### 4. JWT_SECRET
```
your_secure_random_jwt_secret_here
```

### 5. STRIPE_SECRET_KEY
```
sk_test_... (or sk_live_... for production)
```

### 6. STRIPE_WEBHOOK_SECRET
```
whsec_... (from Stripe Dashboard > Webhooks > Signing secret)
```

### 7. STRIPE_PUBLISHABLE_KEY
```
pk_test_... (or pk_live_... for production)
```

## Setup Steps

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project → **Settings** → **Environment Variables**
3. Add each variable above
4. Select all environments (Production, Preview, Development)
5. Redeploy your project

## Stripe Webhook Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set endpoint URL to: `https://findr-api-backend.vercel.app/api/payments/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the **Signing secret** and add it as `STRIPE_WEBHOOK_SECRET` 