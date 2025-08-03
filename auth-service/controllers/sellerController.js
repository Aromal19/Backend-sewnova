const Seller = require('../models/seller');
const bcrypt = require('bcryptjs');

// Register a new seller
const register = async (req, res) => {
  try {
    const { 
      firstname, lastname, email, phone, password, 
      businessName, businessType, gstNumber, address, 
      pincode, district, state, country 
    } = req.body;

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingSeller) {
      return res.status(400).json({ 
        message: 'Seller with this email or phone already exists' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new seller
    const seller = new Seller({
      firstname,
      lastname,
      email,
      phone,
      password: hashedPassword,
      businessName,
      businessType,
      gstNumber,
      address,
      pincode,
      district,
      state,
      country
    });

    await seller.save();

    // Remove password from response
    const sellerResponse = seller.toObject();
    delete sellerResponse.password;

    res.status(201).json({
      message: 'Seller registered successfully',
      seller: sellerResponse
    });
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
      return res.status(404).json({ message: 'Seller profile not found' });
    }

    res.json({ 
      message: 'Profile retrieved successfully',
      seller 
    });
  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update seller profile
const updateProfile = async (req, res) => {
  try {
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

    const seller = await Seller.findByIdAndUpdate(
      req.user.userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ message: 'Seller profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      seller
    });
  } catch (error) {
    console.error('Update seller profile error:', error);
    res.status(500).json({ message: 'Server error' });
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