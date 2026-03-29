/**
 * MAIN SERVER FILE - PRODUCTION HARDENED
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

// Import our modules
const db = require("./db");
const auth = require("./auth");
const deploy = require("./deploy");
const encryption = require("./encryption");
const audit = require("./audit");
const { logger, requestLogger } = require("./logger");
const {
  loginLimiter,
  signupLimiter,
  apiLimiter,
  deploymentLimiter,
} = require("./rateLimit");
const validation = require("./validation");
const {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createAuthError,
  createNotFoundError,
  createAuthorizationError,
} = require("./errors");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:5000"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsing
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use("/api/", apiLimiter);

// AUTHENTICATION ROUTES
app.post(
  "/auth/signup",
  signupLimiter,
  ...validation.validateSignup,
  asyncHandler(async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      const result = await auth.signup(username, email, password);

      await audit.logAuthEvent(result.id, "SIGNUP_SUCCESS", "success", req.ip);

      res.status(201).json(result);
    } catch (error) {
      await audit.logAuthEvent(null, "SIGNUP_FAILED", "error", req.ip, {
        email: req.body?.email,
        reason: error.message,
      });

      next(error);
    }
  }),
);

app.post(
  "/auth/login",
  loginLimiter,
  ...validation.validateLogin,
  asyncHandler(async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const result = await auth.login(username, password);

      await audit.logAuthEvent(
        result.user.id,
        "LOGIN_SUCCESS",
        "success",
        req.ip,
      );

      res.json(result);
    } catch (error) {
      await audit.logAuthEvent(null, "LOGIN_FAILED", "error", req.ip, {
        username: req.body?.username,
      });

      next(error);
    }
  }),
);

// PROJECT ROUTES
app.get(
  "/api/projects",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projects = await new Promise((resolve, reject) => {
      db.all(
        "SELECT id, user_id, name, github_url, github_branch, port, is_running, description, created_at FROM projects WHERE user_id = ?",
        [req.user.id],
        (err, projects) => {
          if (err) reject(err);
          else resolve(projects || []);
        },
      );
    });

    await audit.logAction(req.user.id, "LIST_PROJECTS", "project", null, {
      count: projects.length,
    });

    res.json(projects);
  }),
);

app.post(
  "/api/projects",
  auth.requireAuth,
  ...validation.validateProjectCreation,
  asyncHandler(async (req, res, next) => {
    const { name, github_url, github_branch, description } = req.body;

    const project = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO projects (user_id, name, github_url, github_branch, description)
         VALUES (?, ?, ?, ?, ?)`,
        [
          req.user.id,
          name,
          github_url,
          github_branch || "main",
          description || "",
        ],
        function (err) {
          if (err) reject(err);
          else
            resolve({
              id: this.lastID,
              name,
              github_url,
              github_branch: github_branch || "main",
              message: "Project created successfully. Ready to deploy!",
            });
        },
      );
    });

    await audit.logDeploymentEvent(
      req.user.id,
      project.id,
      "PROJECT_CREATED",
      "success",
      {
        name,
        github_url,
      },
    );

    res.status(201).json(project);
  }),
);

app.delete(
  "/api/projects/:id",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;

    const project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, req.user.id],
        (err, project) => {
          if (err) reject(err);
          else resolve(project);
        },
      );
    });

    if (!project) {
      throw createNotFoundError("Project");
    }

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM projects WHERE id = ?", [projectId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await audit.logDeploymentEvent(
      req.user.id,
      projectId,
      "PROJECT_DELETED",
      "success",
      {
        name: project.name,
      },
    );

    res.json({ success: true, message: "Project deleted" });
  }),
);

// DEPLOYMENT ROUTES
app.post(
  "/api/projects/:id/deploy",
  auth.requireAuth,
  deploymentLimiter,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;

    const project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, req.user.id],
        (err, project) => {
          if (err) reject(err);
          else resolve(project);
        },
      );
    });

    if (!project) {
      throw createNotFoundError("Project");
    }

    try {
      console.log(`\n🚀 DEPLOYING: ${project.name}`);
      console.log(`📍 GitHub URL: ${project.github_url}`);

      const projectPath = await deploy.cloneRepository(
        project.github_url,
        project.name,
      );

      await deploy.installDependencies(projectPath);

      const projectEnv = await encryption.getEnvironmentForProject(projectId);

      const { port, pid } = await deploy.startProject(
        projectId,
        projectPath,
        project.name,
        projectEnv,
      );

      await audit.logDeploymentEvent(
        req.user.id,
        projectId,
        "DEPLOYMENT_SUCCESS",
        "success",
        {
          port,
          pid,
          name: project.name,
        },
      );

      res.json({
        success: true,
        message: `Project deployed successfully!`,
        projectId,
        port,
        pid,
        url: `http://localhost:${port}`,
      });
    } catch (deployError) {
      await audit.logDeploymentEvent(
        req.user.id,
        projectId,
        "DEPLOYMENT_FAILED",
        "error",
        {
          error: deployError.message,
          name: project.name,
        },
      );

      next(deployError);
    }
  }),
);

app.post(
  "/api/projects/:id/stop",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;

    const project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, req.user.id],
        (err, project) => {
          if (err) reject(err);
          else resolve(project);
        },
      );
    });

    if (!project) {
      throw createNotFoundError("Project");
    }

    try {
      await deploy.stopProject(projectId);

      await audit.logDeploymentEvent(
        req.user.id,
        projectId,
        "PROJECT_STOPPED",
        "success",
        {
          name: project.name,
        },
      );

      res.json({
        success: true,
        message: `${project.name} has been stopped`,
      });
    } catch (stopError) {
      next(stopError);
    }
  }),
);

app.get(
  "/api/projects/:id/status",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;

    const project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, req.user.id],
        (err, project) => {
          if (err) reject(err);
          else resolve(project);
        },
      );
    });

    if (!project) {
      throw createNotFoundError("Project");
    }

    const status = deploy.getProjectStatus(projectId);
    res.json({
      projectId,
      name: project.name,
      ...status,
      url: status.port ? `http://localhost:${status.port}` : null,
    });
  }),
);

app.get(
  "/api/projects/:id/logs",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;

    const logs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT dl.* FROM deployment_logs dl
         JOIN deployments d ON dl.deployment_id = d.id
         JOIN projects p ON d.project_id = p.id
         WHERE p.id = ? AND p.user_id = ?
         ORDER BY dl.created_at DESC LIMIT 100`,
        [projectId, req.user.id],
        (err, logs) => {
          if (err) reject(err);
          else resolve(logs || []);
        },
      );
    });

    res.json(logs);
  }),
);

// SECRETS ROUTES
app.get(
  "/api/projects/:id/secrets",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;

    const project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, req.user.id],
        (err, project) => {
          if (err) reject(err);
          else resolve(project);
        },
      );
    });

    if (!project) {
      throw createNotFoundError("Project");
    }

    const secrets = await encryption.getProjectSecrets(projectId);

    await audit.logSecretAccess(
      req.user.id,
      projectId,
      "SECRET_LIST_ACCESSED",
      {
        count: secrets.length,
      },
    );

    res.json(secrets);
  }),
);

app.post(
  "/api/projects/:id/secrets",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;
    const { key, value } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        error: "Key and value are required",
      });
    }

    const project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, req.user.id],
        (err, project) => {
          if (err) reject(err);
          else resolve(project);
        },
      );
    });

    if (!project) {
      throw createNotFoundError("Project");
    }

    await encryption.storeSecret(projectId, key, value);

    await audit.logSecretAccess(req.user.id, projectId, "SECRET_SET", { key });

    res.json({ success: true, message: "Secret stored securely", key });
  }),
);

app.delete(
  "/api/projects/:id/secrets/:key",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const projectId = req.params.id;
    const key = req.params.key;

    const project = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, req.user.id],
        (err, project) => {
          if (err) reject(err);
          else resolve(project);
        },
      );
    });

    if (!project) {
      throw createNotFoundError("Project");
    }

    await encryption.deleteSecret(projectId, key);

    await audit.logSecretAccess(req.user.id, projectId, "SECRET_DELETED", {
      key,
    });

    res.json({ success: true, message: "Secret deleted" });
  }),
);

// AUDIT ROUTES
app.get(
  "/api/audit/logs",
  auth.requireAuth,
  asyncHandler(async (req, res, next) => {
    const logs = await audit.getAuditLogs(req.user.id, 100);
    res.json(logs);
  }),
);

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ERROR HANDLING
app.use(notFoundHandler);
app.use(errorHandler);

// START SERVER
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   Personal Hosting Platform               ║
║   Production-Grade Backend Server         ║
╚═══════════════════════════════════════════╝

🚀 Server: http://localhost:${PORT}
📚 API Ready with security features
💾 Database: SQLite (platform.db)
📊 Logs: ./logs/ directory
🔐 Encryption: Enabled
⏱️  Rate Limiting: Enabled
✅ Audit Logging: Enabled

Available Endpoints:
  🔓 POST   /auth/signup
  🔓 POST   /auth/login
  GET    /api/projects
  POST   /api/projects
  DELETE /api/projects/:id
  POST   /api/projects/:id/deploy
  POST   /api/projects/:id/stop
  GET    /api/projects/:id/status
  GET    /api/projects/:id/logs
  GET    /api/projects/:id/secrets
  POST   /api/projects/:id/secrets
  DELETE /api/projects/:id/secrets/:key
  GET    /api/audit/logs
  GET    /health
`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

module.exports = app;
