/**
 * Chrome Find Clone - Main Controller
 * Orchestrates all modules to provide Chrome's native find functionality
 */

import { UIManager } from './ui-manager.js';
import { SearchEngine } from './search-engine.js';
import { HighlightManager } from './highlight-manager.js';
import { NavigationManager } from './navigation-manager.js';
import { EventHandler } from './event-handler.js';
import { AIService } from './ai-service.js';
import { PatternDetector } from './pattern-detector.js';
import { StorageManager } from './storage-manager.js';

export class ChromeFindClone {
  constructor() {
    this.ui = new UIManager();
    this.searchEngine = new SearchEngine();
    this.highlightManager = new HighlightManager();
    this.navigationManager = new NavigationManager();
    this.eventHandler = new EventHandler();
    this.aiService = new AIService();
    this.patternDetector = new PatternDetector();
    this.storageManager = new StorageManager();
    
    this.aiSearchActive = false;
    this.progressiveMatches = [];
    this.isUserNavigating = false;
    this.navigationTimeout = null;
    
    // Performance optimization properties
    this.searchInProgress = false;
    this.pendingSearch = null;
    
    // Initialize asynchronously
    this.init().catch(error => {
      console.error('Failed to initialize ChromeFindClone:', error);
    });
  }
  
  async init() {
    // Create UI first
    const { closeButton } = this.ui.createFindBar();
    
    // Then load saved settings and last search
    await this.loadStoredData();
    
    this.bindEvents(closeButton);
    
    // Start monitoring content changes for automatic re-search
    this.searchEngine.startContentMonitoring((searchTerm) => {
      // Only trigger incremental search, don't clear existing highlights
      if (this.ui.isVisible && searchTerm) {
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
        console.error('Search error:', error);
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
    
    // Show loading state without changing text
    this.ui.setSearchProgress('AI searching...', true);
    
    // Clear any previous scroll indicators before starting AI search
    this.ui.clearScrollIndicators();
    
    // Initialize progressive search state
    this.progressiveMatches = [];
    this.progressiveBatchCount = 0;
    this.isUserNavigating = false;
    
    try {
      console.log('🔍 AI Search Query:', query);
      
      // Extract page content and query AI
      const pageContent = this.aiService.extractPageContent();
      console.log('📄 Page Content Length:', pageContent.length, 'characters');
      console.log('📄 Page Content Preview:', pageContent.substring(0, 200) + '...');
      
      // Define callback for progressive results
      const onBatchComplete = (newSnippets, batchNumber) => {
        this.processBatchResults(newSnippets, batchNumber);
      };
      
      const relevantSnippets = await this.aiService.searchWithAI(query, pageContent, onBatchComplete);
      console.log('🤖 AI Final Response:', relevantSnippets);
      console.log('📊 Number of AI snippets returned:', relevantSnippets.length);
      
      // Final processing if no progressive results were shown
      if (this.progressiveMatches.length === 0) {
        if (relevantSnippets.length === 0) {
          console.log('❌ No AI snippets returned');
          this.ui.updateSmartSearchHint('No results');
          this.updateUI(0, 0);
          return;
        }
        
        // Process all results at once (fallback for single batch)
        this.processFinalResults(relevantSnippets);
      } else {
        console.log('✅ Progressive search completed with', this.progressiveMatches.length, 'total matches');
        // Final completion - handle no results case for progressive search
        if (this.progressiveMatches.length === 0) {
          this.ui.updateSmartSearchHint('No results');
          this.updateUI(0, 0);
        }
      }
      
    } catch (error) {
      console.error('AI search failed:', error);
      
      // Handle specific rate limit errors with user-friendly messages
      if (error.message.includes('Rate limit exceeded')) {
        this.ui.updateSmartSearchHint('Rate limit exceeded');
        this.ui.setSearchProgress('⏰ ' + error.message.split('Rate limit exceeded. ')[1] || 'Please wait before searching again', false);
        
      } else if (error.message.includes('Content too large')) {
        this.ui.updateSmartSearchHint('Content too large');
        this.ui.setSearchProgress('📄 ' + error.message, false);
        
      } else if (error.message.includes('No tokens available')) {
        this.ui.updateSmartSearchHint('No tokens');
        this.ui.setSearchProgress('💰 Get more tokens to continue AI search', false);
        
      } else if (error.message.includes('must be signed in') || error.message.includes('sign in') || error.message.includes('authentication')) {
        this.ui.updateSmartSearchHint('Sign in for smart search');
        this.ui.setSearchProgress('Sign in required for AI search', false);
        
      } else {
        this.ui.updateSmartSearchHint('No results');
        this.ui.setSearchProgress('', false);
      }
    }
  }

  processBatchResults(newSnippets, batchNumber) {
    console.log(`🔄 Processing batch ${batchNumber} with ${newSnippets.length} new snippets`);
    
    // Log each snippet
    newSnippets.forEach((snippet, index) => {
      console.log(`📝 Batch ${batchNumber} Snippet ${index + 1}:`, `"${snippet}"`);
    });
    
    // Find matches for new snippets only
    const newMatches = this.findSnippetsOnPage(newSnippets, batchNumber);
    console.log(`🎯 Batch ${batchNumber} found ${newMatches.length} matches on page`);
    
    // Add to progressive matches only if we have new matches
    if (newMatches.length > 0) {
      const previousMatchCount = this.progressiveMatches.length;
      
      // Add new matches and sort all matches by document order
      this.progressiveMatches.push(...newMatches);
      this.progressiveMatches.sort((a, b) => {
        return a.compareBoundaryPoints(Range.START_TO_START, b);
      });
      this.progressiveBatchCount++;
      
      // Only update if we're not in the middle of user navigation
      if (!this.isUserNavigating) {
        // Update navigation state but preserve current position if possible
        const currentIndex = this.navigationManager.getCurrentIndex();
        this.navigationManager.setMatches(this.progressiveMatches.length);
        
        // Use incremental highlighting to avoid invalidating existing ranges
        if (previousMatchCount === 0) {
          // First batch - highlight all matches normally
          this.highlightManager.highlightMatches(
            this.progressiveMatches,
            currentIndex,
            { ai: 'ai-highlight' },
            false,
            false
          );
        } else {
          // Subsequent batches - add only new highlights
          this.highlightManager.addMatches(
            newMatches,
            { ai: 'ai-highlight' },
            false,
            false
          );
        }
        
        // Update scroll indicators with all matches
        this.ui.updateScrollIndicators(
          this.progressiveMatches,
          currentIndex,
          { ai: 'ai-highlight' },
          false,
          (index) => this.jumpToMatch(index),
          false
        );
        
        // Update UI
        const position = this.navigationManager.getCurrentPosition();
        this.updateUI(position.current, position.total);
        this.ui.statsElement.textContent = `AI searching... (${this.progressiveMatches.length} found)`;
        
        // Auto-scroll to first match only on the very first result
        if (this.progressiveMatches.length === newMatches.length) {
          this.highlightManager.scrollToCurrentMatch(0);
        }
      } else {
        // Just update the count if user is navigating
        this.ui.statsElement.textContent = `AI searching... (${this.progressiveMatches.length} found)`;
      }
    }
  }

  processFinalResults(relevantSnippets) {
    // Log each snippet
    relevantSnippets.forEach((snippet, index) => {
      console.log(`📝 Snippet ${index + 1}:`, `"${snippet}"`);
    });
    
    // Find and highlight the relevant snippets on the page
    const matches = this.findSnippetsOnPage(relevantSnippets);
    console.log('🎯 Matches found on page:', matches.length);
    
    // Log which snippets were found/not found
    relevantSnippets.forEach((snippet, index) => {
      const found = this.testSnippetMatch(snippet);
      console.log(`${found ? '✅' : '❌'} Snippet ${index + 1} ${found ? 'FOUND' : 'NOT FOUND'} on page:`, `"${snippet}"`);
    });
    
    // Store matches in progressiveMatches for copy functionality
    this.progressiveMatches = [...matches];
    console.log(`📋 Stored ${this.progressiveMatches.length} matches in progressiveMatches for copying`);
    
    // Reset navigation state
    this.navigationManager.reset();
    this.navigationManager.setMatches(matches.length);
    
    // Highlight matches with AI-specific styling
    this.highlightManager.highlightMatches(
      matches,
      this.navigationManager.getCurrentIndex(),
      { ai: 'ai-highlight' }, // Special AI highlight class
      false, // case sensitive
      false  // use regex
    );
    
    // Update scroll indicators like standard search
    this.ui.updateScrollIndicators(
      matches,
      this.navigationManager.getCurrentIndex(),
      { ai: 'ai-highlight' },
      false,
      (index) => this.jumpToMatch(index),
      false
    );
    
    // Update UI
    const position = this.navigationManager.getCurrentPosition();
    this.updateUI(position.current, position.total);
    
    // Handle no results case
    if (matches.length === 0) {
      this.ui.updateSmartSearchHint('No results');
    }
    
    // Auto-scroll to first match
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
        console.error('Error checking for regular matches:', error);
      }
      return false;
    }
  }
  
  async performRegularSearchInAIMode(term) {
    if (!term.trim()) {
      this.updateUI(0, 0);
      return;
    }
    
    try {
      // Check for pattern detection in AI mode
      const patternResult = this.patternDetector.detectPattern(term);
      let searchTerm = term;
      let searchSettings = { ...this.ui.settings };
      
      if (patternResult.isPattern) {
        // Use pattern-detected regex
        searchTerm = patternResult.regex;
        searchSettings.useRegex = true;
        
        // Enable multi-term highlighting for multi-pattern searches
        if (patternResult.isMultiPattern) {
          searchSettings.multiTermHighlighting = true;
        }
        
        console.log(`🔍 Pattern detected: ${patternResult.description}`);
        console.log(`🔍 Using regex: ${searchTerm}`);
        
        // Show pattern detection message
        this.ui.setSearchProgress(this.patternDetector.getPatternMessage(patternResult), true);
      } else {
        // Find regular matches with progress callback
        this.ui.setSearchProgress('Searching...', true);
      }
      
      const matches = await this.searchEngine.findMatches(searchTerm, searchSettings, (count, isComplete) => {
        if (!isComplete) {
          if (patternResult.isPattern) {
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
        console.error('Regular search error in AI mode:', error);
        this.ui.setSearchProgress('', false);
      }
    }
  }
  
  showAISearchPrompt(term) {
    if (!term.trim()) {
      // Don't change the text, just show a subtle indicator
      this.ui.setSearchProgress('AI ready', true);
      return;
    }
    
    // Show prompt to use AI search with minimal UI changes
    this.ui.setSearchProgress('AI ready', true);
    this.ui.updateSmartSearchHint(); // Reset to default hint text
  }

  testSnippetMatch(snippet) {
    // Test if a snippet exists on the page (for debugging)
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
    
    console.log('🔎 Searching for snippets in page text...');
    
    while (node = walker.nextNode()) {
      const text = node.textContent;
      
      for (let i = 0; i < snippets.length; i++) {
        const snippet = snippets[i];
        const snippetText = snippet.trim();
        if (snippetText.length < 10) continue; // Skip very short snippets (increased threshold)
        
        // Try exact match first (case-insensitive)
        let index = text.toLowerCase().indexOf(snippetText.toLowerCase());
        if (index !== -1) {
          console.log(`✅ Found exact match for snippet ${i + 1} in text node:`, `"${snippetText}"`);
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
                console.log(`✅ Found partial match for snippet ${i + 1} (${wordCount}/${words.length} words):`, `"${phrase}"`);
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
    
    console.log(`🎯 Total matches found: ${matches.length}`);
    
    // Sort matches by document order (TreeWalker already gives document order, but ensure consistency)
    matches.sort((a, b) => {
      const comparison = a.compareBoundaryPoints(Range.START_TO_START, b);
      return comparison;
    });
    
    return matches;
  }

  async toggleAIMode() {
    const aiMode = this.ui.toggleAIMode();
    
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
      
      // Debug current state
      console.log('🔍 Copy All Results Debug Info:');
      console.log('  - AI Mode:', this.ui.aiMode);
      console.log('  - Progressive Matches Length:', this.progressiveMatches.length);
      console.log('  - Regular Search Matches:', this.searchEngine.getMatches().length);
      console.log('  - Navigation Manager Has Matches:', this.navigationManager.hasMatches());
      
      // Check if we're in AI mode and have AI results, otherwise fall back to regular results
      if (this.ui.aiMode && this.progressiveMatches.length > 0) {
        // Extract text from AI mode matches (progressiveMatches)
        console.log('📋 Extracting from AI mode progressiveMatches...');
        const seen = new Set();
        this.progressiveMatches.forEach((range, index) => {
          try {
            const text = range.toString().trim();
            console.log(`  - Range ${index + 1}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            if (text && !seen.has(text.toLowerCase())) {
              results.push(text);
              seen.add(text.toLowerCase());
            }
          } catch (error) {
            console.warn(`  - Error extracting range ${index + 1}:`, error);
          }
        });
        console.log(`📋 Copying ${results.length} AI search results`);
      } else {
        // Use regular search engine results (works in both AI mode and regular mode)
        console.log('📋 Using regular search engine results...');
        results = this.searchEngine.getAllResultsText();
        console.log(`📋 Copying ${results.length} regular search results`);
      }
      
      console.log('📋 Final results array:', results);
      
      if (results.length === 0) {
        console.log('❌ No results found - showing "No results to copy" message');
        this.showCopyFeedback('No results to copy');
        return;
      }
      
      // Format results cleanly
      const formattedText = results.join('\n');
      
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
      console.warn('Failed to copy results:', error);
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
  
  hideFindBar() {
    this.isVisible = false;
    this.eventHandler.setVisibility(false);
    this.ui.hideFindBar();
    this.highlightManager.clearHighlights();
    this.ui.clearScrollIndicators(); // Ensure scroll indicators are cleared when hiding find bar
    this.navigationManager.reset();
    this.searchEngine.clear();
    
    // Clear badge
    chrome.runtime.sendMessage({ action: 'clearBadge' });
  }
  
  updateUI(current, total) {
    this.ui.updateStats(current, total);
    this.ui.updateButtonStates(this.navigationManager.hasMatches());
    this.ui.updateInputStyling(this.navigationManager.hasMatches());
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
    
    // In AI mode, don't auto-update - AI results are contextual and shouldn't change
    if (this.ui.aiMode) {
      console.log('🤖 Skipping incremental search in AI mode');
      return;
    }
    
    try {
      // Find only new matches without clearing existing highlights
      const newMatches = await this.searchEngine.findIncrementalMatches(term, this.ui.settings);
      
      if (newMatches.length > 0) {
        console.log(`✨ Found ${newMatches.length} new matches in dynamic content`);
        
        // Add new matches to existing ones
        const allMatches = [...this.searchEngine.getMatches(), ...newMatches];
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
        this.updateUI(position.current, allMatches.length);
      }
    } catch (error) {
      console.warn('Incremental search error:', error);
    }
  }
} 