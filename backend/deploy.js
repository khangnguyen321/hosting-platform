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

//In-memory circular log buffer (last 500 lines per project)
const projectLogs = {};

function addProjectLog(projectId, message, type = 'info') {
  if (!projectLogs[projectId]) {
    projectLogs[projectId] = [];
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message.trim(),
    type: type
  };
  
  projectLogs[projectId].push(logEntry);
  
  // Keep only last 500 entries (circular buffer)
  if (projectLogs[projectId].length > 500) {
    projectLogs[projectId].shift();
  }
}

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
 * KILL PROCESS BY PORT
 * Find and kill any process listening on a specific port
 * This works even after container restarts (unlike in-memory tracking)
 */
function killProcessByPort(port) {
  try {
    console.log(`🔍 Checking for existing process on port ${port}...`);

    // Use lsof to find process using this port
    // lsof -ti:PORT returns the PID
    const result = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();

    if (result) {
      const pids = result.split("\n").filter((pid) => pid);
      console.log(
        `⚠️  Found ${pids.length} process(es) on port ${port}: ${pids.join(", ")}`,
      );

      for (const pid of pids) {
        try {
          console.log(`   Killing PID ${pid}...`);
          // Try SIGTERM first (graceful)
          execSync(`kill -15 ${pid}`);
          // Wait a moment
          execSync("sleep 1");
          // Check if still running, then SIGKILL
          try {
            execSync(`kill -0 ${pid}`); // Check if process exists
            execSync(`kill -9 ${pid}`); // Force kill
            console.log(`   ✓ Forcefully killed PID ${pid}`);
          } catch (e) {
            console.log(`   ✓ Gracefully stopped PID ${pid}`);
          }
        } catch (err) {
          // Process might have already exited
          console.log(`   ✓ Process ${pid} already stopped`);
        }
      }

      return true;
    } else {
      console.log(`✓ No existing process on port ${port}`);
      return false;
    }
  } catch (error) {
    // lsof returns exit code 1 if no process found - this is normal
    if (error.status === 1) {
      console.log(`✓ No existing process on port ${port}`);
      return false;
    }
    console.warn(`⚠️  Error checking port ${port}: ${error.message}`);
    return false;
  }
}

/**
 * CHECK IF PORT IS LISTENING
 * Returns true if a process is actively listening on the specified port
 * This is the source of truth for "is running" status
 */
async function isPortListening(port) {
  return new Promise((resolve) => {
    const net = require("net");
    const tester = net.createConnection({ port, host: "localhost" }, () => {
      tester.end();
      resolve(true); // Port is listening
    });

    tester.on("error", () => {
      resolve(false); // Port is not listening
    });

    // Timeout after 1 second
    setTimeout(() => {
      tester.destroy();
      resolve(false);
    }, 1000);
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
 *
 * IMPROVED:
 * - Kills processes by PORT instead of memory tracking (survives restarts)
 * - Detached processes (survive backend restart)
 * - Proper error handling
 * - Process group cleanup
 */
async function startProject(
  projectId,
  projectPath,
  projectName,
  customEnv = {},
) {
  try {
    // Get the port that should be used for this project
    const assignedPort = await new Promise((resolve, reject) => {
      db.get(
        "SELECT port FROM projects WHERE id = ?",
        [projectId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.port || null);
        },
      );
    });

    // Determine which port to use
    let port;
    if (assignedPort) {
      // Project has an assigned port - kill anything using it, then reuse it
      console.log(`📌 Project assigned to port ${assignedPort}`);
      killProcessByPort(assignedPort);
      port = assignedPort;
    } else {
      // New project - find available port
      port = await findAvailablePort();
    }

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
    // FIXED: Added detached and proper stdio handling
    const childProcess = spawn("npm", ["start"], {
      cwd: projectPath,
      env: envVars,
      detached: true, // ✅ FIX: Process survives parent restart
      stdio: ["ignore", "pipe", "pipe"], // ✅ FIX: Proper stream handling
    });

    // Unref so parent can exit independently
    childProcess.unref();

    // Store process reference so we can stop it later
    runningProcesses[projectId] = {
      childProcess,
      port,
      pid: childProcess.pid,
      startedAt: new Date().toISOString(),
    };

    // ✅ FIX: Handle spawn errors
    childProcess.on("error", (error) => {
      console.error(`[${projectName}] ❌ Failed to spawn: ${error.message}`);
      saveLog(projectId, `Failed to spawn: ${error.message}`, "error");
      delete runningProcesses[projectId];
      db.run("UPDATE projects SET is_running = 0 WHERE id = ?", [projectId]);
    });

    // Collect logs
    let allLogs = "";
    childProcess.stdout.on("data", (data) => {
      const message = data.toString();
      allLogs += message;
      console.log(`[${projectName}] ${message}`);

      // Save to in-memory buffer
      addProjectLog(projectId, message, "info");

      // Save to database
      saveLog(projectId, message, "info");
    });

    childProcess.stderr.on("data", (data) => {
      const message = data.toString();
      allLogs += message;
      console.error(`[${projectName}] ERROR: ${message}`);

      addProjectLog(projectId, message, "error");

      saveLog(projectId, message, "error");
    });

    childProcess.on("exit", (code, signal) => {
      console.log(
        `[${projectName}] Process exited with code ${code}, signal ${signal}`,
      );
      delete runningProcesses[projectId];
      // Update database when process exits
      db.run("UPDATE projects SET is_running = 0 WHERE id = ?", [projectId]);

      // Log the exit
      saveLog(
        projectId,
        `Process exited with code ${code}`,
        code === 0 ? "info" : "error",
      );
    });

    // Update database with port and running status
    db.run("UPDATE projects SET port = ?, is_running = 1 WHERE id = ?", [
      port,
      projectId,
    ]);

    console.log(
      `✅ ${projectName} started successfully on port ${port} (PID: ${childProcess.pid})`,
    );

    return { port, pid: childProcess.pid };
  } catch (error) {
    console.error(`❌ Failed to start project: ${error.message}`);
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
      // Try to get port from database and kill by port
      const project = await new Promise((resolve, reject) => {
        db.get(
          "SELECT port FROM projects WHERE id = ?",
          [projectId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          },
        );
      });

      if (project?.port) {
        console.log(
          `⏹️  Stopping project ${projectId} by port ${project.port}...`,
        );
        killProcessByPort(project.port);
        db.run("UPDATE projects SET is_running = 0 WHERE id = ?", [projectId]);
        return { message: "Project stopped successfully" };
      } else {
        throw new Error("Project is not running");
      }
    }

    console.log(`⏹️  Stopping project ${projectId}...`);

    // Try graceful shutdown first, then force kill
    try {
      processData.childProcess.kill("SIGTERM");
      // Wait a bit for graceful shutdown
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // If still exists, force kill
      if (runningProcesses[projectId]) {
        processData.childProcess.kill("SIGKILL");
      }
    } catch (killError) {
      console.warn(`⚠️  Warning during stop: ${killError.message}`);
    }

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
  isPortListening,
  runningProcesses,
  projectLogs,
  PROJECTS_DIR,
};
