const axios = require('axios');

const BASE_URL = 'http://localhost:3006';

// Test functions
const testHealthCheck = async () => {
  try {
    console.log('🔍 Testing health check...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
};

const testGetAllDesigns = async () => {
  try {
    console.log('🔍 Testing get all designs...');
    const response = await axios.get(`${BASE_URL}/api/designs`);
    console.log('✅ Get all designs passed:', {
      success: response.data.success,
      count: response.data.count,
      sampleDesign: response.data.data[0] ? {
        name: response.data.data[0].name,
        category: response.data.data[0].category,
        hasSizeCriteria: !!response.data.data[0].sizeCriteria
      } : 'No designs found'
    });
    return true;
  } catch (error) {
    console.error('❌ Get all designs failed:', error.message);
    return false;
  }
};

const testGetDesignById = async () => {
  try {
    console.log('🔍 Testing get design by ID...');
    
    // First get all designs to get an ID
    const allDesignsResponse = await axios.get(`${BASE_URL}/api/designs`);
    if (allDesignsResponse.data.data.length === 0) {
      console.log('⚠️  No designs available for ID test');
      return true;
    }
    
    const designId = allDesignsResponse.data.data[0]._id;
    const response = await axios.get(`${BASE_URL}/api/designs/${designId}`);
    console.log('✅ Get design by ID passed:', {
      success: response.data.success,
      designName: response.data.data.name,
      hasSizeCriteria: !!response.data.data.sizeCriteria
    });
    return true;
  } catch (error) {
    console.error('❌ Get design by ID failed:', error.message);
    return false;
  }
};

const testGetCategories = async () => {
  try {
    console.log('🔍 Testing get categories...');
    const response = await axios.get(`${BASE_URL}/api/designs/categories`);
    console.log('✅ Get categories passed:', {
      success: response.data.success,
      categories: response.data.data
    });
    return true;
  } catch (error) {
    console.error('❌ Get categories failed:', error.message);
    return false;
  }
};

const testCreateDesign = async () => {
  try {
    console.log('🔍 Testing create design...');
    const newDesign = {
      name: 'Test Design',
      category: 'casual',
      image: 'https://via.placeholder.com/300x400?text=Test+Design',
      description: 'A test design for API testing',
      sizeCriteria: ['chest', 'waist', 'length'],
      price: 100,
      difficulty: 'beginner',
      estimatedTime: 2,
      tags: ['test', 'casual', 'simple']
    };
    
    const response = await axios.post(`${BASE_URL}/api/designs`, newDesign);
    console.log('✅ Create design passed:', {
      success: response.data.success,
      designId: response.data.data._id,
      hasSizeCriteria: !!response.data.data.sizeCriteria
    });
    return response.data.data._id;
  } catch (error) {
    console.error('❌ Create design failed:', error.message);
    return null;
  }
};

const testFilterDesigns = async () => {
  try {
    console.log('🔍 Testing filter designs by category...');
    const response = await axios.get(`${BASE_URL}/api/designs?category=casual`);
    console.log('✅ Filter designs passed:', {
      success: response.data.success,
      count: response.data.count,
      category: 'casual'
    });
    return true;
  } catch (error) {
    console.error('❌ Filter designs failed:', error.message);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Design Service API Tests...\n');
  
  const results = {
    healthCheck: false,
    getAllDesigns: false,
    getDesignById: false,
    getCategories: false,
    createDesign: false,
    filterDesigns: false
  };
  
  // Run tests
  results.healthCheck = await testHealthCheck();
  console.log('');
  
  results.getAllDesigns = await testGetAllDesigns();
  console.log('');
  
  results.getDesignById = await testGetDesignById();
  console.log('');
  
  results.getCategories = await testGetCategories();
  console.log('');
  
  results.createDesign = await testCreateDesign();
  console.log('');
  
  results.filterDesigns = await testFilterDesigns();
  console.log('');
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test}: ${status}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Design Service is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the service configuration.');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
