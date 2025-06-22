export class StorageManager {
  constructor() {
    this.storageKeys = {
      LAST_SEARCH: 'findr_last_search',
      USER_SETTINGS: 'findr_user_settings',
      CUSTOM_SYSTEM_PROMPT: 'findr_custom_system_prompt'
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
        useRegex: true,
        aiMode: true,
        useCustomPrompt: false
      };
      return { ...defaultSettings, ...result[this.storageKeys.USER_SETTINGS] };
    } catch (error) {
      return {
        caseSensitive: false,
        wholeWords: false,
        useRegex: true,
        aiMode: true,
        useCustomPrompt: false
      };
    }
  }

  // Save custom system prompt
  async saveCustomSystemPrompt(prompt) {
    try {
      await chrome.storage.local.set({
        [this.storageKeys.CUSTOM_SYSTEM_PROMPT]: prompt || ''
      });
    } catch (error) {
      // Failed to save custom system prompt - silently handle
    }
  }

  // Get custom system prompt
  async getCustomSystemPrompt() {
    try {
      const result = await chrome.storage.local.get(this.storageKeys.CUSTOM_SYSTEM_PROMPT);
      return result[this.storageKeys.CUSTOM_SYSTEM_PROMPT] || '';
    } catch (error) {
      // Failed to get custom system prompt - silently handle
      return '';
    }
  }

  // Get the default system prompt for reference (complete version)
  getDefaultSystemPrompt() {
    return 'You are an assistant designed to help users find specific information in a web page. The user will ask a question or describe what theyre looking for. Your task is to: Search the full webpage content provided below. Identify relevant sections that answer or relate to the users query. Return ONLY a JSON array of strings containing the most relevant text snippets from the provided content. Each string should be exact text from the page - no modifications, no commentary, no explanations. Format: ["exact text snippet 1", "exact text snippet 2", "exact text snippet 3"]. Focus on quality over quantity.';
  }

  // Get the JSON format requirement that's always appended to custom prompts
  getJsonFormatRequirement() {
    return '\n\nIMPORTANT: Return ONLY a JSON array of strings containing the most relevant text snippets from the provided content. Each string should be exact text from the page - no modifications, no commentary, no explanations. Format: ["exact text snippet 1", "exact text snippet 2", "exact text snippet 3"]. Focus on quality over quantity.';
  }

  // Clear all stored data
  async clearAll() {
    try {
      await chrome.storage.local.remove([
        this.storageKeys.LAST_SEARCH,
        this.storageKeys.USER_SETTINGS,
        this.storageKeys.CUSTOM_SYSTEM_PROMPT
      ]);
    } catch (error) {
      // Failed to clear all data - silently handle
    }
  }
} 