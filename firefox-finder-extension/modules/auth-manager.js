/**
 * Modern Firefox Extension Authentication Manager (2024)
 * Uses manual OAuth flow since Firefox doesn't support chrome.identity
 * Enhanced with encrypted token storage for security
 */

import { StorageMigration } from './storage-migration.js';

// Use browser API for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : {});

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
    this.daysUntilReset = 0;
    this.nextResetDate = null;
    this.encryptionKey = null;
    this.migrationUtil = new StorageMigration(this);
  }

  // Generate a key for encrypting sensitive data
  async getEncryptionKey() {
    if (this.encryptionKey) return this.encryptionKey;
    
    try {
      // Try to get existing key from storage
      const stored = await browserAPI.storage.local.get(['_ek']);
      if (stored._ek) {
        this.encryptionKey = stored._ek;
        return this.encryptionKey;
      }
      
      // Generate new key if none exists
      const keyArray = new Uint8Array(32);
      crypto.getRandomValues(keyArray);
      this.encryptionKey = Array.from(keyArray);
      
      // Store the key (this is acceptable as it's only for local encryption)
      await browserAPI.storage.local.set({ _ek: this.encryptionKey });
      return this.encryptionKey;
    } catch (error) {
      // Fallback: create a deterministic key from extension ID
      const encoder = new TextEncoder();
      const data = encoder.encode(browserAPI.runtime.id + 'findr_secure_key');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      this.encryptionKey = Array.from(new Uint8Array(hashBuffer));
      return this.encryptionKey;
    }
  }

  // Simple XOR encryption for local storage (better than plaintext)
  async encryptData(data) {
    try {
      const key = await this.getEncryptionKey();
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(jsonString);
      
      const encrypted = new Uint8Array(dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        encrypted[i] = dataBytes[i] ^ key[i % key.length];
      }
      
      return Array.from(encrypted);
    } catch (error) {
      // Fallback to base64 encoding if encryption fails
      return btoa(JSON.stringify(data));
    }
  }

  async decryptData(encryptedData) {
    try {
      if (typeof encryptedData === 'string') {
        // Handle fallback base64 data
        return JSON.parse(atob(encryptedData));
      }
      
      const key = await this.getEncryptionKey();
      const encrypted = new Uint8Array(encryptedData);
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ key[i % key.length];
      }
      
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decrypted);
      return JSON.parse(jsonString);
    } catch (error) {
      // If decryption fails, return null and require re-authentication
      return null;
    }
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Check and perform migration from plaintext to encrypted storage
      await this.migrationUtil.checkAndMigrate();
      
      // Clean up any legacy sensitive storage
      await this.migrationUtil.cleanupLegacyStorage();
      
      // Load user session from storage with decryption
      const userData = await browserAPI.storage.local.get(['user', 'tokens', 'freeTokens', 'paidTokens', '_sjwt', 'lastTokenRefresh', 'daysUntilReset', 'nextResetDate']);
      
      if (userData.user) {
        this.currentUser = userData.user;
        this.userTokens = userData.tokens || 0;
        this.freeTokens = userData.freeTokens || 0;
        this.paidTokens = userData.paidTokens || 0;
        this.lastTokenRefresh = userData.lastTokenRefresh || 0;
        this.daysUntilReset = userData.daysUntilReset || 0;
        this.nextResetDate = userData.nextResetDate || null;
      }
      this.isInitialized = true;
      
      // Auto-refresh if data is stale (older than 30 seconds) - but don't block initialization
      const now = Date.now();
      if (this.currentUser && (!this.lastTokenRefresh || now - this.lastTokenRefresh > 30000)) {
        // Run refresh in background without blocking
        this.refreshUserData().catch(() => {
          // Background refresh failed silently - no logging to prevent token exposure
        });
      }
    } catch (error) {
      // Don't log errors that might contain sensitive data
    }
  }

  // Force reinitialize from storage - useful when auth state might have changed
  async forceRefreshFromStorage() {
    try {
      // Load fresh user session from storage
      const userData = await browserAPI.storage.local.get(['user', 'tokens', 'freeTokens', 'paidTokens', '_sjwt', 'lastTokenRefresh', 'daysUntilReset', 'nextResetDate']);
      
      if (userData.user) {
        this.currentUser = userData.user;
        this.userTokens = userData.tokens || 0;
        this.freeTokens = userData.freeTokens || 0;
        this.paidTokens = userData.paidTokens || 0;
        this.lastTokenRefresh = userData.lastTokenRefresh || 0;
        this.daysUntilReset = userData.daysUntilReset || 0;
        this.nextResetDate = userData.nextResetDate || null;
      } else {
        // No user data in storage, reset state
        this.currentUser = null;
        this.userTokens = 0;
        this.freeTokens = 0;
        this.paidTokens = 0;
        this.lastTokenRefresh = 0;
        this.daysUntilReset = 0;
        this.nextResetDate = null;
      }
    } catch (error) {
      // Silent fail to prevent token exposure
    }
  }

  async signInWithGoogle() {
    console.log('Starting Google sign-in for Firefox...');
    try {
      // Firefox doesn't support chrome.identity, so we use manual OAuth flow
      // Generate a unique state parameter for security
      const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
      console.log('Generated state parameter:', state);
      
      // Store state for verification
      await browserAPI.storage.local.set({ '_oauth_state': state });
      
      // Build OAuth URL with proper parameters for Firefox extension
      const clientId = '148916188620-l2pn60pdkqr8c0dkbe42g1u1sft7ugg5.apps.googleusercontent.com';
      
      // For Firefox, we need to use a different approach
      // Instead of using the backend redirect URL directly, we'll use a loopback address
      let redirectUri;
      
      if (browserAPI.identity && browserAPI.identity.getRedirectURL) {
        // Use Firefox's identity API redirect URL if available
        redirectUri = browserAPI.identity.getRedirectURL();
        console.log('Using Firefox identity redirect URL:', redirectUri);
      } else {
        // Fallback: use loopback address as recommended by Firefox documentation
        redirectUri = 'http://127.0.0.1/mozoauth2/findr-extension';
        console.log('Using fallback redirect URL:', redirectUri);
      }

      const authUrl = `https://accounts.google.com/oauth/authorize?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `state=${state}&` +
        `access_type=offline&` +
        `prompt=consent`;

      console.log('Built auth URL:', authUrl);

      // Check if Firefox supports browser.identity
      if (browserAPI.identity && browserAPI.identity.launchWebAuthFlow) {
        console.log('Attempting to use Firefox identity API...');
        try {
          // Use Firefox's identity API if available
          const redirectUrl = await browserAPI.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
          });
          
          console.log('Received redirect URL:', redirectUrl);
          
          // Extract authorization code from redirect URL
          const urlParams = new URLSearchParams(new URL(redirectUrl).search);
          const code = urlParams.get('code');
          const returnedState = urlParams.get('state');
          
          console.log('Extracted code and state from redirect');
          
          // Verify state parameter
          const storedState = await browserAPI.storage.local.get(['_oauth_state']);
          if (returnedState !== storedState._oauth_state) {
            throw new Error('Invalid state parameter');
          }
          
          console.log('State parameter verified, exchanging code for token...');
          
          // Exchange code for token through your backend
          const response = await fetch(`${this.apiBaseUrl}/auth/google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              code, 
              redirectUri,
              platform: 'firefox-extension'
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log('Token exchange failed:', errorText);
            throw new Error(`Authentication failed: ${errorText}`);
          }

          const userData = await response.json();
          console.log('Authentication successful, storing user data...');
          await this.storeUserData(userData);
          
          return userData;
        } catch (identityError) {
          console.log('Firefox identity API failed, falling back to manual flow:', identityError);
          // Fall through to manual flow
        }
      } else {
        console.log('Firefox identity API not available, using manual flow...');
      }
      
      // Fallback: Open manual OAuth flow in new tab
      // This is the approach that should work for Firefox extensions
      console.log('Using manual OAuth flow for Firefox...');
      
      // Create a special URL that opens the auth flow in a new tab
      // and provides instructions for completing authentication
      const manualAuthUrl = `${this.apiBaseUrl}/auth/google/firefox-extension?state=${state}`;
      console.log('Opening manual auth URL:', manualAuthUrl);
      
      // Send message to background script to open the authentication tab
      browserAPI.runtime.sendMessage({ 
        action: 'startManualAuth',
        url: manualAuthUrl
      });
      
      throw new Error('Please complete authentication in the opened tab. After signing in, come back and try again.');
      
    } catch (error) {
      console.log('Sign-in error:', error);
      throw error;
    }
  }

  // Firefox doesn't have getValidAccessToken, so we'll work with stored JWT tokens
  async getValidAccessToken(interactive = false) {
    // Firefox doesn't support chrome.identity.getAuthToken
    // Instead, check if we have a valid JWT token stored
    const storedJWT = await this.getStoredJWT();
    if (storedJWT) {
      return storedJWT;
    }
    
    if (interactive) {
      // Trigger manual OAuth flow
      await this.signInWithGoogle();
      return await this.getStoredJWT();
    }
    
    return null;
  }

  async clearCachedToken() {
    // Clear any cached authentication data
    this.cachedToken = null;
    this.tokenExpiry = null;
    
    try {
      // Clear stored tokens and auth state
      await browserAPI.storage.local.remove(['_sjwt', '_oauth_state']);
    } catch (error) {
      // Silent fail
    }
  }

  async storeUserData(userData) {
    this.currentUser = userData.user;
    this.userTokens = userData.tokens;
    this.freeTokens = userData.freeTokens || 0;
    this.paidTokens = userData.paidTokens || 0;
    this.daysUntilReset = userData.daysUntilReset || 0;
    this.nextResetDate = userData.nextResetDate || null;
    
    // Encrypt JWT token before storage
    const encryptedJWT = await this.encryptData(userData.jwt);
    
    const storageData = {
      user: this.currentUser,
      tokens: this.userTokens,
      freeTokens: this.freeTokens,
      paidTokens: this.paidTokens,
      _sjwt: encryptedJWT, // Store encrypted JWT with obfuscated key
      lastTokenRefresh: this.lastTokenRefresh || Date.now(),
      daysUntilReset: this.daysUntilReset,
      nextResetDate: this.nextResetDate
    };
    
    await browserAPI.storage.local.set(storageData);
  }

  async getStoredJWT() {
    try {
      const { _sjwt } = await browserAPI.storage.local.get(['_sjwt']);
      if (!_sjwt) return null;
      
      const jwt = await this.decryptData(_sjwt);
      return jwt;
    } catch (error) {
      return null;
    }
  }

  // Email authentication methods removed - OAuth-only implementation

  async signOut() {
    try {
      // Clear cached tokens
      await this.clearCachedToken();
      
      // Clear local storage
      await browserAPI.storage.local.clear();
      
      // Reset state
      this.currentUser = null;
      this.userTokens = 0;
      this.freeTokens = 0;
      this.paidTokens = 0;
      this.lastTokenRefresh = 0;
      
    } catch (error) {
      // Silent fail
    }
  }

  async refreshUserData() {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      // Get the stored JWT token (encrypted)
      const jwt = await this.getStoredJWT();
      if (!jwt) {
        throw new Error('No JWT token found - please sign in again');
      }

  
      const response = await fetch(`${this.apiBaseUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to refresh user data');
      }

      const userData = await response.json();

      
      // Update the stored data with the new values but keep the same JWT
      this.lastTokenRefresh = Date.now();
      await this.storeUserData({
        user: userData.user,
        tokens: userData.tokens,
        freeTokens: userData.freeTokens,
        paidTokens: userData.paidTokens,
        daysUntilReset: userData.daysUntilReset,
        nextResetDate: userData.nextResetDate,
        jwt: jwt  // Keep the existing JWT
      });
      

      
      return userData;
      
    } catch (error) {
      throw error;
    }
  }

  async consumeToken() {
    try {
      if (!this.currentUser || this.userTokens <= 0) {
        throw new Error('No tokens available');
      }

      const jwt = await this.getStoredJWT();
      
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
      await browserAPI.storage.local.set({ 
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
      const jwt = await this.getStoredJWT();
      
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

  getDaysUntilReset() {
    return this.daysUntilReset;
  }

  getNextResetDate() {
    return this.nextResetDate;
  }

  hasTokens() {
    // Calculate actual total from free + paid tokens for accuracy
    const actualTotal = this.freeTokens + this.paidTokens;
    
    // Update userTokens if it's out of sync
    if (this.userTokens !== actualTotal) {
      this.userTokens = actualTotal;
      // Update storage asynchronously
      browserAPI.storage.local.set({ tokens: this.userTokens }).catch(() => {});
    }
    
    return actualTotal > 0;
  }

  async syncUser() {
    try {
      const jwt = await this.getStoredJWT();
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

// Export for ES6 module usage
export { AuthManager };