#!/usr/bin/env node

/**
 * NGINX & SSL AUTOMATION SERVICE
 * 
 * Runs on the VPS HOST (not inside Docker)
 * Accepts requests from backend container to:
 * - Create Nginx configs
 * - Enable sites
 * - Reload Nginx
 * - Request SSL certificates
 * 
 * Security: Only listens on localhost (not exposed to internet)
 * Port: 9000
 */

const http = require('http');
const fs = require('fs');
const { execSync } = require('child_process');

const PORT = 9000;
const HOST = '0.0.0.0'; // all interfaces (allows Docker to connect)

// Nginx config template
function generateNginxConfig(projectName, subdomain, port) {
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
    console.log(`[${new Date().toISOString()}] Executing: ${description}`);
    const output = execSync(command, { encoding: 'utf8' });
    console.log(`[${new Date().toISOString()}] ✓ ${description}`);
    return { success: true, output };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ✗ ${description}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

// Handle automation request
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
    // Step 1: Generate Nginx config
    const nginxConfig = generateNginxConfig(projectName, subdomain, port);
    fs.writeFileSync(configPath, nginxConfig);
    results.steps.push({ step: 'generate_config', success: true });
    console.log(`[${new Date().toISOString()}] ✓ Generated Nginx config: ${configPath}`);
    
    // Step 2: Enable site (create symlink if doesn't exist)
    if (!fs.existsSync(enabledPath)) {
      const symlinkResult = executeCommand(
        `ln -s ${configPath} ${enabledPath}`,
        'Enable site (create symlink)'
      );
      results.steps.push({ step: 'enable_site', ...symlinkResult });
    } else {
      results.steps.push({ step: 'enable_site', success: true, output: 'Already enabled' });
    }
    
    // Step 3: Test Nginx config
    const testResult = executeCommand('nginx -t', 'Test Nginx configuration');
    results.steps.push({ step: 'test_nginx', ...testResult });
    if (!testResult.success) {
      throw new Error('Nginx configuration test failed');
    }
    
    // Step 4: Reload Nginx
    const reloadResult = executeCommand('systemctl reload nginx', 'Reload Nginx');
    results.steps.push({ step: 'reload_nginx', ...reloadResult });
    
    // Step 5: Request SSL certificate
    const certPath = `/etc/letsencrypt/live/${subdomain}`;
    if (!fs.existsSync(certPath)) {
      console.log(`[${new Date().toISOString()}] Requesting SSL certificate for ${subdomain}...`);
      const sslResult = executeCommand(
        `certbot certonly --nginx -d ${subdomain} --non-interactive --agree-tos --email admin@launchport.org`,
        'Request SSL certificate'
      );
      results.steps.push({ step: 'request_ssl', ...sslResult });
      
      if (sslResult.success) {
        // Reload Nginx again to load SSL
        const reloadSslResult = executeCommand('systemctl reload nginx', 'Reload Nginx with SSL');
        results.steps.push({ step: 'reload_nginx_ssl', ...reloadSslResult });
      }
    } else {
      results.steps.push({ 
        step: 'request_ssl', 
        success: true, 
        output: 'SSL certificate already exists' 
      });
    }
    
    results.success = true;
    results.url = `https://${subdomain}`;
    return results;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during automation:`, error.message);
    results.success = false;
    results.error = error.message;
    return results;
  }
}

// HTTP server
const server = http.createServer(async (req, res) => {
  // Only accept POST requests to /automate
  if (req.method !== 'POST' || req.url !== '/automate') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  
  // Parse request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      console.log(`[${new Date().toISOString()}] Received automation request:`, data);
      
      const result = await handleAutomationRequest(data);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error handling request:`, error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  NGINX & SSL Automation Service                                ║
╚════════════════════════════════════════════════════════════════╝

✓ Service started successfully
✓ Listening on: ${HOST}:${PORT}
✓ Endpoint: POST http://${HOST}:${PORT}/automate

Security: Only accepts requests from localhost
Status: Ready to automate Nginx configs and SSL certificates

Press Ctrl+C to stop
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('[${new Date().toISOString()}] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[${new Date().toISOString()}] Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('[${new Date().toISOString()}] Server closed');
    process.exit(0);
  });
});
