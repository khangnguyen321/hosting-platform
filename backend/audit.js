/**
 * AUDIT LOG MODULE
 * 
 * Tracks:
 * - User login/signup
 * - Project creation/deletion
 * - Deployments
 * - Secret access
 * - API key usage
 * - Failed attempts
 * 
 * Useful for security monitoring and compliance
 */

const db = require('./db');
const { logger } = require('./logger');

/**
 * Log an action to the audit trail
 */
function logAction(userId, action, resourceType, resourceId, details = {}, ipAddress = null, status = 'success') {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO audit_log 
       (user_id, action, resource_type, resource_id, details, ip_address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        action,
        resourceType || null,
        resourceId || null,
        JSON.stringify(details),
        ipAddress || null,
        status
      ],
      function(err) {
        if (err) {
          logger.error('Failed to log audit action', { error: err.message, action });
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      }
    );
  });
}

/**
 * Get audit logs for a user
 */
function getAuditLogs(userId, limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM audit_log 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit],
      (err, rows) => {
        if (err) reject(err);
        else {
          // Parse JSON details
          const parsed = (rows || []).map(row => ({
            ...row,
            details: JSON.parse(row.details || '{}')
          }));
          resolve(parsed);
        }
      }
    );
  });
}

/**
 * Get audit logs by action
 */
function getAuditLogsByAction(action, limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM audit_log 
       WHERE action = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [action, limit],
      (err, rows) => {
        if (err) reject(err);
        else {
          const parsed = (rows || []).map(row => ({
            ...row,
            details: JSON.parse(row.details || '{}')
          }));
          resolve(parsed);
        }
      }
    );
  });
}

/**
 * Get failed login attempts
 */
function getFailedLoginAttempts(ipAddress, minutesBack = 15) {
  return new Promise((resolve, reject) => {
    const cutoff = new Date(Date.now() - minutesBack * 60000).toISOString();
    
    db.all(
      `SELECT * FROM audit_log 
       WHERE action = 'LOGIN_FAILED' 
       AND ip_address = ? 
       AND created_at > ?
       ORDER BY created_at DESC`,
      [ipAddress, cutoff],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Log auth events
 */
async function logAuthEvent(userId, action, status = 'success', ipAddress = null, details = {}) {
  try {
    await logAction(userId, action, 'user', userId, details, ipAddress, status);
  } catch (err) {
    logger.error('Failed to log auth event', { action, userId, error: err.message });
  }
}

/**
 * Log deployment events
 */
async function logDeploymentEvent(userId, projectId, action, status = 'success', details = {}) {
  try {
    await logAction(userId, action, 'project', projectId, details, null, status);
  } catch (err) {
    logger.error('Failed to log deployment event', { action, projectId, error: err.message });
  }
}

/**
 * Log secret access
 */
async function logSecretAccess(userId, projectId, action = 'SECRET_ACCESS', details = {}) {
  try {
    await logAction(userId, action, 'secret', projectId, details, null, 'success');
  } catch (err) {
    logger.error('Failed to log secret access', { projectId, error: err.message });
  }
}

module.exports = {
  logAction,
  logAuthEvent,
  logDeploymentEvent,
  logSecretAccess,
  getAuditLogs,
  getAuditLogsByAction,
  getFailedLoginAttempts
};
