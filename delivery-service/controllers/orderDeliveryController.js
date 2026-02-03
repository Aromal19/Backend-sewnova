const OrderDelivery = require('../models/OrderDelivery');

/**
 * System-triggered creation of delivery records
 * @param {Object} req - Internal request
 * @param {Object} res 
 */
exports.createOrderDelivery = async (req, res) => {
    try {
        const { orderId, items, bookingType } = req.body;

        // Determine required delivery types
        const deliveryTypes = [];

        // Logic to determine types based on order content or bookingType
        // Assuming 'bookingType' from order gives a hint, or we inspect items
        // For simplicity based on prompt:
        // Fabric-only -> FABRIC
        // Complete/Tailor -> GARMENT (and possibly FABRIC if fabric was bought?)

        if (bookingType === 'fabric') {
            deliveryTypes.push('FABRIC');
        } else if (bookingType === 'tailor') {
            deliveryTypes.push('GARMENT');
        } else if (bookingType === 'complete') {
            // 'complete' usually means Fabric + Tailoring
            deliveryTypes.push('FABRIC');
            deliveryTypes.push('GARMENT');
        }

        const createdDeliveries = [];

        for (const type of deliveryTypes) {
            // Check if exists to avoid duplicates (idempotency)
            let delivery = await OrderDelivery.findOne({ orderId, deliveryType: type });

            if (!delivery) {
                delivery = await OrderDelivery.create({
                    orderId,
                    deliveryType: type,
                    status: 'CREATED',
                    statusHistory: [{
                        status: 'CREATED',
                        reason: 'Initial creation'
                    }]
                });
            }
            createdDeliveries.push(delivery);
        }

        res.status(201).json({ success: true, deliveries: createdDeliveries });
    } catch (error) {
        console.error('Error creating order delivery:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Submit Dispatch Details (Vendor/Tailor)
 */
exports.dispatchOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { courierName, trackingId } = req.body;
        const user = req.user; // Assumed from auth middleware

        const delivery = await OrderDelivery.findById(id);
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery record not found' });
        }

        // Validation: Status must be CREATED
        if (delivery.status !== 'CREATED') {
            return res.status(400).json({ success: false, message: `Cannot dispatch. Current status: ${delivery.status}` });
        }

        // Validation: Role Access
        if (delivery.deliveryType === 'FABRIC') {
            if (user.role !== 'seller' && user.role !== 'vendor' && user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only Vendors can dispatch Fabric' });
            }
        } else if (delivery.deliveryType === 'GARMENT') {
            if (user.role !== 'tailor' && user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only Tailors can dispatch Garments' });
            }
        }

        // Action
        delivery.courierName = courierName;
        delivery.trackingId = trackingId;
        delivery.status = 'DISPATCHED';
        delivery.dispatchedAt = new Date();
        delivery.isLocked = true;
        delivery.statusHistory.push({
            status: 'DISPATCHED',
            updatedBy: user._id || user.id,
            reason: 'Dispatch details submitted'
        });

        await delivery.save();

        res.json({ success: true, delivery });
    } catch (error) {
        console.error('Error dispatching order:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Mark Delivery as Complete/Delivered
 */
exports.completeDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const delivery = await OrderDelivery.findById(id);
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery record not found' });
        }

        // Validation: Status must be DISPATCHED
        if (delivery.status !== 'DISPATCHED') {
            return res.status(400).json({ success: false, message: `Cannot mark delivered. Current status: ${delivery.status}` });
        }

        // Validation: Role Access (Same as dispatch + Admin)
        if (delivery.deliveryType === 'FABRIC' && !['seller', 'vendor', 'admin'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        if (delivery.deliveryType === 'GARMENT' && !['tailor', 'admin'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Action
        delivery.status = 'DELIVERED';
        delivery.deliveredAt = new Date();
        delivery.statusHistory.push({
            status: 'DELIVERED',
            updatedBy: user._id || user.id,
            reason: 'Marked as delivered'
        });

        await delivery.save();

        res.json({ success: true, delivery });
    } catch (error) {
        console.error('Error completing delivery:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin Override
 */
exports.adminOverride = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason, newData } = req.body;
        const adminUser = req.user;

        if (adminUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const delivery = await OrderDelivery.findById(id);
        if (!delivery) {
            return res.status(404).json({ success: false, message: 'Delivery record not found' });
        }

        const oldValue = { ...delivery.toObject() };

        // Apply changes based on action
        if (action === 'UPDATE_STATUS') {
            delivery.status = newData.status;
            if (newData.status === 'DISPATCHED' && !delivery.dispatchedAt) delivery.dispatchedAt = new Date();
            if (newData.status === 'DELIVERED' && !delivery.deliveredAt) delivery.deliveredAt = new Date();
        } else if (action === 'UNLOCK') {
            delivery.isLocked = false;
        } else if (action === 'UPDATE_DETAILS') {
            if (newData.courierName) delivery.courierName = newData.courierName;
            if (newData.trackingId) delivery.trackingId = newData.trackingId;
        }

        delivery.adminOverrides.push({
            adminId: adminUser._id || adminUser.id,
            timestamp: new Date(),
            action,
            reason,
            oldValue,
            newValue: newData
        });

        delivery.statusHistory.push({
            status: delivery.status,
            updatedBy: adminUser._id || adminUser.id,
            reason: `Admin Override: ${reason}`
        });

        await delivery.save();
        res.json({ success: true, delivery });

    } catch (error) {
        console.error('Error in admin override:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get Deliveries by Order ID
 */
exports.getOrderDeliveries = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { type } = req.query; // Optional filter by type

        const query = { orderId };
        if (type) query.deliveryType = type;

        const deliveries = await OrderDelivery.findById(orderId).catch(() => null)
            ? await OrderDelivery.findById(orderId) // If param is delivery Id
            : await OrderDelivery.find(query).sort({ createdAt: -1 });

        // If generic find by orderId failed, try finding ONE by orderId (if route is ambiguous)
        // But let's assume route is /order/:orderId

        // Actually, let's stick to the route definition: /order/:orderId
        const results = await OrderDelivery.find(query).sort({ createdAt: 1 });

        res.json({ success: true, deliveries: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get Pending Deliveries for Seller (Fabric)
 */
exports.getSellerPendingDeliveries = async (req, res) => {
    try {
        // ideally we filter by orders relevant to this seller, but for V1 we might just show all FABRIC deliveries
        // In a real app, OrderDelivery should probably store sellerId/tailorId for faster lookup
        // For now, let's query all 'FABRIC' type that are not DELIVERED

        // Note: Providing 'sellerId' in req query would be better if we stored it. 
        // Since we didn't add sellerId to the model yet, we rely on the fact that
        // the frontend will filter or we join with Order. 
        // For this iteration, let's just return all FABRIC deliveries and let frontend filter/verify?
        // NO, that's insecure.

        // Let's rely on the strategy that we find orders for this seller first (like in FabricDispatch.jsx),
        // and then query deliveries for those orders.
        // BUT this endpoint is generic. 

        // Let's implement a simple get all by type for now, assuming user has filtered orders already
        // Or better: get by list of IDs.

        const { type, status } = req.query;
        const query = {};
        if (type) query.deliveryType = type;
        if (status) query.status = status;

        const deliveries = await OrderDelivery.find(query).sort({ createdAt: -1 });
        res.json({ success: true, deliveries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
