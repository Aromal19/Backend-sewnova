const { 
  globalSizing, 
  getSizingById: getSizingByIdFromData, 
  getSizingByCategory, 
  getSizingByGender,
  getAllCategories,
  getAllGenders,
  validateSizingIds,
  getSizingForDesignCategory
} = require('../data/globalSizing');

// Get all global sizing options
const getAllSizing = async (req, res) => {
  try {
    const { category, gender, designCategory } = req.query;
    
    let sizing = globalSizing;
    
    // Filter by category if provided
    if (category && category !== 'all') {
      sizing = getSizingByCategory(category);
    }
    
    // Filter by gender if provided
    if (gender && gender !== 'all') {
      sizing = sizing.filter(s => s.gender === gender || s.gender === 'unisex');
    }
    
    // Filter by design category if provided
    if (designCategory && designCategory !== 'all') {
      sizing = getSizingForDesignCategory(designCategory);
    }
    
    res.status(200).json({
      success: true,
      count: sizing.length,
      data: sizing
    });
  } catch (error) {
    console.error('Error fetching sizing options:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sizing options',
      error: error.message
    });
  }
};

// Get sizing by ID
const getSizingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sizing = getSizingByIdFromData(id);
    
    if (!sizing) {
      return res.status(404).json({
        success: false,
        message: 'Sizing option not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: sizing
    });
  } catch (error) {
    console.error('Error fetching sizing option:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sizing option',
      error: error.message
    });
  }
};

// Get sizing categories
const getSizingCategories = async (req, res) => {
  try {
    const categories = getAllCategories();
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching sizing categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sizing categories',
      error: error.message
    });
  }
};

// Get sizing genders
const getSizingGenders = async (req, res) => {
  try {
    const genders = getAllGenders();
    
    res.status(200).json({
      success: true,
      data: genders
    });
  } catch (error) {
    console.error('Error fetching sizing genders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sizing genders',
      error: error.message
    });
  }
};

// Get sizing options for a specific design category
const getSizingForDesign = async (req, res) => {
  try {
    const { designCategory } = req.params;
    
    const sizing = getSizingForDesignCategory(designCategory);
    
    res.status(200).json({
      success: true,
      count: sizing.length,
      data: sizing
    });
  } catch (error) {
    console.error('Error fetching sizing for design category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sizing for design category',
      error: error.message
    });
  }
};

// Validate sizing IDs
const validateSizing = async (req, res) => {
  try {
    const { sizingIds } = req.body;
    
    if (!Array.isArray(sizingIds)) {
      return res.status(400).json({
        success: false,
        message: 'sizingIds must be an array'
      });
    }
    
    const validation = validateSizingIds(sizingIds);
    
    res.status(200).json({
      success: true,
      isValid: validation.isValid,
      invalidIds: validation.invalidIds,
      data: validation.isValid ? 'All sizing IDs are valid' : 'Some sizing IDs are invalid'
    });
  } catch (error) {
    console.error('Error validating sizing:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating sizing',
      error: error.message
    });
  }
};

module.exports = {
  getAllSizing,
  getSizingById,
  getSizingCategories,
  getSizingGenders,
  getSizingForDesign,
  validateSizing
};
