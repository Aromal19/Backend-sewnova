const Customer = require('../models/customer');
const Tailor = require('../models/tailor');
const Seller = require('../models/seller');
const Admin = require('../models/admin');
const RefreshToken = require('../models/refreshToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { checkEmailExists } = require('../utils/emailValidation');
const { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_EXPIRES_IN } = require('../utils/tokenService');

// Enhanced login function that automatically detects user role
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    let user = null;
    let userRole = null;
    let UserModel = null;
    user = await Customer.findOne({ email: email.toLowerCase() });
    if (user) { userRole = 'customer'; UserModel = Customer; }
    if (!user) { user = await Tailor.findOne({ email: email.toLowerCase() }); if (user) { userRole = 'tailor'; UserModel = Tailor; } }
    if (!user) { user = await Seller.findOne({ email: email.toLowerCase() }); if (user) { userRole = 'seller'; UserModel = Seller; } }
    if (!user) { user = await Admin.findOne({ email: email.toLowerCase() }); if (user) { userRole = 'admin'; UserModel = Admin; } }
    if (!user) { return res.status(401).json({ success: false, message: 'Invalid email or password' }); }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) { return res.status(401).json({ success: false, message: 'Invalid email or password' }); }
    if (!user.isGoogleUser && !user.isEmailVerified && userRole !== 'admin') {
      return res.status(401).json({ success: false, message: 'Please verify your email address before logging in. Check your inbox for the verification link.', requiresEmailVerification: true, email: user.email, userType: userRole });
    }
    // Generate tokens
    const accessToken = generateAccessToken({ userId: user._id, role: userRole, email: user.email });
    const refreshTokenDoc = await generateRefreshToken(user._id);
    // Prepare user response (exclude password)
    const userResponse = {
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: userRole,
      phone: user.phone
    };
    if (userRole === 'customer') {
      userResponse.gender = user.gender || null;
      userResponse.isEmailVerified = user.isEmailVerified;
      userResponse.countryCode = user.countryCode;
      userResponse.isGoogleUser = user.isGoogleUser;
    } else if (userRole === 'tailor') {
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
    } else if (userRole === 'admin') {
      userResponse.permissions = user.permissions;
      userResponse.isActive = user.isActive;
      userResponse.lastLogin = user.lastLogin;
    }
    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshTokenDoc.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_IN * 1000
    });
    res.json({ success: true, message: 'Login successful', user: userResponse, accessToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Refresh access token endpoint
const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });
    const refreshTokenDoc = await RefreshToken.findOne({ token });
    if (!refreshTokenDoc || refreshTokenDoc.expires < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
    // Find user
    let user = await Customer.findById(refreshTokenDoc.user);
    if (!user) user = await Tailor.findById(refreshTokenDoc.user);
    if (!user) user = await Seller.findById(refreshTokenDoc.user);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    // Issue new access token
    const userRole = user.role || (user.shopName ? 'tailor' : user.businessName ? 'seller' : 'customer');
    const accessToken = generateAccessToken({ userId: user._id, role: userRole, email: user.email });
    res.json({ success: true, accessToken });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
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
    const authHeader = req.headers.authorization;
    console.log("Authorization header:", authHeader);

    const token = authHeader?.split(' ')[1];
    console.log("Extracted token:", token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT payload:", decoded);

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

// Logout: delete refresh token and clear cookie
const logoutUser = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await RefreshToken.deleteOne({ token });
      res.clearCookie('refreshToken');
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during logout' });
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

// Change password endpoint
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id; // Use _id directly from user object
    const userRole = req.user.role;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    // Find user based on role using _id
    let user = null;
    if (userRole === 'customer') {
      user = await Customer.findById(userId);
    } else if (userRole === 'seller') {
      user = await Seller.findById(userId);
    } else if (userRole === 'tailor') {
      user = await Tailor.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error during password change' });
  }
};

// Generic Google OAuth Sign-In for all user types
const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID token is required' });
    }
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture } = payload;
    let user = null;
    let userRole = null;
    let UserModel = null;
    user = await Customer.findOne({ email: email.toLowerCase() });
    if (user) { userRole = 'customer'; UserModel = Customer; }
    if (!user) { user = await Tailor.findOne({ email: email.toLowerCase() }); if (user) { userRole = 'tailor'; UserModel = Tailor; } }
    if (!user) { user = await Seller.findOne({ email: email.toLowerCase() }); if (user) { userRole = 'seller'; UserModel = Seller; } }
    if (user) {
      // User exists, issue tokens
      const accessToken = generateAccessToken({ userId: user._id, role: userRole, email: user.email });
      const refreshTokenDoc = await generateRefreshToken(user._id);
      const userResponse = {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: userRole,
        phone: user.phone
      };
      if (userRole === 'customer') {
        userResponse.gender = user.gender || null;
        userResponse.isEmailVerified = user.isEmailVerified;
        userResponse.countryCode = user.countryCode;
        userResponse.isGoogleUser = user.isGoogleUser;
      } else if (userRole === 'tailor') {
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
      res.cookie('refreshToken', refreshTokenDoc.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_EXPIRES_IN * 1000
      });
      return res.json({ success: true, message: 'Google Sign-In successful', user: userResponse, accessToken });
    }
    // User doesn't exist, create new customer by default
    const newUser = new Customer({
      firstname: given_name || 'Google',
      lastname: family_name || 'User',
      email: email.toLowerCase(),
      profileImage: picture,
      isGoogleUser: true,
      isEmailVerified: true,
      password: await bcrypt.hash(Math.random().toString(36), 10)
    });
    await newUser.save();
    const accessToken = generateAccessToken({ userId: newUser._id, role: 'customer', email: newUser.email });
    const refreshTokenDoc = await generateRefreshToken(newUser._id);
    const userResponse = {
      id: newUser._id,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      email: newUser.email,
      role: 'customer',
      phone: newUser.phone,
      gender: null,
      isEmailVerified: true,
      isGoogleUser: true
    };
    res.cookie('refreshToken', refreshTokenDoc.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_IN * 1000
    });
    res.status(201).json({ success: true, message: 'Google Sign-In successful', user: userResponse, accessToken });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ success: false, message: 'Server error during Google Sign-In' });
  }
};

module.exports = {
  loginUser,
  getUserRole,
  refreshAccessToken,
  logoutUser,
  checkEmailAvailability,
  googleSignIn,
  validateToken,
  changePassword
}; 