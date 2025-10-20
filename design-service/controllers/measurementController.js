const { 
  globalMeasurements, 
  getMeasurementById: getMeasurementByIdFromData, 
  getMeasurementsByCategory, 
  getAllCategories,
  validateMeasurementIds 
} = require('../data/globalMeasurements');

// Get all global measurements
const getAllMeasurements = async (req, res) => {
  try {
    const { category } = req.query;
    
    let measurements = globalMeasurements;
    
    // Filter by category if provided
    if (category && category !== 'all') {
      measurements = getMeasurementsByCategory(category);
    }
    
    res.status(200).json({
      success: true,
      count: measurements.length,
      data: measurements
    });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching measurements',
      error: error.message
    });
  }
};

// Get measurement by ID
const getMeasurementById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const measurement = getMeasurementByIdFromData(id);
    
    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: measurement
    });
  } catch (error) {
    console.error('Error fetching measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching measurement',
      error: error.message
    });
  }
};

// Get measurement categories
const getMeasurementCategories = async (req, res) => {
  try {
    const categories = getAllCategories();
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching measurement categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching measurement categories',
      error: error.message
    });
  }
};

// Validate measurement IDs
const validateMeasurements = async (req, res) => {
  try {
    const { measurementIds } = req.body;
    
    if (!Array.isArray(measurementIds)) {
      return res.status(400).json({
        success: false,
        message: 'measurementIds must be an array'
      });
    }
    
    const validation = validateMeasurementIds(measurementIds);
    
    res.status(200).json({
      success: true,
      isValid: validation.isValid,
      invalidIds: validation.invalidIds,
      data: validation.isValid ? 'All measurement IDs are valid' : 'Some measurement IDs are invalid'
    });
  } catch (error) {
    console.error('Error validating measurements:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating measurements',
      error: error.message
    });
  }
};

module.exports = {
  getAllMeasurements,
  getMeasurementById,
  getMeasurementCategories,
  validateMeasurements
};
