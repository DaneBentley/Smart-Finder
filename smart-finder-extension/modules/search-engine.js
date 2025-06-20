/**
 * Search Engine - Handles finding and parsing search terms with performance optimizations
 * 
 * Dynamic Content Adaptation:
 * This module includes MutationObserver functionality to automatically detect when new content
 * is added to the page (infinite scroll, AJAX updates, dynamic loading) and re-run searches
 * without requiring user intervention. This provides a seamless experience where search results
 * update automatically as the page content changes.
 * 
 * Key features:
 * - Monitors DOM changes for new visible text content
 * - Debounces content changes (300ms) to avoid excessive re-searching
 * - Only re-searches when the find bar is visible and there's an active search term
 * - Filters out non-content changes (scripts, styles, hidden elements)
 * - Prevents re-searching during ongoing search operations
 */

export class SearchEngine {
  constructor() {
    this.matches = [];
    this.searchTerm = '';
    this.abortController = null;
    this.maxMatches = 10000; // Limit matches to prevent performance issues
    this.yieldInterval = 50; // Yield control every 50 iterations
    
    // Dynamic content detection - simplified
    this.mutationObserver = null;
    this.contentChangeCallback = null;
    this.mutationDebounceTimer = null;
    this.mutationDebounceDelay = 300; // ms to wait after content changes
    this.isSearching = false;
    this.contentSnapshot = new Set();
    this.minContentChangeThreshold = 100; // Minimum characters to trigger re-search
  }
  
  parseTerms(searchText, allowQuestionMarkDelimiter = true) {
    if (!searchText.trim()) return [];
    
    const terms = [];
    const text = searchText.trim();
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // For search terms, allow ? as a phrase delimiter; for regex, only use quotes
      const isQuoteStart = (char === '"' || char === "'") || 
                          (allowQuestionMarkDelimiter && char === '?');
      
      if (isQuoteStart && !inQuotes) {
        // Start of quoted string
        inQuotes = true;
        quoteChar = char === '?' ? '?' : char;
      } else if (char === quoteChar && inQuotes) {
        // End of quoted string
        inQuotes = false;
        if (current.trim()) {
          terms.push(current.trim());
          current = '';
        }
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        // Space outside quotes - term separator
        if (current.trim()) {
          terms.push(current.trim());
          current = '';
        }
      } else {
        // Regular character or space inside quotes
        current += char;
      }
    }
    
    // Add final term if any
    if (current.trim()) {
      terms.push(current.trim());
    }
    
    return terms.filter(term => term.length > 0);
  }
  
  // Convenience methods that use the unified parser
  parseSearchTerms(searchText) {
    return this.parseTerms(searchText, true); // Allow ? delimiter for phrases
  }
  
  parseRegexPatterns(searchText) {
    return this.parseTerms(searchText, false); // Only quotes, no ? delimiter
  }

  createTextWalker() {
    return document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Filter out non-visible elements (matching Chrome's behavior)
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
          
          // Skip script and style tags
          const tagName = parent.tagName.toLowerCase();
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Only include text nodes with actual content
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
  }
  
  async findMatches(searchTerm, settings, onProgress = null) {
    // Cancel any ongoing search
    this.cancelSearch();
    this.abortController = new AbortController();
    
    this.matches = [];
    this.searchTerm = searchTerm.trim();
    this.isSearching = true;
    
    if (!this.searchTerm) {
      this.isSearching = false;
      return this.matches;
    }
    
    const { caseSensitive, useRegex, multiTermHighlighting } = settings;
    
    try {
      // Create a snapshot of current content before searching
      this.createContentSnapshot();
      
      if (useRegex && multiTermHighlighting) {
        return await this.findMultiRegexMatches(caseSensitive, onProgress);
      } else if (useRegex) {
        return await this.findRegexMatches(caseSensitive, onProgress);
      } else if (multiTermHighlighting) {
        return await this.findMultiTermMatches(caseSensitive, onProgress);
      } else {
        return await this.findSingleTermMatches(caseSensitive, onProgress);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return [];
      }
      throw error;
    } finally {
      this.isSearching = false;
    }
  }
  
  cancelSearch() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  async yieldControl() {
    // Yield control to the main thread to prevent freezing
    return new Promise(resolve => setTimeout(resolve, 0));
  }
  
  checkAborted() {
    if (this.abortController?.signal.aborted) {
      const error = new Error('Search cancelled');
      error.name = 'AbortError';
      throw error;
    }
  }
  
  async findRegexMatches(caseSensitive, onProgress = null) {
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(this.searchTerm, flags);
      const walker = this.createTextWalker();
      let node;
      let nodeCount = 0;
      let totalMatches = 0;
      
      while (node = walker.nextNode()) {
        this.checkAborted();
        
        // Yield control periodically to prevent freezing
        if (nodeCount % this.yieldInterval === 0 && nodeCount > 0) {
          await this.yieldControl();
          if (onProgress) {
            onProgress(totalMatches, false);
          }
        }
        
        const text = node.textContent;
        let match;
        
        // Reset regex lastIndex for each node
        regex.lastIndex = 0;
        
        while ((match = regex.exec(text)) !== null) {
          // Stop if we've reached the maximum number of matches
          if (totalMatches >= this.maxMatches) {
            return this.matches;
          }
          
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          
          this.matches.push(range);
          totalMatches++;
          
          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) {
            regex.lastIndex++;
          }
        }
        
        nodeCount++;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Invalid regex - return empty matches
        }
    }
    
    return this.matches;
  }
  
  async findMultiRegexMatches(caseSensitive, onProgress = null) {
    const regexPatterns = this.parseRegexPatterns(this.searchTerm);
    const flags = caseSensitive ? 'g' : 'gi';
    let totalMatches = 0;
    
    for (let patternIndex = 0; patternIndex < regexPatterns.length; patternIndex++) {
      this.checkAborted();
      const pattern = regexPatterns[patternIndex];
      
      try {
        const regex = new RegExp(pattern, flags);
        const walker = this.createTextWalker();
        let node;
        let nodeCount = 0;
        
        while (node = walker.nextNode()) {
          this.checkAborted();
          
          // Yield control periodically
          if (nodeCount % this.yieldInterval === 0 && nodeCount > 0) {
            await this.yieldControl();
            if (onProgress) {
              onProgress(totalMatches, false);
            }
          }
          
          const text = node.textContent;
          let match;
          
          // Reset regex lastIndex for each node
          regex.lastIndex = 0;
          
          while ((match = regex.exec(text)) !== null) {
            // Stop if we've reached the maximum number of matches
            if (totalMatches >= this.maxMatches) {
              return this.matches;
            }
            
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            
            // Add pattern info for color mapping
            range._regexPattern = pattern;
            range._patternIndex = patternIndex;
            
            this.matches.push(range);
            totalMatches++;
            
            // Prevent infinite loop for zero-length matches
            if (match[0].length === 0) {
              regex.lastIndex++;
            }
          }
          
          nodeCount++;
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Invalid regex pattern - skip it
          }
      }
    }
    
    return this.matches;
  }
  
  async findMultiTermMatches(caseSensitive, onProgress = null) {
    const terms = this.parseSearchTerms(this.searchTerm);
    let totalMatches = 0;
    
    for (const term of terms) {
      this.checkAborted();
      const searchTerm = caseSensitive ? term : term.toLowerCase();
      const walker = this.createTextWalker();
      let node;
      let nodeCount = 0;
      
      while (node = walker.nextNode()) {
        this.checkAborted();
        
        // Yield control periodically
        if (nodeCount % this.yieldInterval === 0 && nodeCount > 0) {
          await this.yieldControl();
          if (onProgress) {
            onProgress(totalMatches, false);
          }
        }
        
        const text = node.textContent;
        const textToSearch = caseSensitive ? text : text.toLowerCase();
        let index = 0;
        
        while ((index = textToSearch.indexOf(searchTerm, index)) !== -1) {
          // Stop if we've reached the maximum number of matches
          if (totalMatches >= this.maxMatches) {
            return this.matches;
          }
          
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + term.length);
          
          this.matches.push(range);
          totalMatches++;
          index += term.length;
        }
        
        nodeCount++;
      }
    }
    
    return this.matches;
  }
  
  async findSingleTermMatches(caseSensitive, onProgress = null) {
    const searchTerm = caseSensitive ? this.searchTerm : this.searchTerm.toLowerCase();
    const walker = this.createTextWalker();
    let node;
    let nodeCount = 0;
    let totalMatches = 0;
    
    while (node = walker.nextNode()) {
      this.checkAborted();
      
      // Yield control periodically
      if (nodeCount % this.yieldInterval === 0 && nodeCount > 0) {
        await this.yieldControl();
        if (onProgress) {
          onProgress(totalMatches, false);
        }
      }
      
      const text = node.textContent;
      const textToSearch = caseSensitive ? text : text.toLowerCase();
      let index = 0;
      
      while ((index = textToSearch.indexOf(searchTerm, index)) !== -1) {
        // Stop if we've reached the maximum number of matches
        if (totalMatches >= this.maxMatches) {
          return this.matches;
        }
        
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + this.searchTerm.length);
        
        this.matches.push(range);
        totalMatches++;
        index += this.searchTerm.length;
      }
      
      nodeCount++;
    }
    
    return this.matches;
  }
  
  validateRegex(searchTerm, caseSensitive, multiRegex = false) {
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      
      if (multiRegex) {
        // Validate each regex pattern separately
        const patterns = this.parseRegexPatterns(searchTerm);
        const invalidPatterns = [];
        
        for (const pattern of patterns) {
          try {
            new RegExp(pattern, flags);
          } catch (error) {
            invalidPatterns.push(pattern);
          }
        }
        
        if (invalidPatterns.length > 0) {
          return { 
            isValid: false, 
            error: new Error(`Invalid regex patterns: ${invalidPatterns.join(', ')}`)
          };
        }
        
        return { isValid: true };
      } else {
        // Single regex validation
        new RegExp(searchTerm, flags);
        return { isValid: true };
      }
    } catch (error) {
      return { isValid: false, error };
    }
  }
  
  getTermToColorMap(multiTermHighlighting, useRegex) {
    if (!multiTermHighlighting) {
      return null;
    }
    
    // Use appropriate parsing method based on whether it's regex or not
    const terms = useRegex ? this.parseRegexPatterns(this.searchTerm) : this.parseSearchTerms(this.searchTerm);
    const termToColorMap = new Map();
    
    terms.forEach((term, index) => {
      termToColorMap.set(term, (index % 5) + 1); // Cycle through 5 colors
    });
    
    return termToColorMap;
  }
  
  getMatches() {
    return this.matches;
  }
  
  getSearchTerm() {
    return this.searchTerm;
  }
  
  getAllResultsText() {
    // Extract text from all matches in document order
    const results = [];
    const seen = new Set();
    
    this.matches.forEach(range => {
      const text = range.toString().trim();
      if (text && !seen.has(text.toLowerCase())) {
        results.push(text);
        seen.add(text.toLowerCase());
      }
    });
    
    return results;
  }
  
  clear() {
    this.matches = [];
    this.searchTerm = '';
    this.cancelSearch();
  }
  
  async findIncrementalMatches(searchTerm, settings) {
    // Only search content that wasn't in the original snapshot
    const newMatches = [];
    
    if (!searchTerm.trim() || this.isSearching) {
      return newMatches;
    }
    
    const { caseSensitive, useRegex, multiTermHighlighting } = settings;
    
    try {
      // Create a temporary walker for only new content
      const walker = this.createTextWalker();
      let node;
      
      while (node = walker.nextNode()) {
        const contentId = this.getNodeContentId(node);
        
        // Only process nodes that weren't in our original snapshot
        if (!this.contentSnapshot.has(contentId)) {
          // Search this new text node
          const text = node.textContent;
          const matches = this.searchTextNode(node, text, searchTerm, settings);
          newMatches.push(...matches);
          
          // Add to snapshot so we don't process it again
          this.contentSnapshot.add(contentId);
        }
      }
      
      // Add new matches to our main matches array
      this.matches.push(...newMatches);
      
      return newMatches;
      
    } catch (error) {
      return [];
    }
  }
  
  searchTextNode(node, text, searchTerm, settings) {
    const matches = [];
    const { caseSensitive, useRegex, multiTermHighlighting } = settings;
    
    if (useRegex) {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(searchTerm, flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        matches.push(range);
        
        if (match[0].length === 0) regex.lastIndex++;
      }
    } else if (multiTermHighlighting) {
      const terms = this.parseSearchTerms(searchTerm);
      
      for (const term of terms) {
        const searchText = caseSensitive ? text : text.toLowerCase();
        const termText = caseSensitive ? term : term.toLowerCase();
        let index = 0;
        
        while ((index = searchText.indexOf(termText, index)) !== -1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + term.length);
          matches.push(range);
          index += term.length;
        }
      }
    } else {
      const searchText = caseSensitive ? text : text.toLowerCase();
      const termText = caseSensitive ? searchTerm : searchTerm.toLowerCase();
      let index = 0;
      
      while ((index = searchText.indexOf(termText, index)) !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + searchTerm.length);
        matches.push(range);
        index += searchTerm.length;
      }
    }
    
    return matches;
  }
  
  // Dynamic content monitoring methods
  startContentMonitoring(callback) {
    this.contentChangeCallback = callback;
    
    if (this.mutationObserver) {
      this.stopContentMonitoring();
    }
    
    this.mutationObserver = new MutationObserver((mutations) => {
      // Only process if we have an active search and the find bar is visible
      if (!this.searchTerm || this.isSearching) return;
      
      // Simple check: look for substantial new text content
      let newTextLength = 0;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent?.trim();
              if (text && text.length > 20) { // Only count substantial text
                newTextLength += text.length;
              }
            }
          }
        }
      }
      
      // Only trigger if we found substantial new content
      if (newTextLength >= this.minContentChangeThreshold) {
        this.handleContentChange();
      }
    });
    
    // Observe with minimal configuration
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  stopContentMonitoring() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    if (this.mutationDebounceTimer) {
      clearTimeout(this.mutationDebounceTimer);
      this.mutationDebounceTimer = null;
    }
    
    this.contentChangeCallback = null;
    this.contentSnapshot.clear();
  }
  
  handleContentChange() {
    // Simple debounced re-search
    if (this.mutationDebounceTimer) {
      clearTimeout(this.mutationDebounceTimer);
    }
    
    this.mutationDebounceTimer = setTimeout(() => {
      if (this.contentChangeCallback && this.searchTerm && !this.isSearching) {
        this.contentChangeCallback(this.searchTerm);
      }
    }, this.mutationDebounceDelay);
  }
  
  createContentSnapshot() {
    // Create a snapshot of all current text content
    this.contentSnapshot.clear();
    
    const walker = this.createTextWalker();
    let node;
    
    while (node = walker.nextNode()) {
      const contentId = this.getNodeContentId(node);
      this.contentSnapshot.add(contentId);
    }
    
    }
  
  getNodeContentId(node) {
    // Create a unique identifier for this text content based on its position and content
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    let path = '';
    
    // Build a path to uniquely identify this content
    while (element && element !== document.body) {
      const index = Array.from(element.parentElement?.children || []).indexOf(element);
      path = `${element.tagName}[${index}]/${path}`;
      element = element.parentElement;
    }
    
    // Include a hash of the content to make it more unique
    const content = node.textContent.trim();
    const contentHash = this.simpleHash(content);
    
    return `${path}:${contentHash}`;
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
} 