/**
 * AI Service - Handles AI-powered search functionality
 */

import { AuthManager } from './auth-manager.js';
import { StorageManager } from './storage-manager.js';

export class AIService {
  constructor() {
    this.apiEndpoint = 'https://findr-api-backend.vercel.app/api/ai-search';
    // Optimized for Groq Llama 3.1 8B Instant: Fast, cost-effective with large context window
    this.maxContextLength = 120000; // ~30k tokens - leverage large 131k context window
    this.batchOverlapSize = 2000; // Larger overlap for better context continuity with bigger batches
    this.authManager = new AuthManager();
    this.storageManager = new StorageManager();
    
    // Rate limiting configuration - optimized for larger, fewer batches
    this.rateLimits = {
      apiCallsPerMinute: 20,    // Higher limits for faster 8B model
      apiCallsPerHour: 100,     // Increased for better throughput
      apiCallsPerDay: 400,      // Higher daily limit for 8B instant model
      maxBatchesPerSearch: 8,   // Fewer batches needed with larger context
      maxContentLength: 960000  // Adjusted: 8 batches × 120k chars = 960k total
    };
    
    this.requestHistory = [];
    this.pendingTokenConsumption = []; // Track batches that need token consumption
  }

  async searchWithAI(query, pageContent, onBatchComplete = null) {
    try {
      // Initialize auth manager and force refresh from storage to catch recent sign-ins
      // This fixes the UX issue where users need to refresh page after signing in
      await this.authManager.initialize();
      await this.authManager.forceRefreshFromStorage();
      
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
      
      // Clear pending token consumption for new search
      this.pendingTokenConsumption = [];
      
      // Use progressive parallel search for longer content
      if (pageContent.length > this.maxContextLength) {
        return await this.progressiveParallelSearch(query, pageContent, onBatchComplete);
      }
      
      // Get JWT token for authenticated request  
      const jwt = await this.authManager.getStoredJWT();
      if (!jwt) {
        throw new Error('Authentication required - please sign in again');
      }
      
      // Single search for shorter content with retry logic
      const result = await this.makeAPIRequestWithRetry(query, pageContent, jwt);
      
      // Handle both old format (relevantSnippets) and new format (rawResponse)
      let snippets = [];
      
      if (result.rawResponse) {
        snippets = this.parseAndCleanAIResponse(result.rawResponse);
      } else if (result.relevantSnippets) {
        snippets = result.relevantSnippets || [];
      } else {
        snippets = [];
      }
      
      // Track this batch for token consumption
      if (!result.tokenConsumed) {
        this.pendingTokenConsumption.push({
          batchIndex: 0,
          snippets: snippets,
          matchesFound: 0 // Will be updated when matches are found
        });
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

  async makeAPIRequestWithRetry(query, content, jwtToken, maxRetries = 2) {
    let lastError;
    
    // Get the system prompt (custom or default)
    const systemPrompt = await this.getSystemPrompt();
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({
            query,
            content,
            customSystemPrompt: systemPrompt
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          
          // If it's a token error, try syncing user data in case it's a sync issue
          if (response.status === 403 && JSON.stringify(errorData).includes('tokens')) {
            try {
              await this.authManager.syncUser();
            } catch (syncError) {
              // Ignore sync errors
            }
          }
          
          // Check if this is a retryable error
          if (errorData.shouldRetry && attempt < maxRetries) {
            const retryAfter = errorData.retryAfter || 30;
            // Retry after rate limit
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          
          // Not retryable or max retries reached
          throw new Error(`AI API error: ${response.status} - ${errorData.error || errorData.details || 'Unknown error'}`);
        }

        // Success - return the parsed response
        return await response.json();
        
      } catch (error) {
        lastError = error;
        
        // If it's a network error and we haven't reached max retries, try again
        if (error.name === 'TypeError' && error.message.includes('fetch') && attempt < maxRetries) {
          // Network error, retrying
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }
        
        // If it's not retryable or we've reached max retries, throw the error
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }

  // Get the system prompt (custom or default) with JSON format requirement
  async getSystemPrompt() {
    try {
      const settings = await this.storageManager.getSettings();
      const customPrompt = await this.storageManager.getCustomSystemPrompt();
      
      if (settings.useCustomPrompt) {
        if (customPrompt && customPrompt.trim().length > 0) {
          // Append JSON format requirement to custom prompt
          return customPrompt.trim() + this.storageManager.getJsonFormatRequirement();
        }
      }
      
      // Return default prompt (already includes JSON format requirement)
      return this.storageManager.getDefaultSystemPrompt();
    } catch (error) {
      // Failed to get system prompt - silently handle
      // Fallback to default prompt
      return this.storageManager.getDefaultSystemPrompt();
    }
  }

  async progressiveParallelSearch(query, pageContent, onBatchComplete = null) {
    // Split content into cost-optimized batches with overlap
    const batches = this.createContentBatches(pageContent);
    const allResults = [];
    const processedSnippets = new Set(); // Track already processed snippets
    

    
    // Process batches sequentially from top to bottom instead of concurrently
    for (let i = 0; i < batches.length; i++) {
      try {

        
        const batchResult = await this.searchBatchWithCallback(
          query, 
          batches[i], 
          i, 
          onBatchComplete, 
          processedSnippets
        );
        
        allResults.push(batchResult);
        
        // Small delay between batches to avoid overwhelming the UI and API
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay for better UX
        }
      } catch (error) {
        // Batch failed, continuing with next batch
      }
    }
    
    try {
      // Combine and deduplicate results
      const allSnippets = allResults.flat();
      const uniqueSnippets = this.deduplicateSnippets(allSnippets);
      
      return uniqueSnippets.slice(0, 20); // Higher limit: larger context batches with 8B instant model = better quality results
    } catch (error) {
      return [];
    }
  }

  createContentBatches(content) {
    const batches = [];
    let startIndex = 0;
    const maxBatches = this.rateLimits.maxBatchesPerSearch;
    

    
    while (startIndex < content.length && batches.length < maxBatches) {
      const endIndex = Math.min(startIndex + this.maxContextLength, content.length);
      let batchContent = content.substring(startIndex, endIndex);
      
      // If not the last batch, find optimal boundary (paragraph > sentence > word)
      if (endIndex < content.length) {
        const minLength = this.maxContextLength * 0.7; // Don't go below 70% for better cost efficiency
        
        // Try paragraph boundary first (double newline or section break)
        let lastParagraphEnd = Math.max(
          batchContent.lastIndexOf('\n\n'),
          batchContent.lastIndexOf('\n\n'),
          batchContent.lastIndexOf('</p>'),
          batchContent.lastIndexOf('</div>')
        );
        
        // If no good paragraph boundary, try sentence boundary
        if (lastParagraphEnd < minLength) {
          const sentenceEndings = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
          lastParagraphEnd = -1;
          
          for (const ending of sentenceEndings) {
            const pos = batchContent.lastIndexOf(ending);
            if (pos > lastParagraphEnd && pos >= minLength) {
              lastParagraphEnd = pos + ending.length;
            }
          }
        }
        
        // If still no good boundary, try word boundary
        if (lastParagraphEnd < minLength) {
          const lastSpace = batchContent.lastIndexOf(' ', this.maxContextLength - 100);
          if (lastSpace >= minLength) {
            lastParagraphEnd = lastSpace;
          }
        }
        
        // Use the boundary if it's reasonable, otherwise use full length
        if (lastParagraphEnd >= minLength) {
          batchContent = batchContent.substring(0, lastParagraphEnd);
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
        startIndex = startIndex + Math.max(30000, this.maxContextLength / 4);
      } else {
        startIndex = nextStart;
      }
      
      // Break if we've reached the end
      if (startIndex >= content.length) break;
    }
    
    // Log final batch statistics
    const totalChars = batches.reduce((sum, batch) => sum + batch.length, 0);
    const avgBatchSize = Math.round(totalChars / batches.length);
    
    
    // Log warning if content was truncated due to batch limits
    if (batches.length >= maxBatches && startIndex < content.length) {
      const truncatedChars = content.length - startIndex;
      // Content truncated due to batch limit
    }
    
    return batches;
  }

  async searchBatch(query, batchContent, batchIndex) {
    try {
      // Get JWT token for authenticated request
      const tokenData = await chrome.storage.local.get(['jwt']);
      
      const result = await this.makeAPIRequestWithRetry(query, batchContent, tokenData.jwt);
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
      
      const result = await this.makeAPIRequestWithRetry(query, batchContent, tokenData.jwt);
      let snippets = [];
      
      if (result.rawResponse) {
        snippets = this.parseAndCleanAIResponse(result.rawResponse);
      } else if (result.relevantSnippets) {
        snippets = result.relevantSnippets || [];
      }
      
      // Track this batch for token consumption
      if (!result.tokenConsumed) {
        this.pendingTokenConsumption.push({
          batchIndex: batchIndex,
          snippets: snippets,
          matchesFound: 0 // Will be updated when matches are found
        });
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
      .slice(0, 15); // Higher limit: larger context batches with 8B instant produce more relevant results
    
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

  // New method to report match results and consume tokens
  async reportMatchResults(totalMatchesFound) {

    
    if (this.pendingTokenConsumption.length === 0) {

      return;
    }

    try {
      const jwt = await this.authManager.getStoredJWT();
      if (!jwt) {
        return;
      }
      
      // Consume tokens for each batch that was processed
      // If any matches were found in the overall search, consume tokens for all batches
      // If no matches were found at all, don't consume any tokens
      const shouldConsumeTokens = totalMatchesFound > 0;
      
      for (const batch of this.pendingTokenConsumption) {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({
            matchesFound: shouldConsumeTokens ? 1 : 0 // Consume 1 token per batch if any matches found overall
          })
        });

        if (!response.ok) {
          // Failed to report match results for batch
        } else {
          const result = await response.json();

        }
      }
      
      // Update client-side token counts after reporting results
      try {
        await this.authManager.refreshUserData();
      } catch (refreshError) {
        // Failed to refresh user data after token consumption
      }
      
    } catch (error) {
      // Failed to report match results - silently handle
    } finally {
      // Clear pending consumption requests
      this.pendingTokenConsumption = [];
    }
  }
} 