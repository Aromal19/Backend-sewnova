const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const auth = require('../middlewares/auth');

// Public routes (no authentication required)
router.post('/register', sellerController.register);

// Protected routes (authentication required)
router.get('/profile', auth, sellerController.getProfile);
router.put('/update-profile', auth, sellerController.updateProfile);
router.put('/change-password', auth, sellerController.changePassword);
router.delete('/account', auth, sellerController.deleteAccount);
router.put('/:id/verify', auth, sellerController.updateVerification);

// Email-based routes (for account manipulation using email)
router.get('/email/:email', sellerController.getSellerByEmail);
router.put('/email/:email/update', sellerController.updateSellerByEmail);
router.delete('/email/:email', sellerController.deleteSellerByEmail);

// Admin routes (you might want to add admin middleware later)
router.get('/all', sellerController.getAllSellers);
router.get('/:id', sellerController.getSellerById);

module.exports = router; 