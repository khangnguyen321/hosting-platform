# Database Schema

SQLite database storing all application data. File location: `backend/platform.db`

---

## Users Table

Stores user accounts and authentication data.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique user identifier |
| `username` | TEXT | UNIQUE, NOT NULL | Username (3-20 alphanumeric + underscore) |
| `email` | TEXT | UNIQUE, NOT NULL | Email address (valid format) |
| `password_hash` | TEXT | NOT NULL | Bcrypt hashed password (never plain text) |
| `created_at` | DATETIME | DEFAULT NOW | Account creation timestamp |

**Indexes:** username, email (unique indexes for fast lookups)

**Example Row:**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "password_hash": "$2b$10$...",
  "created_at": "2024-01-15 10:30:00"
}
```

---

## Projects Table

Stores information about deployed applications.

```sql
CREATE TABLE projects (
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
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique project identifier |
| `user_id` | INTEGER | FK → users.id | Owner of the project |
| `name` | TEXT | NOT NULL | Project name (1-100 chars) |
| `github_url` | TEXT | NOT NULL | Full GitHub repo URL (must end with .git) |
| `github_branch` | TEXT | DEFAULT 'main' | Branch to deploy (default: main) |
| `port` | INTEGER | UNIQUE | Port assigned when running (3001+) |
| `description` | TEXT | Optional | Project description (max 500 chars) |
| `is_running` | BOOLEAN | DEFAULT 0 | 1 if running, 0 if stopped |
| `created_at` | DATETIME | DEFAULT NOW | Project creation time |

**Example Row:**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "My API",
  "github_url": "https://github.com/user/my-api.git",
  "github_branch": "main",
  "port": 3001,
  "description": "REST API built with Express",
  "is_running": 1,
  "created_at": "2024-01-15 11:00:00"
}
```

---

## Deployments Table

Records each deployment event.

```sql
CREATE TABLE deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  commit_hash TEXT,
  deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique deployment identifier |
| `project_id` | INTEGER | FK → projects.id | Which project was deployed |
| `status` | TEXT | DEFAULT 'pending' | Status: pending, success, failed |
| `commit_hash` | TEXT | Optional | Git commit hash deployed |
| `deployed_at` | DATETIME | DEFAULT NOW | Deployment timestamp |
| `error_message` | TEXT | Optional | Error details if deployment failed |

**Example Rows:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "status": "success",
    "commit_hash": "abc123def456",
    "deployed_at": "2024-01-15 11:15:00",
    "error_message": null
  },
  {
    "id": 2,
    "project_id": 1,
    "status": "failed",
    "commit_hash": null,
    "deployed_at": "2024-01-15 12:00:00",
    "error_message": "npm install failed: package not found"
  }
]
```

---

## Deployment Logs Table

Stores output/logs from deployments.

```sql
CREATE TABLE deployment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id INTEGER NOT NULL,
  log_message TEXT,
  log_type TEXT DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deployment_id) REFERENCES deployments(id)
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique log entry identifier |
| `deployment_id` | INTEGER | FK → deployments.id | Which deployment this log is from |
| `log_message` | TEXT | Optional | Actual log message (stdout/stderr) |
| `log_type` | TEXT | DEFAULT 'info' | Type: info, warn, error |
| `created_at` | DATETIME | DEFAULT NOW | Timestamp of log entry |

**Example Rows:**
```json
[
  {
    "id": 1,
    "deployment_id": 1,
    "log_message": "📦 Cloning repository...",
    "log_type": "info",
    "created_at": "2024-01-15 11:15:01"
  },
  {
    "id": 2,
    "deployment_id": 1,
    "log_message": "✓ Repository cloned successfully",
    "log_type": "info",
    "created_at": "2024-01-15 11:15:05"
  },
  {
    "id": 3,
    "deployment_id": 1,
    "log_message": "📥 Installing dependencies...",
    "log_type": "info",
    "created_at": "2024-01-15 11:15:06"
  }
]
```

---

## Project Secrets Table

Stores encrypted environment variables per project.

```sql
CREATE TABLE project_secrets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, key),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique secret identifier |
| `project_id` | INTEGER | FK → projects.id | Which project owns this secret |
| `key` | TEXT | NOT NULL | Environment variable name (e.g., API_KEY) |
| `value` | TEXT | NOT NULL | **Encrypted** secret value (AES-256-GCM) |
| `created_at` | DATETIME | DEFAULT NOW | When secret was created |
| `updated_at` | DATETIME | DEFAULT NOW | When secret was last updated |

**UNIQUE Constraint:** (project_id, key) - one secret name per project

**Example Row (value is encrypted):**
```json
{
  "id": 1,
  "project_id": 1,
  "key": "DATABASE_URL",
  "value": "a1b2c3d4e5:f6g7h8i9j0:encrypted_data_hex",
  "created_at": "2024-01-15 11:20:00",
  "updated_at": "2024-01-15 11:20:00"
}
```

**How it's used:**
1. When deploying, fetch all secrets for a project
2. Decrypt each secret's value using master key
3. Pass decrypted values as environment variables to Node.js process
4. Child process can access via `process.env.DATABASE_URL`, etc.

---

## Audit Log Table

Tracks all user actions for security and compliance.

```sql
CREATE TABLE audit_log (
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
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique audit log entry |
| `user_id` | INTEGER | FK → users.id | Which user performed action (null if unauthenticated) |
| `action` | TEXT | NOT NULL | Action type (LOGIN, SIGNUP, DEPLOY, etc.) |
| `resource_type` | TEXT | Optional | Type of resource (user, project, secret, etc.) |
| `resource_id` | INTEGER | Optional | ID of affected resource |
| `details` | TEXT | Optional | JSON with additional details |
| `ip_address` | TEXT | Optional | Client IP address |
| `status` | TEXT | DEFAULT 'success' | success or error |
| `created_at` | DATETIME | DEFAULT NOW | Timestamp |

**Example Rows:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "action": "LOGIN_SUCCESS",
    "resource_type": "user",
    "resource_id": 1,
    "details": "{}",
    "ip_address": "192.168.1.100",
    "status": "success",
    "created_at": "2024-01-15 10:00:00"
  },
  {
    "id": 2,
    "user_id": 1,
    "action": "LOGIN_FAILED",
    "resource_type": "user",
    "resource_id": 1,
    "details": "{\"reason\": \"Invalid password\"}",
    "ip_address": "192.168.1.100",
    "status": "error",
    "created_at": "2024-01-15 09:59:00"
  },
  {
    "id": 3,
    "user_id": 1,
    "action": "PROJECT_CREATED",
    "resource_type": "project",
    "resource_id": 1,
    "details": "{\"name\": \"My API\", \"github_url\": \"...\"}",
    "ip_address": "192.168.1.100",
    "status": "success",
    "created_at": "2024-01-15 11:00:00"
  },
  {
    "id": 4,
    "user_id": 1,
    "action": "DEPLOYMENT_SUCCESS",
    "resource_type": "project",
    "resource_id": 1,
    "details": "{\"port\": 3001, \"pid\": 12345}",
    "ip_address": "192.168.1.100",
    "status": "success",
    "created_at": "2024-01-15 11:15:00"
  },
  {
    "id": 5,
    "user_id": 1,
    "action": "SECRET_SET",
    "resource_type": "secret",
    "resource_id": 1,
    "details": "{\"key\": \"DATABASE_URL\"}",
    "ip_address": "192.168.1.100",
    "status": "success",
    "created_at": "2024-01-15 11:20:00"
  }
]
```

---

## API Keys Table

For future API key authentication (Phase 2+).

```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT 1,
  last_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique API key identifier |
| `user_id` | INTEGER | FK → users.id | Which user owns this key |
| `name` | TEXT | NOT NULL | Friendly name (e.g., "CI/CD Pipeline") |
| `key_hash` | TEXT | UNIQUE, NOT NULL | SHA-256 hash of the actual key (never store plain key) |
| `is_active` | BOOLEAN | DEFAULT 1 | 1 if active, 0 if revoked |
| `last_used` | DATETIME | Optional | Last time this key was used |
| `created_at` | DATETIME | DEFAULT NOW | When key was created |

**Note:** Not currently used in Phase 1, prepared for future use.

---

## Rate Limit Log Table

Tracks API requests for rate limiting enforcement.

```sql
CREATE TABLE rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  reset_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ip_address, endpoint, reset_at)
);
```

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY | Unique log entry |
| `ip_address` | TEXT | NOT NULL | Client IP address |
| `endpoint` | TEXT | NOT NULL | API endpoint (e.g., /auth/login) |
| `request_count` | INTEGER | DEFAULT 1 | Number of requests in window |
| `reset_at` | DATETIME | NOT NULL | When rate limit window resets |
| `created_at` | DATETIME | DEFAULT NOW | Log entry timestamp |

**UNIQUE Constraint:** (ip_address, endpoint, reset_at) - one count per IP/endpoint/window

**Example Row:**
```json
{
  "id": 1,
  "ip_address": "192.168.1.100",
  "endpoint": "/auth/login",
  "request_count": 3,
  "reset_at": "2024-01-15 11:30:00",
  "created_at": "2024-01-15 11:15:00"
}
```

---

## Relationships

```
users (1)
  ├──→ (many) projects
  │     ├──→ (many) deployments
  │     │     └──→ (many) deployment_logs
  │     ├──→ (many) project_secrets
  │     └──→ (many) audit_log (as resource)
  │
  ├──→ (many) audit_log (as user_id)
  └──→ (many) api_keys
```

---

## Indexes

Automatically created for:
- `users.username` (UNIQUE)
- `users.email` (UNIQUE)
- `projects.user_id` (for user's projects lookup)
- `projects.port` (UNIQUE)
- `project_secrets(project_id, key)` (UNIQUE)
- `audit_log.user_id` (for user's audit history)
- `rate_limit_log(ip_address, endpoint, reset_at)` (UNIQUE)

---

## Storage Estimates

**Per User:**
- User record: ~200 bytes
- 10 projects: ~2 KB
- 100 deployments: ~5 KB
- 1000 deployment logs: ~50 KB
- 100 audit entries: ~10 KB
- 50 secrets: ~5 KB

**Total per active user: ~75 KB**

**For 100 users:** ~7.5 MB
**For 1000 users:** ~75 MB

SQLite is efficient and suitable for this scale.

---

## Backup Strategy

Since data is critical:

1. **SQLite Database File**
   - Located: `backend/platform.db`
   - Back up regularly

2. **Backup Command**
   ```bash
   cp backend/platform.db backend/platform.db.backup
   ```

3. **For Production**
   - Use automatic backups
   - Consider PostgreSQL + regular dumps
   - Keep encrypted backups

---

## Querying Examples

### Find User's Projects

```sql
SELECT * FROM projects WHERE user_id = 1;
```

### Get Deployment History for Project

```sql
SELECT d.*, COUNT(dl.id) as log_count
FROM deployments d
LEFT JOIN deployment_logs dl ON d.id = dl.deployment_id
WHERE d.project_id = 1
GROUP BY d.id
ORDER BY d.deployed_at DESC;
```

### Recent Audit Trail for User

```sql
SELECT * FROM audit_log
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 100;
```

### Failed Login Attempts

```sql
SELECT * FROM audit_log
WHERE action = 'LOGIN_FAILED'
AND created_at > datetime('now', '-15 minutes')
ORDER BY created_at DESC;
```

### Get All Secrets for Project

```sql
SELECT key FROM project_secrets WHERE project_id = 1;
```

---

## Data Integrity

- **Foreign Keys:** Enforced (projects → users, deployments → projects)
- **Unique Constraints:** username, email, port, secrets (project_id, key)
- **Not Null:** username, email, password_hash, project name, github_url, etc.
- **Timestamps:** All creation times recorded for audit trail

---

This schema supports all Phase 1 functionality and is designed to be extended for Phase 2+ features.
