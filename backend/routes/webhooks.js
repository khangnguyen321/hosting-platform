const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../db");

/**
 * GitHub Webhook Handler
 * POST /api/webhooks/github
 *
 * Automatically deploys projects when code is pushed to main branch
 */
router.post("/github", async (req, res) => {
  try {
    // Get the GitHub signature from headers
    const signature = req.headers["x-hub-signature-256"];
    const event = req.headers["x-github-event"];

    // Verify signature if webhook secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      if (!signature) {
        return res.status(401).json({ error: "No signature provided" });
      }

      // Compute expected signature
      const hmac = crypto.createHmac("sha256", webhookSecret);
      const payload = JSON.stringify(req.body);
      hmac.update(payload);
      const expectedSignature = "sha256=" + hmac.digest("hex");

      // Compare signatures (timing-safe)
      if (
        !crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature),
        )
      ) {
        console.log("Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    // Only process push events
    if (event !== "push") {
      return res.status(200).json({ message: "Event ignored (not a push)" });
    }

    // Extract repository URL and branch from payload
    const repoUrl =
      req.body.repository?.clone_url || req.body.repository?.html_url;
    const branch = req.body.ref?.replace("refs/heads/", "");

    if (!repoUrl || !branch) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    console.log(`Webhook received: ${repoUrl} on branch ${branch}`);

    // Find project matching this repository (using callback-based sqlite3)
    db.get(
      `SELECT id, name, github_branch, github_url, user_id FROM projects 
       WHERE github_url = ? AND github_branch = ?`,
      [repoUrl, branch],
      (err, project) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        if (!project) {
          console.log(
            `No project found for repo ${repoUrl} on branch ${branch}`,
          );
          return res.status(200).json({
            message: "No matching project found",
            repo: repoUrl,
            branch: branch,
          });
        }

        // DEBUG: Log what we actually got from the database
        console.log("DEBUG: Project object:", JSON.stringify(project));
        console.log("DEBUG: Project keys:", Object.keys(project));
        console.log("DEBUG: Project.id:", project.id);
        console.log("DEBUG: Project.name:", project.name);

        console.log(
          `Auto-deploying project: ${project.name} (ID: ${project.id})`,
        );

        // Update project to deploying state
        db.run(
          `UPDATE projects SET is_running = 0 WHERE id = ?`,
          [project.id],
          (updateErr) => {
            if (updateErr) {
              console.error("Failed to update project status:", updateErr);
            }
          },
        );

        // Trigger deployment using deploy module (same as manual deployment)
        const deploy = require("../deploy");
        const encryption = require("../encryption");
        const nginxAutomation = require("../nginx-automation");

        // Run deployment asynchronously (don't block webhook response)
        (async () => {
          try {
            console.log(`\n🚀 AUTO-DEPLOYING: ${project.name}`);
            console.log(`📍 GitHub URL: ${project.github_url}`);

            const projectPath = await deploy.cloneRepository(
              project.github_url,
              project.name,
            );

            await deploy.installDependencies(projectPath);

            const projectEnv = await encryption.getEnvironmentForProject(
              project.id,
            );

            const { port, pid } = await deploy.startProject(
              project.id,
              projectPath,
              project.name,
              projectEnv,
            );

            // Setup Nginx and SSL
            console.log(`🔧 Setting up Nginx and SSL for ${project.name}...`);
            const automationResult = await nginxAutomation.setupNginxAndSSL(
              project.name,
              port,
            );

            if (automationResult.success) {
              console.log(`✅ Auto-deployment complete: ${project.name}`);
              console.log(`🌐 Live at: ${automationResult.url}`);
            } else {
              console.log(`⚠️  Deployed on port ${port} but automation failed`);
            }
          } catch (error) {
            console.error(
              `❌ Auto-deployment failed for ${project.name}:`,
              error.message,
            );
            db.run(`UPDATE projects SET is_running = 0 WHERE id = ?`, [
              project.id,
            ]);
          }
        })();

        // Return success immediately (don't wait for deployment)
        res.status(200).json({
          message: "Deployment triggered",
          project: project.name,
          branch: branch,
        });
      },
    );
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
