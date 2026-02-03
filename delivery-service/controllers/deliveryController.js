const Delivery = require('../models/delivery');
const mongoose = require('mongoose');

// ============================================================================
// SYSTEM-TRIGGERED: Create delivery record when order is confirmed
// ============================================================================
exports.createDelivery = async (req, res) => {
    try {
        const { orderId, customerId, orderItems, deliveryAddress } = req.body;

        // Validate required fields
        if (!orderId || !customerId || !orderItems || !Array.isArray(orderItems)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: orderId, customerId, orderItems'
            });
        }

        // Check if delivery already exists for this order
        const existingDelivery = await Delivery.findOne({ orderId });
        if (existingDelivery) {
            return res.status(400).json({
                success: false,
                message: 'Delivery record already exists for this order',
                delivery: existingDelivery
            });
        }

        // Determine delivery type from order items
        const deliveryType = Delivery.determineDeliveryType(orderItems);

        // Create new delivery
        const delivery = new Delivery({
            orderId,
            customerId,
            deliveryType,
            deliveryAddress: deliveryAddress || {},
            status: 'CREATED',
            isLocked: false
        });

        // Add initial status history
        delivery.addStatusHistory(
            'CREATED',
            { role: 'system', id: new mongoose.Types.ObjectId() },
            'Delivery record created on order confirmation'
        );

        await delivery.save();

        res.status(201).json({
            success: true,
            message: 'Delivery record created successfully',
            delivery
        });
    } catch (error) {
        console.error('Error creating delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create delivery record',
            error: error.message
        });
    }
};

// ============================================================================
// VENDOR/TAILOR: Submit dispatch details
// POST /api/deliveries/:id/dispatch
// ============================================================================
exports.submitDispatchDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { courierName, trackingId } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        // Validate required fields
        if (!courierName || !trackingId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: courierName, trackingId'
            });
        }

        // Find delivery
        const delivery = await Delivery.findById(id);
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
            });
        }

        // Check if already locked
        if (delivery.isLocked) {
            return res.status(400).json({
                success: false,
                message: 'Dispatch details are locked and cannot be modified. Contact admin for changes.'
            });
        }

        // Validate status
        if (delivery.status !== 'CREATED') {
            return res.status(400).json({
                success: false,
                message: `Cannot submit dispatch details. Current status is ${delivery.status}. Dispatch can only be submitted when status is CREATED.`
            });
        }

        // Validate role matches delivery type
        if (delivery.deliveryType === 'FABRIC' && userRole !== 'seller') {
            return res.status(403).json({
                success: false,
                message: 'Only vendors can dispatch FABRIC deliveries'
            });
        }

        if (delivery.deliveryType === 'GARMENT' && userRole !== 'tailor') {
            return res.status(403).json({
                success: false,
                message: 'Only tailors can dispatch GARMENT deliveries'
            });
        }

        // Update dispatch details
        delivery.courierName = courierName.trim();
        delivery.trackingId = trackingId.trim();
        delivery.dispatchedAt = new Date();
        delivery.isLocked = true; // Lock dispatch metadata
        delivery.status = 'DISPATCHED';
        delivery.dispatchedBy = {
            userId: userId,
            role: userRole
        };

        // Add to status history
        delivery.addStatusHistory(
            'DISPATCHED',
            { role: userRole, id: userId },
            `Dispatched via ${courierName}, tracking: ${trackingId}`
        );

        await delivery.save();

        res.json({
            success: true,
            message: 'Dispatch details submitted successfully. Delivery status updated to DISPATCHED.',
            delivery
        });
    } catch (error) {
        console.error('Error submitting dispatch details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit dispatch details',
            error: error.message
        });
    }
};

// ============================================================================
// VENDOR/TAILOR/ADMIN: Mark delivery as completed
// POST /api/deliveries/:id/complete
// ============================================================================
exports.markDelivered = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        // Find delivery
        const delivery = await Delivery.findById(id);
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
            });
        }

        // Validate status
        if (delivery.status !== 'DISPATCHED') {
            return res.status(400).json({
                success: false,
                message: `Cannot mark as delivered. Current status is ${delivery.status}. Delivery can only be completed when status is DISPATCHED.`
            });
        }

        // Validate role (vendor for FABRIC, tailor for GARMENT, or admin for any)
        if (userRole !== 'admin') {
            if (delivery.deliveryType === 'FABRIC' && userRole !== 'seller') {
                return res.status(403).json({
                    success: false,
                    message: 'Only vendors can mark FABRIC deliveries as delivered'
                });
            }

            if (delivery.deliveryType === 'GARMENT' && userRole !== 'tailor') {
                return res.status(403).json({
                    success: false,
                    message: 'Only tailors can mark GARMENT deliveries as delivered'
                });
            }
        }

        // Update delivery
        delivery.deliveredAt = new Date();
        delivery.status = 'DELIVERED';
        delivery.deliveredBy = {
            userId: userId,
            role: userRole
        };

        // Add to status history
        delivery.addStatusHistory(
            'DELIVERED',
            { role: userRole, id: userId },
            'Delivery completed'
        );

        await delivery.save();

        res.json({
            success: true,
            message: 'Delivery marked as completed successfully',
            delivery
        });
    } catch (error) {
        console.error('Error marking delivery as completed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark delivery as completed',
            error: error.message
        });
    }
};

// ============================================================================
// ADMIN: Override delivery details with reason logging
// POST /api/deliveries/:id/admin-override
// ============================================================================
exports.adminOverride = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, action, updates } = req.body;
        const adminId = req.user?.userId;

        // Validate required fields
        if (!reason || !action || !updates) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: reason, action, updates'
            });
        }

        // Find delivery
        const delivery = await Delivery.findById(id);
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
            });
        }

        // Store old values for logging
        const oldValues = {};
        const newValues = {};

        // Apply updates and log changes
        for (const [field, newValue] of Object.entries(updates)) {
            if (delivery[field] !== undefined) {
                oldValues[field] = delivery[field];
                newValues[field] = newValue;
                delivery[field] = newValue;
            }
        }

        // Log admin override
        delivery.logAdminOverride(adminId, reason, action, oldValues, newValues);

        // Add to status history if status was changed
        if (updates.status) {
            delivery.addStatusHistory(
                updates.status,
                { role: 'admin', id: adminId },
                `Admin override: ${reason}`
            );
        }

        await delivery.save();

        res.json({
            success: true,
            message: 'Admin override applied successfully',
            delivery,
            override: {
                reason,
                action,
                oldValues,
                newValues
            }
        });
    } catch (error) {
        console.error('Error applying admin override:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply admin override',
            error: error.message
        });
    }
};

// ============================================================================
// GET: Delivery by order ID
// ============================================================================
exports.getDeliveryByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;

        const delivery = await Delivery.findOne({ orderId })
            .populate('orderId', 'orderId totalAmount status items')
            .populate('customerId', 'name email phone');

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found for this order'
            });
        }

        res.json({
            success: true,
            delivery
        });
    } catch (error) {
        console.error('Error fetching delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery record',
            error: error.message
        });
    }
};

// ============================================================================
// GET: All deliveries for a customer
// ============================================================================
exports.getCustomerDeliveries = async (req, res) => {
    try {
        const { customerId } = req.params;

        const deliveries = await Delivery.find({ customerId, isActive: true })
            .populate('orderId', 'orderId totalAmount status items')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: deliveries.length,
            deliveries
        });
    } catch (error) {
        console.error('Error fetching customer deliveries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer deliveries',
            error: error.message
        });
    }
};

// ============================================================================
// GET: Delivery tracking information (customer view)
// ============================================================================
exports.getDeliveryTracking = async (req, res) => {
    try {
        const { orderId } = req.params;

        const delivery = await Delivery.findOne({ orderId })
            .populate('orderId', 'orderId totalAmount status')
            .select('-__v -adminOverrides'); // Hide admin overrides from customer view

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery tracking information not found'
            });
        }

        // Format tracking information for customer view
        const trackingInfo = {
            orderId: delivery.orderId,
            deliveryType: delivery.deliveryType,
            status: delivery.status,
            courierName: delivery.courierName || 'Not yet dispatched',
            trackingId: delivery.trackingId || 'Not yet dispatched',
            dispatchedAt: delivery.dispatchedAt,
            deliveredAt: delivery.deliveredAt,
            deliveryAddress: delivery.deliveryAddress,
            timeline: delivery.statusHistory.sort((a, b) => b.timestamp - a.timestamp)
        };

        res.json({
            success: true,
            tracking: trackingInfo
        });
    } catch (error) {
        console.error('Error fetching delivery tracking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery tracking',
            error: error.message
        });
    }
};

// ============================================================================
// GET: All deliveries (admin view)
// ============================================================================
exports.getAllDeliveries = async (req, res) => {
    try {
        const { status, deliveryType, page = 1, limit = 20 } = req.query;

        const filter = { isActive: true };
        if (status) filter.status = status;
        if (deliveryType) filter.deliveryType = deliveryType;

        const deliveries = await Delivery.find(filter)
            .populate('orderId', 'orderId totalAmount status items')
            .populate('customerId', 'name email phone')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Delivery.countDocuments(filter);

        res.json({
            success: true,
            deliveries,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalDeliveries: count
        });
    } catch (error) {
        console.error('Error fetching all deliveries:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch deliveries',
            error: error.message
        });
    }
};

// ============================================================================
// GET: Delivery status history
// ============================================================================
exports.getDeliveryHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await Delivery.findById(id)
            .select('statusHistory adminOverrides');

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
            });
        }

        res.json({
            success: true,
            history: {
                statusHistory: delivery.statusHistory.sort((a, b) => b.timestamp - a.timestamp),
                adminOverrides: delivery.adminOverrides.sort((a, b) => b.timestamp - a.timestamp)
            }
        });
    } catch (error) {
        console.error('Error fetching delivery history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery history',
            error: error.message
        });
    }
};
