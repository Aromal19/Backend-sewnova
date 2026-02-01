const Delivery = require('../models/delivery');
const mongoose = require('mongoose');

// Create delivery record when booking is confirmed
exports.createDelivery = async (req, res) => {
    try {
        const { bookingId, customerId, bookingType, deliveryAddress } = req.body;

        // Validate required fields
        if (!bookingId || !customerId || !bookingType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: bookingId, customerId, bookingType'
            });
        }

        // Check if delivery already exists for this booking
        const existingDelivery = await Delivery.findOne({ bookingId });
        if (existingDelivery) {
            return res.status(400).json({
                success: false,
                message: 'Delivery record already exists for this booking'
            });
        }

        // Create new delivery
        const delivery = new Delivery({
            bookingId,
            customerId,
            bookingType,
            deliveryAddress: deliveryAddress || {},
            overallStatus: 'pending'
        });

        // Add initial status history
        delivery.addStatusHistory(
            'pending',
            'overall',
            { role: 'system', id: new mongoose.Types.ObjectId() },
            'Delivery record created'
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

// Get delivery by booking ID
exports.getDeliveryByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const delivery = await Delivery.findOne({ bookingId })
            .populate('bookingId', 'orderDetails pricing status')
            .populate('customerId', 'name email phone');

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
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

// Get all deliveries for a customer
exports.getCustomerDeliveries = async (req, res) => {
    try {
        const { customerId } = req.params;

        const deliveries = await Delivery.find({ customerId, isActive: true })
            .populate('bookingId', 'orderDetails pricing status timeline')
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

// Update vendor dispatch status
exports.updateVendorDispatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, trackingNumber, courierName, estimatedDelivery, notes } = req.body;
        const vendorId = req.user?.userId; // From auth middleware

        const delivery = await Delivery.findById(id);
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
            });
        }

        // Check if booking type requires vendor dispatch
        if (delivery.bookingType === 'tailor') {
            return res.status(400).json({
                success: false,
                message: 'Tailor-only bookings do not require vendor dispatch'
            });
        }

        // Update vendor dispatch details
        delivery.vendorDispatch.status = status || delivery.vendorDispatch.status;
        if (trackingNumber) delivery.vendorDispatch.trackingNumber = trackingNumber;
        if (courierName) delivery.vendorDispatch.courierName = courierName;
        if (estimatedDelivery) delivery.vendorDispatch.estimatedDelivery = estimatedDelivery;
        if (notes) delivery.vendorDispatch.notes = notes;
        delivery.vendorDispatch.updatedBy = vendorId;

        // Update timestamps based on status
        if (status === 'dispatched' && !delivery.vendorDispatch.dispatchedAt) {
            delivery.vendorDispatch.dispatchedAt = new Date();
        }
        if (status === 'delivered_to_tailor' && !delivery.vendorDispatch.deliveredToTailorAt) {
            delivery.vendorDispatch.deliveredToTailorAt = new Date();
        }

        // Add to status history
        delivery.addStatusHistory(
            status,
            'vendor_dispatch',
            { role: 'vendor', id: vendorId },
            notes || `Vendor dispatch status updated to ${status}`
        );

        // Update overall status
        delivery.updateOverallStatus();

        await delivery.save();

        res.json({
            success: true,
            message: 'Vendor dispatch status updated successfully',
            delivery
        });
    } catch (error) {
        console.error('Error updating vendor dispatch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update vendor dispatch status',
            error: error.message
        });
    }
};

// Update tailor delivery status
exports.updateTailorDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            deliveryMethod,
            trackingNumber,
            courierName,
            notes,
            failureReason
        } = req.body;
        const tailorId = req.user?.userId; // From auth middleware

        const delivery = await Delivery.findById(id);
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
            });
        }

        // Update tailor delivery details
        delivery.tailorDelivery.status = status || delivery.tailorDelivery.status;
        if (deliveryMethod) delivery.tailorDelivery.deliveryMethod = deliveryMethod;
        if (trackingNumber) delivery.tailorDelivery.trackingNumber = trackingNumber;
        if (courierName) delivery.tailorDelivery.courierName = courierName;
        if (notes) delivery.tailorDelivery.notes = notes;
        if (failureReason) delivery.tailorDelivery.failureReason = failureReason;
        delivery.tailorDelivery.updatedBy = tailorId;

        // Update timestamps based on status
        if (status === 'ready_for_delivery' && !delivery.tailorDelivery.readyAt) {
            delivery.tailorDelivery.readyAt = new Date();
        }
        if (status === 'out_for_delivery' && !delivery.tailorDelivery.dispatchedAt) {
            delivery.tailorDelivery.dispatchedAt = new Date();
        }
        if (status === 'delivered' && !delivery.tailorDelivery.deliveredAt) {
            delivery.tailorDelivery.deliveredAt = new Date();
        }

        // Add to status history
        delivery.addStatusHistory(
            status,
            'tailor_delivery',
            { role: 'tailor', id: tailorId },
            notes || `Tailor delivery status updated to ${status}`
        );

        // Update overall status
        delivery.updateOverallStatus();

        await delivery.save();

        res.json({
            success: true,
            message: 'Tailor delivery status updated successfully',
            delivery
        });
    } catch (error) {
        console.error('Error updating tailor delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tailor delivery status',
            error: error.message
        });
    }
};

// Get delivery tracking information (customer view)
exports.getDeliveryTracking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const delivery = await Delivery.findOne({ bookingId })
            .populate('bookingId', 'orderDetails timeline status')
            .select('-__v');

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery tracking information not found'
            });
        }

        // Format tracking information for customer view
        const trackingInfo = {
            bookingId: delivery.bookingId,
            overallStatus: delivery.overallStatus,
            bookingType: delivery.bookingType,
            deliveryAddress: delivery.deliveryAddress,
            vendorDispatch: delivery.bookingType !== 'tailor' ? {
                status: delivery.vendorDispatch.status,
                trackingNumber: delivery.vendorDispatch.trackingNumber,
                courierName: delivery.vendorDispatch.courierName,
                dispatchedAt: delivery.vendorDispatch.dispatchedAt,
                estimatedDelivery: delivery.vendorDispatch.estimatedDelivery,
                deliveredToTailorAt: delivery.vendorDispatch.deliveredToTailorAt
            } : null,
            tailorDelivery: {
                status: delivery.tailorDelivery.status,
                deliveryMethod: delivery.tailorDelivery.deliveryMethod,
                trackingNumber: delivery.tailorDelivery.trackingNumber,
                courierName: delivery.tailorDelivery.courierName,
                readyAt: delivery.tailorDelivery.readyAt,
                dispatchedAt: delivery.tailorDelivery.dispatchedAt,
                deliveredAt: delivery.tailorDelivery.deliveredAt
            },
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

// Get all deliveries (admin view)
exports.getAllDeliveries = async (req, res) => {
    try {
        const { status, bookingType, page = 1, limit = 20 } = req.query;

        const filter = { isActive: true };
        if (status) filter.overallStatus = status;
        if (bookingType) filter.bookingType = bookingType;

        const deliveries = await Delivery.find(filter)
            .populate('bookingId', 'orderDetails pricing status timeline')
            .populate('customerId', 'name email phone')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Delivery.countDocuments(filter);

        res.json({
            success: true,
            deliveries,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
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

// Get delivery status history
exports.getDeliveryHistory = async (req, res) => {
    try {
        const { id } = req.params;

        const delivery = await Delivery.findById(id).select('statusHistory');
        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: 'Delivery record not found'
            });
        }

        res.json({
            success: true,
            history: delivery.statusHistory.sort((a, b) => b.timestamp - a.timestamp)
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
