// Analytics Manager for Smart Finder Chrome Extension
// Privacy-focused analytics following Chrome extension best practices

export class AnalyticsManager {
  constructor() {
    this.GA_MEASUREMENT_ID = 'G-TVZCG903H4';
    this.isInitialized = false;
    this.analyticsEnabled = true; // Default to enabled, can be controlled by user settings
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Check if analytics is enabled in user settings
      const settings = await chrome.storage.sync.get(['analyticsEnabled']);
      this.analyticsEnabled = settings.analyticsEnabled !== false; // Default to true
      
      if (this.analyticsEnabled) {
        await this.loadGoogleAnalytics();
        this.configureAnalytics();
        this.isInitialized = true;
        
        // Check for first-time installation tracking
        await this.checkAndTrackInstallation();
      }
    } catch (error) {
      console.debug('Analytics initialization failed:', error);
    }
  }

  async checkAndTrackInstallation() {
    try {
      const data = await chrome.storage.local.get(['extensionInstalled', 'installTracked']);
      
      if (data.extensionInstalled && !data.installTracked) {
        this.trackExtensionInstall();
        await chrome.storage.local.set({ installTracked: true });
      }
    } catch (error) {
      console.debug('Installation tracking failed:', error);
    }
  }

  async loadGoogleAnalytics() {
    // Use Measurement Protocol for Chrome extensions instead of gtag
    // This avoids CSP issues and is more suitable for extensions
    this.clientId = await this.getOrCreateClientId();
    this.sessionId = Date.now().toString();
  }

  async getOrCreateClientId() {
    try {
      const stored = await chrome.storage.local.get(['analytics_client_id']);
      if (stored.analytics_client_id) {
        return stored.analytics_client_id;
      }
      
      // Generate a random client ID
      const clientId = 'ext.' + Math.random().toString(36).substring(2) + '.' + Date.now();
      await chrome.storage.local.set({ analytics_client_id: clientId });
      return clientId;
    } catch (error) {
      // Fallback client ID
      return 'ext.fallback.' + Date.now();
    }
  }

  configureAnalytics() {
    // Configuration is handled in the measurement protocol requests
    // No gtag configuration needed
  }

  // Track extension installation/activation
  trackExtensionInstall() {
    this.trackEvent('extension_lifecycle', 'install');
  }

  // Track popup opens
  trackPopupOpen() {
    this.trackEvent('popup', 'open');
  }

  // Track search actions
  trackSearch(searchType = 'basic') {
    this.trackEvent('search', 'initiated', { search_type: searchType });
  }

  // Track AI search usage
  trackAISearch() {
    this.trackEvent('ai_search', 'used');
  }

  // Track authentication events
  trackAuth(action) {
    this.trackEvent('authentication', action); // 'signin' or 'signout'
  }

  // Track feature usage
  trackFeatureUsage(feature) {
    this.trackEvent('feature_usage', feature);
  }

  // Track settings changes
  trackSettingsChange(setting, value) {
    this.trackEvent('settings', 'change', { 
      setting_name: setting,
      setting_value: value 
    });
  }

  // Track errors (no PII)
  trackError(errorType, category = 'general') {
    this.trackEvent('error', category, { error_type: errorType });
  }

  // Generic event tracking method
  trackEvent(eventName, action, parameters = {}) {
    if (!this.analyticsEnabled || !this.isInitialized) {
      return;
    }

    try {
      // Ensure no PII is tracked
      const sanitizedParams = this.sanitizeParameters(parameters);
      
      // Send event via Measurement Protocol
      this.sendMeasurementProtocolEvent(eventName, action, sanitizedParams);
    } catch (error) {
      console.debug('Analytics tracking error:', error);
    }
  }

  async sendMeasurementProtocolEvent(eventName, action, parameters = {}) {
    try {
      const payload = {
        // Required fields
        measurement_id: this.GA_MEASUREMENT_ID,
        client_id: this.clientId,
        // Events array
        events: [{
          name: action,
          parameters: {
            event_category: eventName,
            session_id: this.sessionId,
            engagement_time_msec: '1',
            ...parameters
          }
        }]
      };

      // Send to Google Analytics via Measurement Protocol
      await fetch('https://www.google-analytics.com/mp/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.debug('Failed to send analytics event:', error);
    }
  }

  // Sanitize parameters to ensure no PII
  sanitizeParameters(params) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Only allow specific safe parameter types
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        // Avoid any potential PII patterns
        if (!this.containsPotentialPII(String(value))) {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }

  // Basic PII detection (emails, IPs, etc.)
  containsPotentialPII(value) {
    const piiPatterns = [
      /@/, // Email patterns
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card patterns
    ];
    
    return piiPatterns.some(pattern => pattern.test(value));
  }

  // Enable/disable analytics
  async setAnalyticsEnabled(enabled) {
    this.analyticsEnabled = enabled;
    await chrome.storage.sync.set({ analyticsEnabled: enabled });
    
    if (enabled && !this.isInitialized) {
      await this.initialize();
    }
    
    this.trackSettingsChange('analytics_enabled', enabled);
  }

  // Get analytics status
  isEnabled() {
    return this.analyticsEnabled;
  }
} 