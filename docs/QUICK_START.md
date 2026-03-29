# Quick Start (5 Minutes)

Get your hosting platform running in 5 minutes.

## Prerequisites

- **Node.js** 16+ (Check: `node --version`)
- **Git** (Check: `git --version`)
- **Windows 11, Linux, or Mac**

## Step 1: Install (2 minutes)

```bash
cd backend
npm install
```

Wait for it to finish. You'll see `added X packages`.

## Step 2: Configure (1 minute)

Create `.env` file in `backend/` folder:

```env
PORT=5000
JWT_SECRET=my-secret-key-12345
```

## Step 3: Start Server (1 minute)

```bash
npm start
```

You should see:

```
🚀 Server: http://localhost:5000
📚 API Ready with security features
```

**✅ Server is running!**

## Step 4: Create Account (1 minute)

Open PowerShell and run:

```powershell
$body = @{
    username = "testuser"
    email = "test@example.com"
    password = "TestPassword123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/auth/signup" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

You should get back a user ID. **✅ Account created!**

## Step 5: Login (< 1 minute)

```powershell
$body = @{
    username = "testuser"
    password = "TestPassword123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json

$token = $response.token
Write-Host "Your token: $token"
```

Save that token - you'll need it for the next steps. **✅ Logged in!**

---

## You're Done! 🎉

Your hosting platform is running.

**Next Steps:**

1. Read **[SETUP.md](./SETUP.md)** for detailed instructions
2. Check **[API_REFERENCE.md](./API_REFERENCE.md)** for all endpoints
3. Try deploying a test project (see below)

---

## Test Deployment (Optional)

### Create a Test Project

```powershell
$token = "YOUR_TOKEN_HERE"

$body = @{
    name = "Test App"
    github_url = "https://github.com/expressjs/express.git"
    github_branch = "master"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/projects" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $body | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

This creates a project. Note the `id`.

### Deploy It

```powershell
$token = "YOUR_TOKEN_HERE"
$projectId = 1  # From previous response

Invoke-WebRequest -Uri "http://localhost:5000/api/projects/$projectId/deploy" `
  -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

Watch the server window - you'll see:
```
🚀 DEPLOYING: Test App
📦 Cloning...
📥 Installing...
🚀 Starting...
```

When done, you'll get a port number. Visit `http://localhost:PORT` to see your app running!

---

## Common Issues

### "npm: command not found"
→ Install Node.js from nodejs.org

### "Port 5000 already in use"
→ Change `PORT=5000` to `PORT=5001` in `.env`

### "Git is not installed"
→ Install Git from git-scm.com

---

## What's Next?

Read the full documentation:

- **[SETUP.md](./SETUP.md)** - Complete setup with all options
- **[API_REFERENCE.md](./API_REFERENCE.md)** - All endpoints explained
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - How everything works
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common problems & solutions

---

**You're running a production-grade hosting platform!** 🚀
