/**
 * DEPLOYMENT MANAGER
 *
 * This module handles:
 * 1. Cloning GitHub repositories
 * 2. Installing dependencies (npm install)
 * 3. Starting/stopping Node.js applications
 * 4. Managing ports (assigning unique ports to each project)
 * 5. Collecting logs from running processes
 */

const { execSync, ChildProcess } = require("child_process");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const { spawn } = require("child_process");

// Directory where we'll clone all projects
const PROJECTS_DIR = path.join(__dirname, "deployed-projects");

// Ensure deployed-projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Track running processes so we can stop them later
const runningProcesses = {};

/**
 * FIND AVAILABLE PORT
 * Find a port that's not already in use
 * Starts searching from port 3001
 */
function findAvailablePort(startPort = 3001) {
  return new Promise((resolve) => {
    let port = startPort;
    const net = require("net");

    function checkPort() {
      const server = net.createServer();
      server.listen(port, () => {
        server.once("close", () => {
          resolve(port);
        });
        server.close();
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          port++;
          checkPort();
        }
      });
    }

    checkPort();
  });
}

/**
 * CLONE REPOSITORY
 * Downloads a GitHub repo to your local machine
 */
async function cloneRepository(githubUrl, projectName) {
  const projectPath = path.join(PROJECTS_DIR, projectName);

  try {
    console.log(`📦 Cloning ${githubUrl}...`);

    // Remove existing directory if it exists
    if (fs.existsSync(projectPath)) {
      require("rimraf").sync(projectPath);
    }

    // Clone the repository
    execSync(`git clone ${githubUrl} "${projectPath}"`, { stdio: "inherit" });

    console.log(`✓ Repository cloned to ${projectPath}`);
    return projectPath;
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * INSTALL DEPENDENCIES
 * Runs "npm install" in the project directory
 */
async function installDependencies(projectPath) {
  try {
    console.log("📥 Installing npm dependencies...");
    execSync("npm install", {
      cwd: projectPath,
      stdio: "inherit",
    });
    console.log("✓ Dependencies installed");
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error.message}`);
  }
}

/**
 * START PROJECT
 * Starts a Node.js application and assigns it a port
 * Supports custom environment variables (from encrypted secrets)
 */
async function startProject(
  projectId,
  projectPath,
  projectName,
  customEnv = {},
) {
  try {
    // Find an available port
    const port = await findAvailablePort();

    console.log(`🚀 Starting ${projectName} on port ${port}...`);

    // Check if package.json exists
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error("package.json not found in project");
    }

    // Read package.json to find start script
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const startScript = packageJson.scripts?.start || "node index.js";

    // Merge environment variables: base Node env + PORT + custom secrets
    const envVars = {
      ...process.env,
      PORT: port,
      NODE_ENV: "production",
      ...customEnv,
    };

    // Start the process with merged environment
    const childProcess = spawn("npm", ["start"], {
      cwd: projectPath,
      env: envVars,
    });

    // Store process reference so we can stop it later
    runningProcesses[projectId] = {
      childProcess,
      port,
      pid: childProcess.pid,
    };

    // Collect logs
    let allLogs = "";
    childProcess.stdout.on("data", (data) => {
      const message = data.toString();
      allLogs += message;
      console.log(`[${projectName}] ${message}`);
      // Save to database
      saveLog(projectId, message, "info");
    });

    childProcess.stderr.on("data", (data) => {
      const message = data.toString();
      allLogs += message;
      console.error(`[${projectName}] ERROR: ${message}`);
      saveLog(projectId, message, "error");
    });

    childProcess.on("exit", (code) => {
      console.log(`[${projectName}] Process exited with code ${code}`);
      delete runningProcesses[projectId];
    });

    // Update database with port and running status
    db.run("UPDATE projects SET port = ?, is_running = 1 WHERE id = ?", [
      port,
      projectId,
    ]);

    return { port, pid: childProcess.pid };
  } catch (error) {
    throw new Error(`Failed to start project: ${error.message}`);
  }
}

/**
 * STOP PROJECT
 * Stops a running Node.js application
 */
async function stopProject(projectId) {
  try {
    const processData = runningProcesses[projectId];
    if (!processData) {
      throw new Error("Project is not running");
    }

    console.log(`⏹️  Stopping project ${projectId}...`);

    // Kill the process
    processData.childProcess.kill();
    delete runningProcesses[projectId];

    // Update database
    db.run("UPDATE projects SET is_running = 0 WHERE id = ?", [projectId]);

    return { message: "Project stopped successfully" };
  } catch (error) {
    throw new Error(`Failed to stop project: ${error.message}`);
  }
}

/**
 * GET PROJECT STATUS
 * Check if a project is running and get its port
 */
function getProjectStatus(projectId) {
  const processData = runningProcesses[projectId];
  return {
    isRunning: !!processData,
    port: processData?.port || null,
    pid: processData?.pid || null,
  };
}

/**
 * SAVE LOG
 * Store deployment logs in the database
 */
function saveLog(projectId, message, type = "info") {
  db.run(
    `INSERT INTO deployment_logs (deployment_id, log_message, log_type) 
     VALUES (?, ?, ?)`,
    [projectId, message, type],
  );
}

module.exports = {
  cloneRepository,
  installDependencies,
  startProject,
  stopProject,
  getProjectStatus,
  findAvailablePort,
  runningProcesses,
  PROJECTS_DIR,
};
