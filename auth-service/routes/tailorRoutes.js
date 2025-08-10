const express = require('express');
const router = express.Router();
const tailorController = require('../controllers/tailorController');
const auth = require('../middlewares/auth');

// Public routes (no authentication required)
router.post('/register', tailorController.register);

// Protected routes (authentication required)
router.get('/profile', auth, tailorController.getProfile);
router.put('/update-profile', auth, tailorController.updateProfile);
router.put('/change-password', auth, tailorController.changePassword);
router.delete('/account', auth, tailorController.deleteAccount);

// Email-based routes (for account manipulation using email)
router.get('/email/:email', tailorController.getTailorByEmail);
router.put('/email/:email/update', tailorController.updateTailorByEmail);
router.delete('/email/:email', tailorController.deleteTailorByEmail);

// Admin routes (you might want to add admin middleware later)
router.get('/all', tailorController.getAllTailors);
router.get('/:id', tailorController.getTailorById);

module.exports = router; 