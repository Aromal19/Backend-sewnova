const Seller = require('../models/seller');
const bcrypt = require('bcryptjs');
const { validateEmailForRegistration } = require('../utils/emailValidation');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailService');
const { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_EXPIRES_IN } = require('../utils/tokenService');

// Register a new seller
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, businessName, businessType, website } = req.body;
    const emailValidation = await validateEmailForRegistration(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }
    const existingSeller = await Seller.findOne({ phone });
    if (existingSeller) {
      return res.status(400).json({ success: false, message: 'Seller with this phone number already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const seller = new Seller({
      firstname: firstName,
      lastname: lastName,
      email,
      phone,
      password: hashedPassword,
      businessName,
      businessType,
      website
    });
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    seller.emailVerificationToken = verificationToken;
    seller.emailVerificationTokenExpires = tokenExpiry;
    await seller.save();
    const userName = `${seller.firstname} ${seller.lastname}`;
    const emailResult = await sendVerificationEmail(seller.email, verificationToken, 'seller', userName);
    if (emailResult.success) {
      res.status(201).json({
        success: true,
        message: 'Seller registered successfully. Please check your email to verify your account.',
        requiresEmailVerification: true,
        email: seller.email,
        userType: 'seller'
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'Seller registered successfully, but verification email could not be sent. Please try resending verification email.',
        requiresEmailVerification: true,
        email: seller.email,
        userType: 'seller',
        emailError: true
      });
    }
  } catch (error) {
    console.error('Seller registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seller profile by user ID from JWT
const getProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.userId).select('-password');
    
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found' });
    }

    res.json({ 
      success: true,
      message: 'Profile retrieved successfully',
      seller 
    });
  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update seller profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'businessName', 'businessType',
      'businessAddress', 'gstNumber', 'panNumber', 'bankAccount', 'ifscCode'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        // Map frontend field names to database field names
        if (key === 'firstName') filteredUpdates.firstname = updates[key];
        else if (key === 'lastName') filteredUpdates.lastname = updates[key];
        else if (key === 'businessAddress') filteredUpdates.address = updates[key];
        else filteredUpdates[key] = updates[key];
      }
    });

    const seller = await Seller.findByIdAndUpdate(
      req.user.userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      seller
    });
  } catch (error) {
    console.error('Update seller profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const seller = await Seller.findById(req.user.userId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, seller.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    seller.password = hashedPassword;
    await seller.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete seller account
const deleteAccount = async (req, res) => {
  try {
    const seller = await Seller.findByIdAndDelete(req.user.userId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all sellers (admin function)
const getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().select('-password');
    res.json({ sellers });
  } catch (error) {
    console.error('Get all sellers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seller by ID (admin function)
const getSellerById = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id).select('-password');
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    res.json({ seller });
  } catch (error) {
    console.error('Get seller by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seller by email
const getSellerByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const seller = await Seller.findOne({ email }).select('-password');
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    res.json({ seller });
  } catch (error) {
    console.error('Get seller by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update seller by email
const updateSellerByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;
    const allowedUpdates = [
      'firstname', 'lastname', 'phone', 'businessName', 'businessType',
      'gstNumber', 'address', 'pincode', 'district', 'state',
      'country', 'profileImage'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const seller = await Seller.findOneAndUpdate(
      { email },
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json({
      message: 'Seller updated successfully',
      seller
    });
  } catch (error) {
    console.error('Update seller by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete seller by email
const deleteSellerByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const seller = await Seller.findOneAndDelete({ email });
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    res.json({ message: 'Seller deleted successfully' });
  } catch (error) {
    console.error('Delete seller by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAllSellers,
  getSellerById,
  getSellerByEmail,
  updateSellerByEmail,
  deleteSellerByEmail
}; 