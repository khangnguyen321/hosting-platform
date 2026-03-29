# Personal Hosting Platform - Setup Guide

Welcome! This guide will walk you through setting up your hosting platform on Windows 11.

## What You're Building

A system that lets you:
- Create an account and log in
- Add GitHub repositories
- Deploy them with one click
- View logs and stop projects
- Manage everything from a web dashboard

---

## Step 1: Initial Setup (15 minutes)

### 1.1 Create a .env file

In the `hosting-platform` folder, create a new file called `.env` (copy from `.env.example`):

```
PORT=5000
JWT_SECRET=my-super-secret-key-12345
```

> **What is this?** 
> The .env file stores secret settings your app needs. `JWT_SECRET` is a random string that helps secure login tokens. Change "my-super-secret-key-12345" to something unique.

### 1.2 Install Dependencies

Open PowerShell in the `hosting-platform` folder and run:

```powershell
npm install
```

> **What is this?**
> This command reads `package.json` and downloads all the libraries your server needs (Express, JWT, SQLite, etc.). It might take 2-3 minutes. You'll see a new `node_modules` folder appear.

### 1.3 Test the Server

In PowerShell, run:

```powershell
npm start
```

You should see:

```
╔════════════════════════════════════════╗
║   Personal Hosting Platform            ║
║   Backend Server Running               ║
╚════════════════════════════════════════╝

🚀 Server: http://localhost:5000
```

**Success!** Your backend server is running. Leave this PowerShell window open.

---

## Step 2: Test the API (10 minutes)

Open another PowerShell window and test creating an account:

### 2.1 Signup

```powershell
$body = @{
    username = "testuser"
    email = "test@example.com"
    password = "TestPassword123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/auth/signup" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

You should get a response like:

```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "message": "Account created successfully"
}
```

### 2.2 Login

```powershell
$body = @{
    username = "testuser"
    password = "TestPassword123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/auth/login" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

You should get back a `token`. **Save this token** - you'll need it for the next step.

> **What is this token?**
> It's a JWT (JSON Web Token). It proves you're logged in. Any time you make a request, you send this token in the "Authorization" header so the server knows it's really you.

---

## Step 3: Create Your First Project (10 minutes)

Replace `YOUR_TOKEN_HERE` with the token you got from login:

```powershell
$token = "YOUR_TOKEN_HERE"

$body = @{
    name = "My First App"
    github_url = "https://github.com/username/my-app.git"
    github_branch = "main"
    description = "My awesome Node.js app"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/projects" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
  } `
  -Body $body
```

> **What is this?**
> You're telling the server about a GitHub repo you want to deploy. The server saves this info in the SQLite database.

---

## Step 4: Deploy a Project (5-10 minutes)

To actually deploy a project:

```powershell
$token = "YOUR_TOKEN_HERE"
$projectId = 1  # The ID you got from creating the project

Invoke-WebRequest -Uri "http://localhost:5000/projects/$projectId/deploy" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
  }
```

Watch your server window - you'll see:

1. **Cloning** the GitHub repo to `deployed-projects/My First App`
2. **Installing** npm dependencies
3. **Starting** the Node.js app on a random available port

> **What is this doing?**
> The server is:
> 1. Downloading your GitHub repo
> 2. Running `npm install` to get dependencies
> 3. Running `npm start` to run your app
> 4. Finding an unused port (like 3001) and running it there

---

## Step 5: Check Project Status

```powershell
$token = "YOUR_TOKEN_HERE"
$projectId = 1

Invoke-WebRequest -Uri "http://localhost:5000/projects/$projectId/status" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer $token"
  }
```

You should see:

```json
{
  "projectId": 1,
  "name": "My First App",
  "isRunning": true,
  "port": 3001,
  "pid": 12345,
  "url": "http://localhost:3001"
}
```

**Visit http://localhost:3001 in your browser** to see your app running!

---

## Step 6: Stop a Project

```powershell
$token = "YOUR_TOKEN_HERE"
$projectId = 1

Invoke-WebRequest -Uri "http://localhost:5000/projects/$projectId/stop" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
  }
```

---

## How to Use a GitHub Repository

Your GitHub repo needs:
- **package.json** with a `start` script
- **index.js** or **server.js** as the entry point

Example `package.json`:

```json
{
  "name": "my-app",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

Example `index.js`:

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from my hosted app!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Files Explained

- **server.js** - Main API server (handles all requests)
- **db.js** - Database setup (creates SQLite tables)
- **auth.js** - User authentication (signup, login, JWT)
- **deploy.js** - Deployment logic (clone, install, start)
- **package.json** - Lists all libraries your server needs
- **platform.db** - SQLite database (created automatically)
- **deployed-projects/** - Folder where GitHub repos are cloned

---

## Common Issues & Fixes

### Issue: "Port 5000 already in use"
**Fix:** Change `PORT=5000` to `PORT=5001` in your `.env` file

### Issue: "npm: command not found"
**Fix:** Node.js isn't installed. Download from nodejs.org and restart PowerShell

### Issue: "Git is not installed"
**Fix:** Your project can't be cloned. Install Git from git-scm.com

### Issue: "permission denied" on Mac/Linux
**Fix:** Run `chmod +x server.js` first

---

## Next Steps

Once this is working:

1. **Phase 2** - Build a React dashboard UI (web interface)
2. **Phase 3** - Add GitHub OAuth login (login with your GitHub account)
3. **Phase 4** - Environment variables UI (set secrets per project)
4. **Phase 5** - Real-time logs dashboard

Ready to build the frontend? Let me know!

---

## Architecture Summary

```
Your Browser
    ↓
React Dashboard (http://localhost:3000)
    ↓
Express API Server (http://localhost:5000)
    ↓
SQLite Database
    ↓
Deployed Projects (http://localhost:3001, 3002, etc.)
```

---

Questions? Let me know!
