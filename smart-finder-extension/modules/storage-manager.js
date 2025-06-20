export class StorageManager {
  constructor() {
    this.storageKeys = {
      LAST_SEARCH: 'findr_last_search',
      USER_SETTINGS: 'findr_user_settings'
    };
  }

  // Save the last search query (including empty strings)
  async saveLastSearch(query) {
    try {
      await chrome.storage.local.set({
        [this.storageKeys.LAST_SEARCH]: query || ''
      });
    } catch (error) {
      }
  }

  // Get the last search query
  async getLastSearch() {
    try {
      const result = await chrome.storage.local.get(this.storageKeys.LAST_SEARCH);
      return result[this.storageKeys.LAST_SEARCH] || '';
    } catch (error) {
      return '';
    }
  }

  // Save user settings
  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({
        [this.storageKeys.USER_SETTINGS]: settings
      });
    } catch (error) {
      }
  }

  // Get user settings with defaults
  async getSettings() {
    try {
      const result = await chrome.storage.local.get(this.storageKeys.USER_SETTINGS);
      const defaultSettings = {
        caseSensitive: false,
        wholeWords: false,
        useRegex: false,
        aiMode: true
      };
      return { ...defaultSettings, ...result[this.storageKeys.USER_SETTINGS] };
    } catch (error) {
      return {
        caseSensitive: false,
        wholeWords: false,
        useRegex: false,
        aiMode: true
      };
    }
  }

  // Clear all stored data (for debugging/reset)
  async clearAll() {
    try {
      await chrome.storage.local.remove([
        this.storageKeys.LAST_SEARCH,
        this.storageKeys.USER_SETTINGS
      ]);
    } catch (error) {
      }
  }
} 