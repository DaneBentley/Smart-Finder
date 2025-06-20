/**
 * Chrome Native Find Clone - Content Script Entry Point
 * Dynamically imports and initializes the modular find functionality
 */

(function() {
  'use strict';
  
  // Prevent multiple initialization
  if (window.chromeFindClone) {
    return;
  }
  
  // Function to dynamically load modules
  async function loadModules() {
    try {
      // Import the main controller
      const { ChromeFindClone } = await import(chrome.runtime.getURL('modules/chrome-find-clone.js'));
      
      // Initialize the extension
      window.chromeFindClone = new ChromeFindClone();
      
      console.log('Chrome Find Clone initialized successfully');
    } catch (error) {
      console.error('Failed to load Chrome Find Clone modules:', error);
      
      // Fallback: Load a simplified version if modules fail
      initializeFallback();
    }
  }
  
  // Simplified fallback implementation
  function initializeFallback() {
    console.warn('Using fallback implementation');
    
    window.chromeFindClone = {
      isVisible: false,
      toggle: function() {
        console.log('Find functionality not available - module loading failed');
      }
    };
  }
  
  // Start loading modules
  loadModules();
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggleFind') {
      if (window.chromeFindClone && typeof window.chromeFindClone.toggle === 'function') {
        window.chromeFindClone.toggle();
      }
    }
  });
  
})(); 