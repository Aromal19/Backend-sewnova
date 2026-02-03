const mongoose = require('mongoose');

const garmentTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Garment type name is required'],
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Garment type code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        index: true // Faster lookups
    },
    defaultFabricWidth: {
        type: Number,
        required: true,
        default: 44,
        min: [20, 'Fabric width must be realistic']
    },
    primaryMeasurement: {
        type: String,
        required: true,
        default: 'chest',
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent updates by non-admin through standard APIs (logic handled in controller, but schema can define immutability for reference data if strictly enforced, but usually flexible for admin)
// We use a pre-save hook to update 'updatedAt'
garmentTypeSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('GarmentType', garmentTypeSchema);
