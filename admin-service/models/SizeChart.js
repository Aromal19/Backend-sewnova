const mongoose = require('mongoose');

const sizeChartSchema = new mongoose.Schema({
    garmentType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarmentType',
        required: [true, 'Garment Type reference is required']
    },
    sizeLabel: {
        type: String,
        required: [true, 'Size label is required'],
        enum: ['S', 'M', 'L', 'XL', 'XXL'], // Standard sizes
        trim: true
    },
    measurements: {
        unit: {
            type: String,
            default: 'inch',
            enum: ['inch', 'cm']
        },
        chest: { type: Number },
        bust: { type: Number },
        waist: { type: Number },
        hip: { type: Number },
        length: { type: Number },
        sleeve: { type: Number },
        shoulder: { type: Number },
        inseam: { type: Number }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    }
});

// Compound index to ensure unique size per garment type
sizeChartSchema.index({ garmentType: 1, sizeLabel: 1 }, { unique: true });

module.exports = mongoose.model('SizeChart', sizeChartSchema);
