/**
 * UI Manager - Handles creation and management of find bar interface
 */

export class UIManager {
  constructor() {
    this.findBar = null;
    this.input = null;
    this.statsElement = null;
    this.settingsDropdown = null;
    this.scrollIndicators = null;
    this.indicatorElements = [];
    this.prevButton = null;
    this.nextButton = null;
    this.shadowHost = null;
    this.shadowRoot = null;
    
    // Settings state
    this.caseSensitive = false;
    this.useRegex = false;
    this.multiTermHighlighting = false;
    this.aiMode = true;
  }
  
  createFindBar() {
    // Inject highlighting styles into main page head (needed for page content highlighting)
    this.injectHighlightStyles();
    
    // Create shadow host container
    this.shadowHost = document.createElement('div');
    this.shadowHost.style.cssText = `
      all: initial !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 0 !important;
      height: 0 !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    `;
    
    // Attach shadow root
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });
    
    // Inject CSS into shadow root
    const style = document.createElement('style');
    style.textContent = this.getIsolatedCSS();
    this.shadowRoot.appendChild(style);
    
    // Create main container inside shadow root
    this.findBar = document.createElement('div');
    this.findBar.className = 'chrome-find-clone-bar hidden';
    
    // AI mode (no longer in main bar, only in settings)
    this.aiMode = true;
    
    // Search input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'chrome-find-clone-input';
    this.input.placeholder = 'Find in page';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    
    // Match statistics (now clickable)
    this.statsElement = document.createElement('button');
    this.statsElement.className = 'chrome-find-clone-stats';
    this.statsElement.textContent = '0/0';
    this.statsElement.title = 'Settings';
    
    // Settings dropdown
    this.settingsCheckboxes = this.createSettingsDropdown();
    
    // Previous button
    this.prevButton = document.createElement('button');
    this.prevButton.className = 'chrome-find-clone-button';
    this.prevButton.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    this.prevButton.title = 'Previous (Shift+Enter)';
    
    // Next button
    this.nextButton = document.createElement('button');
    this.nextButton.className = 'chrome-find-clone-button';
    this.nextButton.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    this.nextButton.title = 'Next (Enter)';
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'chrome-find-clone-button chrome-find-clone-close';
    closeButton.innerHTML = '✕';
    closeButton.title = 'Close (Escape)';
    
    // Smart search hint
    this.smartSearchHint = document.createElement('div');
    this.smartSearchHint.className = 'chrome-find-clone-smart-search-hint hidden';
    this.smartSearchHint.textContent = 'Enter to smart search';

    // Assemble find bar
    this.findBar.appendChild(this.input);
    this.findBar.appendChild(this.statsElement);
    this.findBar.appendChild(this.settingsDropdown);
    this.findBar.appendChild(this.prevButton);
    this.findBar.appendChild(this.nextButton);
    this.findBar.appendChild(closeButton);
    this.findBar.appendChild(this.smartSearchHint);
    
    // Add to shadow root instead of document.body
    this.shadowRoot.appendChild(this.findBar);
    
    // Add shadow host to page
    document.body.appendChild(this.shadowHost);
    
    // Create scroll indicators container (outside shadow DOM for positioning)
    this.createScrollIndicators();
    
    // Update placeholder to reflect AI mode being enabled by default
    this.updateInputPlaceholder();
    
        return { closeButton };
  }

  injectHighlightStyles() {
    // Check if highlight styles are already injected
    if (document.getElementById('chrome-find-clone-highlight-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'chrome-find-clone-highlight-styles';
    style.textContent = this.getHighlightCSS();
    document.head.appendChild(style);
  }

  getHighlightCSS() {
    return `
      /* Chrome Find Clone - Highlight styles for page content */
      .chrome-find-clone-highlight {
        background: #ffff00 !important;
        color: #000 !important;
        transition: all 0.1s ease !important;
        position: relative !important;
        z-index: 1 !important;
      }

      .chrome-find-clone-highlight.current {
        background: #ff9632 !important;
        color: #000 !important;
      }

      /* Multi-term highlighting uses alternating colors for visual distinction */
      .chrome-find-clone-highlight.multi-term-1 {
        background: #ffff00 !important;
      }

      .chrome-find-clone-highlight.multi-term-2 {
        background: #90ee90 !important;
      }

      .chrome-find-clone-highlight.multi-term-3 {
        background: #ffc0cb !important;
      }

      .chrome-find-clone-highlight.multi-term-4 {
        background: #87ceeb !important;
      }

      .chrome-find-clone-highlight.multi-term-5 {
        background: #dda0dd !important;
      }

      /* Focused versions of multi-term colors - darker/more saturated */
      .chrome-find-clone-highlight.current.multi-term-1 {
        background: #ffcc00 !important; /* Darker yellow */
      }

      .chrome-find-clone-highlight.current.multi-term-2 {
        background: #4caf50 !important; /* Darker green */
      }

      .chrome-find-clone-highlight.current.multi-term-3 {
        background: #e91e63 !important; /* Darker pink */
      }

      .chrome-find-clone-highlight.current.multi-term-4 {
        background: #2196f3 !important; /* Darker blue */
      }

      .chrome-find-clone-highlight.current.multi-term-5 {
        background: #9c27b0 !important; /* Darker purple */
      }

      /* AI Highlight styles */
      .chrome-find-clone-highlight.ai-highlight {
        background: #e8f0fe !important;
        color: #1a73e8 !important;
        border: 1px solid #4285f4 !important;
        padding: 1px 2px !important;
      }

      .chrome-find-clone-highlight.ai-highlight.current {
        background: #4285f4 !important;
        color: white !important;
        border-color: #1a73e8 !important;
      }

      /* Scroll indicators styles (also applied to main page) */
      .chrome-find-clone-scroll-indicators {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        width: 16px !important;
        height: 100vh !important;
        z-index: 2147483646 !important;
        pointer-events: auto !important;
      }

      .chrome-find-clone-scroll-indicators.hidden {
        display: none !important;
      }

      .chrome-find-clone-indicator {
        position: absolute !important;
        right: 0 !important;
        width: 12px !important;
        height: 2px !important;
        background: #dd9211 !important;
        transform: translateY(-50%) !important;
        opacity: 0.9 !important;
        transition: all 0.1s ease !important;
        cursor: pointer !important;
      }

      .chrome-find-clone-indicator:hover {
        opacity: 1 !important;
        transform: translateY(-50%) scale(2) !important;
        background: #ff9800 !important;
      }

      .chrome-find-clone-indicator.current {
        background: #ff9800 !important;
        width: 32px !important;
        height: 3px !important;
        right: 0 !important;
        opacity: 1 !important;
      }

      /* Multi-term indicator colors - using the darker focused colors */
      .chrome-find-clone-indicator.multi-term-1 {
        background: #ffcc00 !important;
      }

      .chrome-find-clone-indicator.multi-term-2 {
        background: #4caf50 !important;
      }

      .chrome-find-clone-indicator.multi-term-3 {
        background: #e91e63 !important;
      }

      .chrome-find-clone-indicator.multi-term-4 {
        background: #2196f3 !important;
      }

      .chrome-find-clone-indicator.multi-term-5 {
        background: #9c27b0 !important;
      }

      /* AI search indicator styles */
      .chrome-find-clone-indicator.multi-term-ai {
        background: #4285f4 !important;
        width: 14px !important;
        height: 3px !important;
        border-radius: 0px !important;
      }

      .chrome-find-clone-indicator.multi-term-ai:hover {
        background: #1a73e8 !important;
        transform: translateY(-50%) scale(1.5) !important;
      }

      .chrome-find-clone-indicator.multi-term-ai.current {
        background: #1a73e8 !important;
        width: 36px !important;
        height: 4px !important;
        right: 0px !important;
      }
    `;
  }

  getIsolatedCSS() {
    // Return CSS without !important declarations since we're in Shadow DOM
    return `
      /* Chrome Find Clone - Shadow DOM Isolated Styles */
      .chrome-find-clone-bar {
        position: fixed;
        top: 5px;
        right: 5px;
        background: rgba(255, 255, 255);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 18px;
        box-shadow: 
          0 12px 40px rgba(0, 0, 0, 0.12),
          0 4px 12px rgba(0, 0, 0, 0.06);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 16px;
        padding: 8px 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 240px;
        max-width: 360px;
        pointer-events: auto;
      }

      @media (prefers-color-scheme: dark) {
        .chrome-find-clone-bar {
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.4),
            0 4px 12px rgba(0, 0, 0, 0.2);
        }
      }

      .chrome-find-clone-bar.settings-open {
        border-radius: 18px 18px 0 0;
        box-shadow: 
          0 4px 16px rgba(0, 0, 0, 0.08),
          0 1px 4px rgba(0, 0, 0, 0.04);
      }

      @media (prefers-color-scheme: dark) {
        .chrome-find-clone-bar.settings-open {
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.3),
            0 1px 4px rgba(0, 0, 0, 0.15);
        }
      }

      .chrome-find-clone-bar.hidden {
        transform: translateY(-120%);
        opacity: 0;
        pointer-events: none;
      }

      .chrome-find-clone-input {
        flex: 1;
        border: none;
        border-radius: 10px;
        padding: 8px 8px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        background: rgba(248, 249, 250);
        color: #1a1a1a;
        min-width: 120px;
      }

      .chrome-find-clone-input:focus {
        background: rgb(239, 239, 239);
      }

      .chrome-find-clone-input::placeholder {
        color: #666;
        font-weight: 400;
      }

      @media (prefers-color-scheme: dark) {
        .chrome-find-clone-input {
          background: rgba(50, 50, 50, 0.8);
          color: #e8eaed;
        }

        .chrome-find-clone-input:focus {
          background: rgba(60, 60, 60, 0.9);
        }

        .chrome-find-clone-input::placeholder {
          color: #9aa0a6;
        }
      }

      .chrome-find-clone-input.ai-ready {
        background: rgba(66, 133, 244, 0.15);
        border: none;
      }

      .chrome-find-clone-smart-search-hint {
        position: absolute;
        top: 100%;
        left: 16px;
        right: 16px;
        background: rgba(66, 133, 244, 0.95);
        color: white;
        font-size: 11px;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 0 0 12px 12px;
        text-align: center;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
      }

      .chrome-find-clone-smart-search-hint.hidden {
        display: none;
      }

      .chrome-find-clone-stats {
        color: #666;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        min-width: 44px;
        width: auto;
        max-width: 80px;
        text-align: center;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 8px;
        position: relative;
        margin: 0 2px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chrome-find-clone-stats:hover {
        background: rgba(0, 0, 0, 0.04);
        color: #1a1a1a;
      }

      .chrome-find-clone-stats:active {
        background: rgba(0, 0, 0, 0.08);
        transform: scale(0.96);
      }

      @media (prefers-color-scheme: dark) {
        .chrome-find-clone-stats {
          color: #9aa0a6;
        }

        .chrome-find-clone-stats:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #e8eaed;
        }

        .chrome-find-clone-stats:active {
          background: rgba(255, 255, 255, 0.12);
        }
      }

      .chrome-find-clone-stats.settings-active {
        background: rgba(66, 133, 244, 0.1);
        color: #1a73e8;
      }

      /* Search progress indicator - Three dot animation */
      .chrome-find-clone-stats.searching {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .chrome-find-clone-stats.searching::before {
        content: '';
        position: absolute;
        right: auto;
        left: calc(50% - 8px);
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background-color: #666;
        opacity: 0.4;
        animation: chrome-find-clone-dots 1.4s infinite;
      }

      .chrome-find-clone-stats.searching::after {
        content: '';
        position: absolute;
        right: auto;
        left: 50%;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background-color: #666;
        opacity: 0.4;
        animation: chrome-find-clone-dots 1.4s infinite;
        animation-delay: 0.2s;
        box-shadow: none;
      }

      .chrome-find-clone-stats.searching span.third-dot {
        position: absolute;
        right: auto;
        left: calc(50% + 8px);
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background-color: #666;
        opacity: 0.4;
        animation: chrome-find-clone-dots 1.4s infinite;
        animation-delay: 0.4s;
      }

      @keyframes chrome-find-clone-dots {
        0%, 80%, 100% { opacity: 0.4; }
        40% { opacity: 1; }
      }

      .chrome-find-clone-settings-dropdown {
        position: absolute;
        top: 100%;
        left: -1px;
        right: -1px;
        background: rgba(255, 255, 255);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-top: none;
        border-radius: 0 0 18px 18px;
        box-shadow: 
          0 4px 16px rgba(0, 0, 0, 0.08),
          0 2px 8px rgba(0, 0, 0, 0.04);
        padding: 8px;
        margin-top: -1px;
        font-size: 13px;
      }

      @media (prefers-color-scheme: dark) {
        .chrome-find-clone-settings-dropdown {
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-top: none;
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.3),
            0 2px 8px rgba(0, 0, 0, 0.15);
        }
      }

      .chrome-find-clone-settings-dropdown.hidden {
        display: none;
        pointer-events: none;
        visibility: hidden;
      }

      .chrome-find-clone-setting-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 2px;
        cursor: pointer;
        color: #1a1a1a;
        font-weight: 400;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        margin-bottom: 6px;
      }

      .chrome-find-clone-setting-option:last-of-type {
        border-bottom: none;
        margin-bottom: 0;
      }

      @media (prefers-color-scheme: dark) {
        .chrome-find-clone-setting-option {
          color: #e8eaed;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
      }

      .chrome-find-clone-checkbox {
        position: relative;
        width: 32px;
        height: 16px;
        background: #ccc;
        border-radius: 16px;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        margin: 0;
      }

      .chrome-find-clone-checkbox:checked {
        background: #1a73e8;
      }

      .chrome-find-clone-checkbox::before {
        content: '';
        position: absolute;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        background: white;
        transform: translateX(0);
      }

      .chrome-find-clone-checkbox:checked::before {
        transform: translateX(16px);
      }

      .chrome-find-clone-copy-all-button {
        display: block;
        width: 100%;
        padding: 6px;
        margin: 6px 0 0 0;
        border: 1px solid rgba(26, 115, 232, 0.2);
        border-radius: 10px;
        background: rgba(26, 115, 232, 0.04);
        color: #1a73e8;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        cursor: pointer;
        text-align: center;
      }

      .chrome-find-clone-copy-all-button:hover:not(:disabled) {
        background: rgba(26, 115, 232, 0.08);
        border-color: rgba(26, 115, 232, 0.3);
        transform: translateY(-1px);
      }

      .chrome-find-clone-copy-all-button:active:not(:disabled) {
        background: rgba(26, 115, 232, 0.12);
        border-color: rgba(26, 115, 232, 0.4);
        transform: translateY(0);
      }

      .chrome-find-clone-copy-all-button:disabled {
        background: rgba(0, 0, 0, 0.03);
        color: #ccc;
        cursor: default;
        border-color: rgba(0, 0, 0, 0.08);
        transform: none;
      }

      .chrome-find-clone-button {
        background: transparent;
        border: none;
        color: #666;
        cursor: pointer;
        font-size: 14px;
        padding: 6px;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        font-family: inherit;
        margin: 0 1px;
      }

      .chrome-find-clone-button:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1a1a1a;
        transform: scale(1.05);
      }

      .chrome-find-clone-button:active {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(0.95);
      }

      .chrome-find-clone-button:disabled {
        color: #ccc;
        cursor: default;
        transform: none;
      }

      .chrome-find-clone-button:disabled:hover {
        background: transparent;
        transform: none;
      }

      @media (prefers-color-scheme: dark) {
        .chrome-find-clone-button {
          color: #9aa0a6;
        }

        .chrome-find-clone-button:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #e8eaed;
        }

        .chrome-find-clone-button:active {
          background: rgba(255, 255, 255, 0.12);
        }

        .chrome-find-clone-button:disabled {
          color: #5f6368;
        }
      }

      .chrome-find-clone-close {
        color: #666;
        font-size: 14px;
      }

      .chrome-find-clone-close:hover {
        background: rgba(234, 67, 53, 0.1);
        color: #ea4335;
      }
    `;
  }
  
  createSettingsDropdown() {
    this.settingsDropdown = document.createElement('div');
    this.settingsDropdown.className = 'chrome-find-clone-settings-dropdown hidden';
    
    // Case sensitivity option
    const caseSensitiveOption = this.createSettingOption('Match case', this.caseSensitive);
    this.settingsDropdown.appendChild(caseSensitiveOption.element);
    
    // Regex option
    const regexOption = this.createSettingOption('Use regex', this.useRegex);
    this.settingsDropdown.appendChild(regexOption.element);
    
    // Multi-term highlighting option
    const multiTermOption = this.createSettingOption('Highlight multiple terms', this.multiTermHighlighting);
    this.settingsDropdown.appendChild(multiTermOption.element);
    
    // AI mode option
    const aiModeOption = this.createSettingOption('AI search mode', this.aiMode);
    this.settingsDropdown.appendChild(aiModeOption.element);
    
    // Copy all results option (button, not checkbox)
    const copyAllOption = this.createCopyAllOption();
    this.settingsDropdown.appendChild(copyAllOption);
    
    return {
      caseSensitiveCheckbox: caseSensitiveOption.checkbox,
      regexCheckbox: regexOption.checkbox,
      multiTermCheckbox: multiTermOption.checkbox,
      aiModeCheckbox: aiModeOption.checkbox,
      copyAllButton: copyAllOption
    };
  }
  
  createSettingOption(labelText, checked) {
    const option = document.createElement('label');
    option.className = 'chrome-find-clone-setting-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'chrome-find-clone-checkbox';
    checkbox.checked = checked;
    
    const label = document.createElement('span');
    label.textContent = labelText;
    
    option.appendChild(checkbox);
    option.appendChild(label);
    
    return { element: option, checkbox };
  }
  
  createCopyAllOption() {
    const button = document.createElement('button');
    button.className = 'chrome-find-clone-copy-all-button';
    button.textContent = 'Copy all results';
    button.title = 'Copy all highlighted results to clipboard';
    button.disabled = true; // Initially disabled
    
    return button;
  }
  
  createScrollIndicators() {
    this.scrollIndicators = document.createElement('div');
    this.scrollIndicators.className = 'chrome-find-clone-scroll-indicators hidden';
    document.body.appendChild(this.scrollIndicators);
  }
  
  showFindBar() {
    this.findBar.classList.remove('hidden');
    
    // Removed automatic pre-filling with selected text to prevent unwanted searches
    
    this.input.focus();
    this.input.select();
  }
  
  hideFindBar() {
    this.findBar.classList.add('hidden');
    this.hideSettingsDropdown();
    this.clearScrollIndicators();
    this.input.value = '';
    
    // Clear input styling
    this.input.classList.remove('ai-ready');
    this.smartSearchHint.classList.add('hidden');
  }
  
  toggleSettingsDropdown() {
    if (this.settingsDropdown.classList.contains('hidden')) {
      this.showSettingsDropdown();
    } else {
      this.hideSettingsDropdown();
    }
  }
  
  showSettingsDropdown() {
    this.settingsDropdown.classList.remove('hidden');
    this.findBar.classList.add('settings-open');
    this.statsElement.classList.add('settings-active');
  }
  
  hideSettingsDropdown() {
    this.settingsDropdown.classList.add('hidden');
    this.findBar.classList.remove('settings-open');
    this.statsElement.classList.remove('settings-active');
  }
  
  updateInputPlaceholder() {
    if (this.aiMode) {
      this.input.placeholder = 'Ask AI about this page...';
    } else if (this.useRegex && this.multiTermHighlighting) {
      this.input.placeholder = 'Find in page (multiple regex - QUOTE complex patterns with spaces)';
    } else if (this.useRegex) {
      this.input.placeholder = 'Find in page (regex)';
    } else if (this.multiTermHighlighting) {
      this.input.placeholder = 'Find in page (multiple terms, use quotes or ? for phrases)';
    } else {
      this.input.placeholder = 'Find in page';
    }
  }

  toggleAIMode() {
    this.aiMode = !this.aiMode;
    this.aiToggle.classList.toggle('active', this.aiMode);
    this.updateInputPlaceholder();
    return this.aiMode;
  }

  updateInputStyling(hasMatches = false) {
    // Apply AI-ready styling when in AI mode, has input text, and no matches exist
    // (meaning Enter would trigger AI search)
    const hasInputText = this.input.value.trim().length > 0;
    if (this.aiMode && hasInputText && !hasMatches) {
      this.input.classList.add('ai-ready');
      this.smartSearchHint.classList.remove('hidden');
    } else {
      this.input.classList.remove('ai-ready');
      this.smartSearchHint.classList.add('hidden');
    }
  }
  
  // Update smart search hint text (for showing "No results" after AI search)
  updateSmartSearchHint(text = 'Enter to smart search') {
    this.smartSearchHint.textContent = text;
  }
  
  updateStats(current, total) {
    // Remove searching class and any loading dots
    this.statsElement.classList.remove('searching');
    const thirdDot = this.statsElement.querySelector('.third-dot');
    if (thirdDot) {
      this.statsElement.removeChild(thirdDot);
    }
    
    // Clear any stored original text
    delete this.statsElement.dataset.originalText;
    
    if (total === 0) {
      this.statsElement.textContent = '0/0';
      this.settingsCheckboxes.copyAllButton.disabled = true;
    } else {
      this.statsElement.textContent = `${current}/${total}`;
      this.settingsCheckboxes.copyAllButton.disabled = false;
    }
    
    // Update extension badge
    chrome.runtime.sendMessage({
      action: 'updateBadge',
      current: current,
      total: total
    });
  }
  
  setSearchProgress(message, isSearching = false) {
    if (isSearching) {
      // Store the current text to restore it later
      if (!this.statsElement.dataset.originalText) {
        this.statsElement.dataset.originalText = this.statsElement.textContent;
      }
      
      // Clear the text content to make room for the dots
      this.statsElement.textContent = '';
      this.statsElement.classList.add('searching');
      
      // Create third dot element if it doesn't exist
      if (!this.statsElement.querySelector('.third-dot')) {
        const thirdDot = document.createElement('span');
        thirdDot.className = 'third-dot';
        this.statsElement.appendChild(thirdDot);
      }
    } else {
      // Restore the original text
      if (this.statsElement.dataset.originalText) {
        this.statsElement.textContent = this.statsElement.dataset.originalText;
        delete this.statsElement.dataset.originalText;
      }
      
      this.statsElement.classList.remove('searching');
      
      // Remove third dot element if it exists
      const thirdDot = this.statsElement.querySelector('.third-dot');
      if (thirdDot) {
        this.statsElement.removeChild(thirdDot);
      }
    }
  }

  showSearchCancelled() {
    // Restore the original text
    if (this.statsElement.dataset.originalText) {
      this.statsElement.textContent = this.statsElement.dataset.originalText;
      delete this.statsElement.dataset.originalText;
    }
    
    this.statsElement.classList.remove('searching');
    
    // Remove third dot element if it exists
    const thirdDot = this.statsElement.querySelector('.third-dot');
    if (thirdDot) {
      this.statsElement.removeChild(thirdDot);
    }
  }
  
  updateButtonStates(hasMatches) {
    this.prevButton.disabled = !hasMatches;
    this.nextButton.disabled = !hasMatches;
    
    // Update copy all button state if it exists
    if (this.settingsCheckboxes && this.settingsCheckboxes.copyAllButton) {
      this.settingsCheckboxes.copyAllButton.disabled = !hasMatches;
    }
  }
  
  // Note: setInputError method no longer used - removed pessimistic red error styling
  
  updateScrollIndicators(matches, currentIndex, termToColorMap, caseSensitive, onIndicatorClick, useRegex = false) {
    this.clearScrollIndicators();
    
    if (matches.length === 0) {
      this.scrollIndicators.classList.add('hidden');
      return;
    }
    
    this.scrollIndicators.classList.remove('hidden');
    
    // Get document height
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    // Create indicators for each match
    matches.forEach((range, index) => {
      try {
        const rect = range.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const elementTop = rect.top + scrollTop;
        const percentage = (elementTop / documentHeight) * 100;
        
        const indicator = document.createElement('div');
        indicator.className = 'chrome-find-clone-indicator';
        
        // Add multi-term color class if applicable
        if (termToColorMap) {
          let colorIndex = null;
          
          // Handle AI search case
          if (termToColorMap.ai) {
            colorIndex = 'ai';
            console.log('🎯 Creating AI scroll indicator at', percentage.toFixed(1) + '%');
          } else if (useRegex && range._regexPattern !== undefined) {
            // For regex patterns, use the pattern index
            colorIndex = (range._patternIndex % 5) + 1;
          } else if (range.toString()) {
            // For text matching, find the matching term
            const matchText = caseSensitive ? range.toString() : range.toString().toLowerCase();
            for (const [term, termColorIndex] of termToColorMap) {
              const searchTerm = caseSensitive ? term : term.toLowerCase();
              if (matchText === searchTerm) {
                colorIndex = termColorIndex;
                break;
              }
            }
          }
          
          if (colorIndex) {
            indicator.classList.add(`multi-term-${colorIndex}`);
          }
        }
        
        if (index === currentIndex) {
          indicator.classList.add('current');
        }
        
        indicator.style.top = `${percentage}%`;
        indicator.addEventListener('click', () => onIndicatorClick(index));
        
        this.scrollIndicators.appendChild(indicator);
        this.indicatorElements.push(indicator);
      } catch (error) {
        console.warn('Could not create scroll indicator:', error);
      }
    });
  }
  
  clearScrollIndicators() {
    this.indicatorElements.forEach(indicator => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    });
    this.indicatorElements = [];
    this.scrollIndicators.classList.add('hidden');
  }
  
  updateCurrentIndicator(currentIndex) {
    this.indicatorElements.forEach((indicator, index) => {
      if (index === currentIndex) {
        indicator.classList.add('current');
      } else {
        indicator.classList.remove('current');
      }
    });
  }
  
  // Getters for settings
  get settings() {
    return {
      caseSensitive: this.caseSensitive,
      useRegex: this.useRegex,
      multiTermHighlighting: this.multiTermHighlighting,
      aiMode: this.aiMode
    };
  }
  
  // Setters for settings
  updateSettings(settings) {
    this.caseSensitive = settings.caseSensitive;
    this.useRegex = settings.useRegex;
    this.multiTermHighlighting = settings.multiTermHighlighting;
    if (settings.aiMode !== undefined) {
      this.aiMode = settings.aiMode;
    }
    this.updateInputPlaceholder();
    this.updateCheckboxStates();
  }
  
  // Update checkbox states to match current settings
  updateCheckboxStates() {
    if (this.settingsCheckboxes) {
      this.settingsCheckboxes.caseSensitiveCheckbox.checked = this.caseSensitive;
      this.settingsCheckboxes.regexCheckbox.checked = this.useRegex;
      this.settingsCheckboxes.multiTermCheckbox.checked = this.multiTermHighlighting;
      this.settingsCheckboxes.aiModeCheckbox.checked = this.aiMode;
    }
  }
  
  // Set the last search query (but don't trigger search)
  setLastSearch(query) {
    if (this.input) {
      this.input.value = query;
    }
  }
  
  // Cleanup method
  destroy() {
    this.clearScrollIndicators();
    
    // Clean up shadow DOM
    if (this.shadowHost && this.shadowHost.parentNode) {
      this.shadowHost.parentNode.removeChild(this.shadowHost);
    }
    
    // Clean up injected highlight styles
    const highlightStyles = document.getElementById('chrome-find-clone-highlight-styles');
    if (highlightStyles && highlightStyles.parentNode) {
      highlightStyles.parentNode.removeChild(highlightStyles);
    }
    
    if (this.scrollIndicators && this.scrollIndicators.parentNode) {
      this.scrollIndicators.parentNode.removeChild(this.scrollIndicators);
    }
    
    this.findBar = null;
    this.input = null;
    this.statsElement = null;
    this.settingsDropdown = null;
    this.scrollIndicators = null;
    this.indicatorElements = [];
    this.prevButton = null;
    this.nextButton = null;
    this.settingsCheckboxes = null;
    this.shadowHost = null;
    this.shadowRoot = null;
  }
  
  // Check if find bar is visible
  get isVisible() {
    return this.findBar && !this.findBar.classList.contains('hidden');
  }
} 