const express = require('express');
const router = express.Router();
const { upload, verifyAadhaar } = require('../controllers/verificationController');

router.post('/verify-aadhaar', upload.single('file'), verifyAadhaar);

module.exports = router;

