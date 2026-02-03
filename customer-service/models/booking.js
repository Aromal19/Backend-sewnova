const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  bookingType: {
    type: String,
    enum: ['tailor', 'fabric', 'complete'],
    required: true
  },

  // Tailor booking details
  tailorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tailor',
    required: function () {
      return ['tailor', 'complete'].includes(this.bookingType);
    }
  },

  // Seller ID (for fabric bookings) - Optional, populated from Fabric if available
  sellerId: {
    type: mongoose.Schema.Types.ObjectId
  },
  tailorDetails: {
    name: String,
    location: {
      city: String,
      district: String,
      state: String,
      pincode: String
    },
    rating: Number,
    specialization: [String]
  },

  // Fabric booking details
  fabricId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fabric',
    required: function () {
      return ['fabric', 'complete'].includes(this.bookingType);
    }
  },
  fabricDetails: {
    name: String,
    type: String,
    color: String,
    pattern: String,
    price: Number,
    sellerId: mongoose.Schema.Types.ObjectId
  },

  // Measurement details
  measurementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Measurement',
    required: false
  },
  // Dynamic measurement snapshot captured during booking (stored on confirmation)
  measurementSnapshot: {
    type: Object,
    default: null
  },

  // Order details
  orderDetails: {
    garmentType: {
      type: String,
      enum: ['shirt', 'pants', 'dress', 'suit', 'kurta', 'saree', 'lehenga', 'other'],
      required: true
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1
    },
    designDescription: {
      type: String,
      trim: true,
      default: ''
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    deliveryDate: {
      type: Date,
      required: true
    }
  },

  // Pricing
  pricing: {
    fabricCost: {
      type: Number,
      min: 0,
      default: 0
    },
    tailoringCost: {
      type: Number,
      min: 0,
      default: 0
    },
    additionalCharges: {
      type: Number,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      min: 0,
      required: true
    },
    advanceAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    remainingAmount: {
      type: Number,
      min: 0,
      required: true
    }
  },

  // Delivery details
  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },

  // Payment info
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['razorpay', 'cod', 'other'],
      default: 'razorpay'
    },
    gatewayOrderId: String,
    gatewayPaymentId: String,
    gatewaySignature: String,
    paidAmount: { type: Number, default: 0 },
    paidAt: Date
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'ready_for_fitting', 'completed', 'cancelled', 'delivered'],
    default: 'pending'
  },

  // Timeline
  timeline: {
    bookingDate: {
      type: Date,
      default: Date.now
    },
    confirmationDate: Date,
    startDate: Date,
    fittingDate: Date,
    completionDate: Date,
    deliveryDate: Date
  },

  // Communication
  messages: [{
    sender: {
      type: String,
      enum: ['customer', 'tailor', 'seller', 'system'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],

  // Reviews and ratings
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    reviewDate: Date
  },

  // Cancellation details
  cancellation: {
    reason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'tailor', 'seller', 'system']
    },
    cancellationDate: Date,
    refundAmount: Number
  },

  // Metadata
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

// Indexes
bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ tailorId: 1, status: 1 });
bookingSchema.index({ sellerId: 1, status: 1 });
bookingSchema.index({ fabricId: 1 });
bookingSchema.index({ status: 1, deliveryDate: 1 });
bookingSchema.index({ createdAt: -1 });

// Update timestamp on save
bookingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Calculate remaining amount
bookingSchema.pre('save', function (next) {
  if (this.pricing.totalAmount && this.pricing.advanceAmount) {
    this.pricing.remainingAmount = this.pricing.totalAmount - this.pricing.advanceAmount;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema); 