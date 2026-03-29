# Environment Variables

Complete configuration guide for Phase 1.

---

## Configuration

Create `.env` file in `backend/` directory based on `.env.example`.

```env
# Server Configuration
PORT=5000

# Authentication
JWT_SECRET=your-super-secret-key-change-this-in-production

# CORS
CORS_ORIGIN=http://localhost:3000

# Environment
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

---

## Variables Reference

### Required Variables

#### `JWT_SECRET`
**Purpose:** Secret key for signing JWT tokens

**Requirements:**
- Minimum 32 characters
- Should be random and unique
- Never commit to Git
- Change in production

**Generate Random:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Example:**
```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Optional Variables

#### `PORT`
**Purpose:** Server port number

**Default:** `5000`

**Example:**
```env
PORT=5001
```

**When to Change:**
- If port 5000 is already in use
- For testing multiple servers

#### `CORS_ORIGIN`
**Purpose:** Allowed request origins

**Default:** `http://localhost:3000,http://localhost:5000`

**For Single Origin:**
```env
CORS_ORIGIN=http://localhost:3000
```

**For Multiple Origins:**
```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5000,https://example.com
```

**For Production:**
```env
CORS_ORIGIN=https://yourdomain.com
```

**Note:** Separate multiple URLs with commas (no spaces)

#### `NODE_ENV`
**Purpose:** Environment mode

**Options:**
- `development` - More logging, detailed errors, stack traces
- `production` - Less logging, minimal error details, optimized

**Default:** `development`

**Example:**
```env
NODE_ENV=production
```

**Effects:**
- **Development:** Stack traces shown to client, verbose logging
- **Production:** Errors hidden, minimal logging, optimized responses

#### `LOG_LEVEL`
**Purpose:** Logging verbosity

**Options:**
- `error` - Only errors
- `warn` - Errors and warnings
- `info` - Errors, warnings, and info (default)
- `debug` - Very detailed logging

**Default:** `info`

**Example:**
```env
LOG_LEVEL=debug
```

**File Locations:**
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs

#### `ENCRYPTION_KEY`
**Purpose:** Master key for encrypting secrets

**Optional:** If not provided, derived from `JWT_SECRET`

**When to Set:**
- For extra security
- When running multiple servers (same key needed)
- For database migrations

**Generate:**
```bash
openssl rand -hex 32
```

**Example:**
```env
ENCRYPTION_KEY=f9e8d7c6b5a4938271605948372615948
```

---

## Environment-Specific Configurations

### Development

```env
PORT=5000
JWT_SECRET=dev-secret-key-change-this
CORS_ORIGIN=http://localhost:3000,http://localhost:5000
NODE_ENV=development
LOG_LEVEL=debug
```

**Features:**
- Detailed error messages
- Full stack traces
- Verbose logging
- Easy debugging

### Testing

```env
PORT=5001
JWT_SECRET=test-secret-key-12345
CORS_ORIGIN=http://localhost:5001
NODE_ENV=development
LOG_LEVEL=info
```

**Features:**
- Isolated port
- Isolated database
- Clean logs
- Fast testing

### Production

```env
PORT=5000
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
LOG_LEVEL=warn
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

**Features:**
- Strong secrets
- HTTPS origins
- Minimal logging
- Optimized performance
- Custom encryption key

---

## Security Best Practices

### 1. Never Commit .env

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```

### 2. Use .env.example

Track template, not actual values:
```bash
# Good
git add .env.example

# Bad
git add .env
```

### 3. Rotate Secrets

In production, rotate periodically:
```bash
# Generate new secret
JWT_SECRET=$(openssl rand -hex 32)

# Update .env
# Restart server
npm start
```

### 4. Use Different Keys Per Environment

| Environment | JWT_SECRET | ENCRYPTION_KEY |
|------------|-----------|----------------|
| Local Dev | dev-key-123 | dev-key-456 |
| Testing | test-key-789 | test-key-101112 |
| Production | (random 32 chars) | (random 32 chars) |

---

## Default Values

If variable not set in `.env`, defaults are:

| Variable | Default |
|----------|---------|
| `PORT` | `5000` |
| `JWT_SECRET` | `'your-super-secret-key-change-in-production'` |
| `CORS_ORIGIN` | `'http://localhost:3000'` |
| `NODE_ENV` | `'development'` |
| `LOG_LEVEL` | `'info'` |
| `ENCRYPTION_KEY` | Derived from JWT_SECRET |

---

## Troubleshooting

### "Port 5000 already in use"

**Solution:** Change PORT
```env
PORT=5001
```

### "JWT_SECRET is not set"

**Solution:** Add to .env
```env
JWT_SECRET=your-random-secret-key
```

### "CORS error: Origin not allowed"

**Solution:** Update CORS_ORIGIN
```env
# If using different frontend port
CORS_ORIGIN=http://localhost:3001
```

### "Secrets not decrypting"

**Causes:**
- Changed ENCRYPTION_KEY without consistency
- Moved database to different environment

**Solution:**
- Use same ENCRYPTION_KEY across environments
- Back up database before changing keys

### "Too much logging"

**Solution:** Reduce LOG_LEVEL
```env
LOG_LEVEL=warn
```

---

## Environment Variables in Code

### Reading Variables

All variables accessible via `process.env`:

```javascript
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
const corsOrigin = process.env.CORS_ORIGIN;
const nodeEnv = process.env.NODE_ENV;
const logLevel = process.env.LOG_LEVEL;
```

### In Backend Files

Example from `server.js`:
```javascript
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
```

Example from `auth.js`:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'default-key';
```

---

## Docker & Deployment

### Using with Docker

Pass variables to container:
```bash
docker run -e PORT=5000 \
           -e JWT_SECRET=your-secret \
           -e CORS_ORIGIN=https://example.com \
           hosting-platform
```

Or with `.env` file:
```bash
docker run --env-file .env hosting-platform
```

### Using with PM2

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'hosting-platform',
    script: './server.js',
    env: {
      PORT: 5000,
      JWT_SECRET: process.env.JWT_SECRET,
      NODE_ENV: 'production'
    }
  }]
};
```

---

## Validation

Variables are validated on startup. Server will fail to start if:
- `JWT_SECRET` is too short (< 10 chars)
- `PORT` is invalid (not a number)
- `LOG_LEVEL` is invalid (not one of: error, warn, info, debug)

---

## Managing Multiple Environments

### Structure

```
backend/
├── .env.example          ← Template (commit to Git)
├── .env                  ← Local development (DON'T commit)
├── .env.test             ← Testing (DON'T commit)
├── .env.production       ← Production (NEVER commit)
└── .gitignore            ← Ignores .env files
```

### .gitignore

```
# Environment variables
.env
.env.local
.env.*.local
.env.production
.env.test

# Logs
logs/
*.log

# Database
platform.db

# Node
node_modules/
```

### Loading Specific Environment

```bash
# Development
npm start

# Testing
TEST_ENV=true npm test

# Production
NODE_ENV=production npm start
```

---

## Security Checklist

- [ ] `JWT_SECRET` is unique and random (32+ characters)
- [ ] `ENCRYPTION_KEY` is set (if using secrets across servers)
- [ ] `.env` is in `.gitignore`
- [ ] `.env` file is NOT committed to Git
- [ ] Different secrets for each environment
- [ ] Production uses HTTPS in `CORS_ORIGIN`
- [ ] `NODE_ENV=production` for production
- [ ] Regular secret rotation scheduled

---

## Quick Reference

### Development Setup

```bash
cp .env.example .env

# Edit .env with:
PORT=5000
JWT_SECRET=dev-key-12345
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info

npm install
npm start
```

### Production Setup

```bash
# Generate strong secrets
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create .env with:
PORT=5000
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
LOG_LEVEL=warn

npm install
npm start
```

---

This completes the environment variable documentation for Phase 1.
