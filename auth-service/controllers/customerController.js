const Customer = require('../models/customer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new customer
const register = async (req, res) => {
  try {
    const { firstname, lastname, email, phone, password } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingCustomer) {
      return res.status(400).json({ 
        message: 'Customer with this email or phone already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new customer
    const customer = new Customer({
      firstname,
      lastname,
      email,
      phone,
      password: hashedPassword
    });

    await customer.save();

    // Generate JWT token
    const token = jwt.sign(
      { customerId: customer._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const customerResponse = customer.toObject();
    delete customerResponse.password;

    res.status(201).json({
      message: 'Customer registered successfully',
      customer: customerResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login customer
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find customer by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { customerId: customer._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const customerResponse = customer.toObject();
    delete customerResponse.password;

    res.json({
      message: 'Login successful',
      customer: customerResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customer profile
const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).select('-password');
    res.json({ customer });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update customer profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'firstname', 'lastname', 'address', 'pincode', 
      'district', 'state', 'country', 'profileImage'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const customer = await Customer.findByIdAndUpdate(
      req.customer._id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      customer
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const customer = await Customer.findById(req.customer._id);
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, customer.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    customer.password = hashedPassword;
    await customer.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete customer account
const deleteAccount = async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.customer._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all customers (admin function - you might want to add admin role later)
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().select('-password');
    res.json({ customers });
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get customer by ID (admin function)
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).select('-password');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ customer });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAllCustomers,
  getCustomerById
}; 