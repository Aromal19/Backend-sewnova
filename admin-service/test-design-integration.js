const axios = require('axios');

const ADMIN_SERVICE_URL = 'http://localhost:3007';
const DESIGN_SERVICE_URL = 'http://localhost:3006';

async function testServices() {
  console.log('🧪 Testing Admin Service and Design Service Integration...\n');

  try {
    // Test 1: Check if services are running
    console.log('1. Testing service health...');
    
    const adminHealth = await axios.get(`${ADMIN_SERVICE_URL}/health`);
    console.log('✅ Admin Service:', adminHealth.data);
    
    const designHealth = await axios.get(`${DESIGN_SERVICE_URL}/health`);
    console.log('✅ Design Service:', designHealth.data);
    
    // Test 2: Test design routes without authentication
    console.log('\n2. Testing design routes without authentication...');
    
    try {
      const designsResponse = await axios.get(`${ADMIN_SERVICE_URL}/api/designs`);
      console.log('✅ GET /api/designs:', designsResponse.data.success ? 'Success' : 'Failed');
    } catch (error) {
      console.log('❌ GET /api/designs failed:', error.response?.status, error.response?.data?.message);
    }
    
    try {
      const statsResponse = await axios.get(`${ADMIN_SERVICE_URL}/api/designs/stats`);
      console.log('✅ GET /api/designs/stats:', statsResponse.data.success ? 'Success' : 'Failed');
    } catch (error) {
      console.log('❌ GET /api/designs/stats failed:', error.response?.status, error.response?.data?.message);
    }
    
    try {
      const categoriesResponse = await axios.get(`${ADMIN_SERVICE_URL}/api/designs/categories`);
      console.log('✅ GET /api/designs/categories:', categoriesResponse.data.success ? 'Success' : 'Failed');
    } catch (error) {
      console.log('❌ GET /api/designs/categories failed:', error.response?.status, error.response?.data?.message);
    }
    
    // Test 3: Test protected routes (should fail without auth)
    console.log('\n3. Testing protected routes without authentication...');
    
    try {
      const createResponse = await axios.post(`${ADMIN_SERVICE_URL}/api/designs`, {
        name: 'Test Design',
        category: 'test',
        image: 'test.jpg'
      });
      console.log('❌ POST /api/designs should have failed but succeeded');
    } catch (error) {
      console.log('✅ POST /api/designs correctly requires auth:', error.response?.status);
    }
    
    // Test 4: Test direct design service access
    console.log('\n4. Testing direct design service access...');
    
    try {
      const directDesignsResponse = await axios.get(`${DESIGN_SERVICE_URL}/api/designs`);
      console.log('✅ Direct Design Service GET /api/designs:', directDesignsResponse.data.success ? 'Success' : 'Failed');
    } catch (error) {
      console.log('❌ Direct Design Service failed:', error.response?.status, error.response?.data?.message);
    }
    
    console.log('\n🎉 Integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testServices();