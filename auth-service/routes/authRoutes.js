const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const checkBlacklistedToken = require('../middlewares/checkBlacklistedToken');

// Enhanced login route that automatically detects user role
router.post('/login', authController.loginUser);

// Google OAuth Sign-In route for all user types
router.post('/google-signin', authController.googleSignIn);

// Route to get user role by email (for frontend routing)
router.post('/get-role', authController.getUserRole);

// Route to validate token and get user info (protected - checks blacklist)
router.get('/validate-token', checkBlacklistedToken, authController.validateToken);

// Route to handle user logout (protected - checks blacklist)
router.post('/logout', checkBlacklistedToken, authController.logoutUser);

// Route to check email availability across all user types
router.get('/check-email', authController.checkEmailAvailability);

module.exports = router; 