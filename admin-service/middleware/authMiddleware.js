const jwt = require('jsonwebtoken');
const axios = require('axios');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // Verify token with main auth service
    try {
      const response = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/api/auth/validate-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const user = response.data.user;
        
        // Check if user is admin
        if (user.role !== 'admin' && user.role !== 'super_admin') {
          return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
        }

        req.admin = user;
        next();
      } else {
        return res.status(401).json({ success: false, message: 'Invalid token.' });
      }
    } catch (error) {
      console.error('Auth service validation error:', error);
      return res.status(401).json({ success: false, message: 'Token validation failed.' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const response = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://localhost:3000'}/api/auth/validate-token`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success && (response.data.user.role === 'admin' || response.data.user.role === 'super_admin')) {
          req.admin = response.data.user;
        }
      } catch (error) {
        console.error('Optional auth validation error:', error);
        // Continue without authentication
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication
    next();
  }
};

const adminOnly = (req, res, next) => {
  if (req.admin.role !== 'admin' && req.admin.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
};

const superAdminOnly = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Super admin privileges required.' });
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminOnly,
  superAdminOnly
};
