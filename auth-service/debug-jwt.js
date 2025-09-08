const axios = require('axios');
const jwt = require('jsonwebtoken');

console.log('🔍 Debugging JWT Token Issues...\n');

async function debugJWT() {
  try {
    // Step 1: Test login
    console.log('1️⃣ Testing Login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'aromalgirish00@gmail.com',
      password: 'Aromal@2002'
    });

    console.log('✅ Login successful!');
    console.log('📊 Login response:', {
      success: loginResponse.data.success,
      hasAccessToken: !!loginResponse.data.accessToken,
      userRole: loginResponse.data.user?.role,
      userEmail: loginResponse.data.user?.email
    });

    const token = loginResponse.data.accessToken;
    console.log('🔑 Token received:', token ? 'Yes' : 'No');
    
    if (token) {
      console.log('🔍 Token preview:', token.substring(0, 50) + '...');
      
      // Step 2: Test token validation
      console.log('\n2️⃣ Testing Token Validation...');
      const validateResponse = await axios.get('http://localhost:3000/api/auth/validate-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Token validation successful!');
      console.log('📊 Validation response:', validateResponse.data);

      // Step 3: Test customer service with token
      console.log('\n3️⃣ Testing Customer Service with Token...');
      const customerResponse = await axios.get('http://localhost:3002/api/addresses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Customer service access successful!');
      console.log('📊 Customer response:', customerResponse.data);

      // Step 4: Decode token manually
      console.log('\n4️⃣ Manually Decoding Token...');
      try {
        const decoded = jwt.decode(token);
        console.log('🔍 Decoded token:', {
          userId: decoded?.userId,
          role: decoded?.role,
          email: decoded?.email,
          exp: decoded?.exp,
          iat: decoded?.iat
        });
        
        const now = Math.floor(Date.now() / 1000);
        console.log('⏰ Current time:', now);
        console.log('⏰ Token expires:', decoded?.exp);
        console.log('⏰ Token valid:', decoded?.exp > now);
        
      } catch (decodeError) {
        console.log('❌ Token decode error:', decodeError.message);
      }

    } else {
      console.log('❌ No token received from login');
    }

  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url
    });

    if (error.response?.status === 401) {
      console.log('\n🔍 401 Error Analysis:');
      console.log('- This means the credentials are invalid');
      console.log('- Check if the user exists in the database');
      console.log('- Check if the password is correct');
    }
  }
}

debugJWT(); 