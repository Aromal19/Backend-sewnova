const Size = require('../models/size');
const Measurement = require('../models/measurement');

// Create size
const createSize = async (req, res) => {
  try {
    const size = new Size(req.body);
    await size.save();
    return res.status(201).json({ success: true, message: 'Size created', data: size });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// List sizes (optional filters: gender, measurementType)
const listSizes = async (req, res) => {
  try {
    const { gender, measurementType, q } = req.query;
    const filter = { isActive: true };
    if (gender) filter.gender = gender;
    if (measurementType) filter.measurementType = measurementType;
    if (q) filter.name = { $regex: q, $options: 'i' };
    const sizes = await Size.find(filter).sort({ name: 1 });
    return res.json({ success: true, data: sizes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sizes' });
  }
};

// Get size by id
const getSize = async (req, res) => {
  try {
    const size = await Size.findById(req.params.id);
    if (!size || !size.isActive) return res.status(404).json({ success: false, message: 'Size not found' });
    return res.json({ success: true, data: size });
  } catch (error) {
    return res.status(404).json({ success: false, message: 'Size not found' });
  }
};

// Update size
const updateSize = async (req, res) => {
  try {
    const updated = await Size.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Size not found' });
    return res.json({ success: true, message: 'Size updated', data: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Delete size (soft)
const deleteSize = async (req, res) => {
  try {
    const updated = await Size.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Size not found' });
    return res.json({ success: true, message: 'Size deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete size' });
  }
};

// Apply size to user measurements: creates a measurement document with the size defaults
const applySizeToUser = async (req, res) => {
  try {
    const customerId = req.user.id || req.user._id;
    const { id } = req.params; // size id
    const { measurementName = 'Size Template', measurementType, isDefault = false } = req.body || {};

    const size = await Size.findById(id);
    if (!size || !size.isActive) return res.status(404).json({ success: false, message: 'Size not found' });

    // Optional gender validation against client-provided gender, else rely on size.gender
    if (req.body?.gender && req.body.gender !== size.gender && size.gender !== 'unisex') {
      return res.status(400).json({ success: false, message: 'Gender mismatch for size' });
    }

    const measurementDoc = new Measurement({
      customerId,
      measurementName,
      measurementType: measurementType || size.measurementType || 'custom',
      gender: size.gender === 'unisex' ? (req.body?.gender || 'unisex') : size.gender,
      ageGroup: 'adult',
      chest: size.chest,
      waist: size.waist,
      hip: size.hip,
      shoulder: size.shoulder,
      sleeveLength: size.sleeveLength,
      sleeveWidth: size.sleeveWidth,
      neck: size.neck,
      inseam: size.inseam,
      thigh: size.thigh,
      knee: size.knee,
      ankle: size.ankle,
      height: size.height,
      weight: size.weight,
      customMeasurements: {},
      notes: size.notes || '',
      preferences: { fit: 'regular', style: 'classic' },
      isDefault: !!isDefault,
    });

    await measurementDoc.save();
    return res.status(201).json({ success: true, message: 'Measurement created from size', data: measurementDoc });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to apply size to user' });
  }
};

module.exports = {
  createSize,
  listSizes,
  getSize,
  updateSize,
  deleteSize,
  applySizeToUser,
};

