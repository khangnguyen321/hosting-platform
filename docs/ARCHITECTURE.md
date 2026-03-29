# Architecture

## System Overview

Your hosting platform is built with a **layered architecture** designed for security, reliability, and maintainability.

```
┌──────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  (Browser, PowerShell, Postman, Mobile, etc.)            │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP/REST
                          ▼
┌──────────────────────────────────────────────────────────┐
│           Express.js Server (Port 5000)                  │
├──────────────────────────────────────────────────────────┤
│  Security Middleware                                     │
│  ├─ Helmet (Security Headers)                            │
│  ├─ CORS (Origin Validation)                             │
│  ├─ Body Parser (Request Parsing)                        │
│  └─ Request Logger (Winston)                             │
├──────────────────────────────────────────────────────────┤
│  Route Handlers & Business Logic                        │
│  ├─ Authentication Routes (/auth/*)                      │
│  ├─ Project Routes (/api/projects/*)                     │
│  ├─ Deployment Routes (/api/projects/:id/deploy)         │
│  ├─ Secrets Routes (/api/projects/:id/secrets/*)         │
│  └─ Audit Routes (/api/audit/*)                          │
├──────────────────────────────────────────────────────────┤
│  Core Modules (Business Logic)                          │
│  ├─ auth.js (User Authentication & JWT)                  │
│  ├─ deploy.js (GitHub Clone & Process Management)        │
│  ├─ encryption.js (AES-256 Secret Management)            │
│  ├─ audit.js (Action Tracking)                           │
│  └─ validation.js (Input Validation & Sanitization)      │
├──────────────────────────────────────────────────────────┤
│  Middleware & Support                                    │
│  ├─ logger.js (Winston Logging)                          │
│  ├─ rateLimit.js (Rate Limiting)                         │
│  ├─ errors.js (Centralized Error Handling)               │
│  └─ validation.js (Input Validation)                     │
├──────────────────────────────────────────────────────────┤
│  Data Layer                                              │
│  └─ SQLite Database (db.js)                              │
└────────┬───────────────────────────────┬────────────────┘
         │                               │
         ▼                               ▼
    ┌─────────────┐            ┌──────────────────────┐
    │ platform.db │            │ Deployed Projects    │
    │  (SQLite)   │            │ (Node.js Apps)       │
    │             │            │                      │
    │ Users       │            │ Port 3001, 3002...   │
    │ Projects    │            │ Running on Spawned   │
    │ Deployments │            │ Child Processes      │
    │ Secrets     │            │                      │
    │ Audit Trail │            └──────────────────────┘
    └─────────────┘
```

---

## Component Architecture

### 1. **Server Layer** (server.js)

The entry point that:

- Initializes Express.js
- Loads security middleware
- Defines all route handlers
- Manages graceful shutdown

**Port:** 5000 (configurable)

### 2. **Security Layer**

#### Helmet

- Sets security headers (X-Frame-Options, CSP, HSTS, etc.)
- Protects against XSS, clickjacking, MIME sniffing

#### CORS

- Validates request origins
- Restricts to configured domains
- Prevents unauthorized cross-origin requests

#### Rate Limiting (rateLimit.js)

- Login: 5 attempts per 15 minutes
- Signup: 3 attempts per hour
- General API: 100 requests per 15 minutes
- Deployment: 5 per hour per user

#### Input Validation (validation.js)

- Email format validation
- Password strength enforcement
- URL format validation
- String sanitization & escaping

### 3. **Authentication Layer** (auth.js)

```
User Input (username, password)
        ↓
    Validation
        ↓
    Find User in DB
        ↓
    Compare Password (bcrypt)
        ↓
    Generate JWT Token
        ↓
    Return Token to Client
        ↓
Client includes token in Authorization header for future requests
        ↓
    Middleware verifies token signature & expiration
```

**Security Features:**

- Passwords hashed with bcrypt (10 salt rounds)
- JWTs signed with secret key
- Tokens expire after 7 days
- Token verification on protected routes

### 4. **Business Logic Layer**

#### Authentication (auth.js)

- User signup (with validation)
- User login (with password verification)
- JWT token generation & validation
- Protected route middleware

#### Deployment (deploy.js)

- Git repository cloning
- NPM dependency installation
- Child process spawning
- Port allocation
- Process lifecycle management
- Log streaming

#### Encryption (encryption.js)

- AES-256-GCM encryption for secrets
- Secure key derivation
- Authenticated encryption (prevents tampering)
- Environment variable injection

#### Audit Logging (audit.js)

- Login attempts (success/failure)
- User actions (create, delete, etc.)
- Deployment events
- Secret access
- Failed login tracking

### 5. **Data Layer** (db.js)

SQLite database with 9 tables:

```
users
├─ id (PK)
├─ username (UNIQUE)
├─ email (UNIQUE)
├─ password_hash
└─ created_at

projects
├─ id (PK)
├─ user_id (FK → users)
├─ name
├─ github_url
├─ github_branch
├─ port
├─ is_running
├─ description
└─ created_at

deployments
├─ id (PK)
├─ project_id (FK → projects)
├─ status
├─ commit_hash
├─ deployed_at
└─ error_message

deployment_logs
├─ id (PK)
├─ deployment_id (FK → deployments)
├─ log_message
├─ log_type
└─ created_at

project_secrets
├─ id (PK)
├─ project_id (FK → projects)
├─ key
├─ value (encrypted)
├─ created_at
└─ updated_at

audit_log
├─ id (PK)
├─ user_id (FK → users)
├─ action
├─ resource_type
├─ resource_id
├─ details (JSON)
├─ ip_address
├─ status
└─ created_at

api_keys
├─ id (PK)
├─ user_id (FK → users)
├─ name
├─ key_hash (UNIQUE)
├─ is_active
├─ last_used
└─ created_at

rate_limit_log
├─ id (PK)
├─ ip_address
├─ endpoint
├─ request_count
├─ reset_at
└─ created_at
```

### 6. **Logging Layer** (logger.js)

**Winston Logger** with:

- **Console output** - Real-time colored logs
- **error.log** - Errors only (5MB rotating files)
- **combined.log** - All logs (5MB rotating files)

**Log Format:**

```
YYYY-MM-DD HH:mm:ss [LEVEL] Message { metadata }
```

**Log Levels:**

- `error` - Critical errors
- `warn` - Warnings & suspicious activity
- `info` - General information
- `debug` - Debug information

---

## Request Flow

### Authentication Request

```
1. Client sends POST /auth/signup with credentials
         ↓
2. Request hits Security Middleware (Helmet, CORS)
         ↓
3. Input Validation checks email, password strength, username format
         ↓
4. If invalid → Return 400 error
         ↓
5. If valid → Hash password with bcrypt
         ↓
6. Store user in SQLite database
         ↓
7. Log signup event in audit_log
         ↓
8. Return user data to client
         ↓
9. Log request to Winston logger
```

### Deployment Request

```
1. Client sends POST /api/projects/:id/deploy with token
         ↓
2. Rate limiter checks: 5 deployments/hour per user
         ↓
3. Auth middleware verifies JWT token
         ↓
4. Verify user owns the project
         ↓
5. Clone GitHub repo to deployed-projects/ directory
         ↓
6. Run npm install in project directory
         ↓
7. Find available port (starts at 3001)
         ↓
8. Spawn Node.js process with environment variables
         ↓
9. Capture stdout/stderr and log to database
         ↓
10. Update project status in database (is_running = 1)
         ↓
11. Log deployment event to audit trail
         ↓
12. Return port & URL to client
         ↓
13. Log request to Winston logger
```

---

## Security Flow

### Password Hashing

```
plaintext password
        ↓
bcrypt.hash(password, 10 salt rounds)
        ↓
Stored in database: $2b$10$...
```

### Secret Encryption

```
plaintext secret (API_KEY=secret-123)
        ↓
Generate random IV (initialization vector)
        ↓
AES-256-GCM encrypt with master key
        ↓
Create authentication tag
        ↓
Stored: IV:authTag:encryptedData (all hex)
        ↓
On retrieval: decrypt with same master key
```

### JWT Token Flow

```
User logs in successfully
        ↓
Create JWT payload: { id, username, email, exp: now + 7 days }
        ↓
Sign with JWT_SECRET: crypto.sign(payload, secret)
        ↓
Return token to client
        ↓
Client includes in Authorization header: Bearer <token>
        ↓
Server verifies: crypto.verify(token, secret)
        ↓
If valid → Allow request
If invalid/expired → Return 401 Unauthorized
```

---

## Data Flow

### Creating a Project

```
User Input: { name, github_url, github_branch }
         ↓
Validation: Check URL format, project name length
         ↓
Database INSERT: projects table
         ↓
Return: { id, name, github_url, ... }
         ↓
Client receives project ID
         ↓
User can now deploy with that project ID
```

### Deploying a Project

```
User clicks Deploy
         ↓
POST /api/projects/:id/deploy
         ↓
1. Clone GitHub repo
   ↓ Git downloads files to deployed-projects/:name/
         ↓
2. Install dependencies
   ↓ npm install (reads package.json)
         ↓
3. Get secrets
   ↓ Decrypt environment variables from database
         ↓
4. Start process
   ↓ spawn('npm', ['start']) with env vars
         ↓
5. Allocate port
   ↓ Find available port starting from 3001
         ↓
6. Capture logs
   ↓ Listen to stdout/stderr, save to database
         ↓
7. Update status
   ↓ Set is_running = 1 in projects table
         ↓
8. Return to user
   ↓ { port, pid, url, ... }
         ↓
User visits http://localhost:PORT to see app running
```

---

## Scalability Considerations

### Current Design (Phase 1)

- **Single server** on one machine
- **File-based SQLite** database
- **In-memory rate limiting**
- **Local process management**

### Good For

- Personal use (1 user)
- Small teams (2-5 users)
- Up to 10-20 projects
- Learning & development

### When You Need Phase 3+

**If adding features, consider:**

- Redis for distributed rate limiting
- PostgreSQL for horizontal scaling
- Load balancer for multiple server instances
- Message queue (RabbitMQ, Kafka) for async deployments
- Container orchestration (Kubernetes) for scaling deployments

---

## Error Handling Strategy

**Centralized in errors.js:**

```
Error occurs somewhere
         ↓
Caught by asyncHandler or try/catch
         ↓
Converted to AppError: new AppError(message, statusCode)
         ↓
Passed to error handler middleware
         ↓
Logged to Winston logger
         ↓
Logged to audit trail (if user action)
         ↓
Return consistent JSON response to client
         ↓
In production: Hide stack trace
In development: Include full error details
```

---

## Technology Stack

| Layer              | Technology         | Purpose                              |
| ------------------ | ------------------ | ------------------------------------ |
| **HTTP Server**    | Express.js         | Handle requests & responses          |
| **Security**       | Helmet, CORS       | Security headers & origin validation |
| **Authentication** | bcrypt, JWT        | Password hashing & token generation  |
| **Encryption**     | crypto (Node.js)   | AES-256-GCM secret encryption        |
| **Database**       | SQLite3            | Data persistence                     |
| **Logging**        | Winston            | Request & error logging              |
| **Validation**     | express-validator  | Input validation & sanitization      |
| **Rate Limiting**  | express-rate-limit | Prevent abuse & brute force          |
| **Deployment**     | child_process      | Spawn Node.js processes              |
| **Git**            | simple-git         | Clone repositories                   |

---

## File Dependencies

```
server.js (main entry)
├─ db.js (database)
├─ auth.js (authentication)
├─ deploy.js (deployment)
├─ encryption.js (encryption)
├─ audit.js (audit logging)
├─ logger.js (logging)
├─ validation.js (validation)
├─ errors.js (error handling)
└─ rateLimit.js (rate limiting)
```

---

## Extension Points

### Adding New Endpoints

1. Create route handler in server.js
2. Add validation in validation.js
3. Add business logic in appropriate module
4. Log events in audit.js
5. Document in API_REFERENCE.md

### Adding New Security Features

1. Create middleware in errors.js or new file
2. Import in server.js
3. Add app.use() for middleware
4. Test with test.js
5. Document in SECURITY.md

### Adding Database Tables

1. Create table definition in db.js
2. Add helper functions in appropriate module
3. Update migrations if needed
4. Document schema in DATABASE_SCHEMA.md

---

**This architecture is designed to be:**

- ✅ Secure (multiple security layers)
- ✅ Maintainable (clear separation of concerns)
- ✅ Observable (comprehensive logging)
- ✅ Extensible (easy to add features)
- ✅ Reliable (proper error handling)
