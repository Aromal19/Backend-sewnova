const Design = require('../models/Design');
const cloudinary = require('cloudinary').v2;
const { getMeasurementById } = require('../data/globalMeasurements');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get all designs
const getAllDesigns = async (req, res) => {
  try {
    console.log('🔍 getAllDesigns called in new controller');
    const { page = 1, limit = 10, category, search, isActive = true } = req.query;
    
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
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    // Populate measurement metadata for each design
    const designsWithMetadata = designs.map(design => {
      const measurementDetails = (design.requiredMeasurements || []).map(measurementId =>
        getMeasurementById(measurementId)
      ).filter(Boolean);

      return {
        ...design,
        measurementDetails
      };
    });
    
    const total = await Design.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: total,
      data: designsWithMetadata,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDesigns: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
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
    
    const design = await Design.findById(id).lean();
    
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
    console.log('🔍 createDesign called in new controller');
    const designData = req.body;
    const uploadedFiles = req.files || [];

    // Validate required fields
    const requiredFields = ['name', 'category'];
    const missingFields = requiredFields.filter(field => !designData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Parse requiredMeasurements if it's a string
    if (designData.requiredMeasurements && typeof designData.requiredMeasurements === 'string') {
      try {
        designData.requiredMeasurements = JSON.parse(designData.requiredMeasurements);
      } catch (e) {
        designData.requiredMeasurements = [];
      }
    }

    // Parse tags if it's a string
    if (designData.tags && typeof designData.tags === 'string') {
      designData.tags = designData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Handle image uploads to Cloudinary
    let uploadedImages = [];
    if (uploadedFiles.length > 0) {
      console.log(`Processing ${uploadedFiles.length} images for Cloudinary upload...`);
      
      for (const file of uploadedFiles) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'sewnova/designs',
              resource_type: 'auto',
              quality: 'auto',
              fetch_format: 'auto'
            }
          );
          
          uploadedImages.push({
            url: result.secure_url,
            publicId: result.public_id
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Failed to upload images to Cloudinary',
            error: uploadError.message
          });
        }
      }
      
      console.log(`Successfully uploaded ${uploadedImages.length} images to Cloudinary`);
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
    const uploadedFiles = req.files || [];

    // Parse requiredMeasurements if it's a string
    if (updateData.requiredMeasurements && typeof updateData.requiredMeasurements === 'string') {
      try {
        updateData.requiredMeasurements = JSON.parse(updateData.requiredMeasurements);
      } catch (e) {
        updateData.requiredMeasurements = [];
      }
    }

    // Parse tags if it's a string
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Handle new image uploads
    if (uploadedFiles.length > 0) {
      console.log(`Processing ${uploadedFiles.length} new images for Cloudinary upload...`);
      
      const newImages = [];
      for (const file of uploadedFiles) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'sewnova/designs',
              resource_type: 'auto',
              quality: 'auto',
              fetch_format: 'auto'
            }
          );
          
          newImages.push({
            url: result.secure_url,
            publicId: result.public_id
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          return res.status(400).json({
            success: false,
            message: 'Failed to upload new images to Cloudinary',
            error: uploadError.message
          });
        }
      }
      
      // Get existing design to delete old images
      const existingDesign = await Design.findById(id);
      if (existingDesign && existingDesign.images) {
        // Delete old images from Cloudinary
        for (const image of existingDesign.images) {
          try {
            await cloudinary.uploader.destroy(image.publicId);
          } catch (deleteError) {
            console.error('Image deletion error:', deleteError);
          }
        }
      }
      
      updateData.images = newImages;
      console.log(`Successfully uploaded ${newImages.length} new images to Cloudinary`);
    }

    const design = await Design.findByIdAndUpdate(
      id,
      updateData,
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

    const designWithMetadata = {
      ...design.toObject(),
      measurementDetails
    };

    res.json({
      success: true,
      message: 'Design updated successfully',
      data: designWithMetadata
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

// Delete design
const deleteDesign = async (req, res) => {
  try {
    const { id } = req.params;

    const design = await Design.findById(id);
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }

    // Delete images from Cloudinary
    if (design.images && design.images.length > 0) {
      for (const image of design.images) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (deleteError) {
          console.error('Image deletion error:', deleteError);
        }
      }
    }

    await Design.findByIdAndDelete(id);

    res.json({
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

// Get design stats
const getDesignStats = async (req, res) => {
  try {
    const totalDesigns = await Design.countDocuments();
    const activeDesigns = await Design.countDocuments({ isActive: true });
    
    // Count by category
    const categories = await Design.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const categoryStats = {};
    categories.forEach(cat => {
      categoryStats[cat._id] = cat.count;
    });
    
    // Calculate average price
    const priceStats = await Design.aggregate([
      { $match: { price: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgPrice: { $avg: '$price' } } }
    ]);
    
    const averagePrice = priceStats.length > 0 ? Math.round(priceStats[0].avgPrice) : 0;

    res.json({
      success: true,
      data: {
        totalDesigns,
        activeDesigns,
        categories: categoryStats,
        averagePrice,
        totalViews: 0 // This would need to be tracked separately
      }
    });
  } catch (error) {
    console.error('Error getting design stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting design stats',
      error: error.message
    });
  }
};

// Get design categories
const getCategories = async (req, res) => {
  try {
    const categories = ['Men', 'Women', 'Unisex'];
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting categories',
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
  getDesignStats,
  getCategories
};
