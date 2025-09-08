const axios = require('axios');

async function testVendorService() {
  try {
    console.log('Testing Vendor Service...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:3004/health');
    console.log('✅ Health check passed:', healthResponse.data);
    
    console.log('🎉 Vendor Service is running successfully!');
    console.log('Available endpoints:');
    console.log('- GET /health - Health check');
    console.log('- POST /api/products - Add fabric (requires auth)');
    console.log('- GET /api/products - Get seller products (requires auth)');
    console.log('- GET /api/orders - Get seller orders (requires auth)');
    console.log('- GET /api/sellers/stats - Get seller stats (requires auth)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testVendorService();