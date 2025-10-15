const Design = require('../models/design');

// Get all designs
const getAllDesigns = async (req, res) => {
  try {
    const { category, search, isActive = true } = req.query;
    
    // Build query object
    const query = { isActive };
    
    // Add category filter if provided
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const designs = await Design.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({
      success: true,
      count: designs.length,
      data: designs
    });
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching designs',
      error: error.message
    });
  }
};

// Get design by ID
const getDesignById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid design ID format'
      });
    }
    
    const design = await Design.findById(id)
      .lean();
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: design
    });
  } catch (error) {
    console.error('Error fetching design:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching design',
      error: error.message
    });
  }
};

// Create new design
const createDesign = async (req, res) => {
  try {
    const designData = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'category', 'image'];
    const missingFields = requiredFields.filter(field => !designData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const design = new Design(designData);
    await design.save();
    
    res.status(201).json({
      success: true,
      message: 'Design created successfully',
      data: design
    });
  } catch (error) {
    console.error('Error creating design:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating design',
      error: error.message
    });
  }
};

// Update design
const updateDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid design ID format'
      });
    }
    
    const design = await Design.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Design updated successfully',
      data: design
    });
  } catch (error) {
    console.error('Error updating design:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating design',
      error: error.message
    });
  }
};

// Delete design (soft delete)
const deleteDesign = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid design ID format'
      });
    }
    
    const design = await Design.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Design deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting design:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting design',
      error: error.message
    });
  }
};

// Get design categories
const getCategories = async (req, res) => {
  try {
    const categories = await Design.distinct('category', { isActive: true });
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

module.exports = {
  getAllDesigns,
  getDesignById,
  createDesign,
  updateDesign,
  deleteDesign,
  getCategories
};
