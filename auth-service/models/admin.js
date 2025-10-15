const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: [true, 'First name is required']
  },
  lastname: {
    type: String,
    required: [true, 'Last name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  isEmailVerified: {
    type: Boolean,
    default: true // Admins are pre-verified
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin', 'super_admin'],
    immutable: true
  },
  
  // Admin-specific fields
  permissions: [{
    type: String,
    enum: ['users', 'designs', 'analytics', 'orders', 'settings', 'platform']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  profileImage: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  pincode: {
    type: String,
    default: ''
  },
  district: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: 'India'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Admin', adminSchema);
