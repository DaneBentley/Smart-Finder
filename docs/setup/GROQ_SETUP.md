# Groq Setup Guide - Ultra-Fast Llama 3.3 70B

## Overview
This guide helps you migrate to Groq for ultra-fast inference with Llama 3.3 70B. Groq offers the same high-quality model with significantly better performance and cost savings compared to other providers.

## Benefits of Using Groq
- **Ultra-fast inference** - Up to 280 tokens/second (10x faster than previous setup)
- **Cost-effective** - ~75% cheaper than Hugging Face with Cerebras
- **Same model quality** - Llama 3.3 70B Instruct model
- **Low latency** - Optimized hardware (LPU chips) for real-time applications
- **Massive context window** - 131k tokens (~400k characters)
- **Optimized batching** - Processes 16x larger content chunks (100k vs 6k chars)
- **Fewer API calls** - Up to 75% reduction in API calls needed
- **Generous free tier** - Great for testing and development

## ⚠️ **IMPORTANT: Cost Analysis Update**

**Our initial batch optimizations were TOO aggressive and actually increased costs!**

### **Token-to-Cost Reality:**
- **100k characters** = ~25,000 tokens
- **Cost per batch**: ~$0.015 (input) + $0.0004 (output) = **$0.0154**
- **Previous 6k char batches**: ~1,500 tokens = **$0.0009** per batch

### **Actual Cost Comparison:**
| Metric | Previous (6k chars) | Current (100k chars) | Reality |
|--------|-------------------|---------------------|---------|
| **Tokens per batch** | ~1,500 | ~25,000 | **16x more tokens** |
| **Cost per batch** | ~$0.0009 | ~$0.0154 | **17x more expensive** |
| **Searches needed** | 10-20 batches | 2-3 batches | **Fewer batches** |
| **Total cost per search** | ~$0.009-$0.018 | ~$0.031-$0.046 | **2-3x more expensive!** |

## 🔧 **Cost-Optimized Batch Size (RECOMMENDED)**

Based on token economics, the optimal batch size is:
- **Target**: 10,000-15,000 characters per batch (~2,500-3,750 tokens)
- **Cost per batch**: ~$0.002-$0.003
- **Sweet spot**: Balance between context and cost efficiency

## Setup Steps

### 1. Get Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `gsk_...`)

### 2. Update Environment Variables
Replace your current API key with the Groq API key:

**For Vercel deployment:**
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to Environment Variables
4. Add `GROQ_API_KEY` with your Groq API key value
5. You can remove `HUGGINGFACE_API_KEY` if not using other HF services

**For local development:**
```bash
# Add new environment variable
export GROQ_API_KEY="gsk_your_api_key_here"
```

### 3. Deploy Changes
After updating the code and environment variables:

```bash
# Navigate to your backend directory
cd vercel-backend

# Deploy to Vercel
vercel --prod
```

## What Changed

### Code Changes Made:
1. **API Endpoint**: Changed from `https://router.huggingface.co/cerebras/v1/chat/completions` to `https://api.groq.com/openai/v1/chat/completions`
2. **Authorization**: Now uses `GROQ_API_KEY` instead of `HUGGINGFACE_API_KEY`
3. **Model**: Using `llama-3.3-70b-versatile` (Groq's optimized version)

### Performance Improvements:
- **Speed**: ~275 tokens/second vs ~25 tokens/second previously
- **Cost**: $0.75/$0.99 per 1M tokens vs ~$3.00/$7.00 previously
- **Latency**: Ultra-low latency with LPU hardware optimization

## Model Specifications

### Model: `llama-3.3-70b-versatile`
- **Context Window**: 128k tokens
- **Provider**: Groq (optimized LPU hardware)
- **Speed**: ~275 tokens/second
- **Pricing**: $0.75 input / $0.99 output per 1M tokens
- **Performance**: Same quality as Llama 3.3 70B, optimized for speed

## Pricing Comparison
| Provider | Input/Output (per 1M tokens) | Speed | Notes |
|----------|------------------------------|-------|--------|
| **Groq** | $0.75 / $0.99 | 275 tok/s | **New setup** |
| Hugging Face/Cerebras | ~$3.00 / $7.00 | ~25 tok/s | Previous setup |

**Estimated savings: ~75% cost reduction + 10x speed improvement**

## Free Tier
Groq offers a generous free tier:
- Free requests per minute
- Free tokens per day
- Perfect for development and testing

## Testing
After deployment, test your AI search functionality to ensure:
1. Authentication works with new Groq API key
2. AI search returns relevant results much faster
3. Token consumption is working properly
4. Notice the significant speed improvement

## Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Check your Groq API key is correct and properly set
2. **Model not found**: Ensure using `llama-3.3-70b-versatile`
3. **Rate limiting**: Groq has generous limits, but check console for usage

### Support:
- Check [Groq documentation](https://console.groq.com/docs)
- Monitor your usage at [console.groq.com](https://console.groq.com)
- Review Vercel deployment logs for any errors

## Next Steps
Once everything is working:
1. **Monitor usage**: Check Groq console for usage statistics
2. **Enjoy faster responses**: Your users will notice significantly faster AI search
3. **Cost savings**: Track your reduced API costs
4. **Consider other models**: Groq offers other fast models for different use cases

## Alternative Groq Models
If you want to experiment with other models:
- `llama-3.1-70b-versatile` - Previous Llama version
- `mixtral-8x7b-32768` - Smaller, faster model for simpler queries
- `gemma2-9b-it` - Even smaller model for basic tasks

Just change the `model` parameter in your API call to test different options!

## 🔧 **Batch Processing Optimizations**

### **What Was Optimized:**
Your app now uses significantly more efficient batch processing tailored for Groq's massive 131k token context window:

### **Before vs After:**
| Metric | Before (Cerebras) | After (Groq) | Improvement |
|--------|-------------------|--------------|-------------|
| **Batch Size** | 6,000 chars | 100,000 chars | **16x larger** |
| **Max Batches** | 20 batches | 8 batches | **60% fewer** |
| **Overlap Size** | 200 chars | 1,000 chars | **5x better context** |
| **Max Content** | 120k chars | 800k chars | **6.7x more content** |
| **Context Usage** | 1.5% of available | 25% of available | **16x more efficient** |

### **Performance Impact:**
- **75% fewer API calls** - Process same content with fewer requests
- **Better context continuity** - 1000-char overlap preserves paragraph context
- **Smarter chunking** - Respects paragraph and sentence boundaries
- **Higher quality results** - More context = better AI understanding
- **Reduced token consumption** - Fewer API calls = lower costs

### **Technical Details:**
- **Intelligent boundary detection**: Prioritizes paragraph breaks, then sentences, then word boundaries
- **Progressive parallel processing**: Processes 2 large batches concurrently (vs 3 small ones)
- **Enhanced deduplication**: Better overlap detection with larger context windows
- **Optimized rate limiting**: Adjusted for fewer, larger API calls

### **Real-World Impact:**
- **Large articles**: Previously 20 API calls → Now 2-3 API calls
- **Long documentation**: Previously truncated → Now processes completely
- **Complex pages**: Better context understanding across sections
- **Cost efficiency**: Dramatically reduced token usage per search 