const Booking = require('../models/booking');
const mongoose = require('mongoose');
const axios = require('axios');

/**
 * Get all bookings/orders for a specific tailor with successful payments
 */
const getTailorOrders = async (req, res) => {
  try {
    const tailorId = req.user._id; // From auth middleware

    console.log('📋 Fetching orders for tailor:', tailorId);

    // Find all bookings where this tailor is involved with successful payments
    const orders = await Booking.find({
      tailorId: tailorId,
      isActive: true,
      'payment.status': { $in: ['paid', 'success', 'successful'] } // Filter for successful payments
    })
    .populate('deliveryAddress')
    .populate('measurementId')
    .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} orders with successful payments for tailor`);
    
    // Fetch customer data from auth-service for each order
    const ordersWithCustomerData = await Promise.all(orders.map(async (order) => {
      try {
        // Get customer data from auth-service
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
        const customerResponse = await axios.get(`${authServiceUrl}/api/customers/${order.customerId}`, {
          headers: {
            'Authorization': req.headers.authorization // Pass through the auth token
          }
        });
        
        if (customerResponse.data.success) {
          order.customerId = customerResponse.data.data;
        }
      } catch (error) {
        console.error('Error fetching customer data:', error.message);
        // Keep the original customerId if fetch fails
      }
      
      // Ensure delivery address is populated
      if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
        // Address is already populated
        console.log('Delivery address already populated:', order.deliveryAddress);
      } else if (order.deliveryAddress) {
        // Address is just an ID, try to populate it
        try {
          const Address = require('../models/address');
          const address = await Address.findById(order.deliveryAddress);
          if (address) {
            order.deliveryAddress = address;
          }
        } catch (error) {
          console.error('Error fetching delivery address:', error.message);
        }
      }
      
      return order;
    }));

    // Debug: Log the first order to see the data structure
    if (ordersWithCustomerData.length > 0) {
      console.log('🔍 Debug - First order data structure:');
      console.log('Order ID:', ordersWithCustomerData[0]._id);
      console.log('Customer Data:', JSON.stringify(ordersWithCustomerData[0].customerId, null, 2));
      console.log('Delivery Address:', JSON.stringify(ordersWithCustomerData[0].deliveryAddress, null, 2));
    }

    res.json({
      success: true,
      count: ordersWithCustomerData.length,
      data: ordersWithCustomerData
    });

  } catch (error) {
    console.error('❌ Error fetching tailor orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get active/pending orders for tailor with successful payments
 */
const getActiveOrders = async (req, res) => {
  try {
    const tailorId = req.user._id;

    console.log('📋 Fetching active orders for tailor:', tailorId);

    const orders = await Booking.find({
      tailorId: tailorId,
      isActive: true,
      status: { $in: ['pending', 'confirmed', 'in_progress', 'ready_for_fitting'] },
      'payment.status': { $in: ['paid', 'success', 'successful'] } // Filter for successful payments
    })
    .populate('deliveryAddress')
    .populate('measurementId')
    .sort({ 'orderDetails.deliveryDate': 1 }); // Sort by delivery date

    console.log(`✅ Found ${orders.length} active orders with successful payments for tailor`);
    
    // Fetch customer data from auth-service for each order
    const ordersWithCustomerData = await Promise.all(orders.map(async (order) => {
      try {
        // Get customer data from auth-service
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
        const customerResponse = await axios.get(`${authServiceUrl}/api/customers/${order.customerId}`, {
          headers: {
            'Authorization': req.headers.authorization // Pass through the auth token
          }
        });
        
        if (customerResponse.data.success) {
          order.customerId = customerResponse.data.data;
        }
      } catch (error) {
        console.error('Error fetching customer data:', error.message);
        // Keep the original customerId if fetch fails
      }
      
      // Ensure delivery address is populated
      if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
        // Address is already populated
        console.log('Delivery address already populated:', order.deliveryAddress);
      } else if (order.deliveryAddress) {
        // Address is just an ID, try to populate it
        try {
          const Address = require('../models/address');
          const address = await Address.findById(order.deliveryAddress);
          if (address) {
            order.deliveryAddress = address;
          }
        } catch (error) {
          console.error('Error fetching delivery address:', error.message);
        }
      }
      
      return order;
    }));

    res.json({
      success: true,
      count: ordersWithCustomerData.length,
      data: ordersWithCustomerData
    });

  } catch (error) {
    console.error('❌ Error fetching active orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active orders',
      error: error.message
    });
  }
};

/**
 * Get a specific order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const tailorId = req.user._id;
    const orderId = req.params.id;

    const order = await Booking.findOne({
      _id: orderId,
      tailorId: tailorId,
      isActive: true
    })
    .populate('customerId', 'firstname lastname email phone countryCode')
    .populate('deliveryAddress')
    .populate('measurementId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have access to this order'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Update order status (tailor action)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const tailorId = req.user._id;
    const orderId = req.params.id;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'in_progress', 'ready_for_fitting', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const order = await Booking.findOne({
      _id: orderId,
      tailorId: tailorId,
      isActive: true
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status
    order.status = status;

    // Update timeline based on status
    const now = new Date();
    switch (status) {
      case 'confirmed':
        order.timeline.confirmationDate = now;
        break;
      case 'in_progress':
        order.timeline.startDate = now;
        break;
      case 'ready_for_fitting':
        order.timeline.fittingDate = now;
        break;
      case 'completed':
        order.timeline.completionDate = now;
        break;
    }

    // Add message if notes provided
    if (notes) {
      order.messages.push({
        sender: 'tailor',
        message: notes,
        timestamp: now
      });
    }

    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

/**
 * Add a message/note to an order
 */
const addOrderMessage = async (req, res) => {
  try {
    const tailorId = req.user._id;
    const orderId = req.params.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const order = await Booking.findOne({
      _id: orderId,
      tailorId: tailorId,
      isActive: true
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.messages.push({
      sender: 'tailor',
      message: message.trim(),
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Message added successfully',
      data: order
    });

  } catch (error) {
    console.error('❌ Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

/**
 * Get order statistics for tailor dashboard (only successful payments)
 */
const getOrderStatistics = async (req, res) => {
  try {
    const tailorId = req.user._id;

    const stats = await Booking.aggregate([
      {
        $match: {
          tailorId: new mongoose.Types.ObjectId(tailorId),
          isActive: true,
          'payment.status': { $in: ['paid', 'success', 'successful'] }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    const totalOrders = await Booking.countDocuments({
      tailorId: tailorId,
      isActive: true,
      'payment.status': { $in: ['paid', 'success', 'successful'] }
    });

    const completedOrders = await Booking.countDocuments({
      tailorId: tailorId,
      isActive: true,
      status: 'completed',
      'payment.status': { $in: ['paid', 'success', 'successful'] }
    });

    const activeOrders = await Booking.countDocuments({
      tailorId: tailorId,
      isActive: true,
      status: { $in: ['pending', 'confirmed', 'in_progress', 'ready_for_fitting'] },
      'payment.status': { $in: ['paid', 'success', 'successful'] }
    });

    const totalRevenue = await Booking.aggregate([
      {
        $match: {
          tailorId: new mongoose.Types.ObjectId(tailorId),
          isActive: true,
          'payment.status': { $in: ['paid', 'success', 'successful'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.tailoringCost' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        activeOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

module.exports = {
  getTailorOrders,
  getActiveOrders,
  getOrderById,
  updateOrderStatus,
  addOrderMessage,
  getOrderStatistics
};

