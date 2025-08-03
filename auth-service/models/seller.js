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
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    default: 'seller',
    enum: ['seller'],
    immutable: true
  },

  // Seller-specific fields
  businessName: {
    type: String,
    required: [true, 'Business name is required']
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    enum: ['fabric', 'accessories', 'tools', 'machinery', 'other']
  },
  gstNumber: {
    type: String,
    required: [true, 'GST number is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required']
  },
  district: {
    type: String,
    required: [true, 'District is required']
  },
  state: {
    type: String,
    required: [true, 'State is required']
  },
  country: {
    type: String,
    default: 'India'
  },
  profileImage: {
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