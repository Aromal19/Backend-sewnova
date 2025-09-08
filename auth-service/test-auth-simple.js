const axios = require('axios');

console.log('🧪 Testing Authentication Flow...\n');

async function testAuth() {
  try {
    // Test 1: Check if auth service is running
    console.log('1️⃣ Testing Auth Service Health...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Auth service is running:', healthResponse.data);

    // Test 2: Try to login with non-existent user
    console.log('\n2️⃣ Testing Login with Non-existent User...');
    try {
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: 'password123'
      });
      console.log('✅ Login response:', loginResponse.data);
    } catch (error) {
      console.log('❌ Login failed (expected):', error.response?.data?.message || error.message);
    }

    // Test 3: Test customer service health
    console.log('\n3️⃣ Testing Customer Service Health...');
    const customerHealthResponse = await axios.get('http://localhost:3002/health');
    console.log('✅ Customer service is running:', customerHealthResponse.data);

    // Test 4: Test customer service without auth
    console.log('\n4️⃣ Testing Customer Service without Auth...');
    try {
      const customerResponse = await axios.get('http://localhost:3002/api/addresses');
      console.log('✅ Customer service response:', customerResponse.data);
    } catch (error) {
      console.log('❌ Customer service auth required (expected):', error.response?.data?.message || error.message);
    }

    console.log('\n🎯 Basic tests completed!');
    console.log('Next steps:');
    console.log('1. Create a user account through the frontend');
    console.log('2. Login with the created account');
    console.log('3. Test the customer addresses page');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuth(); 