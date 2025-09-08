const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

// Seller routes
router.get('/stats', sellerController.getSellerStats);
router.get('/profile', sellerController.getSellerProfile);
router.post('/verify-aadhaar', sellerController.verifyAadhaar);

module.exports = router;