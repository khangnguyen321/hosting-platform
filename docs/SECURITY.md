# Security

Complete security documentation for Phase 1.

---

## Security Layers

### Layer 1: Network Security

**CORS (Cross-Origin Resource Sharing)**
- Only allows requests from configured origins
- Default: `http://localhost:3000`, `http://localhost:5000`
- Configurable via `CORS_ORIGIN` environment variable

```env
CORS_ORIGIN=http://localhost:3000
```

**Security Headers (Helmet.js)**
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME sniffing)
- X-XSS-Protection: 1; mode=block (XSS protection)
- Strict-Transport-Security (HTTPS enforcement, when applicable)
- Content-Security-Policy (restricts script execution)

### Layer 2: Input Validation

**Email Validation**
```
✓ Valid format (RFC 5322 compliant)
✓ Normalized (lowercase)
```

**Password Validation**
```
✓ Minimum 8 characters
✓ Uppercase letter required
✓ Lowercase letter required
✓ Number required
✓ Special character required (!@#$%^&*)
```

**Username Validation**
```
✓ 3-20 characters
✓ Alphanumeric + underscore only
✓ Trimmed and escaped
```

**URL Validation**
```
✓ Valid GitHub URL format
✓ Must end with .git
✓ HTTPS protocol required
```

### Layer 3: Authentication

**Password Hashing**
```
plaintext password
        ↓
bcrypt.hash(password, 10 salt rounds)
        ↓
Stored: $2b$10$...
        ↓
On login: bcrypt.compare(plaintext, hash)
```

**Benefits:**
- Irreversible (cannot decrypt)
- Salted (10 rounds)
- Slow by design (protects against brute force)
- If database is compromised, passwords are still safe

**JWT Tokens**
```
Payload: { id, username, email, exp: now + 7 days }
        ↓
Signed with: crypto.sign(payload, JWT_SECRET)
        ↓
Sent to client: "Bearer eyJhbGc..."
        ↓
On each request: crypto.verify(token, JWT_SECRET)
        ↓
If invalid/expired → 401 Unauthorized
```

**Token Features:**
- Signed (cannot be tampered with)
- Expires after 7 days
- Verified on every protected request
- Includes user information in payload

### Layer 4: Rate Limiting

Prevents brute force attacks and API abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 attempts | 15 minutes |
| `/auth/signup` | 3 attempts | 1 hour |
| `/api/*` (general) | 100 requests | 15 minutes |
| `/api/projects/:id/deploy` | 5 deployments | 1 hour |

**Example: Login Rate Limiting**
```
Attempt 1 → Success (or fail)
Attempt 2 → Success (or fail)
Attempt 3 → Success (or fail)
Attempt 4 → Success (or fail)
Attempt 5 → Success (or fail)
Attempt 6 → 429 Too Many Requests
        ↓
Wait 15 minutes before retry
```

**Stored In:** `rate_limit_log` table with expiration

### Layer 5: Encryption at Rest

**Environment Variables (Secrets)**
```
plaintext: DATABASE_URL=postgresql://...
        ↓
Generate random IV (initialization vector)
        ↓
AES-256-GCM encrypt with master key
        ↓
Create authentication tag (proves data wasn't tampered)
        ↓
Stored: IV:authTag:encryptedData (all hex)
        ↓
On retrieval: Decrypt with same master key + verify tag
```

**Master Encryption Key:**
```
Derived from: crypto.scryptSync(JWT_SECRET, 'salt', 32)
Or: Custom ENCRYPTION_KEY environment variable
```

**Benefits:**
- Secrets encrypted before storage
- Cannot read encrypted secrets without master key
- Tamper detection (authentication tag)
- Different IV for each secret (prevents pattern detection)

### Layer 6: Authorization

**Role-Based Access Control (RBAC)**
- Users can only access their own projects
- Users cannot view other users' deployments
- Users cannot access other users' secrets
- Users cannot view other users' audit logs

**Enforced at:** Route handlers
```javascript
// Verify user owns this project before allowing access
db.get('SELECT * FROM projects WHERE id = ? AND user_id = ?',
  [projectId, req.user.id],
  (err, project) => {
    if (!project) {
      // Not found or not owned by user
      return res.status(404).json({ error: 'Project not found' });
    }
    // Allow access
  }
);
```

### Layer 7: Audit Logging

Complete trail of all user actions:

**What's Logged:**
- ✓ Successful logins
- ✓ Failed login attempts
- ✓ Signups
- ✓ Project creation/deletion
- ✓ Deployments (success/failure)
- ✓ Secret access
- ✓ Errors

**Information Captured:**
- User ID
- Action type
- Resource affected
- Timestamp
- IP address
- Status (success/error)
- Additional details (JSON)

**Stored In:** `audit_log` table

**Access:** Via `/api/audit/logs` endpoint

---

## Security Checklist

### ✅ Implemented

- [x] Passwords hashed with bcrypt
- [x] JWT tokens for authentication
- [x] Rate limiting on sensitive endpoints
- [x] Input validation & sanitization
- [x] CORS origin validation
- [x] Security headers (Helmet)
- [x] Encrypted secrets at rest
- [x] Audit logging of all actions
- [x] Authorization checks (user owns project)
- [x] Error handling (no stack trace leaks)
- [x] HTTPS ready (set CORS for HTTPS URLs)
- [x] Secrets never in logs
- [x] Failed attempts tracked

### ⏳ Phase 2+

- [ ] GitHub OAuth (more secure than username/password)
- [ ] API key authentication
- [ ] 2FA (Two-Factor Authentication)
- [ ] Session management
- [ ] Webhook signature verification

---

## Security Best Practices

### For Deployment (Phase 1 → Production)

1. **Change JWT_SECRET**
   ```env
   JWT_SECRET=$(openssl rand -hex 32)
   ```

2. **Use Strong Passwords**
   - Enforce during signup (already done)
   - Require: uppercase, lowercase, number, special char

3. **Enable HTTPS**
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **Set NODE_ENV**
   ```env
   NODE_ENV=production
   ```

5. **Use Environment Variables**
   - Never hardcode secrets
   - Use .env file (never commit to Git)
   - Use .gitignore to protect it

6. **Regular Backups**
   ```bash
   cp backend/platform.db backend/platform.db.backup.$(date +%Y%m%d)
   ```

7. **Monitor Logs**
   - Check `logs/error.log` regularly
   - Watch for failed login attempts
   - Monitor deployment errors

### For Users (Your Team)

1. **Use Strong Passwords**
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers, special chars
   - Never reuse across services

2. **Keep Token Safe**
   - Don't share your JWT token
   - Don't paste in public places
   - Treat like a password

3. **Rotate Secrets Regularly**
   - Update database passwords
   - Update API keys
   - Use `/api/projects/:id/secrets` endpoints

4. **Monitor Audit Log**
   - Check `/api/audit/logs` regularly
   - Look for suspicious activity
   - Report unauthorized access

---

## Common Security Threats & Mitigations

### 1. SQL Injection

**Threat:** Attacker inserts SQL code into input
```sql
Username: ' OR '1'='1
Password: anything
→ SELECT * FROM users WHERE username = '' OR '1'='1'
→ Bypasses authentication
```

**Mitigation:**
- ✓ Parameterized queries (all queries use ?)
- ✓ Input validation

### 2. Brute Force Attack

**Threat:** Attacker tries many passwords to guess login
```
Try password 1
Try password 2
...
Try password 10000
```

**Mitigation:**
- ✓ Rate limiting: 5 login attempts per 15 minutes
- ✓ Slow password hashing: bcrypt 10 rounds

### 3. XSS (Cross-Site Scripting)

**Threat:** Attacker injects JavaScript
```
Project name: <script>alert('hacked')</script>
```

**Mitigation:**
- ✓ Input sanitization (escapes < > ' ")
- ✓ Content-Security-Policy header
- ✓ X-XSS-Protection header

### 4. CSRF (Cross-Site Request Forgery)

**Threat:** Attacker tricks you into making unwanted requests
```
Attacker sends: <img src="http://localhost:5000/api/projects/1/stop">
→ Without your permission, stops your project
```

**Mitigation:**
- ✓ CORS validation (request must come from allowed origins)
- ✓ JWT tokens (cannot be stolen via cookies alone)

### 5. Man-in-the-Middle (MITM)

**Threat:** Attacker intercepts network traffic
```
Your browser ← [ATTACKER INTERCEPTS] → Server
```

**Mitigation:**
- ✓ Use HTTPS (encrypts traffic)
- ✓ Strict-Transport-Security header

### 6. Unauthorized Access

**Threat:** User accesses projects they don't own
```
Attacker: GET /api/projects/999 (owned by someone else)
```

**Mitigation:**
- ✓ Authorization checks
- ✓ Every endpoint verifies: user_id = owner

---

## Sensitive Data Handling

### Never Log
❌ Passwords (plaintext)  
❌ JWT tokens  
❌ Encrypted secrets  
❌ API keys  
❌ Credit card numbers  

### Always Encrypt
✓ Environment variables in database  
✓ API keys before storage  
✓ Database credentials  

### Always Hash
✓ Passwords  
✓ API key hashes  

### Always Validate
✓ Email format  
✓ Password strength  
✓ URL format  
✓ Username format  

---

## Testing Security

### Manual Testing

1. **Test Rate Limiting**
   ```bash
   # Try login 6 times → 6th should fail
   ```

2. **Test Input Validation**
   ```bash
   # Try weak password → should fail
   # Try invalid email → should fail
   ```

3. **Test Authorization**
   ```bash
   # Try accessing project of another user → should fail
   ```

4. **Test Encryption**
   ```bash
   # Check database → secrets should be encrypted
   ```

5. **Test Audit Logging**
   ```bash
   # Make actions → check /api/audit/logs
   ```

### Automated Testing

Run test suite:
```bash
npm test
```

Includes security checks for:
- Password validation
- Token generation & verification
- Authorization enforcement
- Input validation

---

## Security Monitoring

### What to Monitor

1. **Failed Login Attempts**
   ```sql
   SELECT * FROM audit_log
   WHERE action = 'LOGIN_FAILED'
   AND created_at > datetime('now', '-24 hours');
   ```

2. **Deployment Failures**
   ```sql
   SELECT * FROM audit_log
   WHERE action = 'DEPLOYMENT_FAILED'
   ORDER BY created_at DESC;
   ```

3. **Rate Limit Hits**
   ```sql
   SELECT DISTINCT ip_address FROM rate_limit_log
   WHERE created_at > datetime('now', '-1 hour');
   ```

4. **Unauthorized Access Attempts**
   ```sql
   SELECT * FROM audit_log
   WHERE status = 'error'
   AND action LIKE '%FAILED'
   ORDER BY created_at DESC;
   ```

---

## OWASP Top 10 Coverage

| OWASP Top 10 | Phase 1 Status |
|--------------|----------------|
| A01: Broken Access Control | ✅ Implemented (authorization checks) |
| A02: Cryptographic Failures | ✅ Implemented (encrypted secrets) |
| A03: Injection | ✅ Mitigated (parameterized queries) |
| A04: Insecure Design | ✅ Secure by design |
| A05: Security Misconfiguration | ✅ Secure defaults |
| A06: Vulnerable Components | ✅ Using latest deps |
| A07: Authentication Failures | ✅ Robust JWT auth |
| A08: Data Integrity Failures | ✅ Encryption + validation |
| A09: Logging & Monitoring | ✅ Complete audit trail |
| A10: SSRF | ✅ URL validation |

---

## Incident Response

### If Password Compromised

1. User resets password immediately
2. System logs the reset in audit trail
3. Old password hash is discarded
4. JWT tokens still valid (expire in 7 days)
5. Monitor for unauthorized access

### If Token Leaked

1. Token still expires in 7 days
2. Use new token after login
3. Monitor audit logs for unauthorized actions
4. Consider forced logout in Phase 2

### If Secret Leaked

1. Update secret via `/api/projects/:id/secrets`
2. Redeploy project with new secret
3. Audit log tracks the update
4. Old encrypted value still in database (history)

---

**Phase 1 provides enterprise-grade security suitable for personal and small team use.**

For production deployments beyond small teams, consider:
- Adding 2FA
- Using PostgreSQL + managed backups
- Implementing API key authentication
- Adding webhook signing verification
- Setting up security scanning & monitoring
