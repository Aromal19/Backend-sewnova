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
  countryCode: {
    type: String,
    default: '+91' // Default to India
  },
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationTokenExpires: {
    type: Date,
    default: null
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
    default: [],
    validate: {
      validator: function(arr) {
        return arr.every(item => typeof item === 'string');
      },
      message: 'Specialization must be an array of strings'
    }
  },
  
  // Shop Address Fields (Structured)
  addressLine: {
    type: String,
    trim: true,
    maxlength: [200, 'Address line cannot exceed 200 characters']
  },
  landmark: {
    type: String,
    trim: true,
    maxlength: [100, 'Landmark cannot exceed 100 characters']
  },
  locality: {
    type: String,
    trim: true,
    maxlength: [100, 'Locality cannot exceed 100 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  district: {
    type: String,
    trim: true,
    maxlength: [50, 'District name cannot exceed 50 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [50, 'State name cannot exceed 50 characters']
  },
  pincode: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{6}$/.test(v); // Either empty or 6 digits
      },
      message: 'Pincode must be exactly 6 digits'
    }
  },
  country: {
    type: String,
    trim: true,
    default: 'India',
    maxlength: [50, 'Country name cannot exceed 50 characters']
  },
  
  // Additional Profile Fields
  workingHours: {
    type: String,
    trim: true,
    maxlength: [100, 'Working hours cannot exceed 100 characters']
  },
  about: {
    type: String,
    trim: true,
    maxlength: [1000, 'About section cannot exceed 1000 characters']
  },
  portfolio: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr) {
        return arr.length <= 10; // Max 10 portfolio images
      },
      message: 'Portfolio cannot have more than 10 images'
    }
  },
  
  // Images
  profileImage: {
    type: String,
    default: '',
    trim: true
  },
  shopImage: {
    type: String,
    default: '',
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Aadhaar verification details
  aadhaar: {
    number: { type: String, default: '' },
    name: { type: String, default: '' },
    dob: { type: String, default: '' },
    gender: { type: String, default: '' },
    documentPublicId: { type: String, default: '' },
    documentUrl: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
tailorSchema.index({ email: 1 });
tailorSchema.index({ phone: 1 });
tailorSchema.index({ shopName: 1 });
tailorSchema.index({ city: 1, state: 1 }); // For location-based searches
tailorSchema.index({ pincode: 1 }); // For pincode-based searches
tailorSchema.index({ specialization: 1 }); // For specialization filtering
tailorSchema.index({ isVerified: 1 }); // For filtering verified tailors
tailorSchema.index({ rating: -1 }); // For sorting by rating

// Virtual field for full formatted address
tailorSchema.virtual('fullAddress').get(function() {
  const parts = [];
  
  if (this.addressLine) parts.push(this.addressLine);
  if (this.landmark) parts.push(`Landmark: ${this.landmark}`);
  if (this.locality) parts.push(this.locality);
  
  const cityStateParts = [this.city, this.district, this.state, this.pincode]
    .filter(Boolean);
  
  if (cityStateParts.length > 0) {
    parts.push(cityStateParts.join(', '));
  }
  
  if (this.country && this.country !== 'India') {
    parts.push(this.country);
  }
  
  return parts.length > 0 ? parts.join('\n') : 'No address provided';
});

// Virtual field for display name
tailorSchema.virtual('displayName').get(function() {
  return `${this.firstname} ${this.lastname}`;
});

// Update the updatedAt timestamp before saving
tailorSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

tailorSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Ensure virtuals are included when converting to JSON
tailorSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

tailorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tailor', tailorSchema); 