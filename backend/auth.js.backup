/**
 * AUTHENTICATION MODULE
 * 
 * This handles:
 * 1. User signup (create new account with password)
 * 2. User login (verify password and issue JWT token)
 * 3. Token verification (check if requests are from authenticated users)
 * 
 * JWT = JSON Web Token: A secure way to verify someone is logged in
 * Bcrypt = A way to hash passwords so they're not stored in plain text
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');

// Secret key for signing JWT tokens (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

/**
 * SIGNUP - Create a new user account
 * Takes: username, email, password
 * Returns: success/error message
 */
async function signup(username, email, password) {
  return new Promise((resolve, reject) => {
    // Hash the password before storing it
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return reject(err);

      // Insert user into database
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE')) {
              reject(new Error('Username or email already exists'));
            } else {
              reject(err);
            }
          } else {
            resolve({
              id: this.lastID,
              username,
              email,
              message: 'Account created successfully'
            });
          }
        }
      );
    });
  });
}

/**
 * LOGIN - Verify credentials and issue JWT token
 * Takes: username, password
 * Returns: JWT token (if credentials are correct)
 */
async function login(username, password) {
  return new Promise((resolve, reject) => {
    // Find user by username
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) return reject(err);
        if (!user) return reject(new Error('User not found'));

        // Compare provided password with stored hash
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) return reject(new Error('Invalid password'));

        // Create JWT token (valid for 7 days)
        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        resolve({ token, user: { id: user.id, username, email: user.email } });
      }
    );
  });
}

/**
 * VERIFY TOKEN - Check if a JWT token is valid
 * Used as middleware to protect routes
 * Returns: decoded token data (user info)
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * MIDDLEWARE - Express middleware to protect routes
 * Add this to any route you want to require authentication
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(' ')[1];
  const verification = verifyToken(token);

  if (!verification.valid) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user info to request so route handlers can access it
  req.user = verification.user;
  next();
}

module.exports = {
  signup,
  login,
  verifyToken,
  requireAuth
};
