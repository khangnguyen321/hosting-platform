/**
 * EXAMPLE CLIENT
 * 
 * This shows how to interact with your hosting platform API
 * from Node.js code instead of PowerShell
 * 
 * Usage:
 *   node example-client.js
 */

const http = require('http');

// Base URL of your API server
const BASE_URL = 'http://localhost:5000';

/**
 * Make HTTP request helper
 */
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * EXAMPLE WORKFLOW
 */
async function main() {
  try {
    console.log('🚀 Starting example workflow...\n');

    // Step 1: Check if server is running
    console.log('1️⃣  Checking if server is running...');
    const health = await request('GET', '/health');
    console.log(`   Status: ${health.data.status}\n`);

    // Step 2: Create account
    console.log('2️⃣  Creating new account...');
    const username = 'user_' + Date.now();
    const email = `user_${Date.now()}@example.com`;
    const password = 'MySecurePassword123';

    const signup = await request('POST', '/auth/signup', {
      username,
      email,
      password
    });
    console.log(`   Username: ${signup.data.username}`);
    console.log(`   Email: ${signup.data.email}\n`);

    // Step 3: Login
    console.log('3️⃣  Logging in...');
    const login = await request('POST', '/auth/login', {
      username,
      password
    });
    const token = login.data.token;
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Step 4: Create a project
    console.log('4️⃣  Creating a project...');
    const project = await request('POST', '/projects', {
      name: 'My Test Project',
      github_url: 'https://github.com/example/my-app.git',
      github_branch: 'main',
      description: 'A test project for the hosting platform'
    }, token);
    
    const projectId = project.data.id;
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Name: ${project.data.name}`);
    console.log(`   GitHub: ${project.data.github_url}\n`);

    // Step 5: List projects
    console.log('5️⃣  Listing all projects...');
    const projects = await request('GET', '/projects', null, token);
    console.log(`   Total projects: ${projects.data.length}`);
    projects.data.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (Port: ${p.port || 'Not running'})`);
    });
    console.log();

    // Step 6: Check project status
    console.log('6️⃣  Checking project status...');
    const status = await request('GET', `/projects/${projectId}/status`, null, token);
    console.log(`   Is Running: ${status.data.isRunning}`);
    console.log(`   Port: ${status.data.port || 'Not assigned yet'}`);
    console.log(`   URL: ${status.data.url || 'Not available'}\n`);

    console.log('✅ Example workflow complete!\n');
    console.log('Next steps:');
    console.log('1. Go to your GitHub repo and update it with a valid package.json');
    console.log('2. Run the deploy request to start your project');
    console.log('3. Check the status and visit the URL in your browser');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the example
main();
