const axios = require('axios');
const jwt = require('jsonwebtoken');

console.log('🔍 Comprehensive JWT Token Flow Debug\n');

async function debugJWTFlow() {
  try {
    // Step 1: Test login and get token
    console.log('1️⃣ Testing Login...');
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
    console.log('🔑 Token received:', token ? 'Yes' : 'No');
    console.log('📊 Login response:', {
      success: loginResponse.data.success,
      hasAccessToken: !!loginResponse.data.accessToken,
      hasUser: !!loginResponse.data.user,
      userRole: loginResponse.data.user?.role
    });

    // Step 2: Decode and analyze JWT payload
    console.log('\n2️⃣ Analyzing JWT Payload...');
    const decoded = jwt.decode(token);
    console.log('🔍 Decoded JWT Payload:', {
      userId: decoded?.userId,
      role: decoded?.role,
      email: decoded?.email,
      exp: decoded?.exp,
      iat: decoded?.iat,
      iss: decoded?.iss,
      aud: decoded?.aud
    });

    // Step 3: Check token expiration
    console.log('\n3️⃣ Checking Token Expiration...');
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded?.exp - now;
    console.log('⏰ Current time:', now);
    console.log('⏰ Token expires:', decoded?.exp);
    console.log('⏰ Expires in:', expiresIn, 'seconds');
    console.log('⏰ Token valid:', expiresIn > 0);

    // Step 4: Test token validation with auth service
    console.log('\n4️⃣ Testing Token Validation with Auth Service...');
    try {
      const validateResponse = await axios.get('http://localhost:3000/api/auth/validate-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Token validation successful');
      console.log('📊 Validation response:', {
        success: validateResponse.data.success,
        hasUser: !!validateResponse.data.user,
        userEmail: validateResponse.data.user?.email,
        userRole: validateResponse.data.user?.role
      });

    } catch (validateError) {
      console.log('❌ Token validation failed');
      console.log('🔍 Error details:', {
        status: validateError.response?.status,
        message: validateError.response?.data?.message || validateError.message,
        data: validateError.response?.data
      });
    }

    // Step 5: Test customer service with token
    console.log('\n5️⃣ Testing Customer Service with Token...');
    const testAddress = {
      addressType: 'home',
      addressLine: '123 Test Street',
      landmark: 'Test Landmark',
      locality: 'Test Locality',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
      isDefault: false
    };

    try {
      const customerResponse = await axios.post('http://localhost:3002/api/addresses', testAddress, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Customer service request successful');
      console.log('📊 Response:', {
        success: customerResponse.data.success,
        message: customerResponse.data.message,
        hasData: !!customerResponse.data.data
      });

    } catch (customerError) {
      console.log('❌ Customer service request failed');
      console.log('🔍 Error details:', {
        status: customerError.response?.status,
        message: customerError.response?.data?.message || customerError.message,
        data: customerError.response?.data
      });
    }

    // Step 6: Test frontend-style request
    console.log('\n6️⃣ Testing Frontend-Style Request...');
    try {
      const frontendResponse = await fetch('http://localhost:3002/api/addresses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testAddress)
      });

      const frontendData = await frontendResponse.json();
      
      if (frontendResponse.ok) {
        console.log('✅ Frontend-style request successful');
        console.log('📊 Response:', frontendData);
      } else {
        console.log('❌ Frontend-style request failed');
        console.log('🔍 Error details:', {
          status: frontendResponse.status,
          statusText: frontendResponse.statusText,
          data: frontendData
        });
      }

    } catch (frontendError) {
      console.log('❌ Frontend-style request error:', frontendError.message);
    }

    // Step 7: Check localStorage simulation
    console.log('\n7️⃣ Checking Token Storage...');
    console.log('📋 Token for localStorage:', token);
    console.log('📋 Token length:', token.length);
    console.log('📋 Token format valid:', token.split('.').length === 3);

  } catch (error) {
    console.error('💥 Debug error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });
  }
}

// Check if services are running
async function checkServices() {
  console.log('🔍 Checking Service Availability...\n');
  
  try {
    const authResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Auth Service:', authResponse.data);
  } catch (error) {
    console.log('❌ Auth Service not responding');
  }

  try {
    const customerResponse = await axios.get('http://localhost:3002/health');
    console.log('✅ Customer Service:', customerResponse.data);
  } catch (error) {
    console.log('❌ Customer Service not responding');
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

// Run the debug
checkServices().then(() => {
  debugJWTFlow();
}); 