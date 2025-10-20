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

module.exports = {
  createOrderFromBooking,
  getCustomerOrders,
  getOrderById,
  updateOrderStatus
};
