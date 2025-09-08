const axios = require('axios');
const jwt = require('jsonwebtoken');

console.log('🔍 Testing Frontend Token and JWT Payload...\n');

async function testFrontendToken() {
  try {
    // Step 1: Get a fresh token
    console.log('1️⃣ Getting fresh token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'aromalgirish00@gmail.com',
      password: 'Aromal@2002'
    });

    const token = loginResponse.data.accessToken;
    console.log('✅ Token received');

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

    // Step 3: Check if required fields are present
    console.log('\n3️⃣ Checking Required Fields...');
    const requiredFields = ['userId', 'role', 'email'];
    const missingFields = requiredFields.filter(field => !decoded?.[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
    } else {
      console.log('✅ All required fields present');
    }

    // Step 4: Test POST request to customer service
    console.log('\n4️⃣ Testing POST /api/addresses...');
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
      const postResponse = await axios.post('http://localhost:3002/api/addresses', testAddress, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ POST request successful!');
      console.log('📊 Response:', postResponse.data);

    } catch (postError) {
      console.log('❌ POST request failed');
      console.log('🔍 Error details:', {
        status: postError.response?.status,
        message: postError.response?.data?.message || postError.message,
        data: postError.response?.data
      });
    }

    // Step 5: Test token validation with auth service
    console.log('\n5️⃣ Testing Token Validation...');
    try {
      const validateResponse = await axios.get('http://localhost:3000/api/auth/validate-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Token validation successful');
      console.log('📊 Validation response:', validateResponse.data);

    } catch (validateError) {
      console.log('❌ Token validation failed');
      console.log('🔍 Error details:', {
        status: validateError.response?.status,
        message: validateError.response?.data?.message || validateError.message
      });
    }

    // Step 6: Check token expiration
    console.log('\n6️⃣ Checking Token Expiration...');
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = decoded?.exp - now;
    console.log('⏰ Current time:', now);
    console.log('⏰ Token expires:', decoded?.exp);
    console.log('⏰ Expires in:', expiresIn, 'seconds');
    console.log('⏰ Token valid:', expiresIn > 0);

  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });
  }
}

testFrontendToken(); 