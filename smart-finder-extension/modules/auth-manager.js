/**
 * Modern Chrome Extension Authentication Manager (2024)
 * Follows official Chrome Identity API best practices
 */

class AuthManager {
  constructor() {
    this.apiBaseUrl = 'https://findr-backend-clean-iwy5l8aq7.vercel.app/api';
    this.currentUser = null;
    this.userTokens = 0;
    this.isInitialized = false;
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load user session from storage
      const userData = await chrome.storage.local.get(['user', 'tokens', 'jwt']);
      if (userData.user) {
        this.currentUser = userData.user;
        this.userTokens = userData.tokens || 0;
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  async signInWithGoogle() {
    try {
      console.log('Starting modern Chrome OAuth flow...');
      
      // Clear any existing cached token first
      await this.clearCachedToken();
      
      // Use Chrome's identity API with interactive OAuth
      const token = await this.getValidAccessToken(true);
      
      if (!token) {
        throw new Error('Failed to obtain access token');
      }

      console.log('Got access token, sending to backend...');
      
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
        console.error('Backend authentication failed:', errorText);
        
        // If token is invalid, clear it and throw error
        await this.clearCachedToken();
        throw new Error(`Authentication failed: ${errorText}`);
      }

      const userData = await response.json();
      console.log('Authentication successful:', userData);
      
      // Store user data
      await this.storeUserData(userData);
      
      return userData;
      
    } catch (error) {
      console.error('Google sign-in failed:', error);
      await this.clearCachedToken();
      throw error;
    }
  }

  async getValidAccessToken(interactive = false) {
    try {
      // Check if we have a cached token that's still valid
      if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.log('Using cached access token');
        return this.cachedToken;
      }

      console.log('Requesting new access token...');
      
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
        console.log('New access token obtained and cached');
      }

      return token;
      
    } catch (error) {
      console.error('Failed to get access token:', error);
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
        console.log('Clearing cached Chrome token...');
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token: existingToken }, () => {
            resolve();
          });
        });
      }
    } catch (error) {
      console.log('Error clearing cached token:', error.message);
    }
  }

  async storeUserData(userData) {
    this.currentUser = userData.user;
    this.userTokens = userData.tokens;
    
    await chrome.storage.local.set({
      user: this.currentUser,
      tokens: this.userTokens,
      jwt: userData.jwt
    });
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
      
      console.log('Successfully signed out');
      
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async refreshUserData() {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      const token = await this.getValidAccessToken();
      if (!token) {
        throw new Error('Failed to get access token');
      }

      const response = await fetch(`${this.apiBaseUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh user data');
      }

      const userData = await response.json();
      await this.storeUserData(userData);
      return userData;
      
    } catch (error) {
      console.error('Failed to refresh user data:', error);
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
      
      // Update local token count
      this.userTokens = result.remainingTokens;
      await chrome.storage.local.set({ tokens: this.userTokens });
      
      return result;
      
    } catch (error) {
      console.error('Token consumption failed:', error);
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment session');
      }

      const result = await response.json();
      return result.url;
      
    } catch (error) {
      console.error('Payment URL creation failed:', error);
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

  hasTokens() {
    return this.userTokens > 0;
  }
}

// Make AuthManager available globally for popup (when loaded as script)
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}

// Export for ES6 module usage
export { AuthManager }; 