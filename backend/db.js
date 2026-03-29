/**
 * DATABASE SETUP
 *
 * This file creates the SQLite database tables that store:
 * - Users (who can log in)
 * - Projects (GitHub repos you want to deploy)
 * - Deployments (running instances of your projects)
 * - Deployment Logs (output from running apps)
 */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Create/open database file
const db = new sqlite3.Database(path.join(__dirname, "platform.db"), (err) => {
  if (err) console.error("Database connection failed:", err);
  else console.log("✓ Connected to SQLite database");
});

/**
 * USERS TABLE
 * Stores login credentials for people using your platform
 */
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

/**
 * PROJECTS TABLE
 * Stores information about each GitHub repo you want to deploy
 */
db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    github_url TEXT NOT NULL,
    github_branch TEXT DEFAULT 'main',
    port INTEGER UNIQUE,
    description TEXT,
    is_running BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

/**
 * DEPLOYMENTS TABLE
 * Tracks each time you deploy a project
 */
db.run(`
  CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    commit_hash TEXT,
    deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

/**
 * DEPLOYMENT_LOGS TABLE
 * Stores output/logs from running deployments
 */
db.run(`
  CREATE TABLE IF NOT EXISTS deployment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER NOT NULL,
    log_message TEXT,
    log_type TEXT DEFAULT 'info',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
  )
`);

/**
 * PROJECT_SECRETS TABLE
 * Stores encrypted environment variables per project
 */
db.run(`
  CREATE TABLE IF NOT EXISTS project_secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, key),
    FOREIGN KEY (project_id) REFERENCES projects(id)
  )
`);

/**
 * API_KEYS TABLE
 * Stores API keys for external integrations
 */
db.run(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

/**
 * AUDIT_LOG TABLE
 * Tracks all important actions for security
 */
db.run(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id INTEGER,
    details TEXT,
    ip_address TEXT,
    status TEXT DEFAULT 'success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

/**
 * RATE_LIMIT_TRACKING TABLE
 * Tracks API requests for rate limiting
 */
db.run(`
  CREATE TABLE IF NOT EXISTS rate_limit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    reset_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip_address, endpoint, reset_at)
  )
`);

module.exports = db;
