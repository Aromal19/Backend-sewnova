const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');

// Public routes (no auth required)
router.post('/login', adminController.login);

// Protected routes (auth required)
router.get('/profile', auth.authMiddleware, auth.adminOnly, adminController.getProfile);
router.put('/profile', auth.authMiddleware, auth.adminOnly, adminController.updateProfile);
router.put('/change-password', auth.authMiddleware, auth.adminOnly, adminController.changePassword);
router.get('/dashboard-stats', auth.authMiddleware, auth.adminOnly, adminController.getDashboardStats);

module.exports = router;
