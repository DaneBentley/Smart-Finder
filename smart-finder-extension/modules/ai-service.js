/**
 * AI Service - Handles AI-powered search functionality
 */

import { AuthManager } from './auth-manager.js';

export class AIService {
  constructor() {
    this.apiEndpoint = 'https://findr-api-backend.vercel.app/api/ai-search';
    this.maxContextLength = 6000; // Conservative limit for AI context window
    this.batchOverlapSize = 200; // Overlap between batches to avoid splitting sentences
    this.authManager = new AuthManager();
    
    // Rate limiting configuration - based on API calls (cost-aware)
    this.rateLimits = {
      apiCallsPerMinute: 15,    // Max 15 API calls per minute (prevents rapid batch spam)
      apiCallsPerHour: 60,      // Max 60 API calls per hour (prevents sustained abuse)
      apiCallsPerDay: 200,      // Max 200 API calls per day (covers edge cases)
      maxBatchesPerSearch: 20,  // Hard limit: max 20 batches per single search
      maxContentLength: 120000  // Hard limit: max 120k chars per search (20 batches × 6k)
    };
    
    this.requestHistory = [];
  }

  async searchWithAI(query, pageContent, onBatchComplete = null) {
    try {
      // Initialize auth manager and check authentication
      await this.authManager.initialize();
      
      if (!this.authManager.isSignedIn()) {
        throw new Error('User must be signed in to use AI features');
      }
      


      if (!this.authManager.hasTokens()) {
        // Try refreshing user data first in case it's a sync issue
        try {
          await this.authManager.refreshUserData();
          if (!this.authManager.hasTokens()) {
            throw new Error('No tokens available. Please purchase tokens to use AI features.');
          }
        } catch (refreshError) {
          throw new Error('No tokens available. Please purchase tokens to use AI features.');
        }
      }

      // Pre-flight checks: content length and estimated API calls
      const estimatedBatches = Math.min(
        Math.ceil(pageContent.length / this.maxContextLength),
        this.rateLimits.maxBatchesPerSearch
      );
      
      // Hard limit on content length (prevents massive page attacks)
      if (pageContent.length > this.rateLimits.maxContentLength) {
        throw new Error(`Content too large. Maximum ${Math.floor(this.rateLimits.maxContentLength / 1000)}k characters allowed per search.`);
      }
      
      // Check rate limits based on estimated API calls
      const rateLimitCheck = await this.checkRateLimit(estimatedBatches);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. ${rateLimitCheck.message}`);
      }
      
      // Record this request for rate limiting (with actual API call count)
      this.recordRequest(estimatedBatches);
      
      // Use progressive parallel search for longer content
      if (pageContent.length > this.maxContextLength) {
        return await this.progressiveParallelSearch(query, pageContent, onBatchComplete);
      }
      
      // Get JWT token for authenticated request  
      const tokenData = await chrome.storage.local.get(['jwt']);
      
      // Single search for shorter content
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.jwt}`
        },
        body: JSON.stringify({
          query,
          content: pageContent
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If it's a token error, try syncing user data in case it's a sync issue
        if (response.status === 403 && errorText.includes('tokens')) {
          try {
            await this.authManager.syncUser();
          } catch (syncError) {
            // Ignore sync errors
          }
        }
        
        throw new Error(`AI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Update client-side token counts after successful AI search
      try {
        await this.authManager.refreshUserData();
      } catch (refreshError) {
        // Don't fail the search if refresh fails
      }
      
      // Handle both old format (relevantSnippets) and new format (rawResponse)
      let snippets = [];
      
      if (result.rawResponse) {
        snippets = this.parseAndCleanAIResponse(result.rawResponse);
      } else if (result.relevantSnippets) {
        snippets = result.relevantSnippets || [];
      } else {
        snippets = [];
      }
      
      return snippets;
    } catch (error) {
      // Always rethrow authentication, token, rate limit, and content size errors
      if (error.message.includes('must be signed in') || 
          error.message.includes('tokens') ||
          error.message.includes('Rate limit') ||
          error.message.includes('Content too large')) {
        throw error;
      }
      
      // For other errors, return empty results
      return [];
    }
  }

  async checkRateLimit(estimatedApiCalls = 1) {
    const now = Date.now();
    
    // Load API call history from storage
    const stored = await chrome.storage.local.get(['aiApiCallHistory']);
    this.apiCallHistory = stored.aiApiCallHistory || [];
    
    // Clean old requests (older than 24 hours)
    this.apiCallHistory = this.apiCallHistory.filter(
      record => now - record.timestamp < 24 * 60 * 60 * 1000
    );
    
    // Calculate current usage windows
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const apiCallsLastMinute = this.apiCallHistory
      .filter(r => r.timestamp > oneMinuteAgo)
      .reduce((sum, r) => sum + r.apiCalls, 0);
    
    const apiCallsLastHour = this.apiCallHistory
      .filter(r => r.timestamp > oneHourAgo)
      .reduce((sum, r) => sum + r.apiCalls, 0);
    
    const apiCallsLastDay = this.apiCallHistory
      .filter(r => r.timestamp > oneDayAgo)
      .reduce((sum, r) => sum + r.apiCalls, 0);
    
    // Check if adding this request would exceed limits
    if (apiCallsLastMinute + estimatedApiCalls > this.rateLimits.apiCallsPerMinute) {
      const oldestInMinute = Math.min(...this.apiCallHistory.filter(r => r.timestamp > oneMinuteAgo).map(r => r.timestamp));
      const waitSeconds = Math.ceil((60 - (now - oldestInMinute) / 1000));
      return {
        allowed: false,
        message: `Too many API calls. Please wait ${waitSeconds} seconds. (This search needs ${estimatedApiCalls} API calls)`
      };
    }
    
    if (apiCallsLastHour + estimatedApiCalls > this.rateLimits.apiCallsPerHour) {
      const oldestInHour = Math.min(...this.apiCallHistory.filter(r => r.timestamp > oneHourAgo).map(r => r.timestamp));
      const waitMinutes = Math.ceil((60 - (now - oldestInHour) / (60 * 1000)));
      return {
        allowed: false,
        message: `Hourly API limit reached. Please wait ${waitMinutes} minutes. (This search needs ${estimatedApiCalls} API calls)`
      };
    }
    
    if (apiCallsLastDay + estimatedApiCalls > this.rateLimits.apiCallsPerDay) {
      return {
        allowed: false,
        message: `Daily API limit reached. Please try again tomorrow. (This search needs ${estimatedApiCalls} API calls)`
      };
    }
    
    return { allowed: true };
  }

  async recordRequest(apiCalls = 1) {
    const now = Date.now();
    
    // Initialize if needed
    if (!this.apiCallHistory) {
      this.apiCallHistory = [];
    }
    
    // Record this request with actual API call count
    this.apiCallHistory.push({
      timestamp: now,
      apiCalls: apiCalls
    });
    
    // Keep only last 24 hours of history
    this.apiCallHistory = this.apiCallHistory.filter(
      record => now - record.timestamp < 24 * 60 * 60 * 1000
    );
    
    // Save to storage
    await chrome.storage.local.set({ aiApiCallHistory: this.apiCallHistory });
  }

  async progressiveParallelSearch(query, pageContent, onBatchComplete = null) {
    // Split content into batches with overlap
    const batches = this.createContentBatches(pageContent);
    // Process batches in smaller parallel groups to avoid rate limits
    const batchSize = 3; // Process 3 batches at a time
    const allResults = [];
    const processedSnippets = new Set(); // Track already processed snippets
    
    for (let i = 0; i < batches.length; i += batchSize) {
      const batchGroup = batches.slice(i, i + batchSize);
      
      try {
        const groupPromises = batchGroup.map((batch, index) => 
          this.searchBatchWithCallback(query, batch, i + index, onBatchComplete, processedSnippets)
        );
        
        const groupResults = await Promise.all(groupPromises);
        allResults.push(...groupResults);
        
        // Small delay between batch groups to respect rate limits
        if (i + batchSize < batches.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Batch group ${Math.floor(i/batchSize) + 1} failed:`, error);
      }
    }
    
    try {
      // Combine and deduplicate results
      const allSnippets = allResults.flat();
      const uniqueSnippets = this.deduplicateSnippets(allSnippets);
      
      // Update client-side token counts after all batches complete
      try {
        await this.authManager.refreshUserData();
      } catch (refreshError) {
        // Don't fail the search if refresh fails
      }
      
      return uniqueSnippets.slice(0, 8); // Limit to 8 best results
    } catch (error) {
      return [];
    }
  }

  createContentBatches(content) {
    const batches = [];
    let startIndex = 0;
    const maxBatches = this.rateLimits.maxBatchesPerSearch; // Enforce hard limit from rate limits
    
    while (startIndex < content.length && batches.length < maxBatches) {
      const endIndex = Math.min(startIndex + this.maxContextLength, content.length);
      let batchContent = content.substring(startIndex, endIndex);
      
      // If not the last batch, try to end at a sentence boundary
      if (endIndex < content.length) {
        const lastSentenceEnd = batchContent.lastIndexOf('. ');
        if (lastSentenceEnd > this.maxContextLength * 0.7) {
          batchContent = batchContent.substring(0, lastSentenceEnd + 1);
        }
      }
      
      // Skip empty batches
      if (batchContent.trim().length === 0) {
        break;
      }
      
      batches.push(batchContent);
      
      // Calculate next start position with overlap
      const nextStart = startIndex + batchContent.length - this.batchOverlapSize;
      
      // Ensure we're making progress (prevent infinite loops)
      if (nextStart <= startIndex) {
        startIndex = startIndex + Math.max(1000, this.maxContextLength / 2);
      } else {
        startIndex = nextStart;
      }
      
      // Break if we've reached the end
      if (startIndex >= content.length) break;
    }
    
    // Log warning if content was truncated due to batch limits
    if (batches.length >= maxBatches && startIndex < content.length) {
      const truncatedChars = content.length - startIndex;
      console.warn(`Content truncated: ${truncatedChars} characters skipped due to batch limit`);
    }
    
    return batches;
  }

  async searchBatch(query, batchContent, batchIndex) {
    try {
      // Get JWT token for authenticated request
      const tokenData = await chrome.storage.local.get(['jwt']);
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.jwt}`
        },
        body: JSON.stringify({
          query,
          content: batchContent
        })
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      let snippets = [];
      
      if (result.rawResponse) {
        snippets = this.parseAndCleanAIResponse(result.rawResponse);
      } else if (result.relevantSnippets) {
        snippets = result.relevantSnippets || [];
      }
      
      return snippets;
    } catch (error) {
      return [];
    }
  }

  async searchBatchWithCallback(query, batchContent, batchIndex, onBatchComplete, processedSnippets) {
    try {
      // Get JWT token for authenticated request
      const tokenData = await chrome.storage.local.get(['jwt']);
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.jwt}`
        },
        body: JSON.stringify({
          query,
          content: batchContent
        })
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      let snippets = [];
      
      if (result.rawResponse) {
        snippets = this.parseAndCleanAIResponse(result.rawResponse);
      } else if (result.relevantSnippets) {
        snippets = result.relevantSnippets || [];
      }
      
      // Process new snippets immediately if callback provided
      if (onBatchComplete && snippets.length > 0) {
        const newSnippets = snippets.filter(snippet => {
          const normalized = snippet.trim().toLowerCase();
          if (normalized.length < 10 || processedSnippets.has(normalized)) {
            return false;
          }
          processedSnippets.add(normalized);
          return true;
        });
        
        if (newSnippets.length > 0) {
          onBatchComplete(newSnippets, batchIndex + 1);
        }
      }
      
      return snippets;
    } catch (error) {
      return [];
    }
  }

  deduplicateSnippets(snippets) {
    const seen = new Set();
    const unique = [];
    
    for (const snippet of snippets) {
      // Normalize snippet for comparison (remove extra whitespace, lowercase)
      const normalized = snippet.trim().toLowerCase().replace(/\s+/g, ' ');
      
      // Skip very short snippets or duplicates
      if (normalized.length < 10 || seen.has(normalized)) {
        continue;
      }
      
      // Check for substantial overlap with existing snippets
      let isDuplicate = false;
      for (const existingNormalized of seen) {
        if (this.calculateOverlap(normalized, existingNormalized) > 0.8) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        seen.add(normalized);
        unique.push(snippet);
      }
    }
    
    return unique;
  }

  calculateOverlap(text1, text2) {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    const shorter = words1.length < words2.length ? words1 : words2;
    const longer = words1.length >= words2.length ? words1 : words2;
    
    let matches = 0;
    for (const word of shorter) {
      if (longer.includes(word)) {
        matches++;
      }
    }
    
    return matches / shorter.length;
  }

  parseAndCleanAIResponse(rawResponse) {
    let snippets = [];
    
    try {
      // Try to parse as JSON first
      const parsedSnippets = JSON.parse(rawResponse);
      if (Array.isArray(parsedSnippets)) {
        snippets = parsedSnippets;
      }
    } catch (parseError) {
      // Fallback: extract lines that look like content
      const lines = rawResponse.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 20 && !line.startsWith('*') && !line.startsWith('-'));
      
      snippets = lines;
    }
    
    // Clean each snippet
    const cleanedSnippets = snippets
      .map((snippet, index) => {
        const cleaned = this.cleanSnippet(snippet);
        return cleaned;
      })
      .filter(snippet => snippet && snippet.length > 0)
      .slice(0, 5); // Limit to 5 snippets per batch
    
    return cleanedSnippets;
  }

  cleanSnippet(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Remove leading/trailing whitespace
    let cleaned = text.trim();
    
    // Skip commentary lines that aren't actual content
    if (cleaned.toLowerCase().includes('json array') || 
        cleaned.toLowerCase().includes('text excerpts') ||
        cleaned.toLowerCase().includes('here is') ||
        cleaned.toLowerCase().includes('below are') ||
        cleaned.startsWith('[') ||
        cleaned.startsWith('{')) {
      return '';
    }
    
    // Handle the specific pattern: "  \"text content\","
    // Remove leading spaces and quotes
    cleaned = cleaned.replace(/^\s*"?\s*\\?"/, '');
    
    // Remove trailing quotes and commas  
    cleaned = cleaned.replace(/\\?"\s*,?\s*"?\s*$/, '');
    
    // Remove any remaining escaped quotes
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\'/g, "'");
    
    // Remove trailing commas and semicolons
    cleaned = cleaned.replace(/[,;]\s*$/, '');
    
    // Remove any remaining leading/trailing quotes
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
    
    // Clean up any remaining whitespace
    cleaned = cleaned.trim();
    
    // Return empty if the cleaned text is too short or seems like formatting
    if (cleaned.length < 3 || cleaned.match(/^[,;.\s]*$/)) {
      return '';
    }
    
    return cleaned;
  }

  extractPageContent() {
    // Extract meaningful text content from the page
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const style = window.getComputedStyle(parent);
          
          // Skip hidden elements
          if (style.display === 'none' || 
              style.visibility === 'hidden' || 
              style.opacity === '0' ||
              parent.offsetWidth === 0 || 
              parent.offsetHeight === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip script, style, and navigation elements
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'nav', 'header', 'footer'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const textBlocks = [];
    let node;
    
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (text.length > 20) { // Only include substantial text blocks
        textBlocks.push(text);
      }
    }

    // Return full content - progressive search will handle batching if needed
    return textBlocks.join(' ');
  }
} 