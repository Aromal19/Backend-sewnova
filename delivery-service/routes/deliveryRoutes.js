const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (no auth required - for internal service calls)
router.post('/', deliveryController.createDelivery);

// Customer routes (authenticated)
router.get(
    '/customer/:customerId',
    authMiddleware.authMiddleware,
    authMiddleware.customerOnly,
    deliveryController.getCustomerDeliveries
);

router.get(
    '/tracking/:bookingId',
    authMiddleware.authMiddleware,
    deliveryController.getDeliveryTracking
);

// Vendor routes (authenticated)
router.put(
    '/:id/vendor-dispatch',
    authMiddleware.authMiddleware,
    authMiddleware.vendorOnly,
    deliveryController.updateVendorDispatch
);

// Tailor routes (authenticated)
router.put(
    '/:id/tailor-delivery',
    authMiddleware.authMiddleware,
    authMiddleware.tailorOnly,
    deliveryController.updateTailorDelivery
);

// Admin routes (authenticated)
router.get(
    '/admin/all',
    authMiddleware.authMiddleware,
    authMiddleware.adminOnly,
    deliveryController.getAllDeliveries
);

// Common routes (authenticated - any role)
router.get(
    '/booking/:bookingId',
    authMiddleware.authMiddleware,
    deliveryController.getDeliveryByBookingId
);

router.get(
    '/:id/history',
    authMiddleware.authMiddleware,
    deliveryController.getDeliveryHistory
);

module.exports = router;
