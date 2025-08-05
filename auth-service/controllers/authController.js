const Customer = require('../models/customer');
const Tailor = require('../models/tailor');
const Seller = require('../models/seller');
const BlacklistedToken = require('../models/blacklistedToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { checkEmailExists } = require('../utils/emailValidation');

// Enhanced login function that automatically detects user role
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user exists in any of the collections
    let user = null;
    let userRole = null;
    let UserModel = null;

    // Check in Customer collection
    user = await Customer.findOne({ email: email.toLowerCase() });
    if (user) {
      userRole = 'customer';
      UserModel = Customer;
    }

    // If not found in Customer, check in Tailor collection
    if (!user) {
      user = await Tailor.findOne({ email: email.toLowerCase() });
      if (user) {
        userRole = 'tailor';
        UserModel = Tailor;
      }
    }

    // If not found in Tailor, check in Seller collection
    if (!user) {
      user = await Seller.findOne({ email: email.toLowerCase() });
      if (user) {
        userRole = 'seller';
        UserModel = Seller;
      }
    }

    // If user not found in any collection
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: userRole,
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
      role: userRole,
      phone: user.phone
    };

    // Add role-specific fields
    if (userRole === 'tailor') {
      userResponse.shopName = user.shopName;
      userResponse.experience = user.experience;
      userResponse.specialization = user.specialization;
      userResponse.isVerified = user.isVerified;
      userResponse.rating = user.rating;
      userResponse.totalOrders = user.totalOrders;
    } else if (userRole === 'seller') {
      userResponse.businessName = user.businessName;
      userResponse.businessType = user.businessType;
      userResponse.gstNumber = user.gstNumber;
      userResponse.isVerified = user.isVerified;
      userResponse.rating = user.rating;
      userResponse.totalSales = user.totalSales;
      userResponse.productsCount = user.productsCount;
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Function to fetch user role by email (for frontend routing)
const getUserRole = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check in Customer collection
    let user = await Customer.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.json({
        success: true,
        role: 'customer'
      });
    }

    // Check in Tailor collection
    user = await Tailor.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.json({
        success: true,
        role: 'tailor'
      });
    }

    // Check in Seller collection
    user = await Seller.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.json({
        success: true,
        role: 'seller'
      });
    }

    // User not found
    res.status(404).json({
      success: false,
      message: 'User not found'
    });

  } catch (error) {
    console.error('Get user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user role'
    });
  }
};

// Enhanced token validation with blacklist check
const validateToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // First, check if token is blacklisted
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

    res.json({
      success: true,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: decoded.role,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Enhanced logout function with token blacklisting
const logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify the token to get user information
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Determine user model based on role
    let userModel;
    switch (decoded.role) {
      case 'customer':
        userModel = 'Customer';
        break;
      case 'tailor':
        userModel = 'Tailor';
        break;
      case 'seller':
        userModel = 'Seller';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user role'
        });
    }

    // Add token to blacklist (minimal data)
    const blacklistedToken = new BlacklistedToken({
      token: token,
      expiresAt: new Date(decoded.exp * 1000) // Convert JWT exp to Date
    });

    await blacklistedToken.save();
    
    res.json({
      success: true,
      message: 'Logged out successfully. Token has been invalidated.'
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    // If token is invalid, still return success (frontend will clear localStorage anyway)
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.json({
        success: true,
        message: 'Logged out successfully'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Check email availability across all user types
const checkEmailAvailability = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const emailCheck = await checkEmailExists(email);

    res.json({
      success: true,
      available: !emailCheck.exists,
      message: emailCheck.message,
      userType: emailCheck.userType
    });

  } catch (error) {
    console.error('Email availability check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking email availability'
    });
  }
};

// Generic Google OAuth Sign-In for all user types
const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ 
        success: false,
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

    // Check if user exists in any of the collections
    let user = null;
    let userRole = null;
    let UserModel = null;

    // Check in Customer collection
    user = await Customer.findOne({ email: email.toLowerCase() });
    if (user) {
      userRole = 'customer';
      UserModel = Customer;
    }

    // If not found in Customer, check in Tailor collection
    if (!user) {
      user = await Tailor.findOne({ email: email.toLowerCase() });
      if (user) {
        userRole = 'tailor';
        UserModel = Tailor;
      }
    }

    // If not found in Tailor, check in Seller collection
    if (!user) {
      user = await Seller.findOne({ email: email.toLowerCase() });
      if (user) {
        userRole = 'seller';
        UserModel = Seller;
      }
    }

    if (user) {
      // User exists, generate token and return
      const token = jwt.sign(
        { 
          userId: user._id,
          role: userRole,
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
        role: userRole,
        phone: user.phone
      };

      // Add role-specific fields
      if (userRole === 'tailor') {
        userResponse.shopName = user.shopName;
        userResponse.experience = user.experience;
        userResponse.specialization = user.specialization;
        userResponse.isVerified = user.isVerified;
        userResponse.rating = user.rating;
        userResponse.totalOrders = user.totalOrders;
      } else if (userRole === 'seller') {
        userResponse.businessName = user.businessName;
        userResponse.businessType = user.businessType;
        userResponse.gstNumber = user.gstNumber;
        userResponse.isVerified = user.isVerified;
        userResponse.rating = user.rating;
        userResponse.totalSales = user.totalSales;
        userResponse.productsCount = user.productsCount;
      }

      return res.json({
        success: true,
        message: 'Google Sign-In successful',
        user: userResponse,
        token
      });
    }

    // User doesn't exist, create new customer by default
    // (You might want to add logic to determine user type based on some criteria)
    const newUser = new Customer({
      firstname: given_name || 'Google',
      lastname: family_name || 'User',
      email: email.toLowerCase(),
      profileImage: picture,
      isGoogleUser: true,
      // Generate a random password for Google users
      password: await bcrypt.hash(Math.random().toString(36), 10)
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser._id,
        role: 'customer',
        email: newUser.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare user response
    const userResponse = {
      id: newUser._id,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      email: newUser.email,
      role: 'customer',
      phone: newUser.phone
    };

    res.status(201).json({
      success: true,
      message: 'Google Sign-In successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during Google Sign-In' 
    });
  }
};

module.exports = {
  loginUser,
  getUserRole,
  validateToken,
  logoutUser,
  checkEmailAvailability,
  googleSignIn
}; 