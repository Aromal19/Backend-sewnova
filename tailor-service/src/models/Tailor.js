const mongoose = require('mongoose');

const tailorSchema = new mongoose.Schema({
  firstname: { type: String, required: [true, 'First name is required'] },
  lastname: { type: String, required: [true, 'Last name is required'] },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true },
  phone: { type: String, required: [true, 'Phone number is required'], unique: true },
  countryCode: { type: String, default: '+91' },
  password: { type: String, required: [true, 'Password is required'] },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationTokenExpires: { type: Date, default: null },
  role: { type: String, default: 'tailor', enum: ['tailor'], immutable: true },

  shopName: { type: String, required: [true, 'Shop name is required'] },
  experience: { type: Number, default: 0, min: 0 },
  specialization: { type: [String], default: [] },
  address: { type: String },
  pincode: { type: String },
  district: { type: String },
  state: { type: String },
  country: { type: String, default: 'India' },
  profileImage: { type: String, default: '' },
  shopImage: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalOrders: { type: Number, default: 0 },

  aadhaar: {
    number: { type: String, default: '' },
    name: { type: String, default: '' },
    dob: { type: String, default: '' },
    gender: { type: String, default: '' },
    documentPublicId: { type: String, default: '' },
    documentUrl: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Tailor || mongoose.model('Tailor', tailorSchema);

