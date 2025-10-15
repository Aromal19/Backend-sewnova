const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Design name is required'],
    trim: true,
    maxlength: [100, 'Design name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Design category is required'],
    enum: ['formal', 'casual', 'traditional', 'western', 'ethnic', 'party', 'wedding', 'office'],
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Design image is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // tailorIds: [{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Tailor'
  // }],
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  estimatedTime: {
    type: Number, // in hours
    min: [0, 'Estimated time cannot be negative']
  },
  tags: [{
    type: String,
    trim: true
  }],
  sizeCriteria: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
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

// Update the updatedAt field before saving
designSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
designSchema.index({ category: 1, isActive: 1 });
designSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Design', designSchema);
