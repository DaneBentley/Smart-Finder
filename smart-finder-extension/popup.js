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
    this.updateUI();
    
    // Platform-specific keyboard shortcut display
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const findKeyElement = document.getElementById('findKey');
    if (findKeyElement) {
      findKeyElement.textContent = isMac ? 'Cmd+F' : 'Ctrl+F';
    }
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

      document.getElementById('userName').textContent = user.name || 'User';
      document.getElementById('userEmail').textContent = user.email;
      document.getElementById('tokenCount').textContent = `${tokens} tokens`;
      
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
      this.showMessage('Signing in...', 'info');
      await this.authManager.signInWithGoogle();
      await this.updateUI();
      this.showMessage('Successfully signed in!', 'success');
    } catch (error) {
      console.error('Google sign in failed:', error);
      this.showMessage('Sign in failed: ' + error.message, 'error');
    }
  }

  // General authentication
  async handleSignOut() {
    try {
      this.showMessage('Signing out...', 'info');
      await this.authManager.signOut();
      await this.updateUI();
      this.showMessage('Successfully signed out', 'success');
    } catch (error) {
      console.error('Sign out failed:', error);
      this.showMessage('Sign out failed: ' + error.message, 'error');
    }
  }

  async refreshUserData() {
    try {
      this.showMessage('Refreshing...', 'info');
      await this.authManager.refreshUserData();
      await this.updateUI();
      this.showMessage('Refreshed successfully', 'success');
    } catch (error) {
      console.error('Refresh failed:', error);
      this.showMessage('Refresh failed: ' + error.message, 'error');
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
      this.showMessage('Please select a token amount', 'error');
      return;
    }

    try {
      this.showMessage('Redirecting to payment...', 'info');
      const paymentUrl = await this.authManager.getPaymentUrl(this.selectedTokenAmount);
      
      // Open payment in new tab
      await chrome.tabs.create({ url: paymentUrl });
      
      // Close popup after opening payment page
      window.close();
    } catch (error) {
      console.error('Payment failed:', error);
      this.showMessage('Payment failed: ' + error.message, 'error');
    }
  }

  // Find bar functionality
  async openFindBar() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        this.showMessage('Cannot open find on this page', 'error');
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
      this.showMessage('Failed to open find bar: ' + error.message, 'error');
    }
  }

  // Utility functions
  showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');

    // Auto-hide success and info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        messageDiv.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SmartFinderPopup();
}); 