/**
 * Security Utilities - Safe logging and data handling
 * Prevents accidental exposure of sensitive data in logs
 */

/**
 * Safely logs data while masking sensitive information
 * @param {string} level - Log level (log, error, warn, info)
 * @param {string} message - Log message
 * @param {any} data - Data to log (will be sanitized)
 */
export function safeLog(level, message, data = null) {
  const sanitizedData = data ? sanitizeForLogging(data) : '';
  
  if (process.env.NODE_ENV === 'development') {
    console[level](message, sanitizedData);
  } else {
    // In production, only log errors and warnings
    if (level === 'error' || level === 'warn') {
      console[level](message, sanitizedData);
    }
  }
}

/**
 * Sanitizes data for safe logging by masking sensitive fields
 * @param {any} data - Data to sanitize
 * @returns {any} - Sanitized data safe for logging
 */
export function sanitizeForLogging(data) {
  if (!data) return data;
  
  // Handle different data types
  if (typeof data === 'string') {
    return maskSensitiveString(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (isSensitiveField(key)) {
        sanitized[key] = maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Checks if a field name indicates sensitive data
 * @param {string} fieldName - Field name to check
 * @returns {boolean} - True if field is sensitive
 */
function isSensitiveField(fieldName) {
  const sensitiveFields = [
    'token', 'jwt', 'password', 'secret', 'key', 'auth', 'authorization',
    'bearer', 'api_key', 'access_token', 'refresh_token', 'session_id',
    'session_token', 'oauth_token', 'client_secret', 'private_key',
    'encryption_key', 'webhook_secret', 'stripe_key', 'groq_key'
  ];
  
  const lowerField = fieldName.toLowerCase();
  return sensitiveFields.some(sensitive => lowerField.includes(sensitive));
}

/**
 * Masks a sensitive value for logging
 * @param {any} value - Value to mask
 * @returns {string} - Masked value
 */
function maskValue(value) {
  if (!value) return '[EMPTY]';
  
  const str = String(value);
  if (str.length <= 4) {
    return '[MASKED]';
  }
  
  // Show first 2 and last 2 characters for debugging purposes
  return `${str.slice(0, 2)}...${str.slice(-2)} [${str.length} chars]`;
}

/**
 * Masks sensitive patterns in strings
 * @param {string} str - String to check and mask
 * @returns {string} - String with sensitive patterns masked
 */
function maskSensitiveString(str) {
  // Mask JWT tokens (they start with eyJ)
  str = str.replace(/eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=_-]+/g, 'eyJ...[JWT_MASKED]');
  
  // Mask Bearer tokens
  str = str.replace(/Bearer\s+[A-Za-z0-9+/=_-]+/gi, 'Bearer [TOKEN_MASKED]');
  
  // Mask API keys that look like common patterns
  str = str.replace(/[A-Za-z0-9+/=_-]{32,}/g, (match) => {
    if (match.length > 16) {
      return `${match.slice(0, 4)}...[KEY_MASKED]`;
    }
    return match;
  });
  
  return str;
}

/**
 * Safely formats error messages without exposing sensitive data
 * @param {Error} error - Error object
 * @param {object} context - Additional context (will be sanitized)
 * @returns {object} - Safe error object for logging
 */
export function sanitizeError(error, context = {}) {
  return {
    message: error.message,
    name: error.name,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    context: sanitizeForLogging(context),
    timestamp: new Date().toISOString()
  };
}

/**
 * Rate-limited safe logging to prevent log spam
 */
class RateLimitedLogger {
  constructor() {
    this.logCounts = new Map();
    this.resetInterval = 60000; // Reset counts every minute
    
    setInterval(() => {
      this.logCounts.clear();
    }, this.resetInterval);
  }
  
  log(level, message, data = null, maxPerMinute = 10) {
    const key = `${level}:${message}`;
    const count = this.logCounts.get(key) || 0;
    
    if (count < maxPerMinute) {
      this.logCounts.set(key, count + 1);
      safeLog(level, message, data);
    } else if (count === maxPerMinute) {
      this.logCounts.set(key, count + 1);
      safeLog('warn', `Log message rate limited: ${message}`);
    }
  }
}

export const rateLimitedLogger = new RateLimitedLogger();

/**
 * Validates that environment variables don't contain obvious test/example values
 * @param {string} varName - Environment variable name
 * @param {string} value - Environment variable value
 * @returns {boolean} - True if value appears to be a real secret
 */
export function validateSecretValue(varName, value) {
  if (!value) return false;
  
  const testPatterns = [
    'test', 'example', 'demo', 'placeholder', 'your_', 'replace_me',
    'sk_test_', 'pk_test_', 'dev_', 'development'
  ];
  
  const lowerValue = value.toLowerCase();
  const hasTestPattern = testPatterns.some(pattern => lowerValue.includes(pattern));
  
  if (hasTestPattern) {
    safeLog('warn', `Potentially test value detected for ${varName}`);
    return false;
  }
  
  // Check minimum length for different secret types
  const minLengths = {
    JWT_SECRET: 32,
    GROQ_API_KEY: 20,
    STRIPE_SECRET_KEY: 20,
    SUPABASE_SERVICE_KEY: 50
  };
  
  const minLength = minLengths[varName] || 16;
  if (value.length < minLength) {
    safeLog('warn', `${varName} appears too short (${value.length} chars, min: ${minLength})`);
    return false;
  }
  
  return true;
}

export default {
  safeLog,
  sanitizeForLogging,
  sanitizeError,
  rateLimitedLogger,
  validateSecretValue
}; 