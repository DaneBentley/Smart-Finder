/**
 * Event Handler - Manages all user interactions and keyboard shortcuts with performance optimizations
 */

export class EventHandler {
  constructor() {
    this.debounceTimer = null;
    this.isVisible = false;
    this.typingTimer = null;
    this.searchDelay = {
      normal: 100,  // Browser-like delay for normal searches
      heavy: 300,   // Longer delay for heavy searches (many results)
      typing: 50    // Very short delay while actively typing
    };
    this.lastSearchLength = 0;
  }
  
  bindEvents(ui, searchEngine, highlightManager, navigationManager, onSearch, onNavigate, onToggle, onClose, closeButton, onCopyResults, aiToggle, onToggleAI, storageManager = null, mainController = null) {
    this.navigationManager = navigationManager; // Store reference for Enter key logic
    this.storageManager = storageManager;
    this.mainController = mainController;
    this.bindInputEvents(ui, onSearch, onNavigate);
    this.bindNavigationEvents(ui, onNavigate);
    this.bindSettingsEvents(ui, searchEngine, onSearch, onCopyResults, onToggleAI);
    this.bindUIEvents(ui, onToggle, onClose, closeButton);
    this.bindAIEvents(aiToggle, onToggleAI);
    this.bindKeyboardShortcuts(onToggle, onClose);
    this.bindSelectionEvents(ui, onSearch);
  }
  
  bindInputEvents(ui, onSearch, onNavigate) {
    // Real-time search with adaptive debouncing
    ui.input.addEventListener('input', () => {
      this.handleSearchInput(ui, onSearch);
      // Immediately update styling for empty input in AI mode
      if (ui.aiMode && ui.input.value.trim().length === 0) {
        ui.updateInputStyling(false);
      }
    });
    
    // Handle typing indicators
    ui.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          onNavigate('previous');
        } else {
          // In AI mode, navigate if results exist, otherwise trigger AI search
          if (ui.aiMode) {
            // Check if there are existing search results to navigate through
            if (this.navigationManager && this.navigationManager.hasMatches()) {
              onNavigate('next');
            } else {
              onSearch(ui.input.value, true); // true = trigger AI search
            }
          } else {
            onNavigate('next');
          }
        }
      }
      // Note: Escape handling is now done globally in bindKeyboardShortcuts
    });
  }
  
  handleSearchInput(ui, onSearch) {
    const searchTerm = ui.input.value;
    
    // Clear existing timers
    clearTimeout(this.debounceTimer);
    clearTimeout(this.typingTimer);
    
    // We no longer show the typing indicator to prevent layout shifts
    
    // Determine debounce delay based on search characteristics
    let delay = this.searchDelay.normal;
    
    // Use longer delay for potentially heavy searches
    if (searchTerm.length > 0) {
      // Complex regex patterns or very short terms can be expensive
      if (ui.settings.useRegex || searchTerm.length <= 2) {
        delay = this.searchDelay.heavy;
      }
      // If the last search had many results, be more cautious
      if (this.lastSearchLength > 1000) {
        delay = this.searchDelay.heavy;
      }
    }
    
          this.debounceTimer = setTimeout(() => {
        clearTimeout(this.typingTimer);
        
        // Always save search query (including empty strings)
        this.saveLastSearch(searchTerm);
        
        // In AI mode, only do regular search to show placeholder message
        if (ui.aiMode) {
          onSearch(searchTerm, false); // false = no AI search yet
        } else {
          onSearch(searchTerm);
        }
      }, delay);
  }
  
  bindNavigationEvents(ui, onNavigate) {
    ui.prevButton.onclick = () => onNavigate('previous');
    ui.nextButton.onclick = () => onNavigate('next');
  }
  
  bindSettingsEvents(ui, searchEngine, onSearch, onCopyResults, onToggleAI) {
    const checkboxes = ui.settingsCheckboxes;
    
    // Case sensitivity
    checkboxes.caseSensitiveCheckbox.addEventListener('change', (e) => {
      ui.updateSettings({ ...ui.settings, caseSensitive: e.target.checked });
      this.saveSettings(ui.settings);
      if (ui.input.value) {
        onSearch(ui.input.value);
      }
    });
    
    // Regex mode
    checkboxes.regexCheckbox.addEventListener('change', (e) => {
      ui.updateSettings({ ...ui.settings, useRegex: e.target.checked });
      this.saveSettings(ui.settings);
      if (ui.input.value) {
        onSearch(ui.input.value);
      }
    });
    
    // Multi-term highlighting
    checkboxes.multiTermCheckbox.addEventListener('change', (e) => {
      ui.updateSettings({ ...ui.settings, multiTermHighlighting: e.target.checked });
      this.saveSettings(ui.settings);
      if (ui.input.value) {
        onSearch(ui.input.value);
      }
    });
    
    // AI mode toggle
    if (checkboxes.aiModeCheckbox && onToggleAI) {
      checkboxes.aiModeCheckbox.addEventListener('change', (e) => {
        onToggleAI();
        this.saveSettings(ui.settings);
      });
    }
    
    // Copy all results
    if (checkboxes.copyAllButton && onCopyResults) {
      checkboxes.copyAllButton.addEventListener('click', (e) => {
        e.preventDefault();
        onCopyResults();
      });
    }
  }
  
  bindUIEvents(ui, onToggle, onClose, closeButton) {
    // Settings dropdown toggle
    ui.statsElement.addEventListener('click', (e) => {
      e.stopPropagation();
      ui.toggleSettingsDropdown();
    });
    
    // Close settings dropdown when clicking outside or pressing Escape
    const closeSettingsHandler = (e) => {
      if (e.type === 'click') {
        if (!ui.settingsDropdown.contains(e.target) && !ui.statsElement.contains(e.target)) {
          ui.hideSettingsDropdown();
        }
      } else if (e.type === 'keydown' && e.key === 'Escape') {
        if (!ui.settingsDropdown.classList.contains('hidden')) {
          e.stopPropagation(); // Prevent closing the entire find bar
          ui.hideSettingsDropdown();
        }
      }
    };
    
    document.addEventListener('click', closeSettingsHandler);
    document.addEventListener('keydown', closeSettingsHandler);
    
    // Prevent settings dropdown clicks from closing it
    ui.settingsDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Close button
    closeButton.onclick = onClose;
  }

  bindAIEvents(aiToggle, onToggleAI) {
    if (aiToggle && onToggleAI) {
      aiToggle.addEventListener('click', (e) => {
        e.preventDefault();
        onToggleAI();
      });
    }
  }
  
  bindKeyboardShortcuts(onToggle, onClose) {
    document.addEventListener('keydown', (e) => {
      // Handle Ctrl+F/Cmd+F to open find bar (only when not visible)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !this.isVisible) {
        e.preventDefault();
        onToggle();
      }
      // Handle Escape to close find bar (when visible)
      else if (e.key === 'Escape' && this.isVisible) {
        e.preventDefault();
        onClose();
      }
    });
  }
  
  bindSelectionEvents(ui, onSearch) {
    // Removed automatic selection handling to prevent unwanted searches
    // when users select text on the page
  }
  
  setVisibility(visible) {
    this.isVisible = visible;
  }
  
  getVisibility() {
    return this.isVisible;
  }
  
  setLastSearchLength(length) {
    this.lastSearchLength = length;
  }
  
  async saveSettings(settings) {
    if (this.storageManager) {
      await this.storageManager.saveSettings(settings);
    }
  }
  
  async saveLastSearch(query) {
    if (this.storageManager) {
      await this.storageManager.saveLastSearch(query);
      // Update the main controller's cache if available
      if (this.mainController) {
        this.mainController.lastSearchQuery = query;
      }
    }
  }
  
  cleanup() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.typingTimer);
  }
} 