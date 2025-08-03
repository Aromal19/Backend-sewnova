const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const auth = require('../middlewares/auth');

// Public routes (no authentication required)
router.post('/register', customerController.register);
router.post('/login', customerController.login);

// Protected routes (authentication required)
router.get('/profile', auth, customerController.getProfile);
router.put('/profile', auth, customerController.updateProfile);
router.put('/change-password', auth, customerController.changePassword);
router.delete('/account', auth, customerController.deleteAccount);

// Admin routes (you might want to add admin middleware later)
router.get('/all', customerController.getAllCustomers);

module.exports = router; 