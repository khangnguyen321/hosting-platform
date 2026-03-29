/**
 * LOGGER MODULE
 * 
 * Winston logger for tracking all events:
 * - API requests
 * - Errors
 * - Deployments
 * - Authentication
 * 
 * Logs are saved to files and printed to console
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Configure Winston logger
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hosting-platform' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // All logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Console (for development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      )
    })
  ]
});

/**
 * Create request logger (for HTTP requests)
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(level, `${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.id || 'anonymous',
      ip: req.ip
    });
  });
  
  next();
}

/**
 * Log authentication events
 */
function logAuth(event, data) {
  logger.info(`AUTH_EVENT: ${event}`, data);
}

/**
 * Log deployment events
 */
function logDeployment(event, data) {
  logger.info(`DEPLOYMENT: ${event}`, data);
}

/**
 * Log errors
 */
function logError(error, context = {}) {
  logger.error('ERROR', {
    message: error.message,
    stack: error.stack,
    ...context
  });
}

module.exports = {
  logger,
  requestLogger,
  logAuth,
  logDeployment,
  logError
};
