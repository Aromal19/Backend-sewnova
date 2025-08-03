const jwt = require('jsonwebtoken');
const Customer = require('../models/customer');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const customer = await Customer.findById(decoded.customerId).select('-password');
    
    if (!customer) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.customer = customer;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = auth; 