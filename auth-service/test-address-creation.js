const axios = require('axios');

console.log('🧪 Testing Address Creation with Updated Model\n');

async function testAddressCreation() {
  try {
    // Step 1: Login and get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'aromalgirish00@gmail.com',
      password: 'Aromal@2002'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful');
    console.log('🔑 Token received');

    // Step 2: Test address creation with all form fields
    console.log('\n2️⃣ Testing address creation...');
    const testAddress = {
      addressType: 'home',
      addressLine: '123 Test Street',
      landmark: 'Near Test Hospital',
      locality: 'Test Locality',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
      isDefault: false
    };

    console.log('📝 Address data:', testAddress);

    const addressResponse = await axios.post('http://localhost:3002/api/addresses', testAddress, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (addressResponse.data.success) {
      console.log('✅ Address creation successful!');
      console.log('📊 Response:', {
        message: addressResponse.data.message,
        addressId: addressResponse.data.data._id,
        customerId: addressResponse.data.data.customerId
      });
      
      // Show the saved address data
      console.log('💾 Saved address data:');
      console.log('- Address Type:', addressResponse.data.data.addressType);
      console.log('- Address Line:', addressResponse.data.data.addressLine);
      console.log('- Landmark:', addressResponse.data.data.landmark);
      console.log('- Locality:', addressResponse.data.data.locality);
      console.log('- City:', addressResponse.data.data.city);
      console.log('- District:', addressResponse.data.data.district);
      console.log('- State:', addressResponse.data.data.state);
      console.log('- Pincode:', addressResponse.data.data.pincode);
      console.log('- Country:', addressResponse.data.data.country);
      console.log('- Is Default:', addressResponse.data.data.isDefault);
    } else {
      console.log('❌ Address creation failed:', addressResponse.data.message);
    }

  } catch (error) {
    console.error('💥 Test error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
  }
}

// Check if services are running first
async function checkServices() {
  console.log('🔍 Checking Service Availability...\n');
  
  try {
    const authResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Auth Service:', authResponse.data.message);
  } catch (error) {
    console.log('❌ Auth Service not responding');
    return false;
  }

  try {
    const customerResponse = await axios.get('http://localhost:3002/health');
    console.log('✅ Customer Service:', customerResponse.data.status);
  } catch (error) {
    console.log('❌ Customer Service not responding');
    return false;
  }

  console.log('\n' + '='.repeat(50) + '\n');
  return true;
}

// Run the test
checkServices().then((servicesRunning) => {
  if (servicesRunning) {
    testAddressCreation();
  } else {
    console.log('❌ Services not running. Please start both auth-service and customer-service first.');
  }
}); 