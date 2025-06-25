/**
 * Storage Migration Utility
 * Safely migrates users from plaintext to encrypted token storage
 */

// Use browser API for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : {});

export class StorageMigration {
  constructor(authManager) {
    this.authManager = authManager;
    this.migrationVersion = '1.1.0'; // Version when encryption was added
  }

  /**
   * Check if migration is needed and perform it
   */
  async checkAndMigrate() {
    try {
      const { migrationCompleted, jwt } = await browserAPI.storage.local.get(['migrationCompleted', 'jwt']);
      
      // If migration already completed, skip
      if (migrationCompleted === this.migrationVersion) {
        return { success: true, migrated: false };
      }
      
      // If there's a plaintext JWT, migrate it
      if (jwt && typeof jwt === 'string') {
        await this.migratePlaintextToken(jwt);
        return { success: true, migrated: true };
      }
      
      // Mark migration as completed even if no data to migrate
      await browserAPI.storage.local.set({ migrationCompleted: this.migrationVersion });
      return { success: true, migrated: false };
      
    } catch (error) {
      // Silent fail - migration is not critical
      return { success: false, error: error.message };
    }
  }

  /**
   * Migrate a plaintext JWT token to encrypted storage
   */
  async migratePlaintextToken(plaintextJWT) {
    try {
      // Encrypt the plaintext JWT
      const encryptedJWT = await this.authManager.encryptData(plaintextJWT);
      
      // Store encrypted version and remove plaintext
      await browserAPI.storage.local.set({
        _sjwt: encryptedJWT,
        migrationCompleted: this.migrationVersion
      });
      
      // Remove the old plaintext token
      await browserAPI.storage.local.remove(['jwt']);
      
      return true;
    } catch (error) {
      // If encryption fails, remove the plaintext token anyway for security
      await browserAPI.storage.local.remove(['jwt']);
      throw error;
    }
  }

  /**
   * Clean up any legacy storage keys that might contain sensitive data
   */
  async cleanupLegacyStorage() {
    try {
      const keysToRemove = [
        'authToken', // Old auth token key
        'accessToken', // Old access token key
        'googleToken', // Old Google token key
        'sessionToken', // Old session token key
        'bearerToken', // Old bearer token key
        'oauthToken', // Old OAuth token key
      ];
      
      await browserAPI.storage.local.remove(keysToRemove);
      
      // Also clean up any keys that might be accidentally storing tokens
      const allStorage = await browserAPI.storage.local.get();
      const suspiciousKeys = [];
      
      for (const [key, value] of Object.entries(allStorage)) {
        if (typeof value === 'string' && this.looksLikeToken(value)) {
          suspiciousKeys.push(key);
        }
      }
      
      if (suspiciousKeys.length > 0) {
        await browserAPI.storage.local.remove(suspiciousKeys);
      }
      
      return { cleaned: keysToRemove.length + suspiciousKeys.length };
    } catch (error) {
      return { cleaned: 0, error: error.message };
    }
  }

  /**
   * Check if a string looks like a token that should be encrypted
   */
  looksLikeToken(value) {
    if (!value || typeof value !== 'string') return false;
    
    // JWT tokens start with eyJ
    if (value.startsWith('eyJ')) return true;
    
    // Bearer tokens
    if (value.startsWith('Bearer ')) return true;
    
    // Long base64-like strings
    if (value.length > 50 && /^[A-Za-z0-9+/=_-]+$/.test(value)) return true;
    
    // Google OAuth tokens (start with ya29.)
    if (value.startsWith('ya29.')) return true;
    
    return false;
  }

  /**
   * Get migration status for debugging
   */
  async getMigrationStatus() {
    try {
      const storage = await browserAPI.storage.local.get();
      const status = {
        migrationCompleted: storage.migrationCompleted || 'none',
        hasEncryptedJWT: !!storage._sjwt,
        hasPlaintextJWT: !!storage.jwt,
        hasEncryptionKey: !!storage._ek,
        suspiciousKeys: []
      };
      
      // Check for suspicious keys (for debugging)
      for (const [key, value] of Object.entries(storage)) {
        if (typeof value === 'string' && this.looksLikeToken(value)) {
          status.suspiciousKeys.push(key);
        }
      }
      
      return status;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Force re-migration (for development/testing)
   */
  async forceMigration() {
    try {
      await browserAPI.storage.local.remove(['migrationCompleted']);
      return await this.checkAndMigrate();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in auth manager
export default StorageMigration; 