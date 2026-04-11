#!/usr/bin/env node

/**
 * NGINX CONFIG & SSL AUTOMATION SCRIPT
 * 
 * This script automates:
 * 1. Generating Nginx config files for projects
 * 2. Providing SSL certificate commands
 * 3. Providing enable/reload commands
 * 
 * Usage:
 *   node setup-project-nginx.js <project-name> <port>
 * 
 * Example:
 *   node setup-project-nginx.js portfolio 3001
 */

const fs = require('fs');
const path = require('path');

// Get arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node setup-project-nginx.js <project-name> <port>');
  console.error('Example: node setup-project-nginx.js portfolio 3001');
  process.exit(1);
}

const projectName = args[0];
const port = parseInt(args[1]);

if (isNaN(port) || port < 1 || port > 65535) {
  console.error('Error: Port must be a number between 1 and 65535');
  process.exit(1);
}

// Generate subdomain
const subdomain = `${projectName}.launchport.org`;

// Generate Nginx config content
const nginxConfig = `# HTTP - Redirect to HTTPS
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

// Output file path
const outputPath = `/tmp/nginx-${projectName}`;

// Write config file
try {
  fs.writeFileSync(outputPath, nginxConfig);
  console.log('\n✅ Nginx config generated!\n');
  console.log('📄 Config file created at:', outputPath);
  console.log('\n' + '='.repeat(70));
  console.log('NGINX CONFIG CONTENT:');
  console.log('='.repeat(70));
  console.log(nginxConfig);
  console.log('='.repeat(70));
  
  console.log('\n📋 STEP-BY-STEP DEPLOYMENT COMMANDS:\n');
  console.log('1️⃣  Copy config to Nginx directory:');
  console.log(`   sudo cp ${outputPath} /etc/nginx/sites-available/${projectName}`);
  
  console.log('\n2️⃣  Enable the site:');
  console.log(`   sudo ln -s /etc/nginx/sites-available/${projectName} /etc/nginx/sites-enabled/`);
  
  console.log('\n3️⃣  Test Nginx configuration:');
  console.log(`   sudo nginx -t`);
  
  console.log('\n4️⃣  Reload Nginx:');
  console.log(`   sudo systemctl reload nginx`);
  
  console.log('\n5️⃣  Request SSL certificate:');
  console.log(`   sudo certbot certonly --nginx -d ${subdomain}`);
  
  console.log('\n6️⃣  Reload Nginx again (to load SSL):');
  console.log(`   sudo systemctl reload nginx`);
  
  console.log('\n7️⃣  Test your site:');
  console.log(`   curl -I https://${subdomain}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('✨ ALL-IN-ONE COMMAND (copy & paste):');
  console.log('='.repeat(70));
  console.log(`
sudo cp ${outputPath} /etc/nginx/sites-available/${projectName} && \\
sudo ln -s /etc/nginx/sites-available/${projectName} /etc/nginx/sites-enabled/ && \\
sudo nginx -t && \\
sudo systemctl reload nginx && \\
echo "Nginx reloaded! Now run SSL command:" && \\
echo "sudo certbot certonly --nginx -d ${subdomain}" && \\
echo "Then: sudo systemctl reload nginx"
  `.trim());
  
  console.log('\n' + '='.repeat(70));
  console.log('📝 NOTES:');
  console.log('='.repeat(70));
  console.log(`• Subdomain: ${subdomain}`);
  console.log(`• Port: ${port}`);
  console.log(`• Make sure DNS A record exists: ${subdomain} -> VPS IP`);
  console.log(`• Make sure port ${port} is exposed in docker-compose.yml`);
  console.log('• SSL certificate will be stored in: /etc/letsencrypt/live/' + subdomain + '/');
  console.log('\n');
  
} catch (error) {
  console.error('❌ Error writing config file:', error.message);
  process.exit(1);
}
