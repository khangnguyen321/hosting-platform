/**
 * VALIDATION MODULE
 * 
 * Validates and sanitizes user input:
 * - Email format
 * - Password strength
 * - URL format
 * - Username format
 * 
 * Prevents SQL injection, XSS, and other attacks
 */

const { body, validationResult } = require('express-validator');

/**
 * Email validation rules
 */
const validateEmail = () => 
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required');

/**
 * Password validation rules
 * Must be at least 8 characters, with uppercase, lowercase, number, special char
 */
const validatePassword = () => 
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain special character (!@#$%^&*)');

/**
 * Username validation rules
 * Alphanumeric, 3-20 characters, underscore allowed
 */
const validateUsername = () => 
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim()
    .escape();

/**
 * GitHub URL validation
 */
const validateGithubUrl = () => 
  body('github_url')
    .matches(/^https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.git$/)
    .withMessage('Invalid GitHub URL format (must end with .git)');

/**
 * Project name validation
 */
const validateProjectName = () => 
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be 1-100 characters')
    .trim()
    .escape();

/**
 * Branch name validation
 */
const validateBranchName = () => 
  body('github_branch')
    .isLength({ min: 1, max: 255 })
    .withMessage('Branch name must be 1-255 characters')
    .matches(/^[a-zA-Z0-9_\-\/\.]+$/)
    .withMessage('Invalid branch name characters')
    .optional({ checkFalsy: true });

/**
 * Middleware: Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
}

/**
 * Sanitize strings (remove dangerous characters)
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 1000); // Limit length
}

/**
 * Validate signup request
 */
const validateSignup = [
  validateUsername(),
  validateEmail(),
  validatePassword(),
  handleValidationErrors
];

/**
 * Validate login request
 */
const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validate project creation
 */
const validateProjectCreation = [
  validateProjectName(),
  validateGithubUrl(),
  validateBranchName(),
  body('description')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('Description must be max 500 characters')
    .trim(),
  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateProjectCreation,
  sanitizeString,
  handleValidationErrors
};
