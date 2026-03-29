/**
 * RATE LIMITING MODULE
 * 
 * Prevents:
 * - Brute force login attacks
 * - API abuse
 * - DDoS attacks
 * 
 * Uses express-rate-limit with in-memory store
 */

const rateLimit = require('express-rate-limit');
const db = require('./db');
const { logger } = require('./logger');

/**
 * Custom rate limit store (using SQLite)
 * Tracks requests per IP for rate limiting
 */
class SQLiteRateLimitStore {
  increment(key) {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const resetTime = new Date(now.getTime() + 15 * 60000); // 15 minutes
      
      db.run(
        `INSERT INTO rate_limit_log (ip_address, endpoint, request_count, reset_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(ip_address, endpoint, reset_at) DO UPDATE SET request_count = request_count + 1`,
        [key.split(':')[0], key.split(':')[1], resetTime.toISOString()],
        (err) => {
          if (err) {
            logger.error('Rate limit store error', { error: err.message });
            reject(err);
          } else {
            // Get current count
            db.get(
              `SELECT request_count FROM rate_limit_log 
               WHERE ip_address = ? AND endpoint = ? AND reset_at > datetime('now')
               ORDER BY request_count DESC LIMIT 1`,
              [key.split(':')[0], key.split(':')[1]],
              (err, row) => {
                if (err) reject(err);
                else resolve({ totalHits: row?.request_count || 1 });
              }
            );
          }
        }
      );
    });
  }

  resetKey(key) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM rate_limit_log 
         WHERE ip_address = ? AND endpoint = ?`,
        [key.split(':')[0], key.split(':')[1]],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

/**
 * LOGIN RATE LIMITER
 * Max 5 login attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: false,
  skip: (req) => {
    // Skip rate limiting for certain IPs (optional)
    return false;
  },
  handler: (req, res) => {
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      username: req.body?.username
    });
    
    res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: '15 minutes',
      code: 'RATE_LIMIT_ERROR'
    });
  }
});

/**
 * SIGNUP RATE LIMITER
 * Max 3 signup attempts per hour per IP
 */
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many signup attempts. Please try again later.'
  },
  standardHeaders: false,
  handler: (req, res) => {
    logger.warn('Signup rate limit exceeded', { ip: req.ip });
    
    res.status(429).json({
      error: 'Too many signup attempts',
      retryAfter: '1 hour',
      code: 'RATE_LIMIT_ERROR'
    });
  }
});

/**
 * API RATE LIMITER
 * Max 100 requests per 15 minutes per IP for general API
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: false,
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      endpoint: req.path
    });
    
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: '15 minutes',
      code: 'RATE_LIMIT_ERROR'
    });
  }
});

/**
 * DEPLOYMENT RATE LIMITER
 * Max 5 deployments per hour per user (authenticated)
 */
const deploymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
  standardHeaders: false,
  handler: (req, res) => {
    logger.warn('Deployment rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(429).json({
      error: 'Too many deployments. Please try again in an hour.',
      retryAfter: '1 hour',
      code: 'RATE_LIMIT_ERROR'
    });
  }
});

/**
 * CLEANUP FUNCTION
 * Remove expired rate limit records (run periodically)
 */
function cleanupExpiredLimits() {
  db.run(
    `DELETE FROM rate_limit_log WHERE reset_at < datetime('now')`,
    (err) => {
      if (err) {
        logger.error('Failed to cleanup rate limit logs', { error: err.message });
      } else {
        logger.info('Cleaned up expired rate limit records');
      }
    }
  );
}

// Run cleanup every hour
setInterval(cleanupExpiredLimits, 60 * 60 * 1000);

module.exports = {
  loginLimiter,
  signupLimiter,
  apiLimiter,
  deploymentLimiter,
  cleanupExpiredLimits
};
