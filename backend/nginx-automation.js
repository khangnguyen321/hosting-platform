/**
 * NGINX & SSL AUTOMATION CLIENT
 * 
 * Backend module that calls the automation service running on the host
 * to automatically configure Nginx and SSL for deployed projects
 */

const http = require('http');

// Automation service configuration
const AUTOMATION_SERVICE_HOST = '172.17.0.1'; // Docker default gateway (host machine)
const AUTOMATION_SERVICE_PORT = 9000;

/**
 * Call automation service to setup Nginx and SSL
 * @param {string} projectName - Name of the project
 * @param {number} port - Port the project is running on
 * @returns {Promise<object>} - Automation results
 */
async function setupNginxAndSSL(projectName, port) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      projectName,
      port
    });

    const options = {
      hostname: AUTOMATION_SERVICE_HOST,
      port: AUTOMATION_SERVICE_PORT,
      path: '/automate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000 // 60 second timeout (SSL can be slow)
    };

    console.log(`🔧 Calling automation service for ${projectName} on port ${port}...`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.success) {
            console.log(`✅ Automation complete for ${projectName}`);
            console.log(`🌐 Project URL: ${result.url}`);
          } else {
            console.error(`❌ Automation failed for ${projectName}:`, result.error);
          }
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse automation response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Failed to connect to automation service:`, error.message);
      reject(new Error(`Automation service unreachable: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Automation service timeout (60s)'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Check if automation service is available
 * @returns {Promise<boolean>}
 */
async function checkAutomationService() {
  return new Promise((resolve) => {
    const options = {
      hostname: AUTOMATION_SERVICE_HOST,
      port: AUTOMATION_SERVICE_PORT,
      path: '/health',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404); // 404 is ok, means service is running
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

module.exports = {
  setupNginxAndSSL,
  checkAutomationService,
  AUTOMATION_SERVICE_HOST,
  AUTOMATION_SERVICE_PORT
};
