const express = require('express');
const router = express.Router();
const { saveShopInfo, uploadImage, upload } = require('../controllers/shopController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/shop', authMiddleware, saveShopInfo);
router.post('/upload-image', authMiddleware, upload, uploadImage);

module.exports = router;

