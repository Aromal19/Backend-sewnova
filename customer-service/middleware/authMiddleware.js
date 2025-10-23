const axios = require('axios');

/**
 * Main Authentication Middleware
 * This middleware checks if the user has a valid token
 */
const authMiddleware = async (req, res, next) => {
  console.log('🔐 Auth Middleware: Checking authentication...');
  
  try {
    // Step 1: Extract token from request headers
    const authHeader = req.headers.authorization;
    console.log('📋 Auth Header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found');
      return res.status(401).json({
        success: false,
        message: 'Access token required. Please login first.'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token extracted:', token ? 'Yes' : 'No');

    // Step 2: Verify token with auth service
    console.log('🔍 Verifying token with auth service...');
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
    console.log('🌐 Auth Service URL:', authServiceUrl);

    try {
      const authResponse = await axios.get(
        `${authServiceUrl}/api/auth/validate-token`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 5000 // 5 second timeout
        }
      );

      console.log('✅ Auth service response:', authResponse.status);

      if (authResponse.data.success) {
        // Token is valid - attach user info to request
        req.user = authResponse.data.user;
        req.token = token;
        console.log('👤 User authenticated:', req.user.email, 'Role:', req.user.role);
        next(); // Continue to the next middleware/route
      } else {
        console.log('❌ Auth service returned success: false');
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      }

    } catch (authError) {
      console.error('❌ Auth service error:', {
        status: authError.response?.status,
        message: authError.response?.data?.message || authError.message,
        url: authError.config?.url
      });

      if (authError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: 'Authentication service is unavailable. Please try again later.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token verification failed. Please login again.'
      });
    }

  } catch (error) {
    console.error('💥 Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

/**
 * Role-based middleware for customers only
 * This middleware checks if the authenticated user is a customer
 */
const customerOnly = (req, res, next) => {
  console.log('👥 Customer Only Middleware: Checking user role...');
  
  if (!req.user) {
    console.log('❌ No user found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  console.log('👤 User role:', req.user.role);

  if (req.user.role === 'customer') {
    console.log('✅ Customer access granted');
    next();
  } else {
    console.log('❌ Access denied: Not a customer');
    return res.status(403).json({
      success: false,
      message: 'Access denied. Customer role required.'
    });
  }
};

/**
 * Role-based middleware for tailors only
 */
const tailorOnly = (req, res, next) => {
  console.log('✂️ Tailor Only Middleware: Checking user role...');
  
  if (!req.user) {
    console.log('❌ No user found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  console.log('👤 User role:', req.user.role);

  if (req.user.role === 'tailor') {
    console.log('✅ Tailor access granted');
    next();
  } else {
    console.log('❌ Access denied: Not a tailor');
    return res.status(403).json({
      success: false,
      message: 'Access denied. Tailor role required.'
    });
  }
};

/**
 * Role-based middleware for admin only
 */
const adminOnly = (req, res, next) => {
  console.log('👑 Admin Only Middleware: Checking user role...');
  
  if (!req.user) {
    console.log('❌ No user found in request');
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  console.log('👤 User role:', req.user.role);

  if (req.user.role === 'admin') {
    console.log('✅ Admin access granted');
    next();
  } else {
    console.log('❌ Access denied: Not an admin');
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
};

/**
 * Allow both customers and tailors
 */
const customerOrTailor = (req, res, next) => {
  console.log('👥 CustomerOrTailor Middleware: Checking user role...');

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role === 'customer' || req.user.role === 'tailor') {
    console.log('✅ Access granted for role:', req.user.role);
    return next();
  }

  console.log('❌ Access denied: Role not allowed:', req.user.role);
  return res.status(403).json({ success: false, message: 'Access denied.' });
};

/**
 * Allow both admin and tailor roles
 */
const adminOrTailor = (req, res, next) => {
  console.log('👑✂️ AdminOrTailor Middleware: Checking user role...');

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role === 'admin' || req.user.role === 'tailor') {
    console.log('✅ Access granted for role:', req.user.role);
    return next();
  }

  console.log('❌ Access denied: Role not allowed:', req.user.role);
  return res.status(403).json({ success: false, message: 'Access denied.' });
};

/**
 * Optional authentication middleware
 * This middleware tries to authenticate but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  console.log('🔍 Optional Auth: Checking for token...');
  
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('🔑 Optional token found, attempting validation...');

      try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';
        const authResponse = await axios.get(
          `${authServiceUrl}/api/auth/validate-token`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 3000
          }
        );

        if (authResponse.data.success) {
          req.user = authResponse.data.user;
          req.token = token;
          console.log('✅ Optional auth successful:', req.user.email);
        }
      } catch (authError) {
        console.log('⚠️ Optional auth failed (continuing):', authError.message);
      }
    } else {
      console.log('ℹ️ No token provided for optional auth');
    }
    
    next(); // Always continue, regardless of auth result
  } catch (error) {
    console.error('💥 Optional auth error:', error.message);
    next(); // Continue even on error
  }
};

module.exports = {
  authMiddleware,
  customerOnly,
  tailorOnly,
  adminOnly,
  customerOrTailor,
  adminOrTailor,
  optionalAuth
}; 