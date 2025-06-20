#!/bin/bash

echo "🚀 Deploying findr-backend-clean..."

# Deploy to production and capture the URL
DEPLOY_OUTPUT=$(vercel --prod 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract the deployment URL from the output (get just the URL part)
DEPLOYMENT_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE "https://findr-backend-clean-[a-z0-9]+\.vercel\.app" | tail -1)

if [ -z "$DEPLOYMENT_URL" ]; then
    echo "❌ Failed to extract deployment URL"
    exit 1
fi

echo "📦 Latest deployment: $DEPLOYMENT_URL"

# Update the alias to point to the new deployment
echo "🔗 Updating alias findr-api-backend.vercel.app to point to new deployment..."
vercel alias "$DEPLOYMENT_URL" findr-api-backend.vercel.app

echo "✅ Deployment complete! API is available at: https://findr-api-backend.vercel.app"
echo "🔧 No need to update extension URLs - they will automatically use the new deployment" 