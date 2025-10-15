const jwt = require('jsonwebtoken');
const BlacklistedToken = require('../models/blacklistedToken');
const Customer = require('../models/customer');
const Tailor = require('../models/tailor');
const Seller = require('../models/seller');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
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

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from appropriate collection
    let user = null;
    let UserModel = null;

    switch (decoded.role) {
      case 'customer':
        UserModel = Customer;
        break;
      case 'tailor':
        UserModel = Tailor;
        break;
      case 'seller':
        UserModel = Seller;
        break;
      case 'admin':
        // For admin users, we need to import the Admin model
        const Admin = require('../models/admin');
        UserModel = Admin;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user role'
        });
    }

    user = await UserModel.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: decoded.role,
      phone: user.phone
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

module.exports = authMiddleware; 