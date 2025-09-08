const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  addressType: {
    type: String,
    enum: ['home', 'office', 'other'],
    default: 'home'
  },
  addressLine: {
    type: String,
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  },
  locality: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'India'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Simple index for customer addresses
addressSchema.index({ customerId: 1 });

// Ensure only one default address per customer
addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { customerId: this.customerId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('Address', addressSchema); 