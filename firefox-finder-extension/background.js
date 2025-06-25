// Background script for SmartFinder (Firefox compatible)
// Handles keyboard shortcuts, browser action, and messaging

// Use browser API for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : {});

// Handle extension installation
browserAPI.runtime.onInstalled.addListener(() => {
  console.log('SmartFinder extension installed');
});

// Handle extension startup
browserAPI.runtime.onStartup.addListener(() => {
  console.log('SmartFinder extension started');
});

// Handle messages from content scripts or popup
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'checkAuth') {
    // Firefox doesn't support chrome.identity, so we'll handle auth differently
    // For now, return not authenticated to trigger manual OAuth flow
    sendResponse({ 
      authenticated: false,
      error: 'Firefox uses manual OAuth flow'
    });
    return true;
  }
  
  if (request.action === 'clearAuth') {
    // Clear any stored authentication data
    browserAPI.storage.local.remove(['user', 'tokens', '_sjwt'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'updateBadge') {
    const { current, total } = request;
    const badgeText = total > 0 ? `${current}/${total}` : '';
    
    browserAPI.browserAction.setBadgeText({
      tabId: sender.tab.id,
      text: badgeText
    });
    
    browserAPI.browserAction.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: '#4285f4'
    });
  }
  
  if (request.action === 'updateTokenBadge') {
    const { tokenCount } = request;
    let badgeText = '';
    
    if (tokenCount > 0) {
      badgeText = tokenCount > 99 ? '99+' : tokenCount.toString();
    }
    
    browserAPI.browserAction.setBadgeText({
      tabId: sender.tab?.id,
      text: badgeText
    });
    
    browserAPI.browserAction.setBadgeBackgroundColor({
      tabId: sender.tab?.id,
      color: tokenCount > 0 ? '#34d399' : '#ef4444'
    });
  }
  
  if (request.action === 'clearBadge') {
    browserAPI.browserAction.setBadgeText({
      tabId: sender.tab.id,
      text: ''
    });
  }
  
  if (request.action === 'openHelpPage') {
    browserAPI.tabs.create({
      url: 'https://danebentley.github.io/Smart-Finder/help.html'
    });
  }
  
  if (request.action === 'startManualAuth') {
    // Open OAuth URL in new tab for manual authentication
    const authUrl = request.url || 'https://findr-api-backend.vercel.app/api/auth/google/firefox-extension';
    browserAPI.tabs.create({ url: authUrl });
    sendResponse({ success: true });
  }
});

// Handle keyboard shortcuts
browserAPI.commands.onCommand.addListener((command) => {
  console.log('Keyboard command received:', command);
  if (command === 'toggle-find') {
    console.log('Toggle-find command triggered');
    handleFindToggle();
  }
});

// Handle browser action click
browserAPI.browserAction.onClicked.addListener((tab) => {
  console.log('Browser action clicked for tab:', tab.id);
  handleFindToggle();
});

async function handleFindToggle() {
  console.log('handleFindToggle called');
  try {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      console.log('No active tab found');
      return;
    }

    console.log('Active tab:', tab.url);

    // Check if we can access this tab
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('moz-extension://') ||
        tab.url.startsWith('about:')) {
      console.log('Cannot access restricted tab:', tab.url);
      return;
    }
    
    // Send toggle message to content script (content script is already injected via manifest)
    try {
      console.log('Sending toggle message to tab:', tab.id);
      await browserAPI.tabs.sendMessage(tab.id, { action: 'toggleFind' });
      console.log('Toggle message sent successfully');
    } catch (error) {
      console.log('Message sending failed:', error);
      // Message sending failed, content script might not be ready yet
      // In Manifest V2, we rely on content_scripts in manifest to inject automatically
    }
    
  } catch (error) {
    console.log('Error in handleFindToggle:', error);
  }
} 