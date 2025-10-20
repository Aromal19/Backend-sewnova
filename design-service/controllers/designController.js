const Design = require('../models/design');
const { 
  getMeasurementById, 
  validateMeasurementIds 
} = require('../data/globalMeasurements');
const { uploadMultipleImages } = require('../utils/cloudinary');

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
    
    // Populate measurement and sizing metadata for each design
    const designsWithMetadata = designs.map(design => {
      const measurementDetails = (design.requiredMeasurements || []).map(measurementId =>
        getMeasurementById(measurementId)
      ).filter(Boolean);

      return {
        ...design,
        measurementDetails
      };
    });
    
    res.status(200).json({
      success: true,
      count: designsWithMetadata.length,
      data: designsWithMetadata
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
    
    // Populate measurement metadata for the design
    const measurementDetails = (design.requiredMeasurements || []).map(measurementId => 
      getMeasurementById(measurementId)
    ).filter(Boolean);
    
    const designWithMetadata = {
      ...design,
      measurementDetails
    };
    
    res.status(200).json({
      success: true,
      data: designWithMetadata
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
    const requiredFields = ['name', 'category'];
    const missingFields = requiredFields.filter(field => !designData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Validate requiredMeasurements if provided
    if (designData.requiredMeasurements && Array.isArray(designData.requiredMeasurements)) {
      const validation = validateMeasurementIds(designData.requiredMeasurements);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid measurement IDs provided',
          invalidIds: validation.invalidIds
        });
      }
    }
    
    // Handle image uploads to Cloudinary
    let uploadedImages = [];
    if (designData.images && Array.isArray(designData.images) && designData.images.length > 0) {
      console.log('Processing images for Cloudinary upload...');
      
      // Check Cloudinary configuration
      console.log('Cloudinary Environment Check:', {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
      });

      // For now, skip Cloudinary upload if credentials are not configured
      // and just use the provided image URLs or create placeholder URLs
      if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your-cloud-name' || !process.env.CLOUDINARY_API_KEY) {
        console.log('⚠️  Cloudinary not configured, using provided image URLs');
        uploadedImages = designData.images.map((img, index) => {
          // If it's already a URL, use it directly
          if (typeof img === 'string' && img.startsWith('http')) {
            return img;
          }
          // Otherwise create a placeholder
          return `https://via.placeholder.com/400x300?text=Design+${index + 1}`;
        });
      } else {
        console.log('✅ Cloudinary configured, uploading images...');
        const uploadResult = await uploadMultipleImages(designData.images, 'sewnova/designs');
        
        if (!uploadResult.success) {
          console.error('❌ Cloudinary upload failed:', uploadResult.errors);
          return res.status(400).json({
            success: false,
            message: 'Failed to upload images to Cloudinary',
            errors: uploadResult.errors
          });
        }
        
        uploadedImages = uploadResult.images;
        console.log(`✅ Successfully uploaded ${uploadResult.totalUploaded} images to Cloudinary`);
      }
    }
    
    // Create design with uploaded image URLs
    const designToSave = {
      ...designData,
      images: uploadedImages
    };
    
    const design = new Design(designToSave);
    await design.save();
    
    // Populate measurement metadata for the response
    const measurementDetails = (design.requiredMeasurements || []).map(measurementId => 
      getMeasurementById(measurementId)
    ).filter(Boolean);
    
    const designWithMetadata = {
      ...design.toObject(),
      measurementDetails
    };
    
    res.status(201).json({
      success: true,
      message: 'Design created successfully',
      data: designWithMetadata
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
    
    // Validate requiredMeasurements if provided
    if (updateData.requiredMeasurements && Array.isArray(updateData.requiredMeasurements)) {
      const validation = validateMeasurementIds(updateData.requiredMeasurements);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid measurement IDs provided',
          invalidIds: validation.invalidIds
        });
      }
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
    
    // Populate measurement metadata for the response
    const measurementDetails = (design.requiredMeasurements || []).map(measurementId => 
      getMeasurementById(measurementId)
    ).filter(Boolean);
    
    const designWithMeasurements = {
      ...design.toObject(),
      measurementDetails
    };
    
    res.status(200).json({
      success: true,
      message: 'Design updated successfully',
      data: designWithMeasurements
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
