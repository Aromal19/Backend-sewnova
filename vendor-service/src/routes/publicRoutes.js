const express = require('express');
const router = express.Router();

const Product = require('../models/Product');
const axios = require('axios');

// Public: list active products (for customers browsing marketplace)
router.get('/products', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '20', 10), 1);
    const skip = (page - 1) * limit;

    const category = req.query.category;
    const search = (req.query.search || '').trim();

    const query = { isActive: true };
    if (category) {
      query.category = category;
    }

    // Simple text search across name/description/tags
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $elemMatch: { $regex: search, $options: 'i' } } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);

    // Get seller information from auth-service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const sellerIds = [...new Set(products.map(p => p.sellerId.toString()))];
    
    const sellerPromises = sellerIds.map(async (sellerId) => {
      try {
        const response = await axios.get(`${authServiceUrl}/api/sellers/${sellerId}`);
        return { id: sellerId, data: response.data.seller };
      } catch (error) {
        console.error(`Failed to fetch seller ${sellerId}:`, error.message);
        return { id: sellerId, data: null };
      }
    });

    const sellerResults = await Promise.all(sellerPromises);
    const sellerMap = {};
    sellerResults.forEach(result => {
      if (result.data) {
        sellerMap[result.id] = result.data;
      }
    });

    // Transform products to include seller information
    const productsWithSeller = products.map(product => {
      const seller = sellerMap[product.sellerId.toString()];
      return {
        ...product.toObject(),
        seller: seller ? {
          _id: seller._id,
          name: seller.businessName || `${seller.firstname} ${seller.lastname}`,
          businessName: seller.businessName,
          businessType: seller.businessType,
          isVerified: seller.isVerified,
          aadhaarVerified: seller.aadhaar?.status === 'verified',
          rating: seller.rating,
          totalSales: seller.totalSales,
          profileImage: seller.profileImage,
          location: seller.address ? `${seller.district}, ${seller.state}` : 'Location not specified'
        } : {
          _id: product.sellerId,
          name: 'Unknown Seller',
          businessName: 'Unknown Business',
          businessType: 'Unknown',
          isVerified: false,
          aadhaarVerified: false,
          rating: 0,
          totalSales: 0,
          profileImage: '',
          location: 'Location not specified'
        }
      };
    });

    res.json({
      success: true,
      data: productsWithSeller,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Public products fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

module.exports = router;

