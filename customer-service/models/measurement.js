const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  measurementName: {
    type: String,
    required: [true, 'Measurement name is required'],
    trim: true
  },
  measurementType: {
    type: String,
    enum: ['casual', 'formal', 'traditional', 'western', 'custom'],
    default: 'custom'
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'unisex'],
    required: true
  },
  ageGroup: {
    type: String,
    enum: ['kids', 'teen', 'adult', 'senior'],
    default: 'adult'
  },
  
  // Upper Body Measurements
  chest: {
    type: Number,
    min: 0,
    required: true
  },
  waist: {
    type: Number,
    min: 0,
    required: true
  },
  hip: {
    type: Number,
    min: 0,
    required: true
  },
  shoulder: {
    type: Number,
    min: 0,
    required: true
  },
  sleeveLength: {
    type: Number,
    min: 0,
    required: true
  },
  sleeveWidth: {
    type: Number,
    min: 0,
    required: true
  },
  neck: {
    type: Number,
    min: 0,
    required: true
  },
  
  // Lower Body Measurements
  inseam: {
    type: Number,
    min: 0,
    required: true
  },
  thigh: {
    type: Number,
    min: 0,
    required: true
  },
  knee: {
    type: Number,
    min: 0,
    required: true
  },
  ankle: {
    type: Number,
    min: 0,
    required: true
  },
  
  // Additional Measurements
  height: {
    type: Number,
    min: 0,
    required: true
  },
  weight: {
    type: Number,
    min: 0,
    required: true
  },
  
  // Special Measurements
  customMeasurements: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Notes and preferences
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  preferences: {
    fit: {
      type: String,
      enum: ['loose', 'regular', 'fitted', 'tight'],
      default: 'regular'
    },
    style: {
      type: String,
      enum: ['modern', 'traditional', 'classic', 'trendy'],
      default: 'classic'
    }
  },
  
  // Status and metadata
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
measurementSchema.index({ customerId: 1, isActive: 1 });
measurementSchema.index({ customerId: 1, isDefault: 1 });
measurementSchema.index({ measurementType: 1, gender: 1, ageGroup: 1 });

// Update timestamp on save
measurementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure only one default measurement per customer
measurementSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { customerId: this.customerId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('Measurement', measurementSchema); 