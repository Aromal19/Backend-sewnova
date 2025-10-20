const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true, unique: true },
    paymentId: { type: String },
    signature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Object }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);


