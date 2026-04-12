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

    // Find project matching this repository
    const project = db
      .prepare(
        `
      SELECT id, name, branch FROM projects 
      WHERE repo_url = ? AND branch = ?
    `,
      )
      .get(repoUrl, branch);

    if (!project) {
      console.log(`No project found for repo ${repoUrl} on branch ${branch}`);
      return res.status(200).json({
        message: "No matching project found",
        repo: repoUrl,
        branch: branch,
      });
    }

    console.log(`Auto-deploying project: ${project.name} (ID: ${project.id})`);

    // Update project status to 'deploying'
    db.prepare(
      `
      UPDATE projects 
      SET status = 'deploying', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `,
    ).run(project.id);

    // Trigger deployment asynchronously
    const { exec } = require("child_process");
    const deployScript = `/opt/launchport/scripts/deploy.sh ${project.id}`;

    exec(deployScript, (error, stdout, stderr) => {
      if (error) {
        console.error(`Deployment error for project ${project.id}:`, error);
        db.prepare(
          `
          UPDATE projects 
          SET status = 'stopped' 
          WHERE id = ?
        `,
        ).run(project.id);
      } else {
        console.log(`Deployment output for project ${project.id}:`, stdout);
      }
    });

    // Return success immediately (don't wait for deployment)
    res.status(200).json({
      message: "Deployment triggered",
      project: project.name,
      branch: branch,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
