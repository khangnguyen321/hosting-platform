/**
 * LOGS ROUTES
 * API endpoints for retrieving system logs
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../auth');
const { logger } = require('../logger');

/**
 * GET /api/logs
 * Retrieve recent system logs
 * Query params:
 * - limit: number of log entries to return (default: 100, max: 500)
 * - level: filter by log level (info, warn, error, or 'all')
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const levelFilter = req.query.level || 'all';
    
    const logsPath = path.join(__dirname, '../logs/combined.log');
    
    // Check if log file exists
    if (!fs.existsSync(logsPath)) {
      return res.json({ 
        logs: [], 
        message: 'No logs available yet' 
      });
    }
    
    // Read log file
    const logContent = fs.readFileSync(logsPath, 'utf-8');
    const logLines = logContent.trim().split('\n').filter(line => line.length > 0);
    
    // Parse JSON log entries
    const logs = logLines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          // Skip malformed lines
          return null;
        }
      })
      .filter(log => log !== null)
      .reverse(); // Most recent first
    
    // Apply level filter
    let filteredLogs = logs;
    if (levelFilter !== 'all') {
      filteredLogs = logs.filter(log => log.level === levelFilter);
    }
    
    // Apply limit
    const limitedLogs = filteredLogs.slice(0, limit);
    
    logger.info('Logs retrieved', { 
      user: req.user.username,
      count: limitedLogs.length,
      filter: levelFilter
    });
    
    res.json({
      logs: limitedLogs,
      total: filteredLogs.length,
      showing: limitedLogs.length
    });
    
  } catch (error) {
    logger.error('Error retrieving logs', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

module.exports = router;
