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
        chest: { type: Number, required: true },
        waist: { type: Number, required: true },
        length: { type: Number, required: true },
        sleeve: { type: Number, required: true },
        shoulder: { type: Number }, // Optional but good for detailed tailoring
        hip: { type: Number }      // Optional
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
