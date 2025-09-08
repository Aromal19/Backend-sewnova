const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  documentType: { type: String, enum: ['aadhaar'], required: true },
  documentPublicId: { type: String, required: true },
  documentUrl: { type: String, required: true },
  ocrText: { type: String, default: '' },
  parsed: {
    aadhaarNumber: { type: String, default: '' },
    name: { type: String, default: '' },
    dob: { type: String, default: '' },
    gender: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Verification', verificationSchema);

