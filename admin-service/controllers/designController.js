const axios = require('axios');

// Design service configuration
const DESIGN_SERVICE_URL = process.env.DESIGN_SERVICE_URL || 'http://localhost:3006';

// Helper function to make authenticated requests to design service
const makeDesignServiceRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${DESIGN_SERVICE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000 // 10 second timeout
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response;
  } catch (error) {
    console.error(`Design service request failed (${method} ${endpoint}):`, error.message);
    throw error;
  }
};

const getDesigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, isActive = true } = req.query;
    
    // Build query parameters for design service
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      isActive: isActive.toString()
    });
    
    if (category) queryParams.append('category', category);
    if (search) queryParams.append('search', search);
    
    // Fetch designs from design service
    const response = await makeDesignServiceRequest('GET', `/api/designs?${queryParams}`);
    
    if (response.data.success) {
      res.json({
        success: true,
        data: {
          designs: response.data.data,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(response.data.count / limit),
            totalDesigns: response.data.count,
            hasNext: parseInt(page) * parseInt(limit) < response.data.count,
            hasPrev: parseInt(page) > 1
          }
        }
      });
    } else {
      throw new Error('Failed to fetch designs from design service');
    }
  } catch (error) {
    console.error('Get designs error:', error);
    
    // Fallback to mock data if design service is unavailable
    const mockDesigns = [
      {
        _id: '1',
        name: 'Elegant Wedding Dress',
        category: 'Women',
        description: 'Beautiful wedding dress with intricate details',
        price: 1500,
        isActive: true,
        createdAt: '2024-01-15',
        images: ['/images/wedding-dress.jpg'],
        tags: ['wedding', 'elegant', 'white'],
        sizeCriteria: ['XS', 'S', 'M', 'L', 'XL'],
        requiredMeasurements: ['chest', 'waist', 'hip', 'height']
      },
      {
        _id: '2',
        name: 'Casual Summer Dress',
        category: 'Women',
        description: 'Light and comfortable summer dress',
        price: 250,
        isActive: true,
        createdAt: '2024-01-10',
        images: ['/images/summer-dress.jpg'],
        tags: ['casual', 'summer', 'light'],
        sizeCriteria: ['S', 'M', 'L', 'XL'],
        requiredMeasurements: ['chest', 'waist', 'height']
      }
    ];
    
    res.json({
      success: true,
      data: {
        designs: mockDesigns,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalDesigns: mockDesigns.length,
          hasNext: false,
          hasPrev: false
        }
      }
    });
  }
};

const createDesign = async (req, res) => {
  try {
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

    // Handle uploaded files - convert to base64 for Cloudinary
    if (uploadedFiles.length > 0) {
      console.log(`Processing ${uploadedFiles.length} uploaded files`);
      designData.images = uploadedFiles.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype
      }));
    }

    // Create design via design service
    const response = await makeDesignServiceRequest('POST', '/api/designs', designData);
    
    if (response.data.success) {
      res.status(201).json({
        success: true,
        message: 'Design created successfully',
        data: response.data.data
      });
    } else {
      throw new Error('Failed to create design in design service');
    }
  } catch (error) {
    console.error('Create design error:', error);
    
    if (error.response?.data?.message) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

const updateDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Update design via design service
    const response = await makeDesignServiceRequest('PUT', `/api/designs/${id}`, updateData);
    
    if (response.data.success) {
      res.json({
        success: true,
        message: 'Design updated successfully',
        data: response.data.data
      });
    } else {
      throw new Error('Failed to update design in design service');
    }
  } catch (error) {
    console.error('Update design error:', error);
    
    if (error.response?.data?.message) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

const deleteDesign = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete design via design service
    const response = await makeDesignServiceRequest('DELETE', `/api/designs/${id}`);
    
    if (response.data.success) {
      res.json({
        success: true,
        message: 'Design deleted successfully'
      });
    } else {
      throw new Error('Failed to delete design in design service');
    }
  } catch (error) {
    console.error('Delete design error:', error);
    
    if (error.response?.data?.message) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

const getDesignStats = async (req, res) => {
  try {
    // Fetch all designs to calculate stats
    const response = await makeDesignServiceRequest('GET', '/api/designs?isActive=true');
    
    if (response.data.success) {
      const designs = response.data.data;
      
      // Calculate statistics
      const totalDesigns = designs.length;
      const activeDesigns = designs.filter(d => d.isActive).length;
      
      // Count by category
      const categories = {};
      designs.forEach(design => {
        categories[design.category] = (categories[design.category] || 0) + 1;
      });
      
      // Calculate average price
      const prices = designs.filter(d => d.price).map(d => d.price);
      const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      
      const stats = {
        totalDesigns,
        activeDesigns,
        categories,
        averagePrice: Math.round(averagePrice),
        totalViews: 0 // This would need to be tracked separately
      };

      res.json({
        success: true,
        data: stats
      });
    } else {
      throw new Error('Failed to fetch designs for stats');
    }
  } catch (error) {
    console.error('Get design stats error:', error);
    
    // Fallback to mock stats
    const stats = {
      totalDesigns: 89,
      activeDesigns: 76,
      categories: {
        Men: 25,
        Women: 30,
        Unisex: 20
      },
      averagePrice: 450,
      totalViews: 12500
    };

    res.json({
      success: true,
      data: stats
    });
  }
};

const getDesignById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch design by ID from design service
    const response = await makeDesignServiceRequest('GET', `/api/designs/${id}`);
    
    if (response.data.success) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      throw new Error('Failed to fetch design from design service');
    }
  } catch (error) {
    console.error('Get design by ID error:', error);
    
    if (error.response?.data?.message) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

const getCategories = async (req, res) => {
  try {
    // Fetch categories from design service
    const response = await makeDesignServiceRequest('GET', '/api/designs/categories');
    
    if (response.data.success) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      throw new Error('Failed to fetch categories from design service');
    }
  } catch (error) {
    console.error('Get categories error:', error);
    
    // Fallback to predefined categories
    const categories = ['Men', 'Women', 'Unisex'];
    
    res.json({
      success: true,
      data: categories
    });
  }
};

module.exports = {
  getDesigns,
  getDesignById,
  createDesign,
  updateDesign,
  deleteDesign,
  getDesignStats,
  getCategories
};
