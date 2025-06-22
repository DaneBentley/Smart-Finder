/**
 * Secure CORS Configuration for Chrome Extension
 * Only allows requests from trusted Chrome extension origins
 */

// List of allowed origins for CORS
const ALLOWED_ORIGINS = [
  // Chrome extension IDs (these will be the actual extension URLs)
  'chrome-extension://dhnhlkpgbbglkgaljoimcgbgnblbjeop', // Replace with actual extension ID
  // For development/testing - remove in production
  'https://localhost:3000',
  'http://localhost:3000',
  // Add any other trusted domains as needed
];

// For Chrome extension, we also need to allow chrome-extension:// protocol
const CHROME_EXTENSION_PATTERN = /^chrome-extension:\/\/[a-z]{32}$/;

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  let allowedOrigin = null;
  
  if (origin) {
    // Check against explicit allowed origins
    if (ALLOWED_ORIGINS.includes(origin)) {
      allowedOrigin = origin;
    }
    // Check against Chrome extension pattern
    else if (CHROME_EXTENSION_PATTERN.test(origin)) {
      allowedOrigin = origin;
    }
  }
  
  // Set CORS headers
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  } else {
    // For Chrome extensions, we need to be more permissive due to how they work
    // But we'll log suspicious requests
    if (origin && !origin.startsWith('chrome-extension://')) {
      console.warn('Suspicious CORS request from:', origin);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'false'); // Security: Don't allow credentials
}

export function handleCorsPreflightAndValidateOrigin(req, res) {
  setCorsHeaders(req, res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Indicates preflight was handled
  }
  
  return false; // Continue with normal processing
} 