# Owned BAAS - Hosting Platform Progress

**Project**: Personal web hosting platform combining Railway-like deployment with Supabase-like database management  
**Status**: Phase 3 COMPLETE | Platform LIVE at launchport.org  
**Date Started**: March 29, 2026  
**Last Updated**: April 5, 2026

---

## 📋 Project Overview

Building a personal hosting platform to avoid paying for Railway, Supabase, and Vercel. Goal: Host 10+ projects on a single cheap VPS (~$80/year).

**Core Concept**: Self-hosted platform at **launchport.org** that deploys projects as Docker containers on wildcard subdomains (*.launchport.org).

**LIVE URLs**:
- 🌐 **Backend API**: http://launchport.org
- 🎨 **Dashboard**: http://dashboard.launchport.org

---

## ✅ Phase 1 & 2 - COMPLETE

### Backend (Phase 1)
- ✅ Node.js + Express server
- ✅ SQLite database
- ✅ JWT authentication with bcrypt
- ✅ 16+ API endpoints
- ✅ GitHub integration (repo cloning)
- ✅ Project CRUD operations
- ✅ Deployment management
- ✅ Rate limiting & validation
- **Status**: Running in Docker container on port 5000, accessible via launchport.org

### Frontend (Phase 2)
- ✅ React dashboard
- ✅ User login/logout
- ✅ Project management UI
- ✅ API integration with token auth
- ✅ Responsive design
- **Status**: Running in Docker container on port 3000, accessible via dashboard.launchport.org

### Repository
- **GitHub**: https://github.com/khangnguyen321/hosting-platform.git
- **Visibility**: Public (portfolio piece)

---

## 🚀 Phase 3 - Infrastructure & Deployment - ✅ COMPLETE

### Domain Setup
- **Domain**: `launchport.org`
- **Registrar**: Namecheap
- **Cost**: $7.48/year
- **Type**: .org TLD
- **Privacy**: Enabled (free)
- **Status**: ✅ Active & configured & LIVE

### VPS Setup - Linode
- **Provider**: Linode
- **Plan**: Linode 2GB (Shared CPU)
- **Specs**: 2GB RAM, 50GB SSD, 1 vCPU
- **Region**: US, Atlanta, GA (us-southeast)
- **OS**: Ubuntu 24.04 LTS (GNU/Linux 6.8.0-71-generic x86_64)
- **Cost**: $12/month ($144/year)
- **IP Address**: `45.79.212.239`
- **Hostname**: `launchport-vps`
- **Linode ID**: 95134208
- **Root Password**: Set (strong password with uppercase, lowercase, numbers, symbols)
- **Encrypted**: Yes (data-at-rest encryption enabled)
- **Free Credit**: $100 for 60 days (covers ~33 months free hosting)
- **Status**: ✅ Running & provisioned

### Firewall Configuration
- **Firewall Name**: `launchport-firewall`
- **Status**: ✅ Enabled with 3 rules

**Inbound Rules**:
1. SSH (port 22) - TCP - All IPv4, All IPv6 - ACCEPT
2. HTTP (port 80) - TCP - All IPv4, All IPv6 - ACCEPT
3. HTTPS (port 443) - TCP - All IPv4, All IPv6 - ACCEPT

**Default Policies**:
- Inbound: Drop (blocks unauthorized access)
- Outbound: Accept (allows apps to send data)

### DNS Configuration - ✅ LIVE
- **Nameservers**: Linode
  - ns1.linode.com
  - ns2.linode.com
  - ns3.linode.com
  - ns4.linode.com
  - ns5.linode.com
- **DNS Zone**: ✅ Created in Linode
- **SOA Record**: ✅ Configured with email (ktgorsk.developer@gmail.com)
- **NS Records**: ✅ All 5 Linode nameservers configured
- **A Record**: ✅ launchport.org → 45.79.212.239
- **CNAME Wildcard**: ✅ *.launchport.org → launchport.org
- **Status**: ✅ DNS LIVE and propagated

### Software Installation

#### Docker
- **Version**: 29.3.1
- **Components**:
  - Engine: 29.3.1
  - containerd: v2.2.2
  - runc: 1.3.4
- **Purpose**: Container runtime for deploying projects
- **Status**: ✅ Installed & running
- **Command Syntax**: `docker compose` (space, not hyphen)

#### Nginx
- **Version**: Latest (stable)
- **Purpose**: Reverse proxy for routing subdomains
- **Status**: ✅ Installed, configured & running
- **Config Location**: /etc/nginx/sites-available/
- **Service**: systemctl managed
- **Configs Created**:
  - `launchport` → Routes launchport.org to backend (localhost:5000)
  - `dashboard` → Routes dashboard.launchport.org to frontend (localhost:3000)

#### System Updates
- **Status**: ✅ Complete (apt update && apt upgrade)
- **Kernel**: 6.8.0-71-generic
- **System Load**: ~0.03
- **Memory Usage**: ~30%
- **Disk Usage**: ~14% of 50GB

### SSH Access
- **Command**: `ssh root@45.79.212.239`
- **Status**: ✅ Working via PowerShell on Windows 11 and Linode LISH Console
- **Authentication**: Password-based (root user)
- **Working Directory on VPS**: `/opt/launchport`

---

## 🐳 Phase 3 - Docker Containerization - ✅ COMPLETE

### Docker Setup on VPS
- **Location**: `/opt/launchport/`
- **Compose File**: `docker-compose.yml` (version attribute removed per Docker 29.3.1 best practices)
- **Network**: `launchport-net` (bridge driver)

### Container Status: ✅ BOTH HEALTHY & LIVE

#### Backend Container
- **Name**: `launchport-backend`
- **Image**: Custom build from `./backend/dockerfile`
- **Base**: `node:20-alpine`
- **Port**: 5000 (mapped 0.0.0.0:5000->5000/tcp)
- **Status**: ✅ Up and healthy
- **Public URL**: http://launchport.org
- **Health Endpoint**: http://launchport.org/health
- **Environment**:
  - NODE_ENV=production
  - PORT=5000
  - DATABASE_PATH=/data/platform.db
  - CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://dashboard.launchport.org,https://dashboard.launchport.org
- **Volumes**: `./data:/data` (SQLite database persistence)
- **Restart Policy**: unless-stopped

**Backend Dockerfile Key Points**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
# CRITICAL: Install build tools + curl for healthcheck
RUN apk add --no-cache python3 make g++ curl
COPY package*.json ./
RUN npm ci
RUN npm rebuild  # Rebuild native modules for Linux
COPY . .
EXPOSE 5000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

**Healthcheck Configuration**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s  # CRITICAL: Grace period for Node.js startup
```

#### Frontend Container
- **Name**: `launchport-frontend`
- **Image**: Custom build from `./frontend/Dockerfile`
- **Base**: `node:20-alpine` (build) + `nginx:alpine` (runtime)
- **Port**: 3000 (mapped 0.0.0.0:3000->3000/tcp)
- **Status**: ✅ Up and running
- **Public URL**: http://dashboard.launchport.org
- **API Base**: http://launchport.org (configured in /opt/launchport/frontend/src/api.js)
- **Depends On**: backend (service_healthy condition)
- **Restart Policy**: unless-stopped

### Docker Commands Reference

**On VPS (Ubuntu 24.04 with Docker 29.3.1)**:
- ✅ `docker compose up -d` (start containers in detached mode)
- ✅ `docker compose down` (stop and remove containers)
- ✅ `docker compose build --no-cache` (rebuild images without cache)
- ✅ `docker compose up -d --force-recreate` (recreate containers with updated env vars)
- ✅ `docker ps -a` (list all containers with status)
- ✅ `docker logs <container-name>` (view container logs)
- ✅ `docker exec <container-name> <command>` (run command in container)

**IMPORTANT**: Use `docker compose` (space) not `docker-compose` (hyphen) on Docker 29.3.1+

---

## 🌐 Nginx Reverse Proxy Configuration - ✅ COMPLETE

### Configuration Files Created

**File: /etc/nginx/sites-available/launchport**
```nginx
server {
    listen 80;
    server_name launchport.org;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**File: /etc/nginx/sites-available/dashboard**
```nginx
server {
    listen 80;
    server_name dashboard.launchport.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Nginx Commands Used
```bash
# Create symlinks to enable sites
ln -s /etc/nginx/sites-available/launchport /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Check status
systemctl status nginx
```

---

## 🔐 Authentication & Test User

### Test User Credentials
- **Username**: testuser
- **Email**: test@example.com
- **Password**: Test123!
- **User ID**: 1 (SQLite database)
- **Created**: April 5, 2026
- **Method**: curl POST to http://localhost:5000/auth/signup

### Auth Endpoints
- **Signup**: POST /auth/signup (username, email, password)
- **Login**: POST /auth/login (username, password)
- **Response**: JWT token + user info

### Login Status
- ✅ Login working via dashboard.launchport.org
- ✅ JWT token being issued and stored
- ✅ Dashboard loads successfully at http://dashboard.launchport.org/dashboard
- ⚠️ Auto-redirect after login not working (manual navigation to /dashboard required)

---

## 📊 Cost Summary

| Item | Cost | Duration |
|------|------|----------|
| Domain (launchport.org) | $7.48 | 1 year |
| Linode VPS | $12/month | Ongoing |
| **Total Annual** | **~$152/year** | Full year |
| **Total with Free Credit** | **$7.48 only** | ~33 months |

**Comparison**: 
- Railway: $5-50+/month per project
- Supabase: $25+/month for database
- Your setup: ~$150/year for 10+ projects

**Actual Cost for 33 Months**: $7.48 (domain only, VPS covered by $100 Linode credit)

---

## 🎯 Phase 4 - Next Steps

### 1. Add SSL/HTTPS Certificates ⬅️ **NEXT TASK**
- [ ] Install certbot (Let's Encrypt client)
- [ ] Generate SSL cert for launchport.org
- [ ] Generate wildcard cert for *.launchport.org
- [ ] Update Nginx configs for HTTPS (port 443)
- [ ] Auto-renewal setup

### 2. Fix Frontend Issues
- [ ] Fix Login.jsx navigate('/dashboard') redirect after successful login
- [ ] Create Signup.jsx component (currently missing, causes blank page)
- [ ] Update footer text in Login.jsx ("Phase 1 Backend: http://localhost:5000" → remove or update)

### 3. Modify Backend for Docker Deployment
- [ ] Update deployment logic to use Docker instead of direct execution
- [ ] Create Docker image builder for user projects
- [ ] Implement container lifecycle management
- [ ] Auto-start/stop containers based on projects
- [ ] Configure subdomain routing for deployed projects

### 4. Test First Project Deployment
- [ ] Deploy first project as Docker container
- [ ] Verify subdomain routing works (e.g., myapp.launchport.org)
- [ ] Test HTTPS access
- [ ] Verify database connectivity

---

## 💾 Architecture Overview (CURRENT LIVE STATE)

```
User Browser
    ↓
launchport.org or dashboard.launchport.org (DNS → 45.79.212.239)
    ↓
Linode VPS (45.79.212.239:80)
    ↓
Nginx Reverse Proxy (Port 80)
    ├─ launchport.org → Backend Container (localhost:5000)
    │       ↓
    │   launchport-backend (Node.js/Express)
    │       ↓
    │   SQLite Database (/opt/launchport/data/platform.db)
    │
    └─ dashboard.launchport.org → Frontend Container (localhost:3000)
            ↓
        launchport-frontend (React/Vite + Nginx)
            ↓
        Calls Backend API at launchport.org

FUTURE (when projects deployed):
    ├─ project1.launchport.org → User Project Container 1
    ├─ project2.launchport.org → User Project Container 2
    └─ ... up to 10+ projects
```

---

## 🔑 Important Credentials & Info

**LINODE DETAILS**
- IP: 45.79.212.239
- Root Username: root
- Root Password: [SECURED]
- Linode ID: 95134208
- API Key: [STORED IN LINODE ACCOUNT]

**NAMECHEAP DETAILS**
- Domain: launchport.org
- Registrar: Namecheap
- Nameservers: Linode (ns1-5.linode.com)
- Privacy: Enabled
- Auto-renew: OFF (can enable later)

**GITHUB REPO**
- URL: https://github.com/khangnguyen321/hosting-platform.git
- Visibility: Public
- Branches: main
- Latest Commit: Phase 3 complete - Nginx + DNS + CORS working

**VPS FILE STRUCTURE**
```
/opt/launchport/
├── backend/
│   ├── dockerfile (includes curl, build tools)
│   ├── server.js
│   ├── auth.js
│   ├── package.json
│   └── ... (all backend files)
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── api.js (API_BASE = "http://launchport.org")
│   │   └── pages/
│   │       ├── Login.jsx (has redirect bug)
│   │       ├── Dashboard.jsx
│   │       └── ... (NO Signup.jsx - missing)
│   └── ... (all frontend files)
├── data/
│   └── platform.db (SQLite database with users)
└── docker-compose.yml (CORS_ORIGIN includes dashboard domains)
```

---

## 📝 Next Steps When Resuming

1. **SSH into Linode**: `ssh root@45.79.212.239`
2. **Navigate to project**: `cd /opt/launchport`
3. **Verify containers running**: `docker ps -a` (both should show "healthy" or "Up")
4. **Test live site**: Visit http://dashboard.launchport.org and http://launchport.org
5. **Install certbot**: For SSL/HTTPS certificates
6. **Fix frontend issues**: Login redirect + create Signup component

---

## 🎓 Lessons Learned & Best Practices

### Infrastructure & Setup
- ✅ Using Linode free credit saves ~$144 for first ~33 months
- ✅ Buying .org domain is cheaper than .com for non-commercial projects
- ✅ Opening firewall ports (22, 80, 443) essential before SSH
- ✅ Nameserver changes take time to propagate (patience required)
- ✅ Docker + Nginx combination perfect for multi-project hosting
- ✅ Infrastructure as Code approach makes future scaling easy

### Docker & Containerization (April 4-5, 2026)
- ✅ **Docker Command Syntax**: Use `docker compose` (space) not `docker-compose` (hyphen) on Docker 29.3.1+
- ✅ **Healthcheck Requirements**: Backend Dockerfile MUST include `curl` for healthcheck to work
  - Add to Dockerfile: `RUN apk add --no-cache python3 make g++ curl`
- ✅ **Healthcheck Timing**: Add `start_period: 30s` to docker-compose.yml healthcheck config
  - Gives Node.js app time to fully start before healthchecks count as failures
- ✅ **Cache Corruption**: When Docker build cache corrupts, use `docker compose build --no-cache` to force fresh rebuild
- ✅ **Environment Variables**: `docker compose restart` does NOT reload env vars from docker-compose.yml
  - Must use: `docker compose up -d --force-recreate` to apply env var changes
  - Hardcoded env vars in docker-compose.yml override .env file
- ✅ **Subfolder Structure**: Backend files must stay flat in `backend/` root to avoid Node `require()` path issues
- ✅ **Node Version**: Vite requires Node 20+, use `node:20-alpine` not `node:18-alpine`
- ✅ **Native Modules**: sqlite3 compiled on Windows won't run in Linux containers
  - Fix: Add build tools and run `npm rebuild` in Dockerfile
- ✅ **Docker Testing**: On Windows Home without Hyper-V, skip local Docker testing and deploy directly to VPS

### CORS Configuration (April 5, 2026)
- ✅ **CORS Must Include All Origins**: Backend CORS_ORIGIN must include BOTH http:// and https:// versions
  - Correct format: `http://localhost:3000,http://localhost:5173,http://dashboard.launchport.org,https://dashboard.launchport.org`
- ✅ **CORS in Code vs Config**: Backend server.js splits CORS_ORIGIN by comma and trims each origin
  - Code: `process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())`
- ✅ **docker-compose.yml Overrides .env**: Environment variables hardcoded in docker-compose.yml take precedence over .env file
- ✅ **Verifying Container Env Vars**: Use `docker exec <container> printenv VARIABLE_NAME` to check what the container actually sees

### Frontend Build & Deployment (April 5, 2026)
- ✅ **Frontend Rebuild Required**: Changes to /opt/launchport/frontend/src/api.js require full rebuild
  - Command: `docker compose build --no-cache frontend` then `docker compose up -d frontend`
- ✅ **Browser Cache**: After frontend changes, users must hard refresh (Ctrl+Shift+R) to clear cached JS
- ✅ **API_BASE Configuration**: Frontend api.js contains `const API_BASE = "http://launchport.org"`
  - This is where frontend knows which backend to call

### Nginx & Reverse Proxy (April 5, 2026)
- ✅ **Nginx Config Location**: /etc/nginx/sites-available/ for config files
- ✅ **Enable Sites**: Create symlink to /etc/nginx/sites-enabled/ to enable a site
- ✅ **Test Before Reload**: Always run `nginx -t` to test config before applying
- ✅ **Reload vs Restart**: Use `systemctl reload nginx` to apply changes without downtime
- ✅ **Remove Default**: Delete /etc/nginx/sites-enabled/default to avoid conflicts

### Common Pitfalls & Solutions
- ❌ **Problem**: Backend healthcheck shows "unhealthy"
  - ✅ **Solution**: Install curl in Dockerfile + add start_period to healthcheck
- ❌ **Problem**: "docker-compose: command not found"
  - ✅ **Solution**: Use `docker compose` (space) on newer Docker versions
- ❌ **Problem**: Docker build fails with cache errors
  - ✅ **Solution**: Rebuild with `--no-cache` flag
- ❌ **Problem**: Node modules compiled on Windows fail in Linux container
  - ✅ **Solution**: Install build tools and run `npm rebuild` in Dockerfile
- ❌ **Problem**: CORS errors even though Status 200
  - ✅ **Solution**: Environment variables not reloaded - use `docker compose up -d --force-recreate`
- ❌ **Problem**: Login succeeds but doesn't redirect to dashboard
  - ⚠️ **Known Issue**: navigate('/dashboard') in Login.jsx not working - must manually navigate to /dashboard
- ❌ **Problem**: Sign up button leads to blank page
  - ⚠️ **Known Issue**: Signup.jsx component doesn't exist - needs to be created

---

## 📅 Timeline

| Date | Milestone |
|------|-----------|
| 2026-03-29 | Phase 1 & 2 Complete: Backend + Frontend working locally |
| 2026-03-29 | Phase 3 Infrastructure Setup: VPS + Domain + Firewall + DNS |
| 2026-04-04 | Phase 3 Docker Containerization: Both containers healthy on VPS |
| 2026-04-05 | Phase 3 COMPLETE: Nginx + DNS live, platform accessible at launchport.org |
| 2026-04-05 | Successful login test, dashboard working, CORS configured |
| **Next** | **Phase 4: SSL/HTTPS + Frontend Fixes + First Deployment** |
| TBD | Live hosting of first 10 projects |

---

## 🚀 Future Enhancements

- [ ] Auto-scaling based on traffic
- [ ] Monitoring & alerting system (Prometheus + Grafana)
- [ ] Automated backups (daily SQLite snapshots)
- [ ] CI/CD integration (GitHub Actions)
- [ ] Custom domain support for projects
- [ ] Web UI for project deployment (instead of API only)
- [ ] Analytics & logging dashboard
- [ ] Multi-region support
- [ ] Rate limiting per user
- [ ] Project resource limits (CPU/RAM)

---

## 🔧 Troubleshooting Reference

### Check Container Status
```bash
docker ps -a
```

### View Container Logs
```bash
docker logs launchport-backend
docker logs launchport-frontend
```

### Test Healthcheck Manually
```bash
docker exec launchport-backend curl -f http://localhost:5000/health
```

### Check Environment Variables in Container
```bash
docker exec launchport-backend printenv CORS_ORIGIN
```

### Restart Containers
```bash
docker compose down
docker compose up -d
```

### Restart Container (DOES NOT reload env vars)
```bash
docker compose restart backend
```

### Recreate Container (DOES reload env vars)
```bash
docker compose up -d --force-recreate backend
```

### Rebuild Containers (with cache)
```bash
docker compose build
docker compose up -d
```

### Rebuild Containers (no cache)
```bash
docker compose build --no-cache
docker compose up -d
```

### Rebuild Specific Container
```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

### Check Nginx Status
```bash
systemctl status nginx
```

### Test Nginx Configuration
```bash
nginx -t
```

### Reload Nginx
```bash
systemctl reload nginx
```

### View Nginx Error Logs
```bash
tail -f /var/log/nginx/error.log
```

### Check System Resources
```bash
htop  # or: top
df -h  # disk usage
free -h  # memory usage
```

### Test Backend API Directly
```bash
curl http://localhost:5000/health
curl http://launchport.org/health
```

### Create Test User via API
```bash
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","email":"new@example.com","password":"Password123!"}'
```

---

**Last Updated**: 2026-04-05 01:15 UTC  
**Current Status**: Phase 3 COMPLETE - Platform LIVE at launchport.org  
**Live URLs**: http://launchport.org (API) | http://dashboard.launchport.org (Dashboard)  
**Next Action**: Install SSL/HTTPS certificates via Let's Encrypt  
**Ready For**: SSL setup + frontend bug fixes + first project deployment
