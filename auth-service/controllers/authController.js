const Customer = require('../models/customer');
const Tailor = require('../models/tailor');
const Seller = require('../models/seller');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Shared login function for all user roles
const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({
        message: 'Email, password, and role are required'
      });
    }

    // Validate role
    const validRoles = ['customer', 'tailor', 'seller'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: 'Invalid role. Must be one of: customer, tailor, seller'
      });
    }

    // Select the appropriate model based on role
    let UserModel;
    switch (role) {
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
        return res.status(400).json({
          message: 'Invalid role'
        });
    }

    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare user response (exclude password)
    const userResponse = {
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    // Add role-specific fields
    if (role === 'tailor') {
      userResponse.shopName = user.shopName;
      userResponse.experience = user.experience;
      userResponse.specialization = user.specialization;
      userResponse.isVerified = user.isVerified;
      userResponse.rating = user.rating;
      userResponse.totalOrders = user.totalOrders;
    } else if (role === 'seller') {
      userResponse.businessName = user.businessName;
      userResponse.businessType = user.businessType;
      userResponse.gstNumber = user.gstNumber;
      userResponse.isVerified = user.isVerified;
      userResponse.rating = user.rating;
      userResponse.totalSales = user.totalSales;
      userResponse.productsCount = user.productsCount;
    }

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login'
    });
  }
};

module.exports = {
  loginUser
}; 