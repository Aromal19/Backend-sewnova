const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const emailVerificationController = require('../controllers/emailVerificationController');
const auth = require('../middlewares/auth');
// Removed: const checkBlacklistedToken = require('../middlewares/checkBlacklistedToken');

// Enhanced login route that automatically detects user role
router.post('/login', authController.loginUser);

// Google OAuth Sign-In route for all user types
router.post('/google-signin', authController.googleSignIn);

// Route to get user role by email (for frontend routing)
router.post('/get-role', authController.getUserRole);

// Route to validate token and get user info (no blacklist check)
router.get('/validate-token', authController.validateToken);

// Route to handle user logout (no blacklist check)
router.post('/logout', authController.logoutUser);

// Route to check email availability across all user types
router.get('/check-email', authController.checkEmailAvailability);

// Email verification routes
router.post('/send-verification', emailVerificationController.sendVerification);
router.get('/verify-email', emailVerificationController.verifyEmail);
router.post('/resend-verification', emailVerificationController.resendVerification);
router.get('/check-verification-status', emailVerificationController.checkVerificationStatus);

// Add refresh token endpoint
router.post('/refresh-token', authController.refreshAccessToken);

// Add change password endpoint (requires authentication)
router.post('/change-password', auth, authController.changePassword);

module.exports = router; 