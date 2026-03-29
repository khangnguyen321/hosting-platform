/**
 * ENCRYPTION MODULE
 * 
 * Handles encryption/decryption of sensitive data:
 * - API keys
 * - Database passwords
 * - OAuth tokens
 * - Environment variables
 * 
 * Uses AES-256-GCM encryption
 */

const crypto = require('crypto');
const db = require('./db');

// Master encryption key (should be in .env file)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  crypto.scryptSync(process.env.JWT_SECRET || 'default-key', 'salt', 32);

/**
 * Encrypt a string
 * Returns: IV + encrypted data (both as hex)
 */
function encrypt(plaintext) {
  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      iv
    );
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return IV + auth tag + encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a string
 * Expects: IV:authTag:encryptedData (as hex)
 */
function decrypt(encrypted) {
  try {
    // Split encrypted data
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      iv
    );
    
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Store encrypted environment variable for a project
 */
function storeSecret(projectId, key, value) {
  return new Promise((resolve, reject) => {
    const encrypted = encrypt(value);
    
    db.run(
      `INSERT INTO project_secrets (project_id, key, value) 
       VALUES (?, ?, ?)
       ON CONFLICT(project_id, key) DO UPDATE SET value=excluded.value`,
      [projectId, key, encrypted],
      (err) => {
        if (err) reject(err);
        else resolve({ key, message: 'Secret stored securely' });
      }
    );
  });
}

/**
 * Retrieve decrypted environment variable for a project
 */
function getSecret(projectId, key) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT value FROM project_secrets WHERE project_id = ? AND key = ?',
      [projectId, key],
      (err, row) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else {
          try {
            const decrypted = decrypt(row.value);
            resolve(decrypted);
          } catch (decryptErr) {
            reject(decryptErr);
          }
        }
      }
    );
  });
}

/**
 * Get all secrets for a project (returns keys only, not values)
 */
function getProjectSecrets(projectId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT key FROM project_secrets WHERE project_id = ?',
      [projectId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Delete a secret
 */
function deleteSecret(projectId, key) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM project_secrets WHERE project_id = ? AND key = ?',
      [projectId, key],
      (err) => {
        if (err) reject(err);
        else resolve({ message: 'Secret deleted' });
      }
    );
  });
}

/**
 * Generate environment file content from secrets
 * Returns object that can be used as process.env
 */
async function getEnvironmentForProject(projectId) {
  const secrets = await getProjectSecrets(projectId);
  const env = {};
  
  for (const secret of secrets) {
    try {
      env[secret.key] = await getSecret(projectId, secret.key);
    } catch (err) {
      console.warn(`Failed to decrypt secret ${secret.key}:`, err.message);
    }
  }
  
  return env;
}

module.exports = {
  encrypt,
  decrypt,
  storeSecret,
  getSecret,
  getProjectSecrets,
  deleteSecret,
  getEnvironmentForProject
};
