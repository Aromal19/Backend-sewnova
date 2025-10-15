const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// User management routes
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id/status', userController.updateUserStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
