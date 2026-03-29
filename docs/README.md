# Personal Hosting Platform

A **production-grade hosting platform** combining the deployment capabilities of **Railway** with the database management of **Supabase**. Deploy GitHub repositories and manage your Node.js applications from a single unified system.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ installed
- **Git** installed
- **Windows 11** or Linux/Mac

### Installation (5 minutes)

```bash
# Navigate to backend directory
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start the server
npm start
```

Server runs on `http://localhost:5000`

### Test It

```powershell
# Create account
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

---

## 📋 What Is This?

This is a **complete backend system** that lets you:

✅ **Deploy** GitHub repositories with one click  
✅ **Manage** multiple Node.js projects  
✅ **Store** encrypted environment variables per project  
✅ **Monitor** deployment logs in real-time  
✅ **Track** all user actions for security  
✅ **Secure** everything with rate limiting and encryption  

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   Your Client (PowerShell, API) │
└────────────┬────────────────────┘
             │ HTTP Requests
             ▼
    ┌────────────────────┐
    │  Express API       │
    │  (Port 5000)       │
    │                    │
    │  ✓ Auth            │
    │  ✓ Rate Limiting   │
    │  ✓ Validation      │
    │  ✓ Encryption      │
    └────────┬───────────┘
             │
    ┌────────┴──────────┐
    ▼                   ▼
┌─────────────┐    ┌──────────────┐
│   SQLite    │    │  Git Clone & │
│  Database   │    │  Deploy      │
└─────────────┘    └──────────────┘
                       │
                       ▼
                  ┌──────────────┐
                  │ Your Node.js │
                  │   Apps on    │
                  │ Ports 3001+  │
                  └──────────────┘
```

---

## 📚 Documentation

### Getting Started
- **[SETUP.md](./SETUP.md)** - Step-by-step installation
- **[QUICK_START.md](./QUICK_START.md)** - 5-minute quick start
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues & fixes

### API & Integration
- **[API_REFERENCE.md](./API_REFERENCE.md)** - All endpoints with examples
- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - Configuration guide

### Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design & components
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Database structure
- **[SECURITY.md](./SECURITY.md)** - Security features & best practices

### Operations & Deployment
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deploy to production
- **[MONITORING_GUIDE.md](./MONITORING_GUIDE.md)** - Logs & monitoring
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - How to test the system
- **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)** - Optimization tips

### Phase Documentation
- **[PHASE_1_COMPLETE.md](./PHASE_1_COMPLETE.md)** - Phase 1 features & status

---

## 🔐 Key Features

### Security (Built-In)
- 🔒 JWT authentication with bcrypt password hashing
- 🛡️ Rate limiting (prevents brute force attacks)
- ✅ Input validation & sanitization
- 🔐 AES-256-GCM encryption for secrets
- 📊 Complete audit logging of all actions
- 🎯 Security headers (Helmet)
- 🔄 CORS origin validation

### Reliability
- 📝 Comprehensive error handling
- 📊 Winston logging system with file rotation
- 🔍 Request logging & tracing
- 📈 Graceful error recovery

### Operations
- 🚀 One-click GitHub repo deployment
- 🔧 Automatic port allocation
- 📦 Dependency management (npm install)
- 🎛️ Process management
- 📚 Deployment logs & history

### Data Management
- 💾 SQLite database (file-based, no setup needed)
- 🔑 Per-project encrypted environment variables
- 📋 Full audit trail of all actions
- 🗑️ Automatic database migrations

---

## 📁 Project Structure

```
hosting-platform/
├── backend/                    ← Phase 1 (All backend code)
│   ├── server.js              ← Main API server
│   ├── package.json           ← Dependencies
│   ├── .env.example           ← Configuration template
│   │
│   ├── Core Components
│   ├── auth.js                ← Authentication
│   ├── deploy.js              ← Deployment engine
│   ├── db.js                  ← Database setup
│   │
│   ├── Security & Operations
│   ├── logger.js              ← Logging system
│   ├── validation.js          ← Input validation
│   ├── encryption.js          ← Secret encryption
│   ├── errors.js              ← Error handling
│   ├── rateLimit.js           ← Rate limiting
│   ├── audit.js               ← Audit logging
│   │
│   ├── Testing
│   ├── test.js                ← Automated tests
│   ├── example-client.js      ← API examples
│   │
│   └── Reference
│       └── server-basic.js    ← Original simple version
│
├── docs/                       ← Documentation
│   ├── SETUP.md
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── MONITORING_GUIDE.md
│   ├── TESTING_GUIDE.md
│   └── ... more docs
│
└── README.md                   ← This file
```

---

## 🚀 Getting Started

### 1. **Install & Setup** (5 min)
```bash
cd backend
npm install
cp .env.example .env
npm start
```

### 2. **Create Account** (1 min)
```bash
POST /auth/signup
Body: { username, email, password }
```

### 3. **Add Your First Project** (2 min)
```bash
POST /api/projects
Body: { name, github_url, github_branch }
```

### 4. **Deploy** (2-5 min)
```bash
POST /api/projects/:id/deploy
```

### 5. **Visit Your App** (< 1 min)
```
http://localhost:3001
```

See **[QUICK_START.md](./QUICK_START.md)** for detailed steps.

---

## 🧪 Testing

Run automated tests:

```bash
npm test
```

Or test individual endpoints with PowerShell:

```powershell
node example-client.js
```

See **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** for comprehensive testing.

---

## 📊 API Endpoints

### Authentication
```
POST   /auth/signup              - Create account
POST   /auth/login               - Login & get token
```

### Projects
```
GET    /api/projects             - List your projects
POST   /api/projects             - Create project
DELETE /api/projects/:id         - Delete project
```

### Deployment
```
POST   /api/projects/:id/deploy  - Deploy project
POST   /api/projects/:id/stop    - Stop project
GET    /api/projects/:id/status  - Check status
GET    /api/projects/:id/logs    - View logs
```

### Secrets (Environment Variables)
```
GET    /api/projects/:id/secrets           - List secrets
POST   /api/projects/:id/secrets           - Store encrypted secret
DELETE /api/projects/:id/secrets/:key      - Delete secret
```

### Audit
```
GET    /api/audit/logs           - View action history
```

Full documentation in **[API_REFERENCE.md](./API_REFERENCE.md)**

---

## ⚙️ Configuration

Create `.env` file in backend directory:

```env
PORT=5000
JWT_SECRET=your-super-secret-key-change-this
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info
```

See **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** for all options.

---

## 🔐 Security Features

### Built-In Protection
✅ **Passwords** - Hashed with bcrypt (never stored in plain text)  
✅ **Tokens** - Signed JWT tokens with expiration  
✅ **Secrets** - Encrypted with AES-256-GCM before storage  
✅ **Input** - Validated and sanitized on all endpoints  
✅ **Rate Limits** - Login (5/15min), Signup (3/1hr), API (100/15min)  
✅ **Audit Trail** - Every action logged with timestamp & user  
✅ **Security Headers** - Helmet sets XSS, CSRF, clickjacking protections  
✅ **CORS** - Only allowed origins accepted  

See **[SECURITY.md](./SECURITY.md)** for detailed security documentation.

---

## 📈 What's Included

### Phase 1 (Current - Complete)
✅ User authentication (signup/login)  
✅ Project management (create/list/delete)  
✅ Deployment engine (clone, install, run)  
✅ Rate limiting (prevents abuse)  
✅ Input validation (prevents injection)  
✅ Encryption (protects secrets)  
✅ Audit logging (security tracking)  
✅ Error handling (consistent responses)  
✅ Request logging (Winston)  
✅ CORS validation (origin check)  

### Phase 2 (Coming Soon)
⏳ React web dashboard  
⏳ GitHub OAuth login  
⏳ Real-time log streaming  
⏳ Environment variables UI  

### Phase 3+ (Future)
⏳ Docker container support  
⏳ Database management UI  
⏳ Horizontal scaling  
⏳ Webhook integrations  

---

## 📖 Learn More

- **[SETUP.md](./SETUP.md)** - Complete setup instructions
- **[API_REFERENCE.md](./API_REFERENCE.md)** - All API endpoints
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - How the system works
- **[SECURITY.md](./SECURITY.md)** - Security deep dive
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues

---

## 🤝 Contributing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for contribution guidelines.

---

## 📝 License

MIT License - See **[LICENSE](./LICENSE)** for details.

---

## 🆘 Support

### Having Issues?
1. Check **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**
2. Review logs in `backend/logs/` directory
3. Check **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** for testing steps

### Want to Learn More?
- Read **[ARCHITECTURE.md](./ARCHITECTURE.md)** to understand the system
- Check **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** for data structure
- Review **[SECURITY.md](./SECURITY.md)** for security implementation

---

## ✨ Status

**Phase 1: ✅ COMPLETE & PRODUCTION-READY**

Your backend is:
- ✅ Secure (rate limiting, encryption, validation)
- ✅ Reliable (error handling, logging)
- ✅ Observable (comprehensive logging)
- ✅ Auditable (complete action trail)
- ✅ Production-Ready (enterprise features)

**Ready to deploy!** 🚀

---

**Made for deploying your Node.js projects with confidence.**
