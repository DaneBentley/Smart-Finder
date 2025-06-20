// Popup script for Smart Finder - OAuth-only implementation
import { AuthManager } from './modules/auth-manager.js';

class SmartFinderPopup {
  constructor() {
    this.authManager = new AuthManager();
    this.init();
  }

  async init() {
    await this.authManager.initialize();
    this.setupEventListeners();
    await this.updateUI();
    
    // Initialize theme
    await this.initializeTheme();
    
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

    // Custom amount purchase
    document.getElementById('buyCustomAmount')?.addEventListener('click', () => this.handleCustomAmountPurchase());
    
    // Custom amount input validation and preview update
    document.getElementById('customAmount')?.addEventListener('input', (e) => {
      this.validateCustomAmount(e.target);
      this.updateTokenPreview(e.target.value);
    });
    
    // Floating footer collapse/expand functionality
    document.getElementById('collapseBtn')?.addEventListener('click', () => this.toggleFooterCollapse());
    
    // Initialize token preview
    this.updateTokenPreview(5);
    
    // Load footer state from storage
    this.loadFooterState();
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
      
      // Update token count with clean formatting
      document.getElementById('tokenCount').textContent = `${tokens}`;
      
      // Update token breakdown
      document.getElementById('freeTokens').textContent = `${freeTokens}`;
      document.getElementById('paidTokens').textContent = `${paidTokens}`;
      
      if (user.profile_picture) {
        document.getElementById('userAvatar').src = user.profile_picture;
      }
    } else {
      // Show sign in prompt
      signInPrompt?.classList.remove('hidden');
      userSection?.classList.add('hidden');
    }
  }

  // Theme management
  async initializeTheme() {
    try {
      // Check if the system is using dark mode
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(isDarkMode ? 'dark' : 'light');
      
      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.applyTheme(e.matches ? 'dark' : 'light');
      });
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      this.applyTheme('light');
    }
  }

  applyTheme(theme) {
    const body = document.body;
    if (theme === 'dark') {
      body.setAttribute('data-theme', 'dark');
    } else {
      body.removeAttribute('data-theme');
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
        refreshButton.textContent = 'Updated';
        setTimeout(() => {
          refreshButton.textContent = originalText;
          refreshButton.disabled = false;
        }, 1000);
      }
      
    } catch (error) {
      console.error('Refresh failed:', error);
      
      // Show error feedback
      if (refreshButton) {
        refreshButton.textContent = 'Error';
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

  // Custom amount purchase
  async handleCustomAmountPurchase() {
    const customInput = document.getElementById('customAmount');
    const customButton = document.getElementById('buyCustomAmount');
    const amount = parseFloat(customInput.value);
    
    if (!this.validateCustomAmountValue(amount)) {
      this.showCustomAmountError('Please enter a valid amount between $1.00 and $300.00');
      return;
    }

    try {
      // Add visual feedback
      customButton.disabled = true;
      customButton.textContent = '...';
      
      // Calculate tokens (100 tokens per $1)
      const tokenAmount = Math.floor(amount * 100);
      
      // Pass the exact dollar amount to ensure proper Stripe handling
      const paymentUrl = await this.authManager.getPaymentUrl(tokenAmount, amount);
      
      // Open payment in new tab
      await chrome.tabs.create({ url: paymentUrl });
      
      // Close popup after opening payment page
      window.close();
    } catch (error) {
      console.error('Custom payment failed:', error);
      
      // Show error feedback
      this.showCustomAmountError('Payment failed. Please try again.');
      
      // Reset button
      customButton.disabled = false;
      customButton.textContent = 'Buy Tokens';
    }
  }

  // Update token preview
  updateTokenPreview(amount) {
    const previewElement = document.getElementById('tokensPreview');
    const numAmount = parseFloat(amount);
    
    if (previewElement && !isNaN(numAmount) && numAmount > 0) {
      const tokens = Math.floor(numAmount * 100);
      previewElement.textContent = `${tokens} tokens`;
    } else if (previewElement) {
      previewElement.textContent = '0 tokens';
    }
  }

  // Validate custom amount input
  validateCustomAmount(input) {
    const buyButton = document.getElementById('buyCustomAmount');
    const amount = parseFloat(input.value);
    
    if (this.validateCustomAmountValue(amount)) {
      buyButton.disabled = false;
      input.style.borderColor = 'var(--border-color)';
    } else {
      buyButton.disabled = true;
      if (input.value && amount) {
        input.style.borderColor = 'var(--error-color)';
      } else {
        input.style.borderColor = 'var(--border-color)';
      }
    }
  }

  // Validate custom amount value
  validateCustomAmountValue(amount) {
    return !isNaN(amount) && amount >= 1 && amount <= 300;
  }

  // Show custom amount error
  showCustomAmountError(message) {
    const customInput = document.getElementById('customAmount');
    const customButton = document.getElementById('buyCustomAmount');
    
    // Show error state
    customInput.style.borderColor = 'var(--error-color)';
    customButton.textContent = 'Error';
    customButton.disabled = true;
    
    // Reset after delay
    setTimeout(() => {
      customInput.style.borderColor = 'var(--border-color)';
      customButton.textContent = 'Buy Tokens';
      this.validateCustomAmount(customInput);
    }, 2000);
  }

  // Footer collapse/expand functionality
  toggleFooterCollapse() {
    const footer = document.getElementById('purchaseFooter');
    const collapseBtn = document.getElementById('collapseBtn');
    
    footer.classList.toggle('collapsed');
    collapseBtn.textContent = footer.classList.contains('collapsed') ? '+' : '−';
    
    // Save state to storage
    chrome.storage.local.set({
      footerCollapsed: footer.classList.contains('collapsed')
    });
  }

  // Load footer state from storage
  async loadFooterState() {
    try {
      const result = await chrome.storage.local.get(['footerCollapsed']);
      const footer = document.getElementById('purchaseFooter');
      const collapseBtn = document.getElementById('collapseBtn');
      
      if (result.footerCollapsed) {
        footer.classList.add('collapsed');
        collapseBtn.textContent = '+';
      } else {
        footer.classList.remove('collapsed');
        collapseBtn.textContent = '−';
      }
    } catch (error) {
      console.error('Failed to load footer state:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SmartFinderPopup();
}); 