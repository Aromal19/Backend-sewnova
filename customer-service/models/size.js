const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Size name is required'],
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'unisex'],
    required: true
  },
  measurementType: {
    type: String,
    enum: ['casual', 'formal', 'traditional', 'western', 'custom'],
    default: 'custom'
  },
  // Upper Body
  chest: { type: Number, min: 0, required: true },
  waist: { type: Number, min: 0, required: true },
  hip: { type: Number, min: 0, required: true },
  shoulder: { type: Number, min: 0, required: true },
  sleeveLength: { type: Number, min: 0, required: true },
  sleeveWidth: { type: Number, min: 0, required: true },
  neck: { type: Number, min: 0, required: true },
  // Lower Body
  inseam: { type: Number, min: 0, required: true },
  thigh: { type: Number, min: 0, required: true },
  knee: { type: Number, min: 0, required: true },
  ankle: { type: Number, min: 0, required: true },
  // General
  height: { type: Number, min: 0, required: true },
  weight: { type: Number, min: 0, required: true },
  notes: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

sizeSchema.index({ gender: 1, name: 1 }, { unique: true });

sizeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Size', sizeSchema);

