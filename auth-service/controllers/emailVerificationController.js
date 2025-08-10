const Customer = require('../models/customer');
const Seller = require('../models/seller');
const Tailor = require('../models/tailor');
const { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail } = require('../utils/emailService');
const { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_EXPIRES_IN } = require('../utils/tokenService');
const jwt = require('jsonwebtoken');

// Helper function to get user model based on type
const getUserModel = (userType) => {
  switch (userType) {
    case 'customer':
      return Customer;
    case 'seller':
      return Seller;
    case 'tailor':
      return Tailor;
    default:
      return null;
  }
};

// Send verification email
const sendVerification = async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Email and user type are required'
      });
    }

    const UserModel = getUserModel(userType);
    if (!UserModel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if user is a Google user (shouldn't need verification)
    if (user.isGoogleUser) {
      return res.status(400).json({
        success: false,
        message: 'Google users do not need email verification'
      });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with verification token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = tokenExpiry;
    await user.save();

    // Send verification email
    const userName = `${user.firstname} ${user.lastname}`;
    const emailResult = await sendVerificationEmail(email, verificationToken, userType, userName);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Send verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending verification email'
    });
  }
};

// Verify email with token
const verifyEmail = async (req, res) => {
  try {
    // Support both GET (query params) and POST (body) for backward compatibility
    const token = req.body.token || req.params.token || req.query.token;
    const type = req.body.type || req.params.type || req.query.type;
    
    if (!token || !type) {
      return res.status(400).json({ success: false, message: 'Verification token and user type are required' });
    }
    const UserModel = getUserModel(type);
    if (!UserModel) {
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    }
    // Find user with the verification token
    const user = await UserModel.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;
    await user.save();
    const userName = `${user.firstname} ${user.lastname}`;
    await sendWelcomeEmail(user.email, type, userName);
    // Issue tokens
    const accessToken = generateAccessToken({ userId: user._id, role: type, email: user.email });
    const refreshTokenDoc = await generateRefreshToken(user._id);
    // Prepare user response
    const userResponse = {
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: type,
      phone: user.phone,
      isEmailVerified: true
    };
    let redirectTo;
    switch (type) {
      case 'customer': redirectTo = '/customer/landing'; break;
      case 'seller': redirectTo = '/dashboard/seller'; break;
      case 'tailor': redirectTo = '/dashboard/tailor'; break;
      default: redirectTo = '/';
    }
    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshTokenDoc.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_IN * 1000
    });
    res.json({
      success: true,
      message: 'Email verified successfully!',
      user: userResponse,
      accessToken,
      redirectTo
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Email and user type are required'
      });
    }

    const UserModel = getUserModel(userType);
    if (!UserModel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if user is a Google user
    if (user.isGoogleUser) {
      return res.status(400).json({
        success: false,
        message: 'Google users do not need email verification'
      });
    }

    // Check if a verification email was sent recently (prevent spam)
    if (user.emailVerificationTokenExpires && 
        user.emailVerificationTokenExpires > new Date(Date.now() - 5 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 5 minutes before requesting another verification email'
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = tokenExpiry;
    await user.save();

    // Send verification email
    const userName = `${user.firstname} ${user.lastname}`;
    const emailResult = await sendVerificationEmail(email, verificationToken, userType, userName);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Verification email resent successfully. Please check your inbox.',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Resend verification email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resending verification email'
    });
  }
};

// Check verification status
const checkVerificationStatus = async (req, res) => {
  try {
    const { email, userType } = req.query;

    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Email and user type are required'
      });
    }

    const UserModel = getUserModel(userType);
    if (!UserModel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      isEmailVerified: user.isEmailVerified,
      isGoogleUser: user.isGoogleUser || false
    });

  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking verification status'
    });
  }
};

module.exports = {
  sendVerification,
  verifyEmail,
  resendVerification,
  checkVerificationStatus
};