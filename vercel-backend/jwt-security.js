/**
 * Secure JWT Token Validation
 * Enhanced security for JWT token handling
 */

import jwt from 'jsonwebtoken';

export class JWTSecurityError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'JWTSecurityError';
    this.code = code;
  }
}

export function validateAndDecodeJWT(token) {
  if (!token) {
    throw new JWTSecurityError('No token provided', 'NO_TOKEN');
  }

  // Security: Validate token format
  if (typeof token !== 'string') {
    throw new JWTSecurityError('Invalid token format', 'INVALID_FORMAT');
  }

  // Security: Check token length (JWT tokens should be reasonable length)
  if (token.length < 50 || token.length > 2000) {
    throw new JWTSecurityError('Invalid token length', 'INVALID_LENGTH');
  }

  // Security: Validate JWT structure (should have 3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JWTSecurityError('Invalid token structure', 'INVALID_STRUCTURE');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      // Security: Add additional verification options
      algorithms: ['HS256'], // Only allow HMAC SHA256
      maxAge: '30d', // Maximum age of 30 days
      clockTolerance: 60, // Allow 60 seconds clock skew
    });

    // Security: Validate required claims
    if (!decoded.userId) {
      throw new JWTSecurityError('Missing required userId claim', 'MISSING_USERID');
    }

    if (!decoded.email) {
      throw new JWTSecurityError('Missing required email claim', 'MISSING_EMAIL');
    }

    // Security: Validate userId format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(decoded.userId)) {
      throw new JWTSecurityError('Invalid userId format', 'INVALID_USERID_FORMAT');
    }

    // Security: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(decoded.email)) {
      throw new JWTSecurityError('Invalid email format', 'INVALID_EMAIL_FORMAT');
    }

    return decoded;

  } catch (error) {
    if (error instanceof JWTSecurityError) {
      throw error;
    }

    // Handle jwt library errors
    if (error.name === 'TokenExpiredError') {
      throw new JWTSecurityError('Token has expired', 'EXPIRED');
    } else if (error.name === 'JsonWebTokenError') {
      throw new JWTSecurityError('Invalid token', 'INVALID');
    } else if (error.name === 'NotBeforeError') {
      throw new JWTSecurityError('Token not active yet', 'NOT_ACTIVE');
    } else {
      throw new JWTSecurityError('Token verification failed', 'VERIFICATION_FAILED');
    }
  }
}

export function extractAndValidateJWT(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new JWTSecurityError('Missing authorization header', 'NO_AUTH_HEADER');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new JWTSecurityError('Invalid authorization header format', 'INVALID_AUTH_FORMAT');
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  return validateAndDecodeJWT(token);
}

export function handleJWTError(error, res) {
  console.warn('JWT validation failed:', error.message, 'Code:', error.code);
  
  switch (error.code) {
    case 'NO_TOKEN':
    case 'NO_AUTH_HEADER':
    case 'INVALID_AUTH_FORMAT':
      return res.status(401).json({ error: 'Authentication required' });
    
    case 'EXPIRED':
      return res.status(401).json({ error: 'Token expired, please sign in again' });
    
    case 'INVALID':
    case 'INVALID_FORMAT':
    case 'INVALID_LENGTH':
    case 'INVALID_STRUCTURE':
    case 'VERIFICATION_FAILED':
      return res.status(401).json({ error: 'Invalid token, please sign in again' });
    
    case 'MISSING_USERID':
    case 'MISSING_EMAIL':
    case 'INVALID_USERID_FORMAT':
    case 'INVALID_EMAIL_FORMAT':
      return res.status(401).json({ error: 'Invalid token claims, please sign in again' });
    
    default:
      return res.status(401).json({ error: 'Authentication failed' });
  }
} 