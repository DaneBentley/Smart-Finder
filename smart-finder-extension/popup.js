// Popup script for Smart Finder - OAuth-only implementation
import { AuthManager } from './modules/auth-manager.js';

class SmartFinderPopup {
  constructor() {
    this.authManager = new AuthManager();
    this.selectedTokenAmount = null;
    this.init();
  }

  async init() {
    await this.authManager.initialize();
    this.setupEventListeners();
    await this.updateUI();
    
    // Platform-specific keyboard shortcut display
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const findKeyElement = document.getElementById('findKey');
    if (findKeyElement) {
      findKeyElement.textContent = isMac ? 'Cmd+F' : 'Ctrl+F';
    }
    
    // Auto-refresh token counts every 10 seconds while popup is open
    this.refreshInterval = setInterval(async () => {
      if (this.authManager.isSignedIn()) {
        try {
          await this.authManager.refreshUserData();
          await this.updateUI();
        } catch (error) {
          // Ignore refresh errors
        }
      }
    }, 10000);
    
    // Clean up interval when popup is closed
    window.addEventListener('beforeunload', () => {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
    });
  }

  setupEventListeners() {
    // Google authentication
    document.getElementById('signInButton')?.addEventListener('click', () => this.handleGoogleSignIn());
    
    // General authentication
    document.getElementById('signOutButton')?.addEventListener('click', () => this.handleSignOut());
    document.getElementById('refreshTokens')?.addEventListener('click', () => this.refreshUserData());

    // Token purchase
    document.getElementById('buyTokens')?.addEventListener('click', () => this.showTokenPurchase());
    document.getElementById('cancelPurchase')?.addEventListener('click', () => this.hideTokenPurchase());
    document.getElementById('buyTokensButton')?.addEventListener('click', () => this.handleTokenPurchase());

    // Token selection
    document.querySelectorAll('.token-option').forEach(option => {
      option.addEventListener('click', () => this.selectTokenOption(option));
    });

    // Find bar functionality
    document.getElementById('openFind')?.addEventListener('click', () => this.openFindBar());
  }

  async updateUI() {
    const signInPrompt = document.getElementById('signInPrompt');
    const userSection = document.getElementById('userSection');

    if (this.authManager.isSignedIn()) {
      // Show user section
      signInPrompt?.classList.add('hidden');
      userSection?.classList.remove('hidden');

      // Update user info
      const user = this.authManager.getCurrentUser();
      const tokens = this.authManager.getTokenCount();
      const freeTokens = this.authManager.getFreeTokens();
      const paidTokens = this.authManager.getPaidTokens();

      document.getElementById('userName').textContent = user.name || 'User';
      document.getElementById('userEmail').textContent = user.email;
      document.getElementById('tokenCount').textContent = `${tokens} tokens`;
      
      // Update token breakdown
      document.getElementById('freeTokens').textContent = `${freeTokens} free`;
      document.getElementById('paidTokens').textContent = `${paidTokens} paid`;
      
      if (user.profile_picture) {
        document.getElementById('userAvatar').src = user.profile_picture;
      }
    } else {
      // Show sign in prompt
      signInPrompt?.classList.remove('hidden');
      userSection?.classList.add('hidden');
    }
  }

  // Google authentication
  async handleGoogleSignIn() {
    try {
      await this.authManager.signInWithGoogle();
      await this.updateUI();
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  }

  // General authentication
  async handleSignOut() {
    try {
      await this.authManager.signOut();
      await this.updateUI();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  async refreshUserData() {
    const refreshButton = document.getElementById('refreshTokens');
    const originalText = refreshButton?.textContent || 'Refresh';
    
    try {
      // Show loading state
      if (refreshButton) {
        refreshButton.textContent = '...';
        refreshButton.disabled = true;
      }
      
      console.log('Starting manual refresh...');
      await this.authManager.refreshUserData();
      await this.updateUI();
      console.log('Manual refresh completed successfully');
      
      // Show success feedback briefly
      if (refreshButton) {
        refreshButton.textContent = '✓';
        setTimeout(() => {
          refreshButton.textContent = originalText;
          refreshButton.disabled = false;
        }, 1000);
      }
      
    } catch (error) {
      console.error('Refresh failed:', error);
      
      // Show error feedback
      if (refreshButton) {
        refreshButton.textContent = '✗';
        setTimeout(() => {
          refreshButton.textContent = originalText;
          refreshButton.disabled = false;
        }, 2000);
      }
      
      // Show user-friendly error if needed
      if (error.message.includes('JWT token') || error.message.includes('sign in')) {
        // JWT expired or invalid - user needs to sign in again
        console.log('JWT expired, signing out...');
        await this.authManager.signOut();
        await this.updateUI();
      }
    }
  }

  // Token purchase functionality
  showTokenPurchase() {
    document.getElementById('tokenPurchase').classList.remove('hidden');
  }

  hideTokenPurchase() {
    document.getElementById('tokenPurchase').classList.add('hidden');
    this.selectedTokenAmount = null;
    this.updateTokenPurchaseButton();
  }

  selectTokenOption(option) {
    // Remove active class from all options
    document.querySelectorAll('.token-option').forEach(opt => opt.classList.remove('active'));
    
    // Add active class to selected option
    option.classList.add('active');
    
    // Get token amount from data attribute
    this.selectedTokenAmount = parseInt(option.dataset.tokens);
    this.updateTokenPurchaseButton();
  }

  updateTokenPurchaseButton() {
    const button = document.getElementById('buyTokensButton');
    if (this.selectedTokenAmount) {
      button.textContent = `Buy ${this.selectedTokenAmount} Tokens`;
      button.disabled = false;
    } else {
      button.textContent = 'Select Token Amount';
      button.disabled = true;
    }
  }

  async handleTokenPurchase() {
    if (!this.selectedTokenAmount) {
      return;
    }

    try {
      const paymentUrl = await this.authManager.getPaymentUrl(this.selectedTokenAmount);
      
      // Open payment in new tab
      await chrome.tabs.create({ url: paymentUrl });
      
      // Close popup after opening payment page
      window.close();
    } catch (error) {
      console.error('Payment failed:', error);
    }
  }

  // Find bar functionality
  async openFindBar() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        return;
      }

      // Close popup
      window.close();

      // Inject and execute content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send message to open find bar
      await chrome.tabs.sendMessage(tab.id, { action: 'openFind' });

    } catch (error) {
      console.error('Failed to open find bar:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SmartFinderPopup();
}); 