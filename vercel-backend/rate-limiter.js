/**
 * Server-side Rate Limiting for AI API
 * Prevents abuse and ensures fair usage
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting configurationz
const RATE_LIMITS = {
  requestsPerMinute: 10,     // Max 10 requests per minute per user
  requestsPerHour: 70,       // Max 60 requests per hour per user  
  requestsPerDay: 200,       // Max 200 requests per day per user
  globalRequestsPerMinute: 100, // Global rate limit across all users
};

class RateLimiter {
  constructor() {
    this.globalRequestCount = new Map();
  }

  async checkUserRateLimit(userId) {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Get recent requests for this user
      const { data: recentRequests, error } = await supabase
        .from('api_requests')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Rate limit check error:', error);
        // Allow request if we can't check (fail open for availability)
        return { allowed: true, message: 'Rate limit check unavailable' };
      }

      // Count requests in different time windows
      const requestsLastMinute = recentRequests.filter(
        req => new Date(req.created_at) > oneMinuteAgo
      ).length;

      const requestsLastHour = recentRequests.filter(
        req => new Date(req.created_at) > oneHourAgo
      ).length;

      const requestsLastDay = recentRequests.length;

      // Check limits
      if (requestsLastMinute >= RATE_LIMITS.requestsPerMinute) {
        return {
          allowed: false,
          message: `Rate limit exceeded: ${requestsLastMinute}/${RATE_LIMITS.requestsPerMinute} requests per minute`,
          retryAfter: 60
        };
      }

      if (requestsLastHour >= RATE_LIMITS.requestsPerHour) {
        return {
          allowed: false,
          message: `Rate limit exceeded: ${requestsLastHour}/${RATE_LIMITS.requestsPerHour} requests per hour`,
          retryAfter: 3600
        };
      }

      if (requestsLastDay >= RATE_LIMITS.requestsPerDay) {
        return {
          allowed: false,
          message: `Rate limit exceeded: ${requestsLastDay}/${RATE_LIMITS.requestsPerDay} requests per day`,
          retryAfter: 86400
        };
      }

      return { allowed: true, message: 'Rate limit check passed' };

    } catch (error) {
      console.error('Rate limit error:', error);
      // Allow request if there's an error (fail open)
      return { allowed: true, message: 'Rate limit check failed' };
    }
  }

  async checkGlobalRateLimit() {
    const now = Math.floor(Date.now() / 1000 / 60); // Current minute
    const currentCount = this.globalRequestCount.get(now) || 0;
    
    if (currentCount >= RATE_LIMITS.globalRequestsPerMinute) {
      return {
        allowed: false,
        message: 'Global rate limit exceeded. Please try again later.',
        retryAfter: 60
      };
    }

    return { allowed: true, message: 'Global rate limit check passed' };
  }

  async recordRequest(userId, endpoint, metadata = {}) {
    try {
      // Record the request
      await supabase
        .from('api_requests')
        .insert({
          user_id: userId,
          endpoint: endpoint,
          created_at: new Date().toISOString(),
          metadata: metadata
        });

      // Update global counter
      const now = Math.floor(Date.now() / 1000 / 60);
      const currentCount = this.globalRequestCount.get(now) || 0;
      this.globalRequestCount.set(now, currentCount + 1);

      // Clean old entries
      this.cleanOldEntries();

    } catch (error) {
      console.error('Error recording request:', error);
      // Don't fail the request if we can't record it
    }
  }

  cleanOldEntries() {
    const now = Math.floor(Date.now() / 1000 / 60);
    const cutoff = now - 5; // Keep last 5 minutes
    
    for (const [timestamp] of this.globalRequestCount) {
      if (timestamp < cutoff) {
        this.globalRequestCount.delete(timestamp);
      }
    }
  }

  async checkRateLimit(userId) {
    const [userCheck, globalCheck] = await Promise.all([
      this.checkUserRateLimit(userId),
      this.checkGlobalRateLimit()
    ]);

    if (!userCheck.allowed) return userCheck;
    if (!globalCheck.allowed) return globalCheck;

    return { allowed: true, message: 'All rate limit checks passed' };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter(); 