// Background service worker for SmartFinder
// Handles keyboard shortcuts, browser action, and messaging

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Extension installed
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  // Extension started
});

// Handle authentication state changes
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  // Authentication state changed
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'checkAuth') {
    // Check authentication status
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      sendResponse({ 
        authenticated: !!token,
        error: chrome.runtime.lastError?.message
      });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'clearAuth') {
    // Clear authentication
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-find') {
    handleFindToggle();
  }
});

// Handle browser action click
chrome.action.onClicked.addListener((tab) => {
  handleFindToggle();
});

async function handleFindToggle() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      return;
    }

    // Check if we can access this tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
      return;
    }
    
    // Inject content script if not already present
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.smartFinder !== undefined
      });
      
      // If content script not loaded, inject it
      if (!results || !results[0] || !results[0].result) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Wait a moment for the script to load
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      return;
    }
    
    // Send toggle message to content script
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleFind' });
    } catch (error) {
      // Message sending failed, but we don't need to log in production
    }
    
          } catch (error) {
            // Error toggling find - silently handle
        }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const { current, total } = message;
    const badgeText = total > 0 ? `${current}/${total}` : '';
    
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: badgeText
    });
    
    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: '#4285f4'
    });
  }
  
  if (message.action === 'updateTokenBadge') {
    const { tokenCount } = message;
    let badgeText = '';
    
    if (tokenCount > 0) {
      badgeText = tokenCount > 99 ? '99+' : tokenCount.toString();
    }
    
    chrome.action.setBadgeText({
      tabId: sender.tab?.id,
      text: badgeText
    });
    
    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab?.id,
      color: tokenCount > 0 ? '#34d399' : '#ef4444'
    });
  }
  
  if (message.action === 'clearBadge') {
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: ''
    });
  }
  
  if (message.action === 'openHelpPage') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('help.html')
    });
  }
});

// Keep service worker alive during authentication flows
let authInProgress = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAuth') {
    authInProgress = true;
  } else if (request.action === 'endAuth') {
    authInProgress = false;
  }
});

// Prevent service worker from sleeping during auth
setInterval(() => {
  if (authInProgress) {
    // Keep service worker alive during authentication
  }
}, 20000); // Every 20 seconds 