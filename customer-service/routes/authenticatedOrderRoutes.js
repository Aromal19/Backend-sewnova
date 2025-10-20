const express = require('express');
const router = express.Router();
const { 
  getCustomerOrders, 
  getOrderById, 
  updateOrderStatus 
} = require('../controllers/orderController');

// Get customer orders (requires authentication)
router.get('/', getCustomerOrders);

// Get order by ID (requires authentication)
router.get('/:id', getOrderById);

// Update order status (requires authentication)
router.put('/:id/status', updateOrderStatus);

module.exports = router;
