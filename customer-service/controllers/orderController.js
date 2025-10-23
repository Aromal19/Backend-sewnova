const mongoose = require('mongoose');
const Order = require('../models/order');
const Booking = require('../models/booking');

// Create order from booking after payment success
const createOrderFromBooking = async (req, res) => {
  try {
    const {
      bookingId,
      customerId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      totalAmount,
      paymentMethod,
      paymentMetadata
    } = req.body;

    if (!bookingId || !customerId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for order creation'
      });
    }

    // Get the booking details
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Generate unique order ID
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create order items based on booking type
    const items = [];
    
    if (booking.bookingType === 'tailor' || booking.bookingType === 'complete') {
      items.push({
        serviceType: 'tailor',
        quantity: booking.orderDetails.quantity || 1,
        price: booking.pricing.tailoringCost || 0,
        description: `Tailoring service for ${booking.orderDetails.garmentType}`
      });
    }

    if (booking.bookingType === 'fabric' || booking.bookingType === 'complete') {
      items.push({
        serviceType: 'fabric',
        quantity: booking.orderDetails.quantity || 1,
        price: booking.pricing.fabricCost || 0,
        description: `Fabric for ${booking.orderDetails.garmentType}`
      });
    }

    // Add additional charges if any
    if (booking.pricing.additionalCharges > 0) {
      items.push({
        serviceType: 'additional',
        quantity: 1,
        price: booking.pricing.additionalCharges,
        description: 'Additional charges'
      });
    }

    // Create the order
    const order = new Order({
      orderId,
      customerId: new mongoose.Types.ObjectId(customerId),
      bookingId: new mongoose.Types.ObjectId(bookingId),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      items,
      totalAmount: totalAmount || booking.pricing.totalAmount,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: paymentMethod || 'razorpay',
      deliveryAddress: booking.deliveryAddress,
      deliveryDate: booking.orderDetails.deliveryDate,
      paymentMetadata,
      notes: `Order created from booking ${bookingId}`
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error creating order from booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// Get customer orders
const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ 
      customerId: req.user._id 
    })
    .populate('bookingId', 'bookingType orderDetails status')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('bookingId', 'bookingType orderDetails status tailorDetails fabricDetails')
      .populate('deliveryAddress');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Admin endpoints - Get all orders
const getAllOrdersForAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      customerId, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (customerId) {
      filter.customerId = new mongoose.Types.ObjectId(customerId);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get orders with populated references
    const orders = await Order.find(filter)
      .populate('customerId', 'firstname lastname email phone')
      .populate('bookingId', 'bookingType orderDetails status tailorDetails fabricDetails')
      .populate('deliveryAddress')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
          hasPrev: skip > 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all orders for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Admin endpoint - Get order by ID with full details
const getOrderByIdForAdmin = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId', 'firstname lastname email phone')
      .populate('bookingId', 'bookingType orderDetails status tailorDetails fabricDetails')
      .populate('deliveryAddress');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// Admin endpoint - Update order status
const updateOrderStatusForAdmin = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        notes: notes || order.notes,
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate('customerId', 'firstname lastname email phone')
    .populate('bookingId', 'bookingType orderDetails status tailorDetails fabricDetails')
    .populate('deliveryAddress');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Admin endpoint - Get order statistics
const getOrderStatisticsForAdmin = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    // Get total revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped', 'processing'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get orders by status
    const ordersByStatus = {
      pending: pendingOrders,
      confirmed: confirmedOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders
    };

    // Get recent orders (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue,
        recentOrders,
        ordersByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching order statistics for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics'
    });
  }
};

// Admin endpoint - Get all bookings (not orders)
const getAllBookingsForAdmin = async (req, res) => {
  try {
    console.log('🔍 Customer Service: getAllBookingsForAdmin called');
    console.log('📋 Request query:', req.query);
    console.log('👤 User:', req.user ? `${req.user.email} (${req.user.role})` : 'No user');
    
    const { 
      page = 1, 
      limit = 10, 
      status, 
      customerId, 
      bookingType,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (customerId) {
      try {
        filter.customerId = new mongoose.Types.ObjectId(customerId);
      } catch (objectIdError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customerId format'
        });
      }
    }

    if (bookingType) {
      filter.bookingType = bookingType;
    }

    // Add search functionality
    if (search) {
      // Check if search is a valid ObjectId (for tailor ID filtering)
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      
      if (isObjectId) {
        // If search is an ObjectId, filter by tailorId
        filter.tailorId = new mongoose.Types.ObjectId(search);
      } else {
        // Otherwise, use text search
        filter.$or = [
          { userEmail: { $regex: search, $options: 'i' } },
          { 'orderDetails.garmentType': { $regex: search, $options: 'i' } },
          { 'orderDetails.designDescription': { $regex: search, $options: 'i' } },
          { 'tailorDetails.name': { $regex: search, $options: 'i' } },
          { 'fabricDetails.name': { $regex: search, $options: 'i' } }
        ];
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get bookings with populated references
    const bookings = await Booking.find(filter)
      .populate('customerId', 'firstname lastname email phone')
      .populate('tailorId', 'name location rating specialization')
      .populate('deliveryAddress')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalBookings / limit),
          totalBookings,
          hasNext: skip + bookings.length < totalBookings,
          hasPrev: skip > 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching all bookings for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings: ' + error.message
    });
  }
};

// Admin endpoint - Get booking by ID with full details
const getBookingByIdForAdmin = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'firstname lastname email phone')
      .populate('tailorId', 'name location rating specialization')
      .populate('fabricId')
      .populate('measurementId')
      .populate('deliveryAddress');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error fetching booking for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

// Admin endpoint - Update booking status
const updateBookingStatusForAdmin = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'ready_for_fitting', 'completed', 'cancelled', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate('customerId', 'firstname lastname email phone')
    .populate('tailorId', 'name location rating specialization')
    .populate('fabricId')
    .populate('measurementId')
    .populate('deliveryAddress');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking status for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
};

// Admin endpoint - Get booking statistics
const getBookingStatisticsForAdmin = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const inProgressBookings = await Booking.countDocuments({ status: 'in_progress' });
    const readyForFittingBookings = await Booking.countDocuments({ status: 'ready_for_fitting' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const deliveredBookings = await Booking.countDocuments({ status: 'delivered' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    // Get total revenue from bookings
    const revenueResult = await Booking.aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$pricing.totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get bookings by type
    const bookingsByType = await Booking.aggregate([
      { $group: { _id: '$bookingType', count: { $sum: 1 } } }
    ]);

    // Get bookings by status
    const bookingsByStatus = {
      pending: pendingBookings,
      confirmed: confirmedBookings,
      in_progress: inProgressBookings,
      ready_for_fitting: readyForFittingBookings,
      completed: completedBookings,
      delivered: deliveredBookings,
      cancelled: cancelledBookings
    };

    // Get recent bookings (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentBookings = await Booking.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        totalBookings,
        totalRevenue,
        recentBookings,
        bookingsByStatus,
        bookingsByType
      }
    });
  } catch (error) {
    console.error('Error fetching booking statistics for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics'
    });
  }
};

module.exports = {
  createOrderFromBooking,
  getCustomerOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrdersForAdmin,
  getOrderByIdForAdmin,
  updateOrderStatusForAdmin,
  getOrderStatisticsForAdmin,
  getAllBookingsForAdmin,
  getBookingByIdForAdmin,
  updateBookingStatusForAdmin,
  getBookingStatisticsForAdmin
};
