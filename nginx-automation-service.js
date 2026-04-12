#!/usr/bin/env node

/**
 * NGINX AUTOMATION SERVICE
 * Handles automatic Nginx configuration and SSL certificate provisioning for new projects
 * 
 * Two-stage SSL approach:
 * 1. HTTP-only config → test → reload
 * 2. Request SSL → upgrade to HTTPS config → test → reload
 */

const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

const PORT = 9000;

// Generate HTTP-only Nginx config (Stage 1 - before SSL)
function generateHttpOnlyConfig(projectName, subdomain, port) {
  return `# HTTP - Temporary config before SSL
server {
    listen 80;
    server_name ${subdomain};

    location / {
        proxy_pass http://localhost:${port};
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
`;
}

// Generate HTTPS Nginx config (Stage 2 - after SSL obtained)
function generateHttpsConfig(projectName, subdomain, port) {
  return `# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name ${subdomain};
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl;
    server_name ${subdomain};

    ssl_certificate /etc/letsencrypt/live/${subdomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${subdomain}/privkey.pem;

    location / {
        proxy_pass http://localhost:${port};
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
`;
}

// Execute shell command
function executeCommand(command, description) {
  try {
    const output = execSync(command, { encoding: 'utf8', timeout: 60000 });
    console.log(`[${new Date().toISOString()}] ✓ ${description}`);
    return { success: true, output: output.trim() };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ✗ ${description}`);
    console.error(`  Error: ${error.message}`);
    return { success: false, error: error.message, output: error.stdout?.toString() || '' };
  }
}

async function handleAutomationRequest(body) {
  const { projectName, port } = body;

  if (!projectName || !port) {
    return { success: false, error: 'Missing projectName or port' };
  }

  const subdomain = `${projectName}.launchport.org`;
  const configPath = `/etc/nginx/sites-available/${projectName}`;
  const enabledPath = `/etc/nginx/sites-enabled/${projectName}`;

  const results = {
    projectName,
    subdomain,
    port,
    steps: []
  };

  try {
    console.log(`[${new Date().toISOString()}] Starting automation for ${subdomain}...`);

    // ============================================================
    // STAGE 1: HTTP-ONLY CONFIGURATION
    // ============================================================
    
    // Step 1: Generate HTTP-only Nginx config
    const httpConfig = generateHttpOnlyConfig(projectName, subdomain, port);
    fs.writeFileSync(configPath, httpConfig);
    results.steps.push({ step: 'generate_http_config', success: true });
    console.log(`[${new Date().toISOString()}] ✓ Generated HTTP-only config: ${configPath}`);

    // Step 2: Enable site (create symlink if doesn't exist)
    if (!fs.existsSync(enabledPath)) {
      const symlinkResult = executeCommand(
        `ln -s ${configPath} ${enabledPath}`,
        'Enable site (create symlink)'
      );
      results.steps.push({ step: 'enable_site', ...symlinkResult });
      if (!symlinkResult.success) {
        throw new Error('Failed to enable site');
      }
    } else {
      results.steps.push({ step: 'enable_site', success: true, output: 'Already enabled' });
    }

    // Step 3: Test HTTP-only Nginx config
    const testHttpResult = executeCommand('nginx -t', 'Test HTTP-only Nginx configuration');
    results.steps.push({ step: 'test_nginx_http', ...testHttpResult });
    if (!testHttpResult.success) {
      throw new Error('HTTP-only Nginx configuration test failed');
    }

    // Step 4: Reload Nginx with HTTP-only config
    const reloadHttpResult = executeCommand('systemctl reload nginx', 'Reload Nginx (HTTP-only)');
    results.steps.push({ step: 'reload_nginx_http', ...reloadHttpResult });
    if (!reloadHttpResult.success) {
      throw new Error('Failed to reload Nginx with HTTP config');
    }

    console.log(`[${new Date().toISOString()}] ✓ Stage 1 complete: HTTP-only config active`);

    // ============================================================
    // STAGE 2: SSL CERTIFICATE & HTTPS UPGRADE
    // ============================================================

    const certPath = `/etc/letsencrypt/live/${subdomain}`;
    
    if (!fs.existsSync(certPath)) {
      console.log(`[${new Date().toISOString()}] Requesting SSL certificate for ${subdomain}...`);
      
      // Step 5: Stop Nginx for standalone mode
      const stopResult = executeCommand('systemctl stop nginx', 'Stop Nginx for standalone mode');
      results.steps.push({ step: 'stop_nginx', ...stopResult });
      if (!stopResult.success) {
        throw new Error('Failed to stop Nginx');
      }

      // Step 6: Request SSL certificate using standalone mode
      const sslResult = executeCommand(
        `certbot certonly --standalone -d ${subdomain} --non-interactive --agree-tos --email admin@launchport.org`,
        'Request SSL certificate (standalone mode)'
      );
      results.steps.push({ step: 'request_ssl', ...sslResult });
      
      if (!sslResult.success) {
        // Restart Nginx even if cert request failed
        executeCommand('systemctl start nginx', 'Restart Nginx after failed cert request');
        throw new Error('SSL certificate request failed');
      }

      console.log(`[${new Date().toISOString()}] ✓ SSL certificate obtained`);

      // Step 7: Generate HTTPS Nginx config
      const httpsConfig = generateHttpsConfig(projectName, subdomain, port);
      fs.writeFileSync(configPath, httpsConfig);
      results.steps.push({ step: 'generate_https_config', success: true });
      console.log(`[${new Date().toISOString()}] ✓ Generated HTTPS config`);

      // Step 8: Test HTTPS Nginx config
      const testHttpsResult = executeCommand('nginx -t', 'Test HTTPS Nginx configuration');
      results.steps.push({ step: 'test_nginx_https', ...testHttpsResult });
      if (!testHttpsResult.success) {
        throw new Error('HTTPS Nginx configuration test failed');
      }

      // Step 9: Start Nginx with HTTPS config
      const startResult = executeCommand('systemctl start nginx', 'Start Nginx with HTTPS');
      results.steps.push({ step: 'start_nginx_https', ...startResult });
      if (!startResult.success) {
        throw new Error('Failed to start Nginx with HTTPS config');
      }

      console.log(`[${new Date().toISOString()}] ✓ Stage 2 complete: HTTPS config active`);
    } else {
      results.steps.push({
        step: 'request_ssl',
        success: true,
        output: 'SSL certificate already exists, upgrading to HTTPS config'
      });
      
      // Certificate exists, just upgrade to HTTPS config
      const httpsConfig = generateHttpsConfig(projectName, subdomain, port);
      fs.writeFileSync(configPath, httpsConfig);
      
      const testHttpsResult = executeCommand('nginx -t', 'Test HTTPS configuration');
      results.steps.push({ step: 'test_nginx_https', ...testHttpsResult });
      
      if (testHttpsResult.success) {
        const reloadResult = executeCommand('systemctl reload nginx', 'Reload Nginx with HTTPS');
        results.steps.push({ step: 'reload_nginx_https', ...reloadResult });
      }
    }

    results.success = true;
    console.log(`[${new Date().toISOString()}] ✅ Automation complete for ${subdomain}`);
    return results;

  } catch (error) {
    results.success = false;
    results.error = error.message;
    console.error(`[${new Date().toISOString()}] ❌ Automation failed for ${subdomain}: ${error.message}`);
    return results;
  }
}

// HTTP server to receive automation requests
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/automate') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body);
        const result = await handleAutomationRequest(requestData);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'nginx-automation' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Nginx Automation Service listening on http://0.0.0.0:${PORT}`);
  console.log(`[${new Date().toISOString()}] Ready to handle automation requests`);
});
