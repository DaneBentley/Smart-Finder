#!/bin/bash

echo "🚀 Deploying findr-backend-clean..."

# Deploy to production
vercel --prod

# Get the latest deployment URL
DEPLOYMENT_URL=$(vercel ls --scope=findr-backend-clean -m 1 | grep "https://" | head -1 | awk '{print $2}')

if [ -z "$DEPLOYMENT_URL" ]; then
    echo "❌ Failed to get deployment URL"
    exit 1
fi

echo "📦 Latest deployment: $DEPLOYMENT_URL"

# Update the alias to point to the new deployment
echo "🔗 Updating alias findr-api.vercel.app to point to new deployment..."
vercel alias "$DEPLOYMENT_URL" findr-api.vercel.app

echo "✅ Deployment complete! API is available at: https://findr-api.vercel.app"
echo "🔧 No need to update extension URLs - they will automatically use the new deployment" 