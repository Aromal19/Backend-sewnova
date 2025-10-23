const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/admin-profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'admin-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Admin login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        },
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get admin profile
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.admin
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update admin profile
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const adminId = req.admin._id;

    const updateData = {};
    if (name) updateData.name = name;
    
    // Handle profile picture upload
    if (req.file) {
      // Delete old profile picture if exists
      const admin = await Admin.findById(adminId);
      if (admin.profilePicture) {
        const oldImagePath = path.join(__dirname, '..', admin.profilePicture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Set new profile picture path
      updateData.profilePicture = `/uploads/admin-profiles/${req.file.filename}`;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedAdmin
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.admin._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    const admin = await Admin.findById(adminId);
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const axios = require('axios');
    const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3002';
    const DESIGN_SERVICE_URL = process.env.DESIGN_SERVICE_URL || 'http://localhost:3006';
    
    let bookingStats = null;
    let designStats = null;
    
    try {
      // Get booking statistics from customer service
      const bookingResponse = await axios.get(`${CUSTOMER_SERVICE_URL}/api/simple-bookings/statistics`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (bookingResponse.data.success) {
        bookingStats = bookingResponse.data.data;
        console.log('✅ Dashboard: Fetched booking stats:', bookingStats);
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching booking statistics:', error.message);
    }
    
    try {
      // Get design statistics from design service
      const designResponse = await axios.get(`${DESIGN_SERVICE_URL}/api/designs`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (designResponse.data.success) {
        designStats = {
          totalDesigns: designResponse.data.count
        };
        console.log('✅ Dashboard: Fetched design stats:', designStats);
      }
    } catch (error) {
      console.error('❌ Dashboard: Error fetching design statistics:', error.message);
    }
    
    // Build stats with real data
    const stats = {
      totalUsers: 0, // This would need to be fetched from auth service
      totalOrders: bookingStats?.totalBookings || 0,
      totalRevenue: bookingStats?.totalRevenue || 0,
      activeTailors: 0, // This would need to be fetched from tailor service
      activeSellers: 0, // This would need to be fetched from vendor service
      pendingOrders: bookingStats?.bookingsByStatus?.pending || 0,
      completedOrders: bookingStats?.bookingsByStatus?.completed || 0,
      totalDesigns: designStats?.totalDesigns || 0,
      recentBookings: bookingStats?.recentBookings || 0,
      orderStatus: bookingStats?.bookingsByStatus || {}
    };

    console.log('📊 Dashboard stats prepared:', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  login,
  getProfile,
  updateProfile,
  changePassword,
  getDashboardStats,
  upload
};
