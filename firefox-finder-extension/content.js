/**
 * Chrome Native Find Clone - Content Script Entry Point (Firefox compatible)
 * Initializes the modular find functionality
 */

(function() {
  'use strict';
  
  console.log('SmartFinder content script loading...');
  
  // Use browser API for cross-browser compatibility
  const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : {});
  
  // Prevent multiple initialization
  if (window.smartFinder) {
    console.log('SmartFinder already initialized, skipping...');
    return;
  }
  
  // Firefox-compatible module loading using dynamic imports
  async function loadModules() {
    console.log('Loading SmartFinder modules...');
    try {
      // For Firefox, we need to import the module directly rather than injecting a script
      const moduleURL = browserAPI.runtime.getURL('modules/smart-finder.js');
      console.log('Module URL:', moduleURL);
      
      // Dynamic import for Firefox compatibility
      const module = await import(moduleURL);
      console.log('Module imported successfully:', module);
      
      // Get the SmartFinder class from the module
      const SmartFinder = module.SmartFinder;
      
      if (SmartFinder) {
        console.log('SmartFinder class found, initializing...');
        // Make it available globally
        window.SmartFinder = SmartFinder;
        initializeSmartFinder();
      } else {
        console.log('SmartFinder class not found in module');
        initializeFallback();
      }
      
    } catch (error) {
      console.log('Dynamic import failed, trying script injection:', error);
      // Dynamic import failed, try fallback script injection method (for Chrome compatibility)
      loadModulesScriptInjection();
    }
  }
  
  // Fallback method using script injection (original Chrome method)
  function loadModulesScriptInjection() {
    console.log('Trying script injection method...');
    try {
      // Create script element to load the main module
      const script = document.createElement('script');
      script.type = 'module';
      const moduleURL = browserAPI.runtime.getURL('modules/smart-finder.js');
      script.src = moduleURL;
      
      script.onload = function() {
        console.log('Module script loaded successfully');
        // Module loaded successfully
        initializeSmartFinder();
      };
      
      script.onerror = function() {
        console.log('Module script failed to load');
        // Failed to load SmartFinder modules - use fallback
        initializeFallback();
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      console.log('Script injection failed:', error);
      // Failed to load SmartFinder modules - use fallback
      initializeFallback();
    }
  }
  
  // Initialize SmartFinder when module is loaded
  function initializeSmartFinder() {
    console.log('Initializing SmartFinder...');
    // Wait for the module to be available on window
    if (window.SmartFinder) {
      console.log('Creating SmartFinder instance...');
      window.smartFinder = new window.SmartFinder();
      console.log('SmartFinder initialized successfully!');
    } else {
      console.log('SmartFinder not available yet, retrying...');
      // Try again after a short delay
      setTimeout(() => {
        if (window.SmartFinder) {
          console.log('Creating SmartFinder instance (retry)...');
          window.smartFinder = new window.SmartFinder();
          console.log('SmartFinder initialized successfully (retry)!');
        } else {
          console.log('SmartFinder still not available, using fallback');
          initializeFallback();
        }
      }, 100);
    }
  }
  
  // Simplified fallback implementation
  function initializeFallback() {
    console.log('Using SmartFinder fallback implementation');
    window.smartFinder = {
      isVisible: false,
      toggle: function() {
        // Find functionality not available - module loading failed
        console.log('SmartFinder module loading failed - toggle called but no action');
      }
    };
  }
  
  // Start loading modules
  loadModules();
  
  // Listen for messages from background script
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    if (message.action === 'toggleFind') {
      console.log('Toggle find message received');
      if (window.smartFinder && typeof window.smartFinder.toggle === 'function') {
        console.log('Calling smartFinder.toggle()');
        window.smartFinder.toggle();
      } else {
        console.log('SmartFinder not available or toggle function missing');
      }
    }
  });
  
  console.log('SmartFinder content script setup complete');
  
})(); 