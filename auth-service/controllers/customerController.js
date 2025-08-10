const Customer = require('../models/customer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { validateEmailForRegistration, checkEmailExists } = require('../utils/emailValidation');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailService');

// Register a new customer
const register = async (req, res) => {
  try {
    const { firstname, lastname, email, phone, password } = req.body;

    // Validate email across all user types
    const emailValidation = await validateEmailForRegistration(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        message: emailValidation.message 
      });
    }

    // Check if customer already exists by phone
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ 
        success: false,
        message: 'Customer with this phone number already exists' 
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

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    customer.emailVerificationToken = verificationToken;
    customer.emailVerificationTokenExpires = tokenExpiry;
    await customer.save();

    // Send verification email
    const userName = `${customer.firstname} ${customer.lastname}`;
    const emailResult = await sendVerificationEmail(customer.email, verificationToken, 'customer', userName);

    if (emailResult.success) {
      res.status(201).json({
        success: true,
        message: 'Customer registered successfully. Please check your email to verify your account.',
        requiresEmailVerification: true,
        email: customer.email,
        userType: 'customer'
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'Customer registered successfully, but verification email could not be sent. Please try resending verification email.',
        requiresEmailVerification: true,
        email: customer.email,
        userType: 'customer',
        emailError: true
      });
    }
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

// Google OAuth Sign-In
const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ 
        message: 'Google ID token is required' 
      });
    }

    // Verify the Google ID token
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture } = payload;

    // Check if email exists across all user types
    const emailCheck = await checkEmailExists(email);
    if (emailCheck.exists && emailCheck.userType !== 'customer') {
      return res.status(400).json({
        success: false,
        message: `Email is already registered as a ${emailCheck.userType}. Please use a different email or login with your existing account.`
      });
    }

    // Check if customer already exists
    let customer = await Customer.findOne({ email });

    if (customer) {
      // Customer exists, generate token and return
      const token = jwt.sign(
        { 
          userId: customer._id,
          role: 'customer',
          email: customer.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const customerResponse = customer.toObject();
      delete customerResponse.password;

      return res.json({
        success: true,
        message: 'Google Sign-In successful',
        user: customerResponse,
        token
      });
    }

    // Create new customer with Google data
    customer = new Customer({
      firstname: given_name || 'Google',
      lastname: family_name || 'User',
      email,
      profileImage: picture,
      isGoogleUser: true,
      isEmailVerified: true, // Google users are automatically verified
      // Generate a random password for Google users
      password: await bcrypt.hash(Math.random().toString(36), 10)
    });

    await customer.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: customer._id,
        role: 'customer',
        email: customer.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const customerResponse = customer.toObject();
    delete customerResponse.password;

    res.status(201).json({
      success: true,
      message: 'Google Sign-In successful',
      user: customerResponse,
      token
    });

  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ message: 'Server error during Google Sign-In' });
  }
};

// Get customer profile
const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.userId).select('-password');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, customer });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update customer profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user.userId;
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'address'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        // Map frontend field names to database field names
        if (key === 'firstName') filteredUpdates.firstname = updates[key];
        else if (key === 'lastName') filteredUpdates.lastname = updates[key];
        else filteredUpdates[key] = updates[key];
      }
    });

    const customer = await Customer.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      customer
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
  googleSignIn,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAllCustomers,
  getCustomerById
}; 