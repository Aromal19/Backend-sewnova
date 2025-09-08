const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const Tesseract = require('tesseract.js');
const Verification = require('../models/Verification');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Get seller dashboard stats
const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user.userId;

    // Get product count
    const totalProducts = await Product.countDocuments({ 
      sellerId, 
      isActive: true 
    });

    // Get order stats
    const totalOrders = await Order.countDocuments({ sellerId });
    const pendingOrders = await Order.countDocuments({ 
      sellerId, 
      status: 'pending' 
    });
    const completedOrders = await Order.countDocuments({ 
      sellerId, 
      status: 'delivered' 
    });

    // Get revenue
    const revenueResult = await Order.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(sellerId), status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get recent orders
    const recentOrders = await Order.find({ sellerId })
      .populate('customerId', 'firstName lastName')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get low stock products
    const lowStockProducts = await Product.find({
      sellerId,
      isActive: true,
      stock: { $lte: 10 }
    }).limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalProducts,
          totalOrders,
          pendingOrders,
          completedOrders,
          totalRevenue
        },
        recentOrders,
        lowStockProducts
      }
    });

  } catch (error) {
    console.error('Get seller stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller stats',
      error: error.message
    });
  }
};

// Get seller profile (placeholder - would typically come from auth service)
const getSellerProfile = async (req, res) => {
  try {
    // This would typically fetch from auth service or a separate profile service
    res.json({
      success: true,
      data: {
        sellerId: req.user.userId,
        businessName: req.user.businessName || 'Business Name',
        email: req.user.email,
        phone: req.user.phone || '',
        address: req.user.address || '',
        isVerified: req.user.isVerified || false
      }
    });

  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seller profile',
      error: error.message
    });
  }
};

module.exports = {
  getSellerStats,
  getSellerProfile
};

// Verify Aadhaar via OCR
const verifyAadhaarHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const isPdf = (req.file.mimetype || '').toLowerCase().includes('pdf');
    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      { folder: 'sewnova/verification', resource_type: 'auto' }
    );

    // If PDF, create a JPG rendition of the first page for OCR
    let imageUrl = uploadResult.secure_url;
    if (isPdf) {
      imageUrl = cloudinary.url(uploadResult.public_id, {
        secure: true,
        format: 'jpg',
        page: 1
      });
    }

    const { data: ocr } = await Tesseract.recognize(imageUrl, 'eng');
    const text = ocr?.text || '';

    const aadhaarRegex = /(\d{4}[\s-]?\d{4}[\s-]?\d{4})/;
    const dobRegex = /(?:(?:DOB|D\.O\.B|Date of Birth|Year of Birth)\s*:?\s*)(\d{2}[\/-]\d{2}[\/-]\d{4}|\d{4})/i;
    const genderRegex = /(Male|Female|MALE|FEMALE|male|female)/;

    const lines = text
      .split(/\r?\n/)
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const fullText = lines.join('\n');
    const rawAadhaar = (fullText.match(aadhaarRegex) || [])[1] || '';
    const normalizedAadhaar = rawAadhaar.replace(/\D/g, '');

    let candidateName = '';
    const labelMatch = fullText.match(/(?:(?:Name|NAME)\s*:?\s*)([A-Za-z .]{3,})/);
    if (labelMatch && labelMatch[1]) {
      candidateName = labelMatch[1].trim();
    } else {
      const aadhaarLineIdx = lines.findIndex(l => aadhaarRegex.test(l));
      const startIdx = Math.max(0, (aadhaarLineIdx === -1 ? 0 : aadhaarLineIdx - 3));
      const endIdx = Math.max(0, (aadhaarLineIdx === -1 ? Math.min(3, lines.length) : aadhaarLineIdx));
      const window = lines.slice(startIdx, endIdx);
      const bannedTokens = /(?:Government|GOVERNMENT|VID|Enrol|Enrolment|Address|DOB|D\.O\.B|Date of Birth|Year of Birth|Male|Female|S\/O|D\/O|W\/O|to|of|India|Unique|Identification)/i;
      const nameLike = window
        .filter(l => /^[A-Za-z .]{3,}$/.test(l) && !bannedTokens.test(l))
        .sort((a, b) => b.length - a.length);
      if (nameLike.length) candidateName = nameLike[0].trim();
    }

    candidateName = (candidateName || '').replace(/[^A-Za-z .]/g, ' ').replace(/\s+/g, ' ').trim();

    const dobMatch = fullText.match(dobRegex);
    const genderMatch = fullText.match(genderRegex);

    const parsed = {
      aadhaarNumber: normalizedAadhaar,
      name: candidateName,
      dob: dobMatch ? dobMatch[1] : '',
      gender: (genderMatch ? genderMatch[1] : '').toLowerCase()
    };

    // Validation rules
    const expectedName = (req.body?.expectedName || '').trim();
    const expectedFirstName = (req.body?.expectedFirstName || '').trim();
    const expectedLastName = (req.body?.expectedLastName || '').trim();
    const normalize = (n) => (n || '').toLowerCase().replace(/[^a-z]/g, '');
    const tokenize = (n) => normalize(n).split(/\s+/).filter(t => t.length > 0);
    const startsWith = (a, b) => a.startsWith(b) || b.startsWith(a);

    const parsedTokens = tokenize(parsed.name);
    const expectedTokens = tokenize(expectedName);
    const firstToken = normalize(expectedFirstName);
    const lastToken = normalize(expectedLastName);

    let fullMatch = false;
    if (expectedTokens.length > 0 && parsedTokens.length > 0) {
      const matched = expectedTokens.every(et => parsedTokens.some(pt => startsWith(pt, et)));
      fullMatch = matched;
    }

    let firstLastMatch = false;
    if (firstToken) {
      const firstOk = parsedTokens.some(pt => startsWith(pt, firstToken));
      const lastOk = lastToken ? parsedTokens.some(pt => startsWith(pt, lastToken)) : true;
      firstLastMatch = firstOk && lastOk;
    }

    const namesMatch = Boolean(fullMatch || firstLastMatch);
    const isAadhaarValid = /^\d{12}$/.test(parsed.aadhaarNumber);
    const hasDob = Boolean(parsed.dob);
    const hasGender = parsed.gender === 'male' || parsed.gender === 'female';
    const status = (isAadhaarValid && hasDob && hasGender) ? 'verified' : 'rejected';

    const verification = await Verification.create({
      sellerId: req.user.userId,
      documentType: 'aadhaar',
      documentPublicId: uploadResult.public_id,
      documentUrl: imageUrl,
      ocrText: text,
      parsed,
      status
    });

    return res.status(201).json({ success: true, data: { id: verification._id, parsed: { aadhaarNumber: parsed.aadhaarNumber, dob: parsed.dob, gender: parsed.gender }, status } });
  } catch (error) {
    console.error('Aadhaar verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

module.exports.verifyAadhaar = [upload.single('file'), verifyAadhaarHandler];