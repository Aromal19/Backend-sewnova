const express = require('express');
const router = express.Router();

const Product = require('../models/Product');

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

    res.json({
      success: true,
      data: products,
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

