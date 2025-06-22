// Popup script for Smart Finder - OAuth-only implementation
import { AuthManager } from './modules/auth-manager.js';
import { StorageManager } from './modules/storage-manager.js';

class SmartFinderPopup {
  constructor() {
    this.authManager = new AuthManager();
    this.storageManager = new StorageManager();
    this.advancedSettingsInitialized = false;
    this.characterCounterTimeout = null;
    this.init();
  }

  async init() {
    await this.authManager.initialize();
    this.setupEventListeners();
    await Promise.all([
      this.updateUI(),
      this.initializeTheme()
    ]);
    
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
    
    // Account deletion
    const deleteAccountBtn = document.getElementById('deleteAccountButton');
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', (e) => {
        e.preventDefault();
    
        this.showDeleteAccountModal();
      });
    } else {

    }

    // Custom amount purchase
    document.getElementById('buyCustomAmount')?.addEventListener('click', () => this.handleCustomAmountPurchase());
    
    // Custom amount input validation and preview update
    document.getElementById('customAmount')?.addEventListener('input', (e) => {
      this.validateCustomAmount(e.target);
      this.updateTokenPreview(e.target.value);
    });

    // Advanced settings toggle
    document.getElementById('advancedSettingsToggle')?.addEventListener('click', () => this.toggleAdvancedSettings());
    
    // Regex patterns toggle
    document.getElementById('regexPatternsToggle')?.addEventListener('click', () => this.toggleRegexPatterns());
    
    // Custom prompt management
    document.getElementById('savePromptButton')?.addEventListener('click', () => this.saveCustomPrompt());
    document.getElementById('resetPromptButton')?.addEventListener('click', () => this.resetToDefaultPrompt());
    
    // Character counter for custom prompt
    document.getElementById('customSystemPrompt')?.addEventListener('input', (e) => this.updateCharacterCounter(e.target));
    
    // Initialize token preview
    this.updateTokenPreview(5);
    
    // Account deletion modal event listeners
    this.setupDeleteAccountModal();
    
    // Initialize advanced settings
    this.initializeAdvancedSettings();
  }

  setupDeleteAccountModal() {
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
      const modal = document.getElementById('deleteAccountModal');
      const closeBtn = document.getElementById('closeDeleteModal');
      const cancelDelete = document.getElementById('cancelDelete');
      const cancelConfirm = document.getElementById('cancelConfirm');
      const requestDelete = document.getElementById('requestDelete');
      const confirmDelete = document.getElementById('confirmDelete');
      const codeInput = document.getElementById('confirmationCodeInput');



      // Close modal handlers
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();

          this.hideDeleteAccountModal();
        });
      }

      if (cancelDelete) {
        cancelDelete.addEventListener('click', (e) => {
          e.preventDefault();

          this.hideDeleteAccountModal();
        });
      }

      if (cancelConfirm) {
        cancelConfirm.addEventListener('click', (e) => {
          e.preventDefault();

          this.hideDeleteAccountModal();
        });
      }

      // Close on backdrop click
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {

            this.hideDeleteAccountModal();
          }
        });
      }

      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('deleteAccountModal');
          if (modal && !modal.classList.contains('hidden')) {

            this.hideDeleteAccountModal();
          }
        }
      });

      // Request deletion
      if (requestDelete) {
        requestDelete.addEventListener('click', (e) => {
          e.preventDefault();

          this.requestAccountDeletion();
        });
      }

      // Confirm deletion
      if (confirmDelete) {
        confirmDelete.addEventListener('click', (e) => {
          e.preventDefault();

          this.confirmAccountDeletion();
        });
      }

      // Code input validation
      if (codeInput) {
        codeInput.addEventListener('input', (e) => {
          const code = e.target.value.replace(/\D/g, '').slice(0, 6);
          e.target.value = code;
          
          const confirmBtn = document.getElementById('confirmDelete');
          if (confirmBtn) {
            confirmBtn.disabled = code.length !== 6;
          }
        });
      }
    }, 100);
  }

  async updateUI() {
    const signInPrompt = document.getElementById('signInPrompt');
    const userSection = document.getElementById('userSection');
    const userProfile = document.getElementById('userProfile');
    const purchaseFooter = document.getElementById('purchaseFooter');

    if (this.authManager.isSignedIn()) {
      // Show user section, user profile and purchase footer
      signInPrompt?.classList.add('hidden');
      userSection?.classList.remove('hidden');
      userProfile?.classList.remove('hidden');
      purchaseFooter?.classList.remove('hidden');

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
      
      // Update days until reset information
      const daysUntilReset = this.authManager.getDaysUntilReset();
      const monthlyInfoElement = document.querySelector('.monthly-info');
      if (monthlyInfoElement) {
        if (daysUntilReset > 0) {
          monthlyInfoElement.textContent = `Free tokens reset in ${daysUntilReset} day${daysUntilReset === 1 ? '' : 's'}`;
        } else {
          monthlyInfoElement.textContent = 'Free tokens reset today! Refresh to update.';
        }
      }
      
      if (user.profile_picture) {
        document.getElementById('userAvatar').src = user.profile_picture;
      }
    } else {
      // Show sign in prompt, hide user section, user profile and purchase footer
      signInPrompt?.classList.remove('hidden');
      userSection?.classList.add('hidden');
      userProfile?.classList.add('hidden');
      purchaseFooter?.classList.add('hidden');
    }
    
    // Initialize advanced settings based on authentication state
    await this.initializeAdvancedSettings();
    
    // Update token badge
    this.updateTokenBadge();
  }
  
  updateTokenBadge() {
    try {
      const tokenCount = this.authManager.getTokenCount();
      
      // Send token badge update to background script
      chrome.runtime.sendMessage({
        action: 'updateTokenBadge',
        tokenCount: tokenCount
      });
    } catch (error) {
      // Failed to update token badge - silently handle
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
      // Failed to initialize theme - silently handle
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
      // Badge will be updated by updateUI -> updateTokenBadge
    } catch (error) {
      // Google sign in failed - silently handle
    }
  }

  // General authentication
  async handleSignOut() {
    try {
      await this.authManager.signOut();
      await this.updateUI();
      // Badge will be updated by updateUI -> updateTokenBadge
    } catch (error) {
      // Sign out failed - silently handle
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
      

      await this.authManager.refreshUserData();
      await this.updateUI();
      
      // Update token badge after refresh
      this.updateTokenBadge();
      
      // Show success feedback briefly
      if (refreshButton) {
        refreshButton.textContent = 'Updated';
        setTimeout(() => {
          refreshButton.textContent = originalText;
          refreshButton.disabled = false;
        }, 1000);
      }
      
    } catch (error) {
      // Refresh failed - silently handle
      
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
        // JWT expired, signing out
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
      // Custom payment failed - silently handle
      
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
    const estimateElement = document.getElementById('searchEstimate');
    const numAmount = parseFloat(amount);
    
    if (previewElement && !isNaN(numAmount) && numAmount > 0) {
      const tokens = Math.floor(numAmount * 100);
      previewElement.textContent = `${tokens} tokens`;
      
      // Calculate search estimate (assuming 1.5-2.5 tokens per search on average)
      if (estimateElement) {
        const minSearches = Math.floor(tokens / 2.0);
        const maxSearches = Math.floor(tokens / 1.2);
        estimateElement.textContent = `~${minSearches}-${maxSearches} searches`;
      }
    } else if (previewElement) {
      previewElement.textContent = '0 tokens';
      if (estimateElement) {
        estimateElement.textContent = '~0 searches';
      }
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

  // Account deletion methods
  showDeleteAccountModal() {

    const modal = document.getElementById('deleteAccountModal');
    const step1 = document.getElementById('deleteStep1');
    const step2 = document.getElementById('deleteStep2');
    const step3 = document.getElementById('deleteStep3');



    if (!modal) {

      return;
    }

    // Reset to step 1
    if (step1) step1.classList.remove('hidden');
    if (step2) step2.classList.add('hidden');
    if (step3) step3.classList.add('hidden');

    // Clear any previous data
    const codeInput = document.getElementById('confirmationCodeInput');
    const confirmBtn = document.getElementById('confirmDelete');
    
    if (codeInput) codeInput.value = '';
    if (confirmBtn) confirmBtn.disabled = true;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';

  }

  hideDeleteAccountModal() {

    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';

    } else {
      
    }
  }

      // Force close modal
  forceCloseModal() {

    const modal = document.getElementById('deleteAccountModal');
    if (modal) {
      modal.remove();

    }
  }

  async requestAccountDeletion() {
    try {
      const { jwt } = await chrome.storage.local.get(['jwt']);
      if (!jwt) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.authManager.apiBaseUrl}/user/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          step: 'request'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request account deletion');
      }

      // Show step 2 with confirmation code
      this.showConfirmationStep(result);

    } catch (error) {
      // Account deletion request failed - silently handle
      this.showCustomAmountError('Failed to request account deletion. Please try again.');
    }
  }

  showConfirmationStep(result) {
    const step1 = document.getElementById('deleteStep1');
    const step2 = document.getElementById('deleteStep2');
    const codeDisplay = document.getElementById('confirmationCodeDisplay');
    const warningsDiv = document.getElementById('deletionWarnings');

    // Hide step 1, show step 2
    step1.classList.add('hidden');
    step2.classList.remove('hidden');

    // Display confirmation code
    codeDisplay.textContent = result.confirmationCode;

    // Store the code for validation
    this.deletionConfirmationCode = result.confirmationCode;

    // Show warnings if any
    if (result.warnings) {
      const warnings = [];
      if (result.warnings.accountAge) warnings.push(result.warnings.accountAge);
      if (result.warnings.recentPurchases) warnings.push(result.warnings.recentPurchases);
      if (result.warnings.dataLoss) warnings.push(result.warnings.dataLoss);

      if (warnings.length > 0) {
        // Clear existing content safely
        while (warningsDiv.firstChild) {
          warningsDiv.removeChild(warningsDiv.firstChild);
        }
        
        const strongEl = document.createElement('strong');
        strongEl.textContent = 'Important:';
        warningsDiv.appendChild(strongEl);
        warningsDiv.appendChild(document.createElement('br'));
        
        warnings.forEach((warning, index) => {
          if (index > 0) {
            warningsDiv.appendChild(document.createElement('br'));
          }
          const warningEl = document.createTextNode(warning);
          warningsDiv.appendChild(warningEl);
        });
        warningsDiv.style.display = 'block';
      } else {
        warningsDiv.style.display = 'none';
      }
    }
  }

  async confirmAccountDeletion() {
    const codeInput = document.getElementById('confirmationCodeInput');
    const enteredCode = codeInput.value.trim();

    if (enteredCode !== this.deletionConfirmationCode) {
      this.showCustomAmountError('Invalid confirmation code. Please check and try again.');
      return;
    }

    try {
      // Show processing step
      this.showProcessingStep();

      const { jwt } = await chrome.storage.local.get(['jwt']);
      if (!jwt) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${this.authManager.apiBaseUrl}/user/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          step: 'confirm',
          confirmationCode: enteredCode
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Account successfully deleted
      await this.handleAccountDeleted();

    } catch (error) {
      // Account deletion failed - silently handle
      this.showCustomAmountError('Failed to delete account: ' + error.message);
      this.hideDeleteAccountModal();
    }
  }

  showProcessingStep() {
    const step2 = document.getElementById('deleteStep2');
    const step3 = document.getElementById('deleteStep3');

    step2.classList.add('hidden');
    step3.classList.remove('hidden');
  }

  async handleAccountDeleted() {
    // Clear any stored authentication data
    await this.authManager.signOut();
    
    // Update UI to signed-out state
    await this.updateUI();
    
    // Close modal
    this.hideDeleteAccountModal();
    
    // Show a success message or redirect
  }

  // Advanced Settings Methods
  async initializeAdvancedSettings() {
    // Show advanced settings only for signed-in users
    if (this.authManager.isSignedIn()) {
      document.getElementById('advancedSettingsSection')?.classList.remove('hidden');
      
      // Only initialize the textarea content once, or if it's empty and not focused
      // This prevents clearing the user's input while they're typing
      const promptTextarea = document.getElementById('customSystemPrompt');
      if (promptTextarea && 
          (!this.advancedSettingsInitialized || 
           (promptTextarea.value === '' && document.activeElement !== promptTextarea))) {
        const customPrompt = await this.storageManager.getCustomSystemPrompt();
        promptTextarea.value = customPrompt;
        // Update character counter
        this.updateCharacterCounter(promptTextarea);
        this.advancedSettingsInitialized = true;
      }
    } else {
      document.getElementById('advancedSettingsSection')?.classList.add('hidden');
      this.advancedSettingsInitialized = false;
    }
  }

  updateCharacterCounter(textarea) {
    const counter = document.getElementById('promptCharCounter');
    if (!counter || !textarea) return;
    
    const currentLength = textarea.value.length;
    const maxLength = 2000;
    
    counter.textContent = `${currentLength} / ${maxLength} characters`;
    
    // Update styling based on character count
    counter.classList.remove('warning', 'error');
    if (currentLength > maxLength) {
      counter.classList.add('error');
    } else if (currentLength > maxLength * 0.8) {
      counter.classList.add('warning');
    }
  }

  toggleAdvancedSettings() {
    const content = document.getElementById('advancedSettingsContent');
    const icon = document.getElementById('expandIcon');
    
    if (content && icon) {
      const isHidden = content.classList.contains('hidden');
      
      if (isHidden) {
        content.classList.remove('hidden');
        icon.classList.add('expanded');
      } else {
        content.classList.add('hidden');
        icon.classList.remove('expanded');
      }
    }
  }

  toggleRegexPatterns() {
    const content = document.getElementById('regexPatternsContent');
    const icon = document.getElementById('regexExpandIcon');
    
    if (content && icon) {
      const isHidden = content.classList.contains('hidden');
      
      if (isHidden) {
        content.classList.remove('hidden');
        icon.classList.add('expanded');
      } else {
        content.classList.add('hidden');
        icon.classList.remove('expanded');
      }
    }
  }

  async saveCustomPrompt() {
    const promptTextarea = document.getElementById('customSystemPrompt');
    const saveButton = document.getElementById('savePromptButton');
    
    if (!promptTextarea || !saveButton) return;
    
    const customPrompt = promptTextarea.value.trim();
    
    // Validate prompt length (same limit as backend)
    if (customPrompt.length > 2000) {
      // Show error feedback
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Too Long!';
      saveButton.style.background = 'var(--error-color)';
      saveButton.style.color = '#ffffff';
      
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.style.background = '';
        saveButton.style.color = '';
      }, 2000);
      return;
    }
    
    try {
      // Save the custom prompt
      await this.storageManager.saveCustomSystemPrompt(customPrompt);
      
      // Update settings to indicate custom prompt is in use
      const settings = await this.storageManager.getSettings();
      settings.useCustomPrompt = customPrompt.length > 0;
      await this.storageManager.saveSettings(settings);
      
      // Reset initialization flag so the new saved content can be loaded if needed
      this.advancedSettingsInitialized = false;
      
      // Provide visual feedback
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Saved!';
      saveButton.style.background = 'var(--success-bg)';
      saveButton.style.color = 'var(--success-text)';
      
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.style.background = '';
        saveButton.style.color = '';
      }, 2000);
      
    } catch (error) {
      // Failed to save custom prompt - silently handle
      
      // Show error feedback
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Error!';
      saveButton.style.background = 'var(--error-color)';
      saveButton.style.color = '#ffffff';
      
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.style.background = '';
        saveButton.style.color = '';
      }, 2000);
    }
  }

  async resetToDefaultPrompt() {
    const promptTextarea = document.getElementById('customSystemPrompt');
    const resetButton = document.getElementById('resetPromptButton');
    
    if (!promptTextarea || !resetButton) return;
    
    try {
      // Clear the custom prompt
      promptTextarea.value = '';
      this.updateCharacterCounter(promptTextarea);
      await this.storageManager.saveCustomSystemPrompt('');
      
      // Update settings to indicate default prompt is in use
      const settings = await this.storageManager.getSettings();
      settings.useCustomPrompt = false;
      await this.storageManager.saveSettings(settings);
      
      // Reset initialization flag so the cleared content persists
      this.advancedSettingsInitialized = false;
      
      // Provide visual feedback
      const originalText = resetButton.textContent;
      resetButton.textContent = 'Reset!';
      resetButton.style.background = 'var(--surface-hover)';
      
      setTimeout(() => {
        resetButton.textContent = originalText;
        resetButton.style.background = '';
      }, 1500);
      
    } catch (error) {
      // Failed to reset prompt - silently handle
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.smartFinderPopup = new SmartFinderPopup();
}); 