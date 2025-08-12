const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
    required: function() {
      return !this.isGoogleUser; // Phone is only required for non-Google users
    },
    unique: true,
    sparse: true // Allows multiple null values
  },
  countryCode: {
    type: String,
    default: '+91' // Default to India
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  isGoogleUser: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: function() {
      return this.isGoogleUser; // Google users are automatically verified
    }
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationTokenExpires: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    default: 'customer',
    enum: ['customer'],
    immutable: true  // Prevents role change from frontend or update
  },

  // Additional profile fields (optional, filled later)
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
  profileImage: {
    type: String,
    default: ''
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Customer', customerSchema); 