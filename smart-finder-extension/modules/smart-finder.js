/**
 * SmartFinder - Main Controller
 * Orchestrates all modules to provide intelligent find functionality
 */

import { UIManager } from './ui-manager.js';
import { SearchEngine } from './search-engine.js';
import { HighlightManager } from './highlight-manager.js';
import { NavigationManager } from './navigation-manager.js';
import { EventHandler } from './event-handler.js';
import { AIService } from './ai-service.js';
import { PatternDetector } from './pattern-detector.js';
import { StorageManager } from './storage-manager.js';
import { AnalyticsManager } from './analytics-manager.js';

export class SmartFinder {
  constructor() {
    this.ui = new UIManager();
    this.searchEngine = new SearchEngine();
    this.highlightManager = new HighlightManager();
    this.navigationManager = new NavigationManager();
    this.eventHandler = new EventHandler();
    this.aiService = new AIService();
    this.patternDetector = new PatternDetector();
    this.storageManager = new StorageManager();
    this.analyticsManager = new AnalyticsManager();
    
    this.aiSearchActive = false;
    this.progressiveMatches = [];
    this.isUserNavigating = false;
    this.navigationTimeout = null;
    
    // Performance optimization properties
    this.searchInProgress = false;
    this.pendingSearch = null;
    
    // Initialize asynchronously
    this.init().catch(error => {
      // Failed to initialize SmartFinder - silently handle
    });
  }
  
  async init() {
    // Create UI first
    const { closeButton } = this.ui.createFindBar();
    
    // Then load saved settings and last search
    await this.loadStoredData();
    
    // Initialize analytics
    await this.analyticsManager.initialize();
    
    this.bindEvents(closeButton);
    
    // Update token badge on initialization
    await this.updateTokenBadge();
    
    // Start monitoring content changes for automatic re-search
    this.searchEngine.startContentMonitoring((searchTerm) => {
      // Only trigger incremental search, don't clear existing highlights
      if (this.isVisible && searchTerm) {
        this.performIncrementalSearch(searchTerm);
      }
    });
  }

  async loadStoredData() {
    // Load saved settings
    const savedSettings = await this.storageManager.getSettings();
    this.ui.updateSettings(savedSettings);
    
    // Load last search query but don't restore it immediately
    // (will be restored when find bar is opened)
    this.lastSearchQuery = await this.storageManager.getLastSearch();
  }
  
  bindEvents(closeButton) {
    this.eventHandler.bindEvents(
      this.ui,
      this.searchEngine,
      this.highlightManager,
      this.navigationManager,
      (term, forceAISearch) => this.performSearch(term, forceAISearch),
      (direction) => this.navigate(direction),
      () => this.toggle(),
      () => this.hideFindBar(),
      closeButton,
      () => this.copyAllResults(),
      null, // no aiToggle button anymore
      () => this.toggleAIMode(),
      this.storageManager,
      this
    );
  }
  
  async performSearch(term, forceAISearch = null) {
    // Cancel any ongoing search
    this.searchEngine.cancelSearch();
    
    // If a search is already in progress, store the pending search
    if (this.searchInProgress) {
      this.pendingSearch = { term, forceAISearch };
      return;
    }
    
    this.searchInProgress = true;
    
    try {
      // Clear previous highlights first
      await this.highlightManager.clearHighlights();
      this.ui.clearScrollIndicators(); // Ensure scroll indicators are cleared when starting new search
      
      // Handle AI mode
      if (this.ui.aiMode) {
        // If forceAISearch is explicitly false, just do regular search
        if (forceAISearch === false) {
          await this.performRegularSearchInAIMode(term);
          return;
        }
        // If forceAISearch is true OR we have no regular matches, do AI search
        else if (forceAISearch === true) {
          await this.performAISearch(term);
          return;
        }
        // Default behavior - check for regular matches first
        else {
          const hasRegularMatches = await this.checkForRegularMatches(term);
          if (hasRegularMatches) {
            await this.performRegularSearchInAIMode(term);
          } else {
            this.showAISearchPrompt(term);
          }
          return;
        }
      }
      
      // Validate regex if in regex mode
      if (this.ui.settings.useRegex) {
        const validation = this.searchEngine.validateRegex(
          term, 
          this.ui.settings.caseSensitive, 
          this.ui.settings.multiTermHighlighting
        );
        if (!validation.isValid) {
          this.updateUI(0, 0);
          return;
        }
      }

      // Clear any previous AI search results since we're doing regular search
      this.progressiveMatches = [];
      
      // Track regular search
      this.analyticsManager.trackSearch('regular');
      
      // Find matches with progress callback
      this.ui.setSearchProgress('Searching...', true);
      const matches = await this.searchEngine.findMatches(term, this.ui.settings, (count, isComplete) => {
        // Update UI with progress
        if (!isComplete) {
          this.ui.setSearchProgress(`Searching... (${count} found)`, true);
        }
      });
      
      // Reset navigation state
      this.navigationManager.reset();
      this.navigationManager.setMatches(matches.length);

      // Get term-to-color mapping for multi-term highlighting
      const termToColorMap = this.searchEngine.getTermToColorMap(
        this.ui.settings.multiTermHighlighting,
        this.ui.settings.useRegex
      );

      // Highlight matches
      await this.highlightManager.highlightMatches(
        matches,
        this.navigationManager.getCurrentIndex(),
        termToColorMap,
        this.ui.settings.caseSensitive,
        this.ui.settings.useRegex
      );
      
      // Update scroll indicators
      this.ui.updateScrollIndicators(
        matches,
        this.navigationManager.getCurrentIndex(),
        termToColorMap,
        this.ui.settings.caseSensitive,
        (index) => this.jumpToMatch(index),
        this.ui.settings.useRegex
      );
      
      // Update UI state
      this.ui.setSearchProgress('', false);
      const position = this.navigationManager.getCurrentPosition();
      this.updateUI(position.current, position.total);
      
      // Inform event handler about search volume for adaptive debouncing
      this.eventHandler.setLastSearchLength(matches.length);
      
      // No special styling needed for no results - just show 0/0
      
      // Auto-scroll to first match
      if (matches.length > 0 && this.navigationManager.getCurrentIndex() === 0) {
        this.highlightManager.scrollToCurrentMatch(this.navigationManager.getCurrentIndex());
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.ui.showSearchCancelled();
      } else {
        // Search error - silently handle
        this.ui.setSearchProgress('', false);
      }
    } finally {
      this.searchInProgress = false;
      
      // Process pending search if any
      if (this.pendingSearch) {
        const pending = this.pendingSearch;
        this.pendingSearch = null;
        // Use setTimeout to avoid recursive calls
        setTimeout(() => this.performSearch(pending.term, pending.forceAISearch), 0);
      }
    }
  }

  async performAISearch(query) {
    if (!query.trim()) return;
    
    // Track AI search usage
    this.analyticsManager.trackAISearch();
    
    // Show loading state without changing text
    this.ui.setSearchProgress('AI searching...', true);
    
    // Clear any previous scroll indicators before starting AI search
    this.ui.clearScrollIndicators();
    
    // Initialize progressive search state
    this.progressiveMatches = [];
    this.progressiveBatchCount = 0;
    this.isUserNavigating = false;
    
    try {
      // Extract page content and query AI
      const pageContent = this.aiService.extractPageContent();
      
      // Define callback for progressive results
      const onBatchComplete = (newSnippets, batchNumber) => {
        this.processBatchResults(newSnippets, batchNumber);
      };
      
      const relevantSnippets = await this.aiService.searchWithAI(query, pageContent, onBatchComplete);
      
      // Final processing if no progressive results were shown
      if (this.progressiveMatches.length === 0) {
        if (relevantSnippets.length === 0) {
          this.ui.updateSmartSearchHint('No results');
          this.updateUI(0, 0);
          return;
        }
        
        // Process all results at once (fallback for single batch)
        this.processFinalResults(relevantSnippets);
      } else {
        // Final completion - handle no results case for progressive search
        if (this.progressiveMatches.length === 0) {
          this.ui.updateSmartSearchHint('No results');
          this.updateUI(0, 0);
        }
      }
      
      // After all processing, check if AI returned results but nothing was highlighted
      // This handles the case where AI found relevant content but it doesn't exist on the page
      if (relevantSnippets.length > 0 && this.progressiveMatches.length === 0) {
        this.ui.updateSmartSearchHint('No results');
        this.updateUI(0, 0);
      }
      
      // Report match results for token consumption (after all processing is complete)
      await this.aiService.reportMatchResults(this.progressiveMatches.length);
      
      // Update token badge after AI search completion and potential token consumption
      this.updateTokenBadge().catch(() => {
        // Failed to update token badge - silently handle
      });
      
    } catch (error) {
      // Track AI search errors for analytics
      if (error.message.includes('Rate limit exceeded')) {
        this.analyticsManager.trackError('rate_limit_exceeded', 'ai_search');
      } else if (error.message.includes('Content too large')) {
        this.analyticsManager.trackError('content_too_large', 'ai_search');
      } else if (error.message.includes('No tokens available')) {
        this.analyticsManager.trackError('no_tokens_available', 'ai_search');
      } else if (error.message.includes('must be signed in') || error.message.includes('sign in') || error.message.includes('authentication')) {
        this.analyticsManager.trackError('authentication_required', 'ai_search');
      } else {
        this.analyticsManager.trackError('general_ai_search_error', 'ai_search');
      }
      
      // AI search failed - silently handle
      
      // Clear search progress first
      this.ui.setSearchProgress('', false);
      
      // Handle specific rate limit errors with user-friendly messages
      if (error.message.includes('Rate limit exceeded')) {
        this.ui.updateSmartSearchHint('Rate limit exceeded');
        this.ui.setSearchProgress('⏰ ' + error.message.split('Rate limit exceeded. ')[1] || 'Please wait before searching again', false);
        
      } else if (error.message.includes('Content too large')) {
        this.ui.updateSmartSearchHint('Content too large');
        this.ui.setSearchProgress('📄 ' + error.message, false);
        
      } else if (error.message.includes('No tokens available')) {
        this.ui.updateSmartSearchHint('Out of tokens. Buy more to continue. $1 = 100 tokens');
        this.ui.setSearchProgress('💰 Get more tokens to continue AI search', false);
        
      } else if (error.message.includes('must be signed in') || error.message.includes('sign in') || error.message.includes('authentication')) {
        this.ui.updateSmartSearchHint('Sign in for smart search. Click the extension icon');
        this.ui.setSearchProgress('Sign in required for AI search', false);
        
      } else {
        this.ui.updateSmartSearchHint('No results');
        this.ui.setSearchProgress('', false);
      }
      
      // Update UI with zero results, but preserve the error hint
      this.updateUI(0, 0);
      
      // Report zero matches for token consumption cleanup (even on error)
      try {
        await this.aiService.reportMatchResults(0);
      } catch (reportError) {
        // Failed to report match results after error - silently handle
      }
      
      // Update token badge after potential token consumption
      this.updateTokenBadge().catch(() => {
        // Failed to update token badge - silently handle
      });
    }
  }

  processBatchResults(newSnippets, batchNumber) {
    // Find matches for new snippets only
    const newMatches = this.findSnippetsOnPage(newSnippets, batchNumber);
    
    // Add to progressive matches only if we have new matches
    if (newMatches.length > 0) {
      const previousMatchCount = this.progressiveMatches.length;
      const isFirstBatch = previousMatchCount === 0;
      
      // Add new matches and sort all matches by document order
      this.progressiveMatches.push(...newMatches);
      this.progressiveMatches.sort((a, b) => {
        return a.compareBoundaryPoints(Range.START_TO_START, b);
      });
      this.progressiveBatchCount++;
      

      
      // Only update if we're not in the middle of user navigation
      if (!this.isUserNavigating) {
        // Always reset navigation to start from the top-most result after sorting
        this.navigationManager.reset();
        this.navigationManager.setMatches(this.progressiveMatches.length);
        
        const currentIndex = this.navigationManager.getCurrentIndex(); // This will be 0

        
        if (isFirstBatch) {
          // First batch - highlight all matches and create all scroll indicators
          this.highlightManager.highlightMatches(
            this.progressiveMatches,
            currentIndex,
            { ai: 'ai-highlight' },
            false,
            false
          );
          
          // Create all scroll indicators for the first batch
          this.ui.updateScrollIndicators(
            this.progressiveMatches,
            currentIndex,
            { ai: 'ai-highlight' },
            false,
            (index) => this.jumpToMatch(index),
            false
          );
          
          // Scroll to the top-most result (first batch is always from the top)

          this.highlightManager.scrollToCurrentMatch(0);
          
        } else {
          // Subsequent batches - add only new highlights and scroll indicators
          this.highlightManager.addMatches(
            newMatches,
            { ai: 'ai-highlight' },
            false,
            false
          );
          
          // Update the current highlight to point to the first (top-most) result
          this.highlightManager.updateCurrentHighlight(0);
          
          // Add only new scroll indicators (incremental update)
          this.ui.addScrollIndicators(
            newMatches,
            this.progressiveMatches,
            currentIndex,
            { ai: 'ai-highlight' },
            false,
            (index) => this.jumpToMatch(index),
            false
          );
          
          // Update current indicator to point to the first result
          this.ui.updateCurrentIndicator(0);
          
          // No need to scroll - we're already at the top from the first batch

        }
        
        // Update UI
        const position = this.navigationManager.getCurrentPosition();
        this.updateUI(position.current, position.total);
        this.ui.statsElement.textContent = `AI searching... (${this.progressiveMatches.length} found)`;
        
      } else {
        // Just update the count if user is navigating
        this.ui.statsElement.textContent = `AI searching... (${this.progressiveMatches.length} found)`;
      }
    }
  }

  processFinalResults(relevantSnippets) {
    // Find and highlight the relevant snippets on the page
    const matches = this.findSnippetsOnPage(relevantSnippets);
    
    // Store matches in progressiveMatches for copy functionality
    this.progressiveMatches = [...matches];
    
    // Reset navigation state and start from the first result
    this.navigationManager.reset();
    this.navigationManager.setMatches(matches.length);
    
    // Handle case where AI returned snippets but none were found on page
    if (relevantSnippets.length > 0 && matches.length === 0) {
      this.ui.updateSmartSearchHint('No results');
      this.ui.setSearchProgress('', false);
      this.updateUI(0, 0);
      return;
    }
    
    // Highlight matches with AI-specific styling
    this.highlightManager.highlightMatches(
      matches,
      this.navigationManager.getCurrentIndex(), // This will be 0 after reset
      { ai: 'ai-highlight' }, // Special AI highlight class
      false, // case sensitive
      false  // use regex
    );
    
    // Update scroll indicators like standard search
    this.ui.updateScrollIndicators(
      matches,
      this.navigationManager.getCurrentIndex(), // This will be 0 after reset
      { ai: 'ai-highlight' },
      false,
      (index) => this.jumpToMatch(index),
      false
    );
    
    // Update UI
    const position = this.navigationManager.getCurrentPosition();
    this.updateUI(position.current, position.total);
    
    // Clear search progress
    this.ui.setSearchProgress('', false);
    
    // Auto-scroll to first match (top-most result)
    if (matches.length > 0) {
      this.highlightManager.scrollToCurrentMatch(0);
    }
  }

  async checkForRegularMatches(term) {
    if (!term.trim()) return false;
    
    try {
      // Quick check for regular matches (limited to first 100)
      const testSettings = { ...this.ui.settings };
      const originalMaxMatches = this.searchEngine.maxMatches;
      this.searchEngine.maxMatches = 100; // Limit for quick check
      
      const matches = await this.searchEngine.findMatches(term, testSettings);
      
      // Restore original limit
      this.searchEngine.maxMatches = originalMaxMatches;
      
      return matches.length > 0;
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Error checking for regular matches - silently handle
      }
      return false;
    }
  }
  
  async performRegularSearchInAIMode(term) {
    if (!term.trim()) {
      this.updateUI(0, 0);
      return;
    }
    
    // Clear any previous AI search results since we're doing regular search
    this.progressiveMatches = [];
    
    try {
      // Check for pattern detection in AI mode
      const patternResult = this.patternDetector.detectPattern(term);
      let searchTerm = term;
      let searchSettings = { ...this.ui.settings };
      
      if (patternResult.isPattern && searchSettings.useRegex) {
        // Use pattern-detected regex only if regex is enabled
        searchTerm = patternResult.regex;
        
        // Enable multi-term highlighting for multi-pattern searches
        if (patternResult.isMultiPattern) {
          searchSettings.multiTermHighlighting = true;
        }
        
        // Show pattern detection message
        this.ui.setSearchProgress(this.patternDetector.getPatternMessage(patternResult), true);
      } else {
        // Find regular matches with progress callback
        this.ui.setSearchProgress('Searching...', true);
      }
      
      const matches = await this.searchEngine.findMatches(searchTerm, searchSettings, (count, isComplete) => {
        if (!isComplete) {
          if (patternResult.isPattern && searchSettings.useRegex) {
            this.ui.setSearchProgress(`Finding ${patternResult.description}... (${count} found)`, true);
          } else {
            this.ui.setSearchProgress(`Searching... (${count} found)`, true);
          }
        }
      });
      
      // Reset navigation state
      this.navigationManager.reset();
      this.navigationManager.setMatches(matches.length);

      // Get term-to-color mapping for multi-term highlighting
      const termToColorMap = this.searchEngine.getTermToColorMap(
        searchSettings.multiTermHighlighting,
        searchSettings.useRegex
      );

      // Highlight matches
      await this.highlightManager.highlightMatches(
        matches,
        this.navigationManager.getCurrentIndex(),
        termToColorMap,
        searchSettings.caseSensitive,
        searchSettings.useRegex
      );
      
      // Update scroll indicators
      this.ui.updateScrollIndicators(
        matches,
        this.navigationManager.getCurrentIndex(),
        termToColorMap,
        searchSettings.caseSensitive,
        (index) => this.jumpToMatch(index),
        searchSettings.useRegex
      );
      
      // Update UI state
      this.ui.setSearchProgress('', false);
      const position = this.navigationManager.getCurrentPosition();
      this.updateUI(position.current, position.total);
      
      // Auto-scroll to first match
      if (matches.length > 0 && this.navigationManager.getCurrentIndex() === 0) {
        this.highlightManager.scrollToCurrentMatch(this.navigationManager.getCurrentIndex());
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.ui.showSearchCancelled();
      } else {
        // Regular search error in AI mode - silently handle
        this.ui.setSearchProgress('', false);
      }
    }
  }
  
  showAISearchPrompt(term) {
    if (!term.trim()) {
      // Don't change the text, just show a subtle indicator
      this.ui.setSearchProgress('', false); // Clear any loading state
      this.updateUI(0, 0);
      return;
    }
    
    // Clear any previous search results
    this.progressiveMatches = [];
    
    // Clear any loading state and show proper "Enter to smart search" state
    this.ui.setSearchProgress('', false);
    this.updateUI(0, 0);
    
    // Reset hint to default and let updateInputStyling handle visibility
    this.ui.updateSmartSearchHint(); // Reset to default hint text
    
    // Update input styling to show the hint appropriately
    this.ui.updateInputStyling(false);
  }

  testSnippetMatch(snippet) {
    // Test if a snippet exists on the page
    const walker = this.searchEngine.createTextWalker();
    let node;
    
    while (node = walker.nextNode()) {
      const text = node.textContent;
      if (text.toLowerCase().includes(snippet.toLowerCase())) {
        return true;
      }
    }
    return false;
  }
  
  findSnippetsOnPage(snippets, batchNumber = 0) {
    const matches = [];
    const walker = this.searchEngine.createTextWalker();
    let node;
    
    while (node = walker.nextNode()) {
      const text = node.textContent;
      
      for (let i = 0; i < snippets.length; i++) {
        const snippet = snippets[i];
        const snippetText = snippet.trim();
        if (snippetText.length < 10) continue; // Skip very short snippets (increased threshold)
        
        // Try exact match first (case-insensitive)
        let index = text.toLowerCase().indexOf(snippetText.toLowerCase());
        if (index !== -1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + snippetText.length);
          range._aiSnippet = true; // Mark as AI result
          range._snippetId = `snippet_${i}_${batchNumber || 0}`; // Unique ID to prevent duplicates
          matches.push(range);
          continue;
        }
        
        // Only do partial matching for longer snippets (>20 characters)
        if (snippetText.length > 20) {
          const words = snippetText.split(/\s+/);
          if (words.length > 3) { // Only for multi-word snippets
            // Try to find at least 80% of the words in order
            const minWords = Math.max(3, Math.floor(words.length * 0.8));
            for (let wordCount = words.length; wordCount >= minWords; wordCount--) {
              const phrase = words.slice(0, wordCount).join(' ');
              if (phrase.length < 15) continue; // Skip short phrases
              
              const phraseIndex = text.toLowerCase().indexOf(phrase.toLowerCase());
              if (phraseIndex !== -1) {
                const range = document.createRange();
                range.setStart(node, phraseIndex);
                range.setEnd(node, phraseIndex + phrase.length);
                range._aiSnippet = true;
                range._snippetId = `snippet_${i}_${batchNumber || 0}_partial`;
                matches.push(range);
                break; // Take the first (longest) match
              }
            }
          }
        }
      }
    }
    
    // Sort matches by document order to ensure top-to-bottom navigation
    matches.sort((a, b) => {
      try {
        const comparison = a.compareBoundaryPoints(Range.START_TO_START, b);
        return comparison;
      } catch (error) {
        // Fallback: compare by element position if ranges are invalid
        // Range comparison failed, using fallback sorting - silently handle
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        
        // Sort by vertical position first, then horizontal
        if (Math.abs(aRect.top - bRect.top) > 5) { // 5px tolerance for same line
          return aRect.top - bRect.top;
        }
        return aRect.left - bRect.left;
      }
    });
    
    
    
    return matches;
  }

  async toggleAIMode() {
    const aiMode = this.ui.toggleAIMode();
    
    // Track AI mode toggle
    this.analyticsManager.trackFeatureUsage('ai_mode_toggle');
    this.analyticsManager.trackSettingsChange('ai_mode', aiMode);
    
    // Save the setting
    await this.storageManager.saveSettings(this.ui.settings);
    
    // Clear current search when switching modes
    this.highlightManager.clearHighlights();
    this.ui.clearScrollIndicators(); // Explicitly clear scroll indicators when switching modes
    this.ui.input.value = '';
    this.updateUI(0, 0);
    
    // Update settings visibility and stats display
    if (aiMode) {
      this.ui.setSearchProgress('AI mode', true);
    } else {
      this.ui.updateStats(0, 0);
    }
    
    return aiMode;
  }
  
  navigate(direction) {
    // Mark that user is actively navigating
    this.isUserNavigating = true;
    clearTimeout(this.navigationTimeout);
    this.navigationTimeout = setTimeout(() => {
      this.isUserNavigating = false;
    }, 2000); // Clear flag after 2 seconds of no navigation
    
    let newIndex;
    
    if (direction === 'next') {
      newIndex = this.navigationManager.findNext();
    } else {
      newIndex = this.navigationManager.findPrevious();
    }
    
    // Update highlights and scroll
    this.highlightManager.updateCurrentHighlight(newIndex);
    this.highlightManager.scrollToCurrentMatch(newIndex);
    this.ui.updateCurrentIndicator(newIndex);
    
    // Update stats
    const position = this.navigationManager.getCurrentPosition();
    this.ui.updateStats(position.current, position.total);
  }
  
  jumpToMatch(index) {
    const newIndex = this.navigationManager.jumpToMatch(index);
    
    // Update highlights and scroll
    this.highlightManager.updateCurrentHighlight(newIndex);
    this.highlightManager.scrollToCurrentMatch(newIndex);
    this.ui.updateCurrentIndicator(newIndex);
    
    // Update stats
    const position = this.navigationManager.getCurrentPosition();
    this.ui.updateStats(position.current, position.total);
  }
  
  async copyAllResults() {
    try {
      let results = [];
      
      // Check if we're in AI mode and have AI results, otherwise fall back to regular results
      if (this.ui.aiMode && this.progressiveMatches.length > 0) {
        // Extract text from AI mode matches (progressiveMatches)
        const seen = new Set();
        this.progressiveMatches.forEach((range, index) => {
          try {
            const text = range.toString().trim();
            if (text && !seen.has(text.toLowerCase())) {
              results.push(text);
              seen.add(text.toLowerCase());
            }
          } catch (error) {
            // Error extracting range - silently handle
          }
        });
      } else {
        // Use regular search engine results (works in both AI mode and regular mode)
        results = this.searchEngine.getAllResultsText();
      }
      
      if (results.length === 0) {
        this.showCopyFeedback('No results to copy');
        return;
      }
      
      // Format results cleanly
      const formattedText = results.join('\n');
      
      // Track copy feature usage
      this.analyticsManager.trackFeatureUsage('copy_all_results');
      
      // Copy to clipboard using the modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
        this.showCopyFeedback(`Copied ${results.length} result${results.length !== 1 ? 's' : ''}`);
      } else {
        // Fallback for older browsers
        this.fallbackCopyToClipboard(formattedText);
        this.showCopyFeedback(`Copied ${results.length} result${results.length !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      // Failed to copy results - silently handle
      this.showCopyFeedback('Failed to copy results', true);
    }
  }
  
  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = 'position:fixed;left:-999999px;top:-999999px;';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (error) {
      throw new Error('Fallback copy failed');
    } finally {
      document.body.removeChild(textArea);
    }
  }
  
  showCopyFeedback(message, isError = false) {
    // Temporarily change the copy button text to show feedback
    const copyButton = this.ui.settingsCheckboxes?.copyAllButton;
    if (copyButton) {
      const originalText = copyButton.textContent;
      copyButton.textContent = message;
      copyButton.style.color = isError ? '#ea4335' : '#34a853';
      
      setTimeout(() => {  
        copyButton.textContent = originalText;
        copyButton.style.color = '';
      }, 2000);
    }
  }
  
  async toggle() {
    if (this.isVisible) {
      this.hideFindBar();
    } else {
      await this.showFindBar();
    }
  }
  
  async showFindBar() {
    this.isVisible = true;
    this.eventHandler.setVisibility(true);
    
    // Check if we're on a restricted Google service or PDF viewer
    this.checkForRestrictedSites();
    
    // Restore last search when opening find bar (including empty string)
    if (this.lastSearchQuery !== undefined) {
      this.ui.setLastSearch(this.lastSearchQuery);
    }
    
    this.ui.showFindBar();
    
    // Trigger search if there's a pre-filled value
    if (this.ui.input.value.trim()) {
      this.performSearch(this.ui.input.value);
    }
  }
  
  checkForRestrictedSites() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const url = window.location.href;
    
    // Check for Google services (including various subdomains)
    const isGoogleDrive = hostname === 'drive.google.com' || hostname.endsWith('.drive.google.com');
    const isGoogleDocs = hostname === 'docs.google.com' || hostname.endsWith('.docs.google.com');
    const isGoogleSheets = hostname === 'sheets.google.com' || hostname.endsWith('.sheets.google.com');
    const isGoogleSlides = hostname === 'slides.google.com' || hostname.endsWith('.slides.google.com');
    
    // Check for Chrome's native PDF viewer
    // Chrome PDF viewer uses chrome-extension:// URLs or file:// URLs with .pdf extension
    const isPdfViewer = url.startsWith('chrome-extension://') && url.includes('pdf');
    const isFilePdf = url.startsWith('file://') && pathname.toLowerCase().endsWith('.pdf');
    const isChromePdfViewer = isPdfViewer || isFilePdf || 
                             (document.querySelector('embed[type="application/pdf"]') !== null);
    
    if (isGoogleDrive || isGoogleDocs || isGoogleSheets || isGoogleSlides || isChromePdfViewer) {
      let serviceName;
      if (isGoogleDrive) serviceName = 'Google Drive';
      else if (isGoogleDocs) serviceName = 'Google Docs';
      else if (isGoogleSheets) serviceName = 'Google Sheets';
      else if (isGoogleSlides) serviceName = 'Google Slides';
      else if (isChromePdfViewer) serviceName = 'Chrome PDF Viewer';
      
      // Detect OS to show appropriate keyboard shortcut
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const shortcut = isMac ? '⌘+G' : 'Ctrl+G';
      
      const message = `${serviceName} doesn't allow extensions to search. Use ${shortcut} for Chrome's built-in search instead.`;
      this.ui.showRestrictionNotification(message);
    }
  }

  hideFindBar() {
    this.isVisible = false;
    this.eventHandler.setVisibility(false);
    this.ui.hideFindBar();
    this.highlightManager.clearHighlights();
    this.ui.clearScrollIndicators(); // Ensure scroll indicators are cleared when hiding find bar
    this.navigationManager.reset();
    this.searchEngine.clear();
    
    // Update token badge (will show token count instead of clearing)
    this.updateTokenBadge().catch(() => {
      // Failed to update token badge - silently handle
    });
  }
  
  async updateTokenBadge() {
    try {
      // Initialize auth manager if needed and get token count
      await this.aiService.authManager.initialize();
      await this.aiService.authManager.forceRefreshFromStorage();
      
      const tokenCount = this.aiService.authManager.getTokenCount();
      
      // Send token badge update to background script
      chrome.runtime.sendMessage({
        action: 'updateTokenBadge',
        tokenCount: tokenCount
      });
    } catch (error) {
      // Failed to update token badge - silently handle
    }
  }

  updateUI(current, total) {
    this.ui.updateStats(current, total);
    this.ui.updateButtonStates(this.navigationManager.hasMatches());
    
    // Only update input styling if we don't have a non-default hint showing
    // This prevents overriding error messages like "Sign in for smart search"
    const currentHintText = this.ui.smartSearchHint.textContent;
    const isDefaultHint = currentHintText === 'Enter to smart search';
    const hasMatches = this.navigationManager.hasMatches();
    
    if (isDefaultHint || hasMatches) {
      // Safe to update styling - either default hint or we have matches
      this.ui.updateInputStyling(hasMatches);
    }
    // Otherwise, leave hint visibility as-is to preserve error messages
    
    // Update token badge whenever UI is updated
    this.updateTokenBadge().catch(() => {
      // Failed to update token badge - silently handle
    });
  }
  
  // Public API
  get isVisible() {
    return this.eventHandler.getVisibility();
  }
  
  set isVisible(value) {
    this.eventHandler.setVisibility(value);
  }
  
  // Cleanup method
  destroy() {
    this.searchEngine.cancelSearch();
    this.searchEngine.stopContentMonitoring();
    this.highlightManager.clearHighlights();
    this.ui.destroy();
  }

  async performIncrementalSearch(term) {
    // Don't interfere if user is actively searching or navigating
    if (this.searchInProgress || this.isUserNavigating) {
      return;
    }
    
    // In AI mode, only allow incremental search if we're currently showing regular search results
    // (not AI search results). AI search results are contextual and shouldn't change.
    if (this.ui.aiMode) {
      // Check if we have AI search results currently displayed
      const hasAIResults = this.progressiveMatches && this.progressiveMatches.length > 0 && 
                          this.progressiveMatches.some(match => match && match._aiSnippet);
      
      if (hasAIResults) {
        // We're showing AI search results - don't do incremental search
        return;
      }
      // We're in AI mode but showing regular search results - allow incremental search
    }
    
    try {
      // Find only new matches without clearing existing highlights
      const newMatches = await this.searchEngine.findIncrementalMatches(term, this.ui.settings);
      
      if (newMatches.length > 0) {
        // Get all matches (which now includes the new ones)
        const allMatches = this.searchEngine.getMatches();
        this.navigationManager.setMatches(allMatches.length);
        
        // Get term-to-color mapping for consistency
        const termToColorMap = this.searchEngine.getTermToColorMap(
          this.ui.settings.multiTermHighlighting,
          this.ui.settings.useRegex
        );
        
        // Highlight only the new matches (preserve existing ones)
        await this.highlightManager.highlightNewMatches(
          newMatches,
          termToColorMap,
          this.ui.settings.caseSensitive,
          this.ui.settings.useRegex
        );
        
        // Update scroll indicators with all matches
        this.ui.updateScrollIndicators(
          allMatches,
          this.navigationManager.getCurrentIndex(),
          termToColorMap,
          this.ui.settings.caseSensitive,
          (index) => this.jumpToMatch(index),
          this.ui.settings.useRegex
        );
        
        // Update UI with new totals
        const position = this.navigationManager.getCurrentPosition();
        this.updateUI(position.current, position.total);
      }
    } catch (error) {
      // Handle extension context invalidation gracefully
      if (error.message && error.message.includes('Extension context invalidated')) {
        // Extension was reloaded, stopping incremental search - silently handle
        return;
      }
      // Incremental search error - silently handle
    }
  }
} 