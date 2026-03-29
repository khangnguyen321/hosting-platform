# Troubleshooting

Solutions for common issues in Phase 1.

---

## Installation Issues

### "npm: command not found"

**Problem:** Node.js is not installed

**Solution:**
1. Download Node.js from https://nodejs.org
2. Install version 16 or higher
3. Restart PowerShell
4. Verify: `node --version`

---

### "git: command not found"

**Problem:** Git is not installed

**Solution:**
1. Download Git from https://git-scm.com
2. Install with default options
3. Restart PowerShell
4. Verify: `git --version`

---

### "npm install fails"

**Problem:** Dependencies fail to install

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rmdir /s /q node_modules

# Retry install
npm install
```

**If still failing:**
- Check internet connection
- Try from different terminal (Admin PowerShell)
- Check available disk space

---

## Server Issues

### "Port 5000 already in use"

**Problem:** Another process is using port 5000

**Quick Fix:**
```env
# In .env
PORT=5001
```

**Find What's Using Port 5000:**
```powershell
# PowerShell
netstat -ano | findstr :5000

# Or find by PID
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess
```

**Kill Process:**
```powershell
Stop-Process -Id <PID> -Force
```

---

### "Server crashes on startup"

**Problem:** Server exits immediately

**Check:**
1. Error message in terminal
2. `.env` file exists
3. `JWT_SECRET` is set in `.env`

**Common Causes:**
- Missing `.env` file → Create from `.env.example`
- Invalid `JWT_SECRET` → Must be set
- Node.js version too old → Update to 16+

---

### "Cannot find module 'express'"

**Problem:** Dependencies not installed

**Solution:**
```bash
npm install
```

**If still failing:**
```bash
# Remove and reinstall
rmdir /s /q node_modules
npm install
```

---

## Authentication Issues

### "Invalid email" error on signup

**Problem:** Email format validation failed

**Solution:**
Use valid email format:
```
valid: user@example.com
invalid: user@
invalid: user.example.com
```

---

### "Password too weak" error

**Problem:** Password doesn't meet requirements

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)

**Example valid password:**
```
Password123!
MyP@ssw0rd
Test@1234
```

---

### "Username already exists"

**Problem:** Username is taken

**Solution:**
Use a different username. Usernames must be:
- 3-20 characters
- Alphanumeric + underscore only
- Unique

---

### "Login fails with correct credentials"

**Problem:** Authentication failed

**Solutions:**
1. Check username and password spelling
2. Ensure account was created (check signup response)
3. Check that token is being used in subsequent requests
4. Try login again (rate limit after 5 failures)

---

## Deployment Issues

### "Git clone fails"

**Problem:** Repository cannot be cloned

**Causes:**
- Invalid GitHub URL
- Repository doesn't exist
- GitHub is down
- Network issue

**Solution:**
```bash
# Test git directly
git clone https://github.com/username/repo.git

# If that fails, GitHub URL is wrong
```

**Check URL Format:**
```
Must be: https://github.com/user/repo.git
Not: https://github.com/user/repo
```

---

### "npm install fails during deployment"

**Problem:** Dependencies fail to install on deployed project

**Causes:**
- Missing package.json
- Invalid package.json syntax
- Private packages without credentials
- Network issue

**Solution:**
1. Verify project has `package.json`
2. Verify `package.json` is valid JSON
3. Check project can be cloned and installed locally first

---

### "Project won't start"

**Problem:** Application starts but immediately crashes

**Check Logs:**
```powershell
# Get logs from project
GET /api/projects/:id/logs
```

**Look for:**
- Port already in use
- Missing required packages
- Syntax errors in code
- Missing environment variables

**Common Causes:**
- No `package.json` → Create one
- No start script → Add to `package.json`
- Wrong port → App should use `process.env.PORT`

---

### "Deployment hangs"

**Problem:** Deployment appears to freeze

**Causes:**
- Large repository (slow clone)
- Many dependencies (slow install)
- Network issue

**Solution:**
- Wait longer (can take 5-10 minutes for large repos)
- Check server logs
- Cancel and retry

---

## API Issues

### "401 Unauthorized"

**Problem:** Request rejected as unauthenticated

**Causes:**
- Missing `Authorization` header
- Invalid or expired token
- Wrong token format

**Solution:**
```powershell
# Correct format
-Headers @{"Authorization" = "Bearer YOUR_TOKEN"}

# Get new token
POST /auth/login with credentials
```

---

### "429 Too Many Requests"

**Problem:** Rate limit exceeded

**Limits:**
- Login: 5 attempts per 15 minutes
- Signup: 3 attempts per hour
- General API: 100 requests per 15 minutes
- Deploy: 5 per hour

**Solution:**
- Wait until reset time
- Check which endpoint is being rate limited
- Optimize request frequency

---

### "404 Project not found"

**Problem:** Project doesn't exist or not owned by user

**Causes:**
- Wrong project ID
- Project deleted
- Different user account

**Solution:**
1. Get correct project ID: `GET /api/projects`
2. Use that ID in requests
3. Ensure logged in as correct user

---

### "CORS error: Origin not allowed"

**Problem:** Browser blocks request due to CORS

**Causes:**
- Frontend origin not in `CORS_ORIGIN`
- Wrong protocol (http vs https)

**Solution:**
Update `backend/.env`:
```env
# If frontend on port 3001
CORS_ORIGIN=http://localhost:3001

# If production HTTPS
CORS_ORIGIN=https://yourdomain.com
```

---

## Database Issues

### "Database locked"

**Problem:** SQLite database is locked (only file-based database)

**Causes:**
- Multiple processes accessing database
- Previous process didn't close properly

**Solution:**
```bash
# Restart server
npm start
```

**If persists:**
```bash
# Close all Node processes
taskkill /F /IM node.exe

# Delete lock file if exists
rm platform.db-wal
rm platform.db-shm

# Restart
npm start
```

---

### "Cannot read projects list"

**Problem:** Database query fails

**Check:**
1. Database file exists: `backend/platform.db`
2. User is authenticated (has valid token)
3. Server logs for errors

---

## Logging & Debugging

### "Not seeing logs"

**Problem:** Deployment logs not appearing

**Solutions:**
1. Check project is actually running: `GET /api/projects/:id/status`
2. Check for errors: `GET /api/projects/:id/logs`
3. Check server logs: `tail -f backend/logs/combined.log`

---

### "How to view full error details"

**In Development:**
```env
NODE_ENV=development
LOG_LEVEL=debug
```

**Then:**
```bash
tail -f backend/logs/error.log
```

---

### "How to clear logs"

```bash
# Remove log files
rm backend/logs/error.log*
rm backend/logs/combined.log*

# Or truncate
echo "" > backend/logs/error.log
echo "" > backend/logs/combined.log
```

---

## Performance Issues

### "Server is slow"

**Check:**
1. How many projects are running?
2. How many requests per second?
3. Disk usage?
4. Memory usage?

**Solutions:**
- Stop unused projects
- Limit concurrent deployments (max 5/hour)
- Clear old logs: `rm backend/logs/*.log`

---

### "Database is slow"

**Causes:**
- Too much data
- Inefficient queries
- Fragmentation

**Solutions:**
- Keep only recent logs
- Archive old data
- Optimize queries

---

## Getting Help

### 1. Check Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - How system works
- [API_REFERENCE.md](API_REFERENCE.md) - All endpoints
- [SECURITY.md](SECURITY.md) - Security features

### 2. Check Logs

```bash
# Backend logs
tail -f backend/logs/error.log
tail -f backend/logs/combined.log

# Or view via API
GET /api/audit/logs
```

### 3. Verify Setup

```bash
# Test server is running
curl http://localhost:5000/health

# Test authentication
npm run test
```

### 4. Test Individual Endpoint

```powershell
# Simple health check
Invoke-WebRequest http://localhost:5000/health

# Check if signup works
# See QUICK_START.md for example
```

---

## Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Port in use | Change PORT in .env |
| npm install fails | `npm cache clean --force` then retry |
| Server won't start | Check .env file exists |
| Can't deploy | Verify GitHub URL is correct |
| Deployment slow | Normal for large repos, be patient |
| Authorization errors | Include Bearer token in header |
| CORS errors | Check CORS_ORIGIN in .env |
| Database locked | Restart server (npm start) |

---

## Still Not Working?

1. **Read the error message carefully** - It usually tells you what's wrong
2. **Check the logs** - Error details are in `logs/` directory
3. **Verify prerequisites** - Node.js 16+, Git installed
4. **Check .env file** - Exists and has JWT_SECRET set
5. **Restart everything** - Stop server and restart

If all else fails, start fresh:

```bash
# Stop server (Ctrl+C)

# Remove node_modules
rmdir /s /q node_modules

# Reinstall
npm install

# Restart
npm start
```

---

**Most issues are resolved by:**
1. ✓ Checking .env file
2. ✓ Checking error logs
3. ✓ Restarting server
4. ✓ Reinstalling dependencies

