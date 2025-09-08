const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Reference to auth-service customer
  authCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true
  },
  
  // Customer preferences and extended data
  preferences: {
    preferredTailorTypes: [String], // e.g., ['traditional', 'modern', 'luxury']
    preferredFabricTypes: [String], // e.g., ['cotton', 'silk', 'linen']
    preferredStyles: [String], // e.g., ['casual', 'formal', 'ethnic']
    preferredColors: [String],
    sizePreferences: {
      fit: { type: String, enum: ['loose', 'regular', 'tight'], default: 'regular' },
      style: { type: String, enum: ['traditional', 'modern', 'fusion'], default: 'modern' }
    },
    communicationPreferences: {
      preferredLanguage: { type: String, default: 'English' },
      preferredContactMethod: { type: String, enum: ['phone', 'email', 'whatsapp'], default: 'phone' }
    }
  },
  
  // Customer statistics and history
  stats: {
    totalBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  
  // Customer status and verification
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  accountType: { type: String, enum: ['basic', 'premium', 'vip'], default: 'basic' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient querying
customerSchema.index({ authCustomerId: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ accountType: 1 });
customerSchema.index({ 'stats.lastActive': -1 });

// Pre-save middleware to update updatedAt
customerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for full customer data (to be populated from auth-service)
customerSchema.virtual('fullProfile', {
  ref: 'Customer',
  localField: 'authCustomerId',
  foreignField: '_id',
  justOne: true
});

// Method to update stats
customerSchema.methods.updateStats = function(bookingData) {
  this.stats.totalBookings += 1;
  if (bookingData.status === 'completed') {
    this.stats.completedBookings += 1;
  }
  if (bookingData.pricing?.totalAmount) {
    this.stats.totalSpent += bookingData.pricing.totalAmount;
  }
  this.stats.lastActive = new Date();
  return this.save();
};

// Method to update rating
customerSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.stats.averageRating * (this.stats.completedBookings - 1);
  this.stats.averageRating = (currentTotal + newRating) / this.stats.completedBookings;
  return this.save();
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer; 