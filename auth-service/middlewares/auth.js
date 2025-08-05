const jwt = require('jsonwebtoken');
const Customer = require('../models/customer');
const Tailor = require('../models/tailor');
const Seller = require('../models/seller');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from appropriate collection based on role
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
      default:
        return res.status(401).json({ 
          success: false,
          message: 'Invalid user role in token.' 
        });
    }

    user = await UserModel.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. User not found.' 
      });
    }

    // Add user and role to request object
    req.user = user;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Invalid token.' 
    });
  }
};

module.exports = auth; 