const Tailor = require('../models/tailor');
const bcrypt = require('bcryptjs');
const { validateEmailForRegistration } = require('../utils/emailValidation');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailService');
const { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_EXPIRES_IN } = require('../utils/tokenService');

// Register a new tailor
const register = async (req, res) => {
  try {
    const { firstname, lastname, email, phone, countryCode, password, shopName, experience, specialization, address, pincode, district, state, country } = req.body;
    const emailValidation = await validateEmailForRegistration(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }
    const existingTailor = await Tailor.findOne({ phone });
    if (existingTailor) {
      return res.status(400).json({ success: false, message: 'Tailor with this phone number already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const tailor = new Tailor({
      firstname,
      lastname,
      email,
      phone,
      countryCode: countryCode || '+91', // Default to India if not provided
      password: hashedPassword,
      shopName,
      experience,
      specialization,
      address,
      pincode,
      district,
      state,
      country
    });
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tailor.emailVerificationToken = verificationToken;
    tailor.emailVerificationTokenExpires = tokenExpiry;
    await tailor.save();
    const userName = `${tailor.firstname} ${tailor.lastname}`;
    const emailResult = await sendVerificationEmail(tailor.email, verificationToken, 'tailor', userName);
    if (emailResult.success) {
      res.status(201).json({
        success: true,
        message: 'Tailor registered successfully. Please check your email to verify your account.',
        requiresEmailVerification: true,
        email: tailor.email,
        userType: 'tailor'
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'Tailor registered successfully, but verification email could not be sent. Please try resending verification email.',
        requiresEmailVerification: true,
        email: tailor.email,
        userType: 'tailor',
        emailError: true
      });
    }
  } catch (error) {
    console.error('Tailor registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tailor profile
const getProfile = async (req, res) => {
  try {
    const tailor = await Tailor.findById(req.user._id).select('-password');
    
    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor profile not found' });
    }

    res.json({ 
      success: true,
      message: 'Profile retrieved successfully',
      tailor 
    });
  } catch (error) {
    console.error('Get tailor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update tailor profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'countryCode', 'shopName', 'shopAddress',
      'experience', 'speciality', 'workingHours', 'about', 'skills'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        // Map frontend field names to database field names
        if (key === 'firstName') filteredUpdates.firstname = updates[key];
        else if (key === 'lastName') filteredUpdates.lastname = updates[key];
        else if (key === 'shopAddress') filteredUpdates.address = updates[key];
        else if (key === 'speciality') filteredUpdates.specialization = updates[key];
        else filteredUpdates[key] = updates[key];
      }
    });

    const tailor = await Tailor.findByIdAndUpdate(
      req.user._id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor profile not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      tailor
    });
  } catch (error) {
    console.error('Update tailor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const tailor = await Tailor.findById(req.user._id); // Use _id directly from user object
    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, tailor.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    tailor.password = hashedPassword;
    await tailor.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete tailor account
const deleteAccount = async (req, res) => {
  try {
    const tailor = await Tailor.findByIdAndDelete(req.user._id);
    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor not found' });
    }
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all tailors (admin function)
const getAllTailors = async (req, res) => {
  try {
    const tailors = await Tailor.find().select('-password');
    res.json({ tailors });
  } catch (error) {
    console.error('Get all tailors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tailor by ID (admin function)
const getTailorById = async (req, res) => {
  try {
    const tailor = await Tailor.findById(req.params.id).select('-password');
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    res.json({ tailor });
  } catch (error) {
    console.error('Get tailor by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tailor by email
const getTailorByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const tailor = await Tailor.findOne({ email }).select('-password');
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    res.json({ tailor });
  } catch (error) {
    console.error('Get tailor by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update tailor by email
const updateTailorByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;
    const allowedUpdates = [
      'firstname', 'lastname', 'phone', 'shopName', 'experience',
      'specialization', 'address', 'pincode', 'district', 'state',
      'country', 'profileImage'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const tailor = await Tailor.findOneAndUpdate(
      { email },
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }

    res.json({
      message: 'Tailor updated successfully',
      tailor
    });
  } catch (error) {
    console.error('Update tailor by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete tailor by email
const deleteTailorByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const tailor = await Tailor.findOneAndDelete({ email });
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    
    res.json({ message: 'Tailor deleted successfully' });
  } catch (error) {
    console.error('Delete tailor by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAllTailors,
  getTailorById,
  getTailorByEmail,
  updateTailorByEmail,
  deleteTailorByEmail
}; 