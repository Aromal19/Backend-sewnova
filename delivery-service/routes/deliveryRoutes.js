const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================================
// SYSTEM/INTERNAL: Create delivery (called by order service on confirmation)
// ============================================================================
router.post('/', deliveryController.createDelivery);

// ============================================================================
// VENDOR/TAILOR: Submit dispatch details
// POST /api/deliveries/:id/dispatch
// Access: Vendor (for FABRIC) or Tailor (for GARMENT)
// ============================================================================
router.post(
    '/:id/dispatch',
    authMiddleware.authMiddleware,
    authMiddleware.vendorOrTailor,
    deliveryController.submitDispatchDetails
);

// ============================================================================
// VENDOR/TAILOR/ADMIN: Mark delivery as completed
// POST /api/deliveries/:id/complete
// Access: Vendor (for FABRIC), Tailor (for GARMENT), or Admin (for any)
// ============================================================================
router.post(
    '/:id/complete',
    authMiddleware.authMiddleware,
    deliveryController.markDelivered
);

// ============================================================================
// ADMIN: Override delivery details with reason logging
// POST /api/deliveries/:id/admin-override
// Access: Admin only
// ============================================================================
router.post(
    '/:id/admin-override',
    authMiddleware.authMiddleware,
    authMiddleware.adminOnly,
    deliveryController.adminOverride
);

// ============================================================================
// CUSTOMER/AUTHENTICATED: Get delivery by order ID
// GET /api/deliveries/order/:orderId
// Access: Authenticated users
// ============================================================================
router.get(
    '/order/:orderId',
    authMiddleware.authMiddleware,
    deliveryController.getDeliveryByOrderId
);

// ============================================================================
// CUSTOMER: Get all deliveries for a customer
// GET /api/deliveries/customer/:customerId
// Access: Authenticated users (customer or admin)
// ============================================================================
router.get(
    '/customer/:customerId',
    authMiddleware.authMiddleware,
    deliveryController.getCustomerDeliveries
);

// ============================================================================
// CUSTOMER: Get delivery tracking information
// GET /api/deliveries/tracking/:orderId
// Access: Authenticated users
// ============================================================================
router.get(
    '/tracking/:orderId',
    authMiddleware.authMiddleware,
    deliveryController.getDeliveryTracking
);

// ============================================================================
// ADMIN: Get all deliveries with filtering
// GET /api/deliveries/admin/all
// Access: Admin only
// ============================================================================
router.get(
    '/admin/all',
    authMiddleware.authMiddleware,
    authMiddleware.adminOnly,
    deliveryController.getAllDeliveries
);

// ============================================================================
// AUTHENTICATED: Get delivery status history
// GET /api/deliveries/:id/history
// Access: Authenticated users
// ============================================================================
router.get(
    '/:id/history',
    authMiddleware.authMiddleware,
    deliveryController.getDeliveryHistory
);

module.exports = router;
