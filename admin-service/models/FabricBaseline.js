const mongoose = require('mongoose');

const fabricBaselineSchema = new mongoose.Schema({
    garmentType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GarmentType',
        required: [true, 'Garment Type reference is required']
    },
    sizeLabel: {
        type: String,
        required: [true, 'Size label is required'],
        enum: ['S', 'M', 'L', 'XL', 'XXL'],
        trim: true
    },
    baseFabricMeters: {
        type: Number,
        required: [true, 'Base fabric requirement is required'],
        min: 0.5
    },
    assumedFabricWidth: {
        type: Number,
        default: 44, // Matches GarmentType default, but can be overridden if baseline differs
        required: true
    },
    notes: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    }
});

// Compound index to ensure unique baseline per garment type and size
fabricBaselineSchema.index({ garmentType: 1, sizeLabel: 1 }, { unique: true });

module.exports = mongoose.model('FabricBaseline', fabricBaselineSchema);
