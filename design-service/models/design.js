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
    enum: ['Men', 'Women', 'Unisex'],
    trim: true
  },
  garmentType: {
    type: String,
    required: [true, 'Garment type is required'],
    trim: true
  },
  images: [{
    type: String,
    required: [true, 'Design images are required'],
    trim: true
  }],
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  requiredMeasurements: [{
    type: String,
    trim: true,
    validate: {
      validator: function(measurementId) {
        // This will be validated in the controller using globalMeasurements
        return measurementId && measurementId.length > 0;
      },
      message: 'Measurement ID cannot be empty'
    }
  }],
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
    trim: true,
    enum: ['bridal', 'ethnic', 'casual', 'formal', 'party', 'traditional', 'western', 'fusion', 'wedding', 'festive', 'office', 'sports', 'beach', 'cocktail', 'evening']
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
