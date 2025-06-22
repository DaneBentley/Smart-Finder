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
    this.ui = ui; // Store reference for event target checking
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
    ui.input.addEventListener('input', (e) => {
      // Prevent event from bubbling to avoid interfering with website
      e.stopPropagation();
      
      this.handleSearchInput(ui, onSearch);
      
      // Update styling based on current input state in AI mode
      if (ui.aiMode) {
        // Update input styling to show/hide hints appropriately
        // This will be corrected by search results when they come in
        const hasInputText = ui.input.value.trim().length > 0;
        ui.updateInputStyling(false); // Assume no matches until search completes
      }
    });
    
    // Handle typing indicators
    ui.input.addEventListener('keydown', (e) => {
      // Prevent extension input events from bubbling to the website
      e.stopPropagation();
      
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
    
    // Also handle keyup to prevent bubbling
    ui.input.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });
    
    // Handle other input-related events to prevent interference
    ui.input.addEventListener('focus', (e) => {
      e.stopPropagation();
    });
    
    ui.input.addEventListener('blur', (e) => {
      e.stopPropagation();
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

    // Scroll indicators toggle
    checkboxes.scrollIndicatorsCheckbox.addEventListener('change', (e) => {
      ui.updateSettings({ ...ui.settings, showScrollIndicators: e.target.checked });
      this.saveSettings(ui.settings);
      if (ui.input.value) {
        onSearch(ui.input.value);
      }
    });
    
    // Copy all results
    if (checkboxes.copyAllButton && onCopyResults) {
      checkboxes.copyAllButton.addEventListener('click', (e) => {
        e.preventDefault();
        onCopyResults();
      });
    }
    
    // Help text
    if (checkboxes.helpText) {
      checkboxes.helpText.addEventListener('click', (e) => {
        e.preventDefault();
        this.openHelpPage();
      });
    }
  }
  
  bindUIEvents(ui, onToggle, onClose, closeButton) {
    // Settings row toggle
    ui.statsElement.addEventListener('click', (e) => {
      e.stopPropagation();
      ui.toggleSettingsDropdown();
    });
    
    // Close settings row when clicking outside or pressing Escape
    this.closeSettingsHandler = (e) => {
      if (e.type === 'click') {
        if (!ui.settingsRow.contains(e.target) && !ui.statsElement.contains(e.target)) {
          ui.hideSettingsDropdown();
        }
      } else if (e.type === 'keydown' && e.key === 'Escape') {
        // Only handle Escape if the settings dropdown is open AND the event is from within the extension
        if (!ui.settingsRow.classList.contains('hidden') && this.isEventFromExtension(e.target, ui)) {
          e.stopPropagation(); // Prevent closing the entire find bar
          ui.hideSettingsDropdown();
        }
      }
    };
    
    document.addEventListener('click', this.closeSettingsHandler);
    document.addEventListener('keydown', this.closeSettingsHandler);
    
    // Prevent settings row clicks from closing it
    ui.settingsRow.addEventListener('click', (e) => {
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
    this.keyboardShortcutHandler = (e) => {
      // Only handle keyboard shortcuts if the event is not from a website input element
      if (this.isEventFromWebsiteInput(e.target)) {
        return; // Let the website handle its own input events
      }
      
      // Handle Ctrl+F/Cmd+F to open find bar (only when not visible)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !this.isVisible) {
        e.preventDefault();
        onToggle();
      }
      // Handle Escape to close find bar (when visible and event is from extension or page content)
      else if (e.key === 'Escape' && this.isVisible) {
        // Only prevent default if this escape is meant to close our find bar
        // Don't interfere with website modals, dropdowns, etc.
        if (this.isEventFromExtension(e.target, this.ui) || !this.isEventFromWebsiteInput(e.target)) {
          e.preventDefault();
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', this.keyboardShortcutHandler);
  }
  
  // Helper method to check if an event originated from the extension's UI
  isEventFromExtension(target, ui) {
    if (!target || !ui) return false;
    
    // Check if the target is within the shadow root
    if (ui.shadowRoot && ui.shadowRoot.contains(target)) {
      return true;
    }
    
    // Check if the target is the shadow host
    if (ui.shadowHost && (target === ui.shadowHost || ui.shadowHost.contains(target))) {
      return true;
    }
    
    // Check if the target is part of scroll indicators (outside shadow DOM)
    if (ui.scrollIndicatorsContainer && ui.scrollIndicatorsContainer.contains(target)) {
      return true;
    }
    
    return false;
  }
  
  // Helper method to check if an event originated from a website input element
  isEventFromWebsiteInput(target) {
    if (!target) return false;
    
    // Check if the target is an input element that belongs to the website (not our extension)
    const inputElements = ['input', 'textarea', 'select'];
    const editableElements = target.isContentEditable || target.contentEditable === 'true';
    
    if (inputElements.includes(target.tagName?.toLowerCase()) || editableElements) {
      // Make sure it's not our extension's input
      if (this.ui && target === this.ui.input) {
        return false; // This is our extension's input
      }
      return true; // This is a website input
    }
    
    return false;
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
  
  openHelpPage() {
    // Open the help page in a new tab
    chrome.runtime.sendMessage({
      action: 'openHelpPage'
    });
  }
  
  cleanup() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.typingTimer);
    
    // Remove global event listeners to prevent memory leaks and interference
    if (this.closeSettingsHandler) {
      document.removeEventListener('click', this.closeSettingsHandler);
      document.removeEventListener('keydown', this.closeSettingsHandler);
    }
    
    if (this.keyboardShortcutHandler) {
      document.removeEventListener('keydown', this.keyboardShortcutHandler);
    }
  }
} 