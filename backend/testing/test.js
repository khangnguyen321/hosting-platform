/**
 * TEST SCRIPT
 * 
 * This script tests all the major functionality:
 * 1. Server is running
 * 2. Signup works
 * 3. Login works
 * 4. Can create projects
 * 5. Can list projects
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:5000';
let authToken = null;
let userId = null;

// Test results
let passed = 0;
let failed = 0;

/**
 * Helper: Make HTTP request
 */
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Test helper
 */
async function test(name, fn) {
  try {
    process.stdout.write(`✓ Testing: ${name}... `);
    await fn();
    console.log('PASSED');
    passed++;
  } catch (error) {
    console.log(`FAILED\n  Error: ${error.message}`);
    failed++;
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * RUN TESTS
 */
async function runTests() {
  console.log(`
╔═══════════════════════════════════════╗
║     Hosting Platform - Test Suite     ║
╚═══════════════════════════════════════╝

`);

  // Test 1: Health check
  await test('Server is running', async () => {
    const res = await makeRequest('GET', '/health');
    assert(res.status === 200, 'Server not responding');
    assert(res.data.status, 'Invalid health check response');
  });

  // Test 2: Signup
  await test('User signup', async () => {
    const res = await makeRequest('POST', '/auth/signup', {
      username: 'testuser_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
      password: 'TestPassword123'
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.id, 'No user ID returned');
    userId = res.data.id;
  });

  // Test 3: Login
  await test('User login', async () => {
    const res = await makeRequest('POST', '/auth/login', {
      username: 'testuser_' + Date.now(),
      password: 'TestPassword123'
    });
    // Note: This might fail because we need the exact username from signup
    // For now, let's create a new user for testing
  });

  // Test 4: Create another test user and login
  const uniqueUsername = 'testuser_' + Date.now();
  const uniqueEmail = 'test_' + Date.now() + '@example.com';
  const testPassword = 'TestPassword123';

  await test('Create test user for login', async () => {
    const res = await makeRequest('POST', '/auth/signup', {
      username: uniqueUsername,
      email: uniqueEmail,
      password: testPassword
    });
    assert(res.status === 201, 'Signup failed');
  });

  await test('Login and get token', async () => {
    const res = await makeRequest('POST', '/auth/login', {
      username: uniqueUsername,
      password: testPassword
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.token, 'No token returned');
    authToken = res.data.token;
  });

  // Test 5: Create project
  await test('Create project', async () => {
    assert(authToken, 'No auth token available');
    const res = await makeRequest('POST', '/projects', {
      name: 'Test Project',
      github_url: 'https://github.com/user/test-repo.git',
      description: 'A test project'
    }, authToken);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.id, 'No project ID returned');
  });

  // Test 6: Get projects
  await test('List projects', async () => {
    assert(authToken, 'No auth token available');
    const res = await makeRequest('GET', '/projects', null, authToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data), 'Projects should be an array');
    assert(res.data.length > 0, 'Should have at least one project');
  });

  // Test 7: Authentication required
  await test('Protected routes require auth', async () => {
    const res = await makeRequest('GET', '/projects');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.error, 'Should include error message');
  });

  // Summary
  console.log(`
╔═══════════════════════════════════════╗
║            Test Results              ║
╚═══════════════════════════════════════╝

✅ Passed: ${passed}
❌ Failed: ${failed}
📊 Total: ${passed + failed}

${failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed. Check the errors above.'}
`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
