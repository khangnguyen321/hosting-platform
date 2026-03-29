# API Reference

All requests must include the header: `Content-Type: application/json`

---

## Authentication

### POST /auth/signup
Create a new account

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "message": "Account created successfully"
}
```

---

### POST /auth/login
Get JWT token to authenticate requests

**Request:**
```json
{
  "username": "john_doe",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Save this token!** Include it in all future requests as:
```
Authorization: Bearer <your_token>
```

---

## Projects

### GET /projects
Get all your projects

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "name": "My App",
    "github_url": "https://github.com/user/my-app.git",
    "github_branch": "main",
    "port": null,
    "description": "My awesome app",
    "is_running": 0,
    "created_at": "2024-01-15 10:30:00"
  }
]
```

---

### POST /projects
Create a new project

**Headers:**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "My App",
  "github_url": "https://github.com/user/my-app.git",
  "github_branch": "main",
  "description": "My awesome app"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "My App",
  "github_url": "https://github.com/user/my-app.git",
  "github_branch": "main",
  "message": "Project created successfully. Ready to deploy!"
}
```

---

## Deployments

### POST /projects/:id/deploy
Deploy a project (clone, install, run)

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Project deployed successfully!",
  "projectId": 1,
  "port": 3001,
  "pid": 12345,
  "url": "http://localhost:3001"
}
```

---

### POST /projects/:id/stop
Stop a running project

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response:**
```json
{
  "success": true,
  "message": "My App has been stopped"
}
```

---

### GET /projects/:id/status
Check if a project is running

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response:**
```json
{
  "projectId": 1,
  "name": "My App",
  "isRunning": true,
  "port": 3001,
  "pid": 12345,
  "url": "http://localhost:3001"
}
```

---

### GET /projects/:id/logs
Get deployment logs for a project

**Headers:**
```
Authorization: Bearer <your_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "deployment_id": 1,
    "log_message": "npm WARN deprecated old-package@1.0.0",
    "log_type": "info",
    "created_at": "2024-01-15 10:35:00"
  },
  {
    "id": 2,
    "deployment_id": 1,
    "log_message": "Server listening on port 3001",
    "log_type": "info",
    "created_at": "2024-01-15 10:35:05"
  }
]
```

---

## Health Check

### GET /health
Check if server is running

**Response:**
```json
{
  "status": "Server is running",
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

---

## Error Responses

If something goes wrong, you'll get an error response:

```json
{
  "error": "User not found"
}
```

Common HTTP status codes:
- **200** - Success
- **201** - Created successfully
- **400** - Bad request (missing fields, etc.)
- **401** - Unauthorized (invalid token)
- **404** - Not found
- **500** - Server error

---

## Using PowerShell

Example request with PowerShell:

```powershell
# Save your token
$token = "eyJhbGc..."

# Make a request
$response = Invoke-WebRequest `
  -Uri "http://localhost:5000/projects" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  }

# View response
$response.Content | ConvertFrom-Json
```
