const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Shared login route for all user roles
router.post('/login', authController.loginUser);

module.exports = router; 