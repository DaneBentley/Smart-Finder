# Findr AI Backend

This is the Vercel serverless backend for the Findr Chrome extension's AI search functionality.

## Setup

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Navigate to this directory:
```bash
cd vercel-backend
```

4. Deploy to Vercel:
```bash
# Use the deployment script for automatic alias updating
./deploy.sh

# Or manually:
vercel --prod
vercel alias <new-deployment-url> findr-api.vercel.app
```

## Environment Variables

Add the following environment variable in your Vercel project dashboard:

- `CEREBRAS_API_KEY`: Your Cerebras AI API key

You can also set it via CLI:
```bash
vercel env add CEREBRAS_API_KEY
```

## API Endpoint

The API is available at a stable URL:
```
https://findr-api.vercel.app/api/ai-search
```

This URL uses Vercel aliases and will automatically point to the latest deployment.
The extension code already uses this stable URL, so no manual updates are needed after deployments.

## Testing

You can test the API locally:
```bash
vercel dev
```

Then test with curl:
```bash
curl -X POST http://localhost:3000/api/ai-search \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "content": "test content"}'
``` 