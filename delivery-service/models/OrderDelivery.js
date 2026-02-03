const mongoose = require('mongoose');

const OrderDeliverySchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    deliveryType: {
        type: String,
        enum: ['FABRIC', 'GARMENT'],
        required: true
    },
    status: {
        type: String,
        enum: ['CREATED', 'DISPATCHED', 'DELIVERED'],
        default: 'CREATED'
    },
    // Dispatch Details
    courierName: {
        type: String,
        default: null
    },
    trackingId: {
        type: String,
        default: null
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    // Timestamps
    dispatchedAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
    // History and Audit
    statusHistory: [{
        status: {
            type: String,
            enum: ['CREATED', 'DISPATCHED', 'DELIVERED']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Assuming User model exists, but keeping generic if not direct ref
        },
        reason: String
    }],
    adminOverrides: [{
        adminId: {
            type: mongoose.Schema.Types.ObjectId
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        action: String,
        reason: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    }]
}, {
    timestamps: true // Adds createdAt, updatedAt
});

// Ensure one delivery record per type per order
OrderDeliverySchema.index({ orderId: 1, deliveryType: 1 }, { unique: true });

module.exports = mongoose.model('OrderDelivery', OrderDeliverySchema);
