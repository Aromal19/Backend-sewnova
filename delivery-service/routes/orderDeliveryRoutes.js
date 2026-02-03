const express = require('express');
const router = express.Router();
const orderDeliveryController = require('../controllers/orderDeliveryController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Standardized auth middleware

// System Routes (Internal)
router.post('/internal/create', orderDeliveryController.createOrderDelivery);

// View Routes
router.get('/order/:orderId', protect, orderDeliveryController.getOrderDeliveries);

// specialized route for seller/tailor fetching (can be refined)
router.get('/list', protect, orderDeliveryController.getSellerPendingDeliveries);


// Action Routes
// Dispatch: Vendor (Seller) or Tailor or Admin
router.post('/:id/dispatch', protect, authorize('seller', 'vendor', 'tailor', 'admin'), orderDeliveryController.dispatchOrder);

// Complete: Vendor (Seller) or Tailor or Admin
router.post('/:id/complete', protect, authorize('seller', 'vendor', 'tailor', 'admin'), orderDeliveryController.completeDelivery);

// Admin Override
router.post('/:id/admin-override', protect, authorize('admin'), orderDeliveryController.adminOverride);

module.exports = router;
