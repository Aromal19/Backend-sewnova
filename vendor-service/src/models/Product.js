const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['cotton', 'silk', 'linen', 'wool', 'polyester', 'denim', 'chiffon', 'georgette', 'other']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerUnit: {
    type: String,
    required: true,
    enum: ['per_meter', 'per_yard', 'per_piece']
  },
  color: {
    type: String,
    required: true
  },
  pattern: {
    type: String,
    enum: ['solid', 'striped', 'polka_dot', 'floral', 'geometric', 'abstract', 'other']
  },
  weight: {
    type: String,
    required: true
  },
  width: {
    type: String,
    required: true
  },
  careInstructions: {
    type: String,
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
productSchema.index({ sellerId: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);