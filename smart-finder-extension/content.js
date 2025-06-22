/**
 * Chrome Native Find Clone - Content Script Entry Point
 * Dynamically imports and initializes the modular find functionality
 */

(function() {
  'use strict';
  
  // Prevent multiple initialization
  if (window.smartFinder) {
    return;
  }
  
  // Function to dynamically load modules
  async function loadModules() {
    try {
      // Import the main controller
      const { SmartFinder } = await import(chrome.runtime.getURL('modules/smart-finder.js'));
      
      // Initialize the extension
      window.smartFinder = new SmartFinder();
      
    } catch (error) {
      // Failed to load SmartFinder modules - silently handle
      
      // Fallback: Load a simplified version if modules fail
      initializeFallback();
    }
  }
  
  // Simplified fallback implementation
  function initializeFallback() {
    window.smartFinder = {
      isVisible: false,
      toggle: function() {
        // Find functionality not available - module loading failed
      }
    };
  }
  
  // Start loading modules
  loadModules();
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleFind') {
      if (window.smartFinder && typeof window.smartFinder.toggle === 'function') {
    window.smartFinder.toggle();
      }
    }
  });
  
})(); 