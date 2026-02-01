const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    // Reference to booking
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true
    },
    bookingType: {
        type: String,
        enum: ['tailor', 'fabric', 'complete'],
        required: true
    },

    // Vendor dispatch tracking (for fabric/complete bookings)
    vendorDispatch: {
        status: {
            type: String,
            enum: ['pending', 'dispatched', 'in_transit', 'delivered_to_tailor'],
            default: 'pending'
        },
        dispatchedAt: {
            type: Date,
            default: null
        },
        deliveredToTailorAt: {
            type: Date,
            default: null
        },
        trackingNumber: {
            type: String,
            trim: true,
            default: ''
        },
        courierName: {
            type: String,
            trim: true,
            default: ''
        },
        estimatedDelivery: {
            type: Date,
            default: null
        },
        notes: {
            type: String,
            trim: true,
            default: ''
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            default: null
        }
    },

    // Tailor delivery tracking
    tailorDelivery: {
        status: {
            type: String,
            enum: ['pending', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'failed'],
            default: 'pending'
        },
        readyAt: {
            type: Date,
            default: null
        },
        dispatchedAt: {
            type: Date,
            default: null
        },
        deliveredAt: {
            type: Date,
            default: null
        },
        deliveryMethod: {
            type: String,
            enum: ['courier', 'pickup', 'hand_delivery'],
            default: 'courier'
        },
        trackingNumber: {
            type: String,
            trim: true,
            default: ''
        },
        courierName: {
            type: String,
            trim: true,
            default: ''
        },
        notes: {
            type: String,
            trim: true,
            default: ''
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tailor',
            default: null
        },
        failureReason: {
            type: String,
            trim: true,
            default: ''
        }
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

    // Overall status
    overallStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'delivered', 'failed'],
        default: 'pending',
        index: true
    },

    // Timeline - status history
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        phase: {
            type: String,
            enum: ['vendor_dispatch', 'tailor_delivery', 'overall'],
            required: true
        },
        updatedBy: {
            role: {
                type: String,
                enum: ['vendor', 'tailor', 'admin', 'system'],
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
deliverySchema.index({ bookingId: 1 });
deliverySchema.index({ customerId: 1, overallStatus: 1 });
deliverySchema.index({ 'vendorDispatch.status': 1 });
deliverySchema.index({ 'tailorDelivery.status': 1 });
deliverySchema.index({ createdAt: -1 });

// Update timestamp on save
deliverySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Method to add status history entry
deliverySchema.methods.addStatusHistory = function (status, phase, updatedBy, notes = '') {
    this.statusHistory.push({
        status,
        phase,
        updatedBy,
        timestamp: new Date(),
        notes
    });
};

// Method to update overall status based on vendor and tailor status
deliverySchema.methods.updateOverallStatus = function () {
    const vendorStatus = this.vendorDispatch.status;
    const tailorStatus = this.tailorDelivery.status;

    // If tailor delivery is delivered, overall is delivered
    if (tailorStatus === 'delivered') {
        this.overallStatus = 'delivered';
    }
    // If tailor delivery failed, overall is failed
    else if (tailorStatus === 'failed') {
        this.overallStatus = 'failed';
    }
    // If any phase is in progress, overall is in progress
    else if (
        vendorStatus !== 'pending' ||
        tailorStatus !== 'pending'
    ) {
        this.overallStatus = 'in_progress';
    }
    // Otherwise, it's pending
    else {
        this.overallStatus = 'pending';
    }
};

module.exports = mongoose.model('Delivery', deliverySchema);
