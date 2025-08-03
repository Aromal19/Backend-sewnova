const mongoose = require('mongoose');

const tailorSchema = new mongoose.Schema({
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
    default: 'tailor',
    enum: ['tailor'],
    immutable: true
  },

  // Tailor-specific fields
  shopName: {
    type: String,
    required: [true, 'Shop name is required']
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  specialization: {
    type: [String],
    default: []
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
  totalOrders: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tailor', tailorSchema); 