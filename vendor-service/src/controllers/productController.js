const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Add fabric/product
const addFabric = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      pricePerUnit,
      color,
      pattern,
      weight,
      width,
      careInstructions,
      stock,
      tags
    } = req.body;

    // Validate required fields (allow color to be auto-detected if images provided)
    if (!name || !description || !category || !price || !pricePerUnit || !weight || !width || !careInstructions) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Handle image uploads
    const images = [];
    let extractedDominantColor = null;
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'sewnova/fabrics',
              resource_type: 'image',
              colors: true
            }
          );
          
          images.push({
            url: result.secure_url,
            publicId: result.public_id
          });

          // Extract dominant color from the first image if available
          if (!extractedDominantColor && Array.isArray(result.colors) && result.colors.length > 0) {
            const topColor = result.colors[0];
            if (Array.isArray(topColor) && typeof topColor[0] === 'string') {
              extractedDominantColor = topColor[0]; // hex string like '#aabbcc'
            }
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload images'
          });
        }
      }
    }

    // If color not provided, attempt to use extracted dominant color (if images uploaded)
    const resolvedColor = color || extractedDominantColor || 'unknown';

    // Create new product
    const product = new Product({
      sellerId: req.user.userId,
      name,
      description,
      category,
      price: parseFloat(price),
      pricePerUnit,
      color: resolvedColor,
      pattern: pattern || 'solid',
      weight,
      width,
      careInstructions,
      images,
      stock: parseInt(stock) || 0,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Fabric added successfully',
      data: product
    });

  } catch (error) {
    console.error('Add fabric error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add fabric',
      error: error.message
    });
  }
};

// Get all products for a seller
const getSellerProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const skip = (page - 1) * limit;

    let query = { sellerId: req.user.userId, isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user.userId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user.userId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Handle image updates
    if (req.files && req.files.length > 0) {
      const newImages = [];
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'sewnova/fabrics',
              resource_type: 'image'
            }
          );
          
          newImages.push({
            url: result.secure_url,
            publicId: result.public_id
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload images'
          });
        }
      }
      
      // Delete old images from Cloudinary
      for (const image of product.images) {
        try {
          await cloudinary.uploader.destroy(image.publicId);
        } catch (deleteError) {
          console.error('Image deletion error:', deleteError);
        }
      }
      
      req.body.images = newImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user.userId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch (deleteError) {
        console.error('Image deletion error:', deleteError);
      }
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

module.exports = {
  addFabric: [upload.array('images', 5), addFabric],
  getSellerProducts,
  getProduct,
  updateProduct: [upload.array('images', 5), updateProduct],
  deleteProduct
};

// Detect dominant color from a single image upload
const detectColorFromImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      {
        folder: 'sewnova/fabrics/temp',
        resource_type: 'image',
        colors: true
      }
    );

    let detectedColor = null;
    if (Array.isArray(result.colors) && result.colors.length > 0) {
      const topColor = result.colors[0];
      if (Array.isArray(topColor) && typeof topColor[0] === 'string') {
        detectedColor = topColor[0];
      }
    }

    return res.status(200).json({ success: true, color: detectedColor, image: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    console.error('Detect color error:', error);
    return res.status(500).json({ success: false, message: 'Failed to detect color', error: error.message });
  }
};

module.exports.detectColorFromImage = [upload.single('image'), detectColorFromImage];