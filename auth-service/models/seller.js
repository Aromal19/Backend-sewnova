const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
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
    default: '+91' // Default to India
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
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
    default: 'seller',
    enum: ['seller'],
    immutable: true
  },

  // Seller-specific fields - Required for registration
  businessName: {
    type: String,
    required: [true, 'Business name is required']
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
  },

  // Optional fields for later verification
  gstNumber: {
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
  profileImage: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalSales: {
    type: Number,
    default: 0
  },
  productsCount: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Seller', sellerSchema); 