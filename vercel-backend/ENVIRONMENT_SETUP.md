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

## How to Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (`findr-backend-clean`)
3. Go to **Settings** > **Environment Variables**
4. Add each variable with:
   - **Name**: Variable name (e.g., `GOOGLE_CLIENT_ID`)
   - **Value**: The corresponding value
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**
6. Redeploy your project

## Testing the Setup

After setting environment variables, test the auth endpoint:
```bash
curl -X POST https://findr-backend-clean-n4cmdjees.vercel.app/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"test_token"}'
```

You should see detailed error logs that help identify the issue. 