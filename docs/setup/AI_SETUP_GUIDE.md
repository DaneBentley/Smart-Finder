# AI-Powered Search Setup Guide

This guide will help you set up the AI-powered search functionality for your Findr Chrome extension.

## Overview

The AI mode adds intelligent search capabilities that allow users to ask questions about the content of any webpage. Instead of exact text matching, users can type natural language queries like "What is the main topic?" or "How do I install this?" and the AI will find and highlight the most relevant content on the page.

## Architecture

1. **Chrome Extension**: Contains the UI and handles highlighting
2. **Vercel Backend**: Serverless API that processes AI requests
3. **Cerebras AI**: Provides the LLaMA model for intelligent text analysis

## Step 1: Get Cerebras AI API Key

1. Go to [Cerebras AI](https://cerebras.ai/) and create an account
2. Navigate to the API section and generate an API key
3. Save this key - you'll need it for the Vercel deployment

## Step 2: Deploy the Backend to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Navigate to the backend directory:
```bash
cd vercel-backend
```

4. Deploy:
```bash
vercel --prod
```

5. Follow the prompts:
   - Link to existing project? **N**
   - Project name: `findr-ai-backend` (or your preferred name)
   - Directory: `./` (current directory)

6. Set environment variable:
```bash
vercel env add CEREBRAS_API_KEY
```
Enter your Cerebras API key when prompted.

7. Redeploy to apply environment variable:
```bash
vercel --prod
```

### Option B: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import the `vercel-backend` folder or upload it as a zip
4. In Project Settings → Environment Variables, add:
   - **Name**: `CEREBRAS_API_KEY`
   - **Value**: Your Cerebras AI API key
5. Deploy the project

## Step 3: Update Extension Configuration

1. Note your Vercel deployment URL: `https://findr-api-backend.vercel.app`

2. Update the API endpoint in `modules/ai-service.js`:
```javascript
constructor() {
  this.apiEndpoint = 'https://findr-api-backend.vercel.app/api/ai-search';
}
```

Replace `YOUR-PROJECT-NAME` with your actual Vercel project name.

## Step 4: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select your extension directory
4. The extension should now appear in your extensions list

## Step 5: Test the AI Functionality

1. Navigate to any webpage with substantial text content
2. Press `Ctrl+F` (or `Cmd+F` on Mac) to open the find bar
3. Click the 🤖 AI toggle button (should turn blue when active)
4. Type a natural language query like:
   - "What is this page about?"
   - "How do I get started?"
   - "What are the main features?"
5. Press Enter and wait for the AI to analyze and highlight relevant content

## Troubleshooting

### AI Mode Not Working

1. **Check Console**: Open browser dev tools (F12) and look for errors
2. **Verify API URL**: Ensure the URL in `ai-service.js` matches your Vercel deployment
3. **Check Environment Variable**: Verify `CEREBRAS_API_KEY` is set in Vercel dashboard
4. **Test API Directly**: 
```bash
curl -X POST https://findr-api-backend.vercel.app/api/ai-search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "content": "This is test content for AI analysis."}'
```

### CORS Issues

If you see CORS errors, ensure:
1. The Vercel API includes proper CORS headers (already configured)
2. The extension has host permissions for your Vercel domain (already added)

### Performance Issues

- The AI search may take 2-5 seconds depending on page content size
- Content is automatically truncated to 8000 characters to manage API costs
- Results are limited to the most relevant snippets

## Features

### AI Mode Features
- 🤖 **Toggle Button**: Click to switch between regular search and AI mode
- 📝 **Natural Language Queries**: Ask questions in plain English
- 🎯 **Smart Highlighting**: AI identifies and highlights relevant content
- 🔍 **Context-Aware**: Understands the meaning behind your queries
- ⚡ **Fast Results**: Typically responds in 2-5 seconds

### Preserved Features
- All existing find functionality remains unchanged
- Regular text search, regex, case sensitivity still work
- Navigation, multi-term highlighting, and copy features intact
- AI mode is purely additive - no existing functionality is modified

## Cost Considerations

- Cerebras AI offers competitive pricing for LLaMA models
- Each query costs a few cents depending on content length
- Consider setting usage limits in your Cerebras dashboard for cost control
- The backend includes content truncation to manage costs

## Security

- API key is stored securely as a Vercel environment variable
- No sensitive data is logged or stored
- CORS is properly configured to prevent unauthorized access
- Content is only sent to Cerebras for processing, not stored

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Vercel deployment is working
3. Test the API endpoint directly
4. Ensure your Cerebras API key is valid and has sufficient credits 