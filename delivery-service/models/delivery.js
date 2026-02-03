const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    // Reference to order (changed from bookingId)
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true, // One delivery per order
        index: true
    },

    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true
    },

    // Delivery type: FABRIC (vendor→user) or GARMENT (tailor→user)
    deliveryType: {
        type: String,
        enum: ['FABRIC', 'GARMENT'],
        required: true,
        index: true
    },

    // Simplified status: CREATED → DISPATCHED → DELIVERED
    status: {
        type: String,
        enum: ['CREATED', 'DISPATCHED', 'DELIVERED'],
        default: 'CREATED',
        required: true,
        index: true
    },

    // Dispatch details
    courierName: {
        type: String,
        trim: true,
        default: ''
    },

    trackingId: {
        type: String,
        trim: true,
        default: ''
    },

    // Immutability lock - once dispatch details are submitted, they cannot be changed
    isLocked: {
        type: Boolean,
        default: false
    },

    // Timestamps
    dispatchedAt: {
        type: Date,
        default: null
    },

    deliveredAt: {
        type: Date,
        default: null
    },

    // Delivery address snapshot
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: String,
        phone: String,
        landmark: String
    },

    // Who submitted dispatch details (vendor or tailor)
    dispatchedBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        role: {
            type: String,
            enum: ['seller', 'tailor', 'admin']
        }
    },

    // Who marked as delivered
    deliveredBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        role: {
            type: String,
            enum: ['seller', 'tailor', 'admin']
        }
    },

    // Admin override logging
    adminOverrides: [{
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        action: {
            type: String,
            required: true,
            trim: true
        },
        oldValue: {
            type: mongoose.Schema.Types.Mixed
        },
        newValue: {
            type: mongoose.Schema.Types.Mixed
        }
    }],

    // Status history - audit trail
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        updatedBy: {
            role: {
                type: String,
                enum: ['seller', 'tailor', 'admin', 'system'],
                required: true
            },
            id: {
                type: mongoose.Schema.Types.ObjectId,
                required: true
            }
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        notes: {
            type: String,
            trim: true,
            default: ''
        }
    }],

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

// Indexes for efficient queries
deliverySchema.index({ orderId: 1 });
deliverySchema.index({ customerId: 1, status: 1 });
deliverySchema.index({ deliveryType: 1, status: 1 });
deliverySchema.index({ createdAt: -1 });
deliverySchema.index({ status: 1, deliveryType: 1 });

// Update timestamp on save
deliverySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Method to add status history entry
deliverySchema.methods.addStatusHistory = function (status, updatedBy, notes = '') {
    this.statusHistory.push({
        status,
        updatedBy,
        timestamp: new Date(),
        notes
    });
};

// Method to validate state transition
deliverySchema.methods.canTransitionTo = function (newStatus) {
    const validTransitions = {
        'CREATED': ['DISPATCHED'],
        'DISPATCHED': ['DELIVERED'],
        'DELIVERED': [] // Terminal state
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
};

// Method to log admin override
deliverySchema.methods.logAdminOverride = function (adminId, reason, action, oldValue, newValue) {
    this.adminOverrides.push({
        adminId,
        timestamp: new Date(),
        reason,
        action,
        oldValue,
        newValue
    });
};

// Static method to determine delivery type from order
deliverySchema.statics.determineDeliveryType = function (orderItems) {
    // If order contains tailoring service → GARMENT
    // If order contains only fabric → FABRIC
    const hasTailoringService = orderItems.some(item =>
        item.serviceType === 'tailor' || item.serviceType === 'complete'
    );

    return hasTailoringService ? 'GARMENT' : 'FABRIC';
};

module.exports = mongoose.model('Delivery', deliverySchema);
