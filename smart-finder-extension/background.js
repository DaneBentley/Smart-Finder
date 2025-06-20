// Background service worker for Chrome Find Clone
// Handles keyboard shortcuts, browser action, and messaging

console.log('Smart Finder background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Smart Finder extension installed');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Smart Finder extension started');
});

// Handle authentication state changes
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  console.log('Chrome identity sign-in changed:', { account, signedIn });
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
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
    console.log('Toggle find command triggered');
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
    
    if (!tab) return;
    
    // Inject content script if not already present
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.chromeFindClone !== undefined
      });
    } catch (error) {
      // Content script not loaded, inject it
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['findbar.css']
      });
    }
    
    // Send toggle message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'toggleFind' });
    
  } catch (error) {
    console.error('Error toggling find:', error);
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
  
  if (message.action === 'clearBadge') {
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: ''
    });
  }
});

// Keep service worker alive during authentication flows
let authInProgress = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAuth') {
    authInProgress = true;
    console.log('Authentication flow started');
  } else if (request.action === 'endAuth') {
    authInProgress = false;
    console.log('Authentication flow ended');
  }
});

// Prevent service worker from sleeping during auth
setInterval(() => {
  if (authInProgress) {
    console.log('Keeping service worker alive during auth');
  }
}, 20000); // Every 20 seconds 