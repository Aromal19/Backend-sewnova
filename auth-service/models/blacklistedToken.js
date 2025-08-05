const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true  // This automatically creates an index
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: false  // Disable timestamps to save space
});

// Index for faster queries and automatic cleanup
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BlacklistedToken', blacklistedTokenSchema); 