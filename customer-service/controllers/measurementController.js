const Measurement = require('../models/measurement');

// Get customer measurements
const getCustomerMeasurements = async (req, res) => {
  try {
    const customerId = req.user.id || req.user._id;
    const measurements = await Measurement.find({ 
      customerId, 
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: measurements
    });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch measurements'
    });
  }
};

// Get a specific measurement
const getMeasurementById = async (req, res) => {
  try {
    const customerId = req.user.id || req.user._id;
    const measurement = await Measurement.findOne({
      _id: req.params.id,
      customerId,
      isActive: true
    });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    res.json({
      success: true,
      data: measurement
    });
  } catch (error) {
    console.error('Error fetching measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch measurement'
    });
  }
};

// Create a new measurement
const createMeasurement = async (req, res) => {
  try {
    const customerId = req.user.id || req.user._id;
    const body = req.body || {};

    // Normalize incoming fields to model shape
    const measurementName = body.measurementName || body.name || `Measurement ${new Date().toISOString()}`;
    const measurementType = body.measurementType || 'custom';
    const gender = body.gender || 'unisex';

    if (!measurementType || !measurementName) {
      return res.status(400).json({
        success: false,
        message: 'Measurement type and measurementName are required'
      });
    }

    const toNumber = (val, fallback = 0) => {
      const num = typeof val === 'string' && val.trim() === '' ? NaN : Number(val);
      return Number.isFinite(num) ? num : fallback;
    };

    const measurementData = {
      customerId,
      measurementName,
      measurementType,
      gender,
      ageGroup: body.ageGroup || 'adult',
      chest: toNumber(body.chest),
      waist: toNumber(body.waist),
      hip: toNumber(body.hip ?? body.hips),
      shoulder: toNumber(body.shoulder),
      sleeveLength: toNumber(body.sleeveLength),
      sleeveWidth: toNumber(body.sleeveWidth),
      neck: toNumber(body.neck),
      inseam: toNumber(body.inseam),
      thigh: toNumber(body.thigh),
      knee: toNumber(body.knee),
      ankle: toNumber(body.ankle),
      height: toNumber(body.height),
      weight: toNumber(body.weight),
      customMeasurements: body.customMeasurements || {},
      notes: body.notes || '',
      preferences: body.preferences || { fit: 'regular', style: 'classic' },
      isDefault: body.isDefault || false
    };

    const measurement = new Measurement(measurementData);
    await measurement.save();

    res.status(201).json({
      success: true,
      message: 'Measurement created successfully',
      data: measurement
    });
  } catch (error) {
    console.error('Error creating measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create measurement'
    });
  }
};

// Update a measurement
const updateMeasurement = async (req, res) => {
  try {
    const customerId = req.user.id || req.user._id;
    const measurement = await Measurement.findOne({
      _id: req.params.id,
      customerId,
      isActive: true
    });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    const body = req.body || {};
    const toNumber = (val, fallback = 0) => {
      const num = typeof val === 'string' && val.trim() === '' ? NaN : Number(val);
      return Number.isFinite(num) ? num : fallback;
    };
    if (body.measurementName !== undefined || body.name !== undefined) {
      measurement.measurementName = body.measurementName ?? body.name;
    }
    if (body.measurementType !== undefined) measurement.measurementType = body.measurementType;
    if (body.gender !== undefined) measurement.gender = body.gender;
    if (body.ageGroup !== undefined) measurement.ageGroup = body.ageGroup;
    if (body.chest !== undefined) measurement.chest = toNumber(body.chest, measurement.chest);
    if (body.waist !== undefined) measurement.waist = toNumber(body.waist, measurement.waist);
    if (body.hip !== undefined || body.hips !== undefined) measurement.hip = toNumber(body.hip ?? body.hips, measurement.hip);
    if (body.shoulder !== undefined) measurement.shoulder = toNumber(body.shoulder, measurement.shoulder);
    if (body.sleeveLength !== undefined) measurement.sleeveLength = toNumber(body.sleeveLength, measurement.sleeveLength);
    if (body.sleeveWidth !== undefined) measurement.sleeveWidth = toNumber(body.sleeveWidth, measurement.sleeveWidth);
    if (body.neck !== undefined) measurement.neck = toNumber(body.neck, measurement.neck);
    if (body.inseam !== undefined) measurement.inseam = toNumber(body.inseam, measurement.inseam);
    if (body.thigh !== undefined) measurement.thigh = toNumber(body.thigh, measurement.thigh);
    if (body.knee !== undefined) measurement.knee = toNumber(body.knee, measurement.knee);
    if (body.ankle !== undefined) measurement.ankle = toNumber(body.ankle, measurement.ankle);
    if (body.height !== undefined) measurement.height = toNumber(body.height, measurement.height);
    if (body.weight !== undefined) measurement.weight = toNumber(body.weight, measurement.weight);
    if (body.customMeasurements !== undefined) measurement.customMeasurements = body.customMeasurements;
    if (body.notes !== undefined) measurement.notes = body.notes;
    if (body.preferences !== undefined) measurement.preferences = body.preferences;
    if (body.isDefault !== undefined) measurement.isDefault = body.isDefault;

    await measurement.save();

    res.json({
      success: true,
      message: 'Measurement updated successfully',
      data: measurement
    });
  } catch (error) {
    console.error('Error updating measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update measurement'
    });
  }
};

// Delete a measurement (hard delete)
const deleteMeasurement = async (req, res) => {
  try {
    const customerId = req.user.id || req.user._id;
    console.log('🗑️ Delete measurement request', { id: req.params.id, customerId });
    const result = await Measurement.deleteOne({ _id: req.params.id, customerId });
    console.log('🗑️ Delete result', result);
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Measurement not found or not owned by user' });
    }
    res.json({ success: true, message: 'Measurement deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete measurement'
    });
  }
};

// Set default measurement
const setDefaultMeasurement = async (req, res) => {
  try {
    const customerId = req.user.id || req.user._id;
    const measurement = await Measurement.findOne({
      _id: req.params.id,
      customerId,
      isActive: true
    });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    // Set as default (this will automatically unset others due to pre-save hook)
    measurement.isDefault = true;
    await measurement.save();

    res.json({
      success: true,
      message: 'Default measurement set successfully',
      data: measurement
    });
  } catch (error) {
    console.error('Error setting default measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default measurement'
    });
  }
};

// Get measurements by type
const getMeasurementsByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    const measurements = await Measurement.find({
      customerId: req.user._id,
      measurementType: type,
      isActive: true
    }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: measurements
    });
  } catch (error) {
    console.error('Error fetching measurements by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch measurements by type'
    });
  }
};

module.exports = {
  getCustomerMeasurements,
  getMeasurementById,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  setDefaultMeasurement,
  getMeasurementsByType
}; 