const express = require('express');
const router = express.Router();

const Tailor = require('../models/Tailor');

// Public: list verified tailors
router.get('/tailors', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '20', 10), 1);
    const skip = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const query = { isVerified: true };

    if (search) {
      query.$or = [
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } },
        { specialization: { $elemMatch: { $regex: search, $options: 'i' } } },
        { address: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } }
      ];
    }

    const projection = '-password -emailVerificationToken -emailVerificationTokenExpires -aadhaar.number -aadhaar.documentPublicId';

    const [tailors, total] = await Promise.all([
      Tailor.find(query)
        .select(projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tailor.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: tailors,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Public tailors fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tailors' });
  }
});

module.exports = router;

