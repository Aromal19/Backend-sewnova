const Tailor = require('../models/tailor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateEmailForRegistration } = require('../utils/emailValidation');

// Register a new tailor
const register = async (req, res) => {
  try {
    const { 
      firstname, lastname, email, phone, password, 
      shopName, experience, specialization, address, 
      pincode, district, state, country 
    } = req.body;

    // Validate email across all user types
    const emailValidation = await validateEmailForRegistration(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        success: false,
        message: emailValidation.message 
      });
    }

    // Check if tailor already exists by phone
    const existingTailor = await Tailor.findOne({ phone });

    if (existingTailor) {
      return res.status(400).json({ 
        success: false,
        message: 'Tailor with this phone number already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new tailor
    const tailor = new Tailor({
      firstname,
      lastname,
      email,
      phone,
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

    await tailor.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: tailor._id,
        role: 'tailor',
        email: tailor.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const tailorResponse = tailor.toObject();
    delete tailorResponse.password;

    res.status(201).json({
      success: true,
      message: 'Tailor registered successfully',
      user: tailorResponse,
      token
    });
  } catch (error) {
    console.error('Tailor registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tailor profile by user ID from JWT
const getProfile = async (req, res) => {
  try {
    const tailor = await Tailor.findById(req.user.userId).select('-password');
    
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor profile not found' });
    }

    res.json({ 
      message: 'Profile retrieved successfully',
      tailor 
    });
  } catch (error) {
    console.error('Get tailor profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update tailor profile
const updateProfile = async (req, res) => {
  try {
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

    const tailor = await Tailor.findByIdAndUpdate(
      req.user.userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!tailor) {
      return res.status(404).json({ message: 'Tailor profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      tailor
    });
  } catch (error) {
    console.error('Update tailor profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const tailor = await Tailor.findById(req.user.userId);
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, tailor.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    tailor.password = hashedPassword;
    await tailor.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete tailor account
const deleteAccount = async (req, res) => {
  try {
    const tailor = await Tailor.findByIdAndDelete(req.user.userId);
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
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