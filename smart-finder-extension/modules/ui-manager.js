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
    this.hintTimeout = null;
    this.hintDelayTimeout = null;
    
    // Restriction notification properties
    this.restrictionNotification = null;
    this.restrictionTimeout = null;
    
    // Settings state
    this.caseSensitive = false;
    this.useRegex = true;
    this.multiTermHighlighting = false;
    this.aiMode = true;
    this.showScrollIndicators = true;
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
    this.findBar.className = 'smart-finder-bar hidden';
    
    // AI mode (no longer in main bar, only in settings)
    this.aiMode = true;
    
    // Search input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'smart-finder-input';
    this.input.placeholder = 'Find in page';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    
    // Match statistics (now clickable)
    this.statsElement = document.createElement('button');
    this.statsElement.className = 'smart-finder-stats';
    this.statsElement.textContent = '0/0';
    this.statsElement.title = 'Settings';
    
    // Previous button
    this.prevButton = document.createElement('button');
    this.prevButton.className = 'smart-finder-button';
    // Use safer DOM manipulation instead of innerHTML
    const prevSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    prevSvg.setAttribute('width', '36');
    prevSvg.setAttribute('height', '36');
    prevSvg.setAttribute('viewBox', '0 0 24 24');
    prevSvg.setAttribute('fill', 'none');
    prevSvg.setAttribute('stroke', 'currentColor');
    prevSvg.setAttribute('stroke-width', '2');
    const prevPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    prevPolyline.setAttribute('points', '18 15 12 9 6 15');
    prevSvg.appendChild(prevPolyline);
    this.prevButton.appendChild(prevSvg);
    this.prevButton.title = 'Previous (Shift+Enter)';
    
    // Next button
    this.nextButton = document.createElement('button');
    this.nextButton.className = 'smart-finder-button';
    // Use safer DOM manipulation instead of innerHTML
    const nextSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    nextSvg.setAttribute('width', '36');
    nextSvg.setAttribute('height', '36');
    nextSvg.setAttribute('viewBox', '0 0 24 24');
    nextSvg.setAttribute('fill', 'none');
    nextSvg.setAttribute('stroke', 'currentColor');
    nextSvg.setAttribute('stroke-width', '2');
    const nextPolyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    nextPolyline.setAttribute('points', '6 9 12 15 18 9');
    nextSvg.appendChild(nextPolyline);
    this.nextButton.appendChild(nextSvg);
    this.nextButton.title = 'Next (Enter)';
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'smart-finder-button smart-finder-close';
    closeButton.textContent = '✕';
    closeButton.title = 'Close (Escape)';

    // Create toolbar row container
    const toolbarRow = document.createElement('div');
    toolbarRow.className = 'smart-finder-toolbar-row';

    // Assemble toolbar row
    toolbarRow.appendChild(this.input);
    toolbarRow.appendChild(this.statsElement);
    toolbarRow.appendChild(this.prevButton);
    toolbarRow.appendChild(this.nextButton);
    toolbarRow.appendChild(closeButton);
    
    // Settings row (inline settings)
    this.settingsRow = this.createSettingsRow();
    
    // Smart search hint
    this.smartSearchHint = document.createElement('div');
    this.smartSearchHint.className = 'smart-finder-smart-search-hint hidden';
    this.smartSearchHint.textContent = 'Press Enter for smart search';
    
    // Restriction notification
    this.restrictionNotification = document.createElement('div');
    this.restrictionNotification.className = 'smart-finder-restriction-notification hidden';
    
    // Assemble find bar
    this.findBar.appendChild(toolbarRow);
    this.findBar.appendChild(this.settingsRow);
    this.findBar.appendChild(this.smartSearchHint);
    this.findBar.appendChild(this.restrictionNotification);
    
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
    if (document.getElementById('smart-finder-highlight-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'smart-finder-highlight-styles';
    style.textContent = this.getHighlightCSS();
    document.head.appendChild(style);
  }

  getHighlightCSS() {
    return `
              /* SmartFinder - Highlight styles for page content */
      .smart-finder-highlight {
        background: #ffff99 !important; /* Lighter yellow */
        color: #000 !important;
        transition: all 0.1s ease !important;
        position: relative !important;
        z-index: 1 !important;
      }

      .smart-finder-highlight.current {
        background: #ffb366 !important; /* Lighter orange */
        color: #000 !important;
      }

      /* Multi-term highlighting uses alternating colors for visual distinction */
      .smart-finder-highlight.multi-term-1 {
        background: #ffff99 !important; /* Lighter yellow */
      }

      .smart-finder-highlight.multi-term-2 {
        background: #b8f4b8 !important; /* Lighter green */
      }

      .smart-finder-highlight.multi-term-3 {
        background: #ffd1d9 !important; /* Lighter pink */
      }

      .smart-finder-highlight.multi-term-4 {
        background: #b3e0f2 !important; /* Lighter blue */
      }

      .smart-finder-highlight.multi-term-5 {
        background: #e6b3e6 !important; /* Lighter purple */
      }

      /* Focused versions of multi-term colors - slightly darker but still pastel */
      .smart-finder-highlight.current.multi-term-1 {
        background: #ffeb99 !important; /* Focused yellow */
      }

      .smart-finder-highlight.current.multi-term-2 {
        background: #88cc88 !important; /* Focused green */
      }

      .smart-finder-highlight.current.multi-term-3 {
        background: #ff99b3 !important; /* Focused pink */
      }

      .smart-finder-highlight.current.multi-term-4 {
        background: #66b3e6 !important; /* Focused blue */
      }

      .smart-finder-highlight.current.multi-term-5 {
        background: #cc99cc !important; /* Focused purple */
      }

      /* AI Highlight styles */
      .smart-finder-highlight.ai-highlight {
        background: #e8f0fe !important;
        color: #1a73e8 !important;
        border: 1px solid #4285f4 !important;
        border-radius: 3px !important;
        padding: 1px 2px !important;
      }

      .smart-finder-highlight.ai-highlight.current {
        background: #4285f4 !important;
        color: white !important;
        border-color: #1a73e8 !important;
      }

      /* Scroll indicators styles (also applied to main page) */
      .smart-finder-scroll-indicators {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        width: 16px !important;
        height: 100vh !important;
        z-index: 2147483646 !important;
        pointer-events: auto !important;
      }

      .smart-finder-scroll-indicators.hidden {
        display: none !important;
      }

      .smart-finder-indicator {
        position: absolute !important;
        right: 0 !important;
        width: 12px !important;
        height: 2px !important;
        background: #dd9211 !important;
        border-radius: 0px !important;
        transform: translateY(-50%) !important;
        opacity: 0.9 !important;
        transition: all 0.1s ease !important;
        cursor: pointer !important;
      }

      .smart-finder-indicator:hover {
        opacity: 1 !important;
        transform: translateY(-50%) scale(2) !important;
        background: #ff9800 !important;
      }

      .smart-finder-indicator.current {
        background: #ff9800 !important;
        width: 32px !important;
        height: 3px !important;
        right: 0 !important;
        opacity: 1 !important;
      }

      /* Multi-term indicator colors - using the darker focused colors */
      .smart-finder-indicator.multi-term-1 {
        background: #ffcc00 !important;
      }

      .smart-finder-indicator.multi-term-2 {
        background: #4caf50 !important;
      }

      .smart-finder-indicator.multi-term-3 {
        background: #e91e63 !important;
      }

      .smart-finder-indicator.multi-term-4 {
        background: #2196f3 !important;
      }

      .smart-finder-indicator.multi-term-5 {
        background: #9c27b0 !important;
      }

      /* AI search indicator styles */
      .smart-finder-indicator.multi-term-ai {
        background: #4285f4 !important;
        width: 14px !important;
        height: 3px !important;
        border-radius: 0px !important;
      }

      .smart-finder-indicator.multi-term-ai:hover {
        background: #1a73e8 !important;
        transform: translateY(-50%) scale(1.5) !important;
      }

      .smart-finder-indicator.multi-term-ai.current {
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
              /* SmartFinder - Shadow DOM Isolated Styles */
      .smart-finder-bar {
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
        display: block;
        min-width: 320px;
        max-width: 380px;
        width: 340px;
        pointer-events: auto;
      }

      .smart-finder-toolbar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
      }

      .smart-finder-smart-search-hint {
        width: 100%;
        font-size: 10px;
        font-weight: 400;
        padding: 4px 8px 0px;
        text-align: left;
        color: #888;
        margin-top: 2px;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.8;
      }

      .smart-finder-smart-search-hint.hidden {
        display: none;
      }

      .smart-finder-restriction-notification {
        width: 100%;
        font-size: 11px;
        font-weight: 400;
        padding: 6px 8px;
        text-align: left;
        color: #d93025;
        background: rgba(234, 67, 53, 0.1);
        border: 1px solid rgba(234, 67, 53, 0.2);
        border-radius: 8px;
        margin-top: 4px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: space-between;
        line-height: 1.3;
      }

      .smart-finder-restriction-notification.hidden {
        display: none;
      }

      .smart-finder-restriction-notification .dismiss-button {
        background: none;
        border: none;
        color: #d93025;
        cursor: pointer;
        font-size: 14px;
        padding: 0 4px;
        margin-left: 8px;
        border-radius: 4px;
        line-height: 1;
        flex-shrink: 0;
      }

      .smart-finder-restriction-notification .dismiss-button:hover {
        background: rgba(234, 67, 53, 0.1);
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-bar {
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.4),
            0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .smart-finder-smart-search-hint {
          color: #9aa0a6;
        }

        .smart-finder-restriction-notification {
          color: #f28b82;
          background: rgba(244, 67, 54, 0.15);
          border: 1px solid rgba(244, 67, 54, 0.25);
        }

        .smart-finder-restriction-notification .dismiss-button {
          color: #f28b82;
        }

        .smart-finder-restriction-notification .dismiss-button:hover {
          background: rgba(244, 67, 54, 0.2);
        }
      }

      .smart-finder-bar.settings-open {
        border-radius: 18px;
        box-shadow: 
          0 4px 16px rgba(0, 0, 0, 0.08),
          0 1px 4px rgba(0, 0, 0, 0.04);
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-bar.settings-open {
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.3),
            0 1px 4px rgba(0, 0, 0, 0.15);
        }
      }

      .smart-finder-bar.hidden {
        transform: translateY(-120%);
        opacity: 0;
        pointer-events: none;
      }

      .smart-finder-input {
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

      .smart-finder-input:focus {
        background: rgb(239, 239, 239);
      }

      .smart-finder-input::placeholder {
        color: #666;
        font-weight: 400;
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-input {
          background: rgba(50, 50, 50, 0.8);
          color: #e8eaed;
        }

        .smart-finder-input:focus {
          background: rgba(60, 60, 60, 0.9);
        }

        .smart-finder-input::placeholder {
          color: #9aa0a6;
        }
      }

      .smart-finder-input.ai-ready {
        background: rgba(66, 133, 244, 0.15);
        border: none;
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-input.ai-ready {
          background: rgba(66, 133, 244, 0.25);
        }
      }

      .smart-finder-stats {
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

      .smart-finder-stats:hover {
        background: rgba(0, 0, 0, 0.04);
        color: #1a1a1a;
      }

      .smart-finder-stats:active {
        background: rgba(0, 0, 0, 0.08);
        transform: scale(0.96);
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-stats {
          color: #9aa0a6;
        }

        .smart-finder-stats:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #e8eaed;
        }

        .smart-finder-stats:active {
          background: rgba(255, 255, 255, 0.12);
        }
      }

      .smart-finder-stats.searching {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .smart-finder-stats.searching::before {
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
        animation: smart-finder-dots 1.4s infinite;
      }

      .smart-finder-stats.searching::after {
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
        animation: smart-finder-dots 1.4s infinite;
        animation-delay: 0.2s;
        box-shadow: none;
      }

      .smart-finder-stats.searching span.third-dot {
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
        animation: smart-finder-dots 1.4s infinite;
        animation-delay: 0.4s;
      }

      @keyframes smart-finder-dots {
        0%, 80%, 100% { opacity: 0.4; }
        40% { opacity: 1; }
      }

      .smart-finder-settings-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 8px 4px 4px 4px;
        border-top: 1px solid rgba(0, 0, 0, 0.06);
        margin-top: 8px;
        transition: all 0.2s ease;
        border-radius: 0 0 18px 18px;
      }

      .smart-finder-settings-row.hidden {
        display: none;
      }

      .smart-finder-settings-row .smart-finder-copy-all-button {
        grid-column: 1 / -1;
        margin-top: 4px;
      }

      .smart-finder-settings-row .smart-finder-help-text {
        grid-column: 1 / -1;
        margin-top: 8px;
        text-align: center;
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-settings-row {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
      }

      .smart-finder-setting-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        cursor: pointer;
        color: #1a1a1a;
        font-weight: 400;
        font-size: 12px;
        border-radius: 8px;
        transition: background-color 0.15s ease;
        user-select: none;
        position: relative;
      }

      .smart-finder-setting-option:hover {
        background: rgba(0, 0, 0, 0.04);
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-setting-option {
          color: #e8eaed;
        }

        .smart-finder-setting-option:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .smart-finder-checkbox {
          background: rgba(255, 255, 255, 0.12);
        }

        .smart-finder-checkbox:checked {
          background: #8ab4f8;
        }

        .smart-finder-checkbox::before {
          background: #e8eaed;
        }

        .smart-finder-copy-all-button {
          background: rgba(138, 180, 248, 0.08);
          border-color: rgba(138, 180, 248, 0.2);
          color: #8ab4f8;
        }

        .smart-finder-copy-all-button:hover:not(:disabled) {
          background: rgba(138, 180, 248, 0.12);
          border-color: rgba(138, 180, 248, 0.3);
        }

        .smart-finder-copy-all-button:active:not(:disabled) {
          background: rgba(138, 180, 248, 0.16);
          border-color: rgba(138, 180, 248, 0.4);
        }

        .smart-finder-copy-all-button:disabled {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .smart-finder-help-text {
          color: #9aa0a6;
        }

        .smart-finder-help-text:hover {
          color: #8ab4f8;
          text-decoration-color: #8ab4f8;
        }

        .smart-finder-help-text:active {
          color: #aecbfa;
        }
      }

      .smart-finder-checkbox {
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

      .smart-finder-checkbox:checked {
        background: #1a73e8;
      }

      .smart-finder-checkbox::before {
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

      .smart-finder-checkbox:checked::before {
        transform: translateX(16px);
      }

      .smart-finder-copy-all-button {
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

      .smart-finder-copy-all-button:hover:not(:disabled) {
        background: rgba(26, 115, 232, 0.08);
        border-color: rgba(26, 115, 232, 0.3);
        transform: translateY(-1px);
      }

      .smart-finder-copy-all-button:active:not(:disabled) {
        background: rgba(26, 115, 232, 0.12);
        border-color: rgba(26, 115, 232, 0.4);
        transform: translateY(0);
      }

      .smart-finder-copy-all-button:disabled {
        background: rgba(0, 0, 0, 0.03);
        color: #ccc;
        cursor: default;
        border-color: rgba(0, 0, 0, 0.08);
        transform: none;
      }

      .smart-finder-help-text {
        display: block;
        color: #666;
        font-size: 11px;
        font-family: inherit;
        font-weight: 400;
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: transparent;
        transition: all 0.2s ease;
        opacity: 0.7;
      }

      .smart-finder-help-text:hover {
        color: #1a73e8;
        text-decoration-color: #1a73e8;
        opacity: 1;
      }

      .smart-finder-help-text:active {
        color: #1557b0;
      }

      .smart-finder-button {
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

      .smart-finder-button:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #1a1a1a;
        transform: scale(1.05);
      }

      .smart-finder-button:active {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(0.95);
      }

      .smart-finder-button:disabled {
        color: #ccc;
        cursor: default;
        transform: none;
      }

      .smart-finder-button:disabled:hover {
        background: transparent;
        transform: none;
      }

      @media (prefers-color-scheme: dark) {
        .smart-finder-button {
          color: #9aa0a6;
        }

        .smart-finder-button:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #e8eaed;
        }

        .smart-finder-button:active {
          background: rgba(255, 255, 255, 0.12);
        }

        .smart-finder-button:disabled {
          color: #5f6368;
        }
      }

      .smart-finder-close {
        color: #666;
        font-size: 14px;
      }

      .smart-finder-close:hover {
        background: rgba(234, 67, 53, 0.1);
        color: #ea4335;
      }
    `;
  }
  
  createSettingsRow() {
    this.settingsRow = document.createElement('div');
    this.settingsRow.className = 'smart-finder-settings-row hidden';
    
    // AI mode option (first position) - using text icon
    const aiModeOption = this.createSettingOption('Smart Search', this.aiMode, 'Use AI to find relevant content intelligently');
    this.settingsRow.appendChild(aiModeOption.element);
    
    // Case sensitivity option - using Aa icon
    const caseSensitiveOption = this.createSettingOption('Aa Match Case', this.caseSensitive, 'Distinguish between uppercase and lowercase letters');
    this.settingsRow.appendChild(caseSensitiveOption.element);
    
    // Regex option - using .* icon
    const regexOption = this.createSettingOption('Regular Expression', this.useRegex, 'Use regular expression patterns for advanced search');
    this.settingsRow.appendChild(regexOption.element);
    
    // Multi-term highlighting option - clearer naming
    const multiTermOption = this.createSettingOption('Multiple Terms', this.multiTermHighlighting, 'Highlight different search terms with different colors');
    this.settingsRow.appendChild(multiTermOption.element);
    
    // Scroll indicators option - using text description
    const scrollIndicatorsOption = this.createSettingOption('Scrollbar Highlights', this.showScrollIndicators, 'Show match locations on the scrollbar');
    this.settingsRow.appendChild(scrollIndicatorsOption.element);
    
    // Copy all results option (button, not checkbox)
    const copyAllOption = this.createCopyAllOption();
    this.settingsRow.appendChild(copyAllOption);
    
    // Help button (button, not checkbox)
    const helpOption = this.createHelpOption();
    this.settingsRow.appendChild(helpOption);
    
    this.settingsCheckboxes = {
      aiModeCheckbox: aiModeOption.checkbox,
      caseSensitiveCheckbox: caseSensitiveOption.checkbox,
      regexCheckbox: regexOption.checkbox,
      multiTermCheckbox: multiTermOption.checkbox,
      scrollIndicatorsCheckbox: scrollIndicatorsOption.checkbox,
      copyAllButton: copyAllOption,
      helpText: helpOption
    };
    
    return this.settingsRow;
  }

  createSettingOption(labelText, checked, tooltipText) {
    const option = document.createElement('label');
    option.className = 'smart-finder-setting-option';
    if (tooltipText) {
      option.title = tooltipText;
    }
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'smart-finder-checkbox';
    checkbox.checked = checked;
    
    const label = document.createElement('span');
    label.textContent = labelText;
    
    option.appendChild(checkbox);
    option.appendChild(label);
    
    return { element: option, checkbox };
  }
  
  createCopyAllOption() {
    const button = document.createElement('button');
    button.className = 'smart-finder-copy-all-button';
    button.textContent = 'Copy all results';
    button.title = 'Copy all highlighted results to clipboard';
    button.disabled = true; // Initially disabled
    
    return button;
  }
  
  createHelpOption() {
    const helpText = document.createElement('span');
    helpText.className = 'smart-finder-help-text';
    helpText.textContent = 'Help';
    helpText.title = 'Get help with using Smart Finder';
    
    return helpText;
  }
  
  createScrollIndicators() {
    this.scrollIndicators = document.createElement('div');
    this.scrollIndicators.className = 'smart-finder-scroll-indicators hidden';
    document.body.appendChild(this.scrollIndicators);
  }
  
  showFindBar() {
    this.findBar.classList.remove('hidden');
    
    // Removed automatic pre-filling with selected text to prevent unwanted searches
    
    this.input.focus();
    this.input.select();
    
    // Ensure input styling is properly initialized
    this.updateInputStyling(false);
  }
  
  hideFindBar() {
    this.findBar.classList.add('hidden');
    this.hideSettingsDropdown();
    this.clearScrollIndicators();
    this.input.value = '';
    
    // Clear input styling and hint timeouts
    this.input.classList.remove('ai-ready');
    this.smartSearchHint.classList.add('hidden');
    
    // Clear any pending hint delays
    if (this.hintDelayTimeout) {
      clearTimeout(this.hintDelayTimeout);
      this.hintDelayTimeout = null;
    }
  }
  
  toggleSettingsDropdown() {
    if (this.settingsRow.classList.contains('hidden')) {
      this.showSettingsDropdown();
    } else {
      this.hideSettingsDropdown();
    }
  }
  
  showSettingsDropdown() {
    this.settingsRow.classList.remove('hidden');
    this.findBar.classList.add('settings-open');
    this.statsElement.classList.add('settings-active');
  }
  
  hideSettingsDropdown() {
    this.settingsRow.classList.add('hidden');
    this.findBar.classList.remove('settings-open');
    this.statsElement.classList.remove('settings-active');
  }
  
  updateInputPlaceholder() {
    if (this.aiMode) {
      this.input.placeholder = 'Search or ask...';
    } else if (this.useRegex && this.multiTermHighlighting) {
      this.input.placeholder = 'Find in page (multiple regex - QUOTE complex patterns with spaces)';
    } else if (this.useRegex) {
      this.input.placeholder = 'Find in page (regex)';
    } else if (this.multiTermHighlighting) {
      this.input.placeholder = 'Space to seperate. Quote to contain';
    } else {
      this.input.placeholder = 'Find in page';
    }
  }

  toggleAIMode() {
    this.aiMode = !this.aiMode;
    this.updateInputPlaceholder();
    this.updateCheckboxStates(); // Update the checkbox state to reflect the change
    return this.aiMode;
  }

  updateInputStyling(hasMatches = false) {
    // Apply AI-ready styling when in AI mode, has input text, and no matches exist
    // (meaning Enter would trigger AI search)
    const hasInputText = this.input.value.trim().length > 0;
    const isDefaultHintText = this.smartSearchHint.textContent === 'Press Enter for smart search';
    const isSearching = this.statsElement.classList.contains('searching');
    
    // Clear any existing hint delay timeout
    if (this.hintDelayTimeout) {
      clearTimeout(this.hintDelayTimeout);
      this.hintDelayTimeout = null;
    }
    
    // Don't show hint if search is in progress or if we have matches
    if (isSearching || hasMatches) {
      this.input.classList.remove('ai-ready');
      this.smartSearchHint.classList.add('hidden');
      return;
    }
    
    // For AI mode with input text and no matches, delay showing the hint
    // This prevents the hint from appearing during the search debounce delay
    if (this.aiMode && hasInputText && !hasMatches && isDefaultHintText) {
      // Hide hint immediately
      this.input.classList.remove('ai-ready');
      this.smartSearchHint.classList.add('hidden');
      
      // Show hint after a delay longer than search debounce (400ms > 300ms heavy delay)
      this.hintDelayTimeout = setTimeout(() => {
        // Double-check conditions haven't changed
        const stillHasInputText = this.input.value.trim().length > 0;
        const stillIsDefaultHint = this.smartSearchHint.textContent === 'Press Enter for smart search';
        const stillSearching = this.statsElement.classList.contains('searching');
        
        if (this.aiMode && stillHasInputText && !stillSearching && stillIsDefaultHint) {
          this.input.classList.add('ai-ready');
          this.smartSearchHint.classList.remove('hidden');
        }
      }, 400); // 400ms delay - longer than the heaviest search debounce (300ms)
    } else {
      this.input.classList.remove('ai-ready');
      this.smartSearchHint.classList.add('hidden');
    }
  }
  
  // Update smart search hint text (for showing "No results" after AI search)
  updateSmartSearchHint(text = 'Press Enter for smart search') {
    this.smartSearchHint.textContent = text;
    
    // Clear any existing timeout
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
    
    // If we're setting a non-default hint (like "No results"), show it temporarily
    // but don't show the default hint automatically
    if (text !== 'Press Enter for smart search') {
      this.smartSearchHint.classList.remove('hidden');
      this.input.classList.remove('ai-ready');
      
      // Determine timeout based on hint type
      let timeout = 3000; // Default 3 seconds
      if (text.includes('Sign in') || text.includes('tokens') || text.includes('Rate limit')) {
        timeout = 5000; // 5 seconds for important error messages
      }
      
      // Hide the hint after timeout for non-default messages
      this.hintTimeout = setTimeout(() => {
        // Only hide if the text hasn't changed to something else
        if (this.smartSearchHint.textContent === text) {
          this.smartSearchHint.classList.add('hidden');
        }
      }, timeout);
    } else {
      // For default hint text, let updateInputStyling control visibility
      // Don't automatically show or hide here
    }
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
    
    // Badge is now handled by SmartFinder's updateTokenBadge method
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
      
      // Hide hints during search
      this.smartSearchHint.classList.add('hidden');
      this.input.classList.remove('ai-ready');
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
      
      // Don't automatically update input styling when search completes
      // This allows error messages and sign-in prompts to remain visible
      // The calling code should handle hint visibility appropriately
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
    
    // Don't automatically update input styling when search is cancelled
    // This allows any existing hints to remain visible
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
    
    if (matches.length === 0 || !this.showScrollIndicators) {
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
        const percentage = Math.max(0, Math.min(100, (elementTop / documentHeight) * 100));
        
        const indicator = document.createElement('div');
        indicator.className = 'smart-finder-indicator';
        
        // Add multi-term color class if applicable
        if (termToColorMap) {
          let colorIndex = null;
          
          // Handle AI search case
          if (termToColorMap.ai) {
            colorIndex = 'ai';
    
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
        // Could not create scroll indicator - silently handle
      }
    });
  }

  // Add new method for progressive scroll indicator updates
  addScrollIndicators(newMatches, allMatches, currentIndex, termToColorMap, caseSensitive, onIndicatorClick, useRegex = false) {
    if (newMatches.length === 0 || !this.showScrollIndicators) return;
    
    this.scrollIndicators.classList.remove('hidden');
    
    // Get document height
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    // Create indicators only for new matches
    newMatches.forEach((range) => {
      try {
        const rect = range.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const elementTop = rect.top + scrollTop;
        const percentage = Math.max(0, Math.min(100, (elementTop / documentHeight) * 100));
        
        const indicator = document.createElement('div');
        indicator.className = 'smart-finder-indicator';
        
        // Find the index of this range in the complete matches array
        const matchIndex = allMatches.findIndex(match => {
          try {
            return match.compareBoundaryPoints(Range.START_TO_START, range) === 0 &&
                   match.compareBoundaryPoints(Range.END_TO_END, range) === 0;
          } catch (error) {
            return false;
          }
        });
        
        // Add multi-term color class if applicable
        if (termToColorMap) {
          let colorIndex = null;
          
          // Handle AI search case
          if (termToColorMap.ai) {
            colorIndex = 'ai';
    
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
        
        if (matchIndex === currentIndex) {
          indicator.classList.add('current');
        }
        
        indicator.style.top = `${percentage}%`;
        indicator.addEventListener('click', () => onIndicatorClick(matchIndex));
        
        this.scrollIndicators.appendChild(indicator);
        this.indicatorElements.push(indicator);
      } catch (error) {
        // Could not create scroll indicator - silently handle
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
      aiMode: this.aiMode,
      showScrollIndicators: this.showScrollIndicators
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
    if (settings.showScrollIndicators !== undefined) {
      this.showScrollIndicators = settings.showScrollIndicators;
      if (!this.showScrollIndicators) {
        this.clearScrollIndicators();
      }
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
      this.settingsCheckboxes.scrollIndicatorsCheckbox.checked = this.showScrollIndicators;
    }
  }
  
  // Set the last search query (but don't trigger search)
  setLastSearch(query) {
    if (this.input) {
      this.input.value = query;
    }
  }
  
  // Show restriction notification with auto-dismiss
  showRestrictionNotification(message) {
    if (!this.restrictionNotification) return;
    
    // Clear any existing timeout
    if (this.restrictionTimeout) {
      clearTimeout(this.restrictionTimeout);
      this.restrictionTimeout = null;
    }
    
    // Create message content - clear existing content safely
    while (this.restrictionNotification.firstChild) {
      this.restrictionNotification.removeChild(this.restrictionNotification.firstChild);
    }
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    const dismissButton = document.createElement('button');
    dismissButton.className = 'dismiss-button';
    dismissButton.textContent = '×';
    dismissButton.title = 'Dismiss';
    dismissButton.addEventListener('click', () => this.hideRestrictionNotification());
    
    this.restrictionNotification.appendChild(messageSpan);
    this.restrictionNotification.appendChild(dismissButton);
    
    // Show the notification
    this.restrictionNotification.classList.remove('hidden');
    
    // Auto-dismiss after 10 seconds
    this.restrictionTimeout = setTimeout(() => {
      this.hideRestrictionNotification();
    }, 10000);
  }
  
  // Hide restriction notification
  hideRestrictionNotification() {
    if (!this.restrictionNotification) return;
    
    this.restrictionNotification.classList.add('hidden');
    
    // Clear timeout if it exists
    if (this.restrictionTimeout) {
      clearTimeout(this.restrictionTimeout);
      this.restrictionTimeout = null;
    }
  }
  
  // Cleanup method
  destroy() {
    this.clearScrollIndicators();
    
    // Clean up hint timeouts
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
      this.hintTimeout = null;
    }
    if (this.hintDelayTimeout) {
      clearTimeout(this.hintDelayTimeout);
      this.hintDelayTimeout = null;
    }
    
    // Clean up restriction notification timeout
    if (this.restrictionTimeout) {
      clearTimeout(this.restrictionTimeout);
      this.restrictionTimeout = null;
    }
    
    // Clean up shadow DOM
    if (this.shadowHost && this.shadowHost.parentNode) {
      this.shadowHost.parentNode.removeChild(this.shadowHost);
    }
    
    // Clean up highlight styles
    const highlightStyles = document.getElementById('smart-finder-highlight-styles');
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