/**
 * Modern Chrome Extension Authentication Manager (2024)
 * Follows official Chrome Identity API best practices
 */

class AuthManager {
  constructor() {
    this.apiBaseUrl = 'https://findr-api-backend.vercel.app/api';
    this.currentUser = null;
    this.userTokens = 0;
    this.freeTokens = 0;
    this.paidTokens = 0;
    this.lastTokenRefresh = 0;
    this.isInitialized = false;
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load user session from storage
      const userData = await chrome.storage.local.get(['user', 'tokens', 'freeTokens', 'paidTokens', 'jwt', 'lastTokenRefresh']);
      
      if (userData.user) {
        this.currentUser = userData.user;
        this.userTokens = userData.tokens || 0;
        this.freeTokens = userData.freeTokens || 0;
        this.paidTokens = userData.paidTokens || 0;
        this.lastTokenRefresh = userData.lastTokenRefresh || 0;
      }
      this.isInitialized = true;
      
      // Auto-refresh if data is stale (older than 30 seconds)
      const now = Date.now();
      if (this.currentUser && (!this.lastTokenRefresh || now - this.lastTokenRefresh > 30000)) {
        try {
          await this.refreshUserData();
        } catch (error) {
          // Ignore refresh errors during initialization
        }
      }
    } catch (error) {
    }
  }

  async signInWithGoogle() {
    try {
      // Clear any existing cached token first
      await this.clearCachedToken();
      
      // Use Chrome's identity API with interactive OAuth
      const token = await this.getValidAccessToken(true);
      
      if (!token) {
        throw new Error('Failed to obtain access token');
      }

      // Send token to backend for validation and user creation
      const response = await fetch(`${this.apiBaseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If token is invalid, clear it and throw error
        await this.clearCachedToken();
        throw new Error(`Authentication failed: ${errorText}`);
      }

      const userData = await response.json();
      // Store user data
      await this.storeUserData(userData);
      
      return userData;
      
    } catch (error) {
      await this.clearCachedToken();
      throw error;
    }
  }

  async getValidAccessToken(interactive = false) {
    try {
      // Check if we have a cached token that's still valid
      if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.cachedToken;
      }

      // Get new token from Chrome identity API
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ 
          interactive: interactive 
        }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });

      if (token) {
        // Cache the token with a reasonable expiry (55 minutes, tokens usually last 1 hour)
        this.cachedToken = token;
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
      }

      return token;
      
    } catch (error) {
      throw error;
    }
  }

  async clearCachedToken() {
    try {
      // Clear our cached token
      this.cachedToken = null;
      this.tokenExpiry = null;
      
      // Remove any cached tokens from Chrome
      const existingToken = await new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          resolve(token || null);
        });
      });
      
      if (existingToken) {
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token: existingToken }, () => {
            resolve();
          });
        });
      }
    } catch (error) {
    }
  }

  async storeUserData(userData) {
    this.currentUser = userData.user;
    this.userTokens = userData.tokens;
    this.freeTokens = userData.freeTokens || 0;
    this.paidTokens = userData.paidTokens || 0;
    
    const storageData = {
      user: this.currentUser,
      tokens: this.userTokens,
      freeTokens: this.freeTokens,
      paidTokens: this.paidTokens,
      jwt: userData.jwt,
      lastTokenRefresh: this.lastTokenRefresh || Date.now()
    };
    
    await chrome.storage.local.set(storageData);
  }

  // Email authentication methods removed - OAuth-only implementation

  async signOut() {
    try {
      // Clear cached tokens
      await this.clearCachedToken();
      
      // Clear local storage
      await chrome.storage.local.clear();
      
      // Reset state
      this.currentUser = null;
      this.userTokens = 0;
      this.freeTokens = 0;
      this.paidTokens = 0;
      this.lastTokenRefresh = 0;
      
    } catch (error) {
    }
  }

  async refreshUserData() {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      // Get the stored JWT token (not the OAuth access token)
      const { jwt } = await chrome.storage.local.get(['jwt']);
      if (!jwt) {
        throw new Error('No JWT token found - please sign in again');
      }

      console.log('Refreshing user data...');
      const response = await fetch(`${this.apiBaseUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Refresh failed with status:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to refresh user data');
      }

      const userData = await response.json();
      console.log('Received fresh user data:', userData);
      
      // Update the stored data with the new values but keep the same JWT
      this.lastTokenRefresh = Date.now();
      await this.storeUserData({
        user: userData.user,
        tokens: userData.tokens,
        freeTokens: userData.freeTokens,
        paidTokens: userData.paidTokens,
        jwt: jwt  // Keep the existing JWT
      });
      
      console.log('User data refreshed successfully. New tokens:', {
        total: this.userTokens,
        free: this.freeTokens,
        paid: this.paidTokens
      });
      
      return userData;
      
    } catch (error) {
      console.error('refreshUserData error:', error);
      throw error;
    }
  }

  async consumeToken() {
    try {
      if (!this.currentUser || this.userTokens <= 0) {
        throw new Error('No tokens available');
      }

      const { jwt } = await chrome.storage.local.get(['jwt']);
      
      const response = await fetch(`${this.apiBaseUrl}/user/consume-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to consume token');
      }

      const result = await response.json();
      
      // Update local token counts
      this.userTokens = result.remainingTokens;
      this.freeTokens = result.freeTokens || 0;
      this.paidTokens = result.paidTokens || 0;
      await chrome.storage.local.set({ 
        tokens: this.userTokens,
        freeTokens: this.freeTokens,
        paidTokens: this.paidTokens
      });
      
      return result;
      
    } catch (error) {
      throw error;
    }
  }

  async getPaymentUrl(tokenAmount) {
    try {
      const { jwt } = await chrome.storage.local.get(['jwt']);
      
      const response = await fetch(`${this.apiBaseUrl}/payments/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ tokenAmount })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const result = await response.json();
      return result.paymentUrl;  // Use 'paymentUrl' instead of 'url'
      
    } catch (error) {
      throw error;
    }
  }

  isSignedIn() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getTokenCount() {
    return this.userTokens;
  }

  getFreeTokens() {
    return this.freeTokens;
  }

  getPaidTokens() {
    return this.paidTokens;
  }

  hasTokens() {
    // Calculate actual total from free + paid tokens for accuracy
    const actualTotal = this.freeTokens + this.paidTokens;
    
    // Update userTokens if it's out of sync
    if (this.userTokens !== actualTotal) {
      this.userTokens = actualTotal;
      // Update storage asynchronously
      chrome.storage.local.set({ tokens: this.userTokens }).catch(() => {});
    }
    
    return actualTotal > 0;
  }

  async debugJWT() {
    // Debug functionality removed
    return { debug: 'not_available' };
  }

  async syncUser() {
    try {
      const { jwt } = await chrome.storage.local.get(['jwt']);
      if (!jwt) {
        throw new Error('No JWT token found');
      }
      
      const response = await fetch(`${this.apiBaseUrl}/user/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sync user');
      }

      const result = await response.json();
      // Update local user data if sync was successful
      if (result.synced) {
        await this.storeUserData({
          user: result.user,
          tokens: result.tokens,
          jwt: jwt
        });
      }
      
      return result;
      
    } catch (error) {
      throw error;
    }
  }
}

// Make AuthManager available globally for popup (when loaded as script)
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}

// Export for ES6 module usage
export { AuthManager }; 