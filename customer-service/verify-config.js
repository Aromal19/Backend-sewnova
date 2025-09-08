require('dotenv').config();
const axios = require('axios');

console.log('🔧 Verifying Service Configuration...\n');

// Check environment variables
console.log('📋 Environment Configuration:');
console.log('  Customer Service PORT:', process.env.PORT || '3002 (default)');
console.log('  Auth Service URL:', process.env.AUTH_SERVICE_URL || 'http://localhost:3000');
console.log('  Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:5173');

// Test service connectivity
async function testServices() {
  console.log('\n🧪 Testing Service Connectivity...\n');

  // Test Auth Service
  console.log('1. Testing Auth Service...');
  try {
    const authResponse = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/health`, {
      timeout: 5000
    });
    console.log('   ✅ Auth Service is running');
    console.log('   📊 Response:', authResponse.data);
  } catch (error) {
    console.log('   ❌ Auth Service is not reachable');
    console.log('   🔍 Error:', error.message);
    console.log('   💡 Make sure Auth Service is running on port 3000');
  }

  // Test Customer Service
  console.log('\n2. Testing Customer Service...');
  try {
    const customerResponse = await axios.get(`http://localhost:${process.env.PORT || 3002}/health`, {
      timeout: 5000
    });
    console.log('   ✅ Customer Service is running');
    console.log('   📊 Response:', customerResponse.data);
  } catch (error) {
    console.log('   ❌ Customer Service is not reachable');
    console.log('   🔍 Error:', error.message);
    console.log('   💡 Make sure Customer Service is running on port 3002');
  }

  // Test authentication flow
  console.log('\n3. Testing Authentication Flow...');
  try {
    // Try to login (this will fail if no users exist, but should reach the service)
    const loginResponse = await axios.post(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    }, {
      timeout: 5000
    });
    console.log('   ✅ Auth Service login endpoint is working');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('   ✅ Auth Service login endpoint is working (expected 401 for invalid credentials)');
    } else {
      console.log('   ❌ Auth Service login endpoint is not working');
      console.log('   🔍 Error:', error.message);
    }
  }
}

// Run tests
testServices().then(() => {
  console.log('\n🎯 Configuration Verification Complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Make sure Auth Service is running on port 3000');
  console.log('2. Make sure Customer Service is running on port 3002');
  console.log('3. Create a test user in the Auth Service');
  console.log('4. Test the full authentication flow');
}).catch(error => {
  console.log('❌ Verification failed:', error.message);
}); 