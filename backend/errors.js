/**
 * ERROR HANDLING MODULE
 * 
 * Centralized error handling:
 * - Consistent error responses
 * - Error logging
 * - Error recovery suggestions
 * - Prevents stack traces leaking to clients
 */

const { logger } = require('./logger');
const { logAction } = require('./audit');

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date();
  }
}

/**
 * Error types for easy classification
 */
const ErrorTypes = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  AUTHENTICATION_ERROR: { code: 'AUTHENTICATION_ERROR', status: 401 },
  AUTHORIZATION_ERROR: { code: 'AUTHORIZATION_ERROR', status: 403 },
  NOT_FOUND_ERROR: { code: 'NOT_FOUND_ERROR', status: 404 },
  CONFLICT_ERROR: { code: 'CONFLICT_ERROR', status: 409 },
  RATE_LIMIT_ERROR: { code: 'RATE_LIMIT_ERROR', status: 429 },
  DEPLOYMENT_ERROR: { code: 'DEPLOYMENT_ERROR', status: 500 },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', status: 500 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 }
};

/**
 * Create typed errors
 */
function createValidationError(message, details = {}) {
  return new AppError(message, 400, { ...details, type: 'VALIDATION_ERROR' });
}

function createAuthError(message) {
  return new AppError(message, 401, { type: 'AUTHENTICATION_ERROR' });
}

function createAuthorizationError(message) {
  return new AppError(message, 403, { type: 'AUTHORIZATION_ERROR' });
}

function createNotFoundError(resource) {
  return new AppError(`${resource} not found`, 404, { type: 'NOT_FOUND_ERROR' });
}

function createDeploymentError(message, details = {}) {
  return new AppError(message, 500, { ...details, type: 'DEPLOYMENT_ERROR' });
}

/**
 * Express error handling middleware
 * Should be the LAST middleware in the chain
 */
function errorHandler(err, req, res, next) {
  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log the error
  logger.error('Unhandled Error', {
    message: err.message,
    statusCode,
    stack: err.stack,
    url: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous'
  });
  
  // Log to audit trail if user is authenticated
  if (req.user) {
    logAction(
      req.user.id,
      'ERROR_OCCURRED',
      null,
      null,
      { message: err.message, statusCode },
      req.ip,
      'error'
    ).catch(auditErr => {
      logger.error('Failed to log error to audit trail', { error: auditErr.message });
    });
  }
  
  // Build response
  const errorResponse = {
    error: err.message || 'Internal server error',
    code: err.context?.type || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.id // If you add request tracking
  };
  
  // Include details in development, hide in production
  if (!isProduction && err.context) {
    errorResponse.details = err.context;
  }
  
  // Include suggestions for common errors
  if (statusCode === 401) {
    errorResponse.suggestion = 'Please log in and include your auth token in the Authorization header';
  } else if (statusCode === 403) {
    errorResponse.suggestion = 'You do not have permission to access this resource';
  } else if (statusCode === 404) {
    errorResponse.suggestion = 'The requested resource was not found';
  } else if (statusCode === 429) {
    errorResponse.suggestion = 'Too many requests. Please wait before trying again';
  } else if (statusCode === 500 && !isProduction) {
    errorResponse.suggestion = 'An internal server error occurred. Check the server logs for details';
  }
  
  res.status(statusCode).json(errorResponse);
}

/**
 * Async route wrapper - catches errors in async routes
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle 404 routes
 */
function notFoundHandler(req, res, next) {
  const error = createNotFoundError('Route');
  error.statusCode = 404;
  next(error);
}

module.exports = {
  AppError,
  ErrorTypes,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createDeploymentError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
