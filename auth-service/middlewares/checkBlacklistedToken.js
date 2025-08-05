const BlacklistedToken = require('../models/blacklistedToken');

const checkBlacklistedToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Check if token is blacklisted
    const blacklistedToken = await BlacklistedToken.findOne({ token });
    
    if (blacklistedToken) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please login again.'
      });
    }

    next();
  } catch (error) {
    console.error('Blacklisted token check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during token validation'
    });
  }
};

module.exports = checkBlacklistedToken; 