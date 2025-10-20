const mongoose = require('mongoose');
const Booking = require('../models/booking');
const Order = require('../models/order');
const { sendNewOrderNotification } = require('../../auth-service/utils/orderEmailService');

// Get customer bookings
const getCustomerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      customerId: req.user._id, 
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// Get a specific booking
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

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
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
};

// Create a new booking (order save; can be called pre-payment or after verification)
const createBooking = async (req, res) => {
  try {
    const payload = req.body || {};

    // Expected minimal payload
    const {
      bookingType,
      tailorId,
      fabricId,
      measurementId,
      measurementSnapshot,
      addressId,
      customerId,
      orderDetails = {},
      pricing = {},
      payment = {},
      tailorDetails,
      fabricDetails
    } = payload;

    if (!bookingType || !addressId) {
      return res.status(400).json({ success: false, message: 'bookingType and addressId are required' });
    }

    // Validate required IDs based on bookingType
    if ((bookingType === 'fabric' || bookingType === 'complete') && !fabricId) {
      return res.status(400).json({ success: false, message: 'fabricId is required for this booking type' });
    }
    if ((bookingType === 'tailor' || bookingType === 'complete') && !tailorId) {
      return res.status(400).json({ success: false, message: 'tailorId is required for this booking type' });
    }
    if (!measurementId && (!measurementSnapshot || Object.keys(measurementSnapshot).length === 0)) {
      return res.status(400).json({ success: false, message: 'Provide measurementId or measurementSnapshot' });
    }

    // Get customerId from request body (for payment service calls) or from authenticated user
    console.log('=== BOOKING CREATION DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Request user:', req.user);
    console.log('Payload customerId:', payload.customerId);
    console.log('User ID from req.user:', req.user ? (req.user._id || req.user.id) : 'No user');
    
    const resolvedCustomerId = payload.customerId || (req.user && (req.user._id || req.user.id)) || undefined;
    console.log('Final resolved customerId:', resolvedCustomerId);
    console.log('=== END DEBUG ===');
    
    if (!resolvedCustomerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: customer not resolved' });
    }

    // Validate/massage ids
    const asObjectId = (val) => (typeof val === 'string' && mongoose.isValidObjectId(val) ? new mongoose.Types.ObjectId(val) : undefined);
    const tailorObjectId = asObjectId(tailorId);
    const fabricObjectId = asObjectId(fabricId);
    const measurementObjectId = asObjectId(measurementId);
    const addressObjectId = asObjectId(addressId);

    if (!addressObjectId) {
      return res.status(400).json({ success: false, message: 'addressId is invalid' });
    }

    if ((bookingType === 'fabric' || bookingType === 'complete') && !fabricObjectId) {
      return res.status(400).json({ success: false, message: 'fabricId is invalid or missing' });
    }
    if ((bookingType === 'tailor' || bookingType === 'complete') && !tailorObjectId) {
      return res.status(400).json({ success: false, message: 'tailorId is invalid or missing' });
    }

    const booking = new Booking({
      customerId: resolvedCustomerId,
      bookingType,
      tailorId: tailorObjectId,
      fabricId: fabricObjectId,
      measurementId: measurementObjectId,
      measurementSnapshot: measurementSnapshot || undefined,
      deliveryAddress: addressObjectId,
      orderDetails: {
        garmentType: orderDetails.garmentType || 'other',
        quantity: orderDetails.quantity || 1,
        designDescription: orderDetails.designDescription || '',
        specialInstructions: orderDetails.specialInstructions || '',
        deliveryDate: orderDetails.deliveryDate || new Date(Date.now() + 7*24*60*60*1000)
      },
      pricing: (function() {
        const fabricCost = Number(pricing.fabricCost || 0);
        const tailoringCost = Number(pricing.tailoringCost || 0);
        const additionalCharges = Number(pricing.additionalCharges || 0);
        const computedTotal = fabricCost + tailoringCost + additionalCharges;
        const totalAmount = Number(pricing.totalAmount || computedTotal);
        const advanceAmount = Number(pricing.advanceAmount || 0);
        const remainingAmount = Math.max(totalAmount - advanceAmount, 0);
        return { fabricCost, tailoringCost, additionalCharges, totalAmount, advanceAmount, remainingAmount };
      })(),
      payment: {
        status: payment.status || 'pending',
        method: payment.method || 'razorpay',
        gatewayOrderId: payment.gatewayOrderId,
        gatewayPaymentId: payment.gatewayPaymentId,
        gatewaySignature: payment.gatewaySignature,
        paidAmount: payment.paidAmount || 0,
        paidAt: payment.paidAt || undefined
      },
      status: 'confirmed', // Set status to confirmed for paid bookings
      tailorDetails: tailorDetails || undefined,
      fabricDetails: fabricDetails || undefined
    });

    await booking.save();

    // If payment is successful, send email notification to tailor
    if (payment.status === 'paid' && tailorId) {
      try {
        // Fetch tailor details to get email
        const Tailor = mongoose.model('Tailor');
        const tailor = await Tailor.findById(tailorId).select('email firstname lastname');
        
        // Fetch customer details
        const Customer = mongoose.model('Customer');
        const customer = await Customer.findById(resolvedCustomerId).select('firstname lastname email phone countryCode');
        
        // Fetch delivery address
        const Address = mongoose.model('Address');
        const address = await Address.findById(addressObjectId);

        if (tailor && tailor.email) {
          console.log('📧 Sending order notification to tailor:', tailor.email);
          
          const orderNotificationDetails = {
            orderId: booking._id.toString().substring(0, 10).toUpperCase(),
            customerName: `${customer.firstname} ${customer.lastname}`,
            customerEmail: customer.email,
            customerPhone: `${customer.countryCode || '+91'} ${customer.phone}`,
            garmentType: orderDetails.garmentType || 'Custom',
            quantity: orderDetails.quantity || 1,
            designDescription: orderDetails.designDescription || 'No description provided',
            specialInstructions: orderDetails.specialInstructions || 'None',
            deliveryDate: orderDetails.deliveryDate,
            measurements: measurementSnapshot || {},
            totalAmount: pricing.totalAmount || 0,
            advanceAmount: pricing.advanceAmount || 0,
            deliveryAddress: {
              addressLine: address?.addressLine || '',
              locality: address?.locality || '',
              city: address?.city || '',
              district: address?.district || '',
              state: address?.state || '',
              pincode: address?.pincode || '',
              country: address?.country || 'India'
            }
          };

          // Send email asynchronously (don't wait for it)
          sendNewOrderNotification(tailor.email, orderNotificationDetails)
            .then(result => {
              if (result.success) {
                console.log('✅ Order notification sent successfully');
              } else {
                console.error('❌ Failed to send order notification:', result.error);
              }
            })
            .catch(err => {
              console.error('❌ Error in email notification:', err);
            });
        }
      } catch (emailError) {
        console.error('❌ Error preparing/sending email notification:', emailError);
        // Don't fail the booking creation if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order saved successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save order'
    });
  }
};

// Update a booking
const updateBooking = async (req, res) => {
  try {
    const {
      bookingType,
      tailorId,
      fabricId,
      measurementId,
      addressId,
      description,
      preferredDate,
      budget,
      status
    } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update fields
    if (bookingType !== undefined) booking.bookingType = bookingType;
    if (tailorId !== undefined) booking.tailorId = tailorId;
    if (fabricId !== undefined) booking.fabricId = fabricId;
    if (measurementId !== undefined) booking.measurementId = measurementId;
    if (addressId !== undefined) booking.addressId = addressId;
    if (description !== undefined) booking.description = description;
    if (preferredDate !== undefined) booking.preferredDate = preferredDate;
    if (budget !== undefined) booking.budget = budget;
    if (status !== undefined) booking.status = status;

    await booking.save();

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking'
    });
  }
};

// Cancel a booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
};

// Complete a booking
const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'Booking completed successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete booking'
    });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, amount } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.paymentStatus = paymentStatus;
    booking.paymentMethod = paymentMethod;
    booking.amount = amount;
    await booking.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
};

// Add review to booking
const addBookingReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      customerId: req.user._id,
      isActive: true
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.review = {
      rating,
      comment,
      createdAt: new Date()
    };
    await booking.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review'
    });
  }
};

// Handle payment success for booking
const handlePaymentSuccess = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod,
      paidAmount,
      paidAt,
      bank,
      cardId
    } = req.body;

    if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }

    // Update booking with payment success
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          'payment.status': 'paid',
          'payment.method': paymentMethod || 'razorpay',
          'payment.gatewayOrderId': razorpayOrderId,
          'payment.gatewayPaymentId': razorpayPaymentId,
          'payment.gatewaySignature': razorpaySignature,
          'payment.paidAmount': paidAmount,
          'payment.paidAt': paidAt || new Date(),
          'status': 'confirmed',
          'updatedAt': new Date()
        }
      },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Send notification to tailor about new order
    try {
      await sendNewOrderNotification(updatedBooking);
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the payment success if notification fails
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status'
    });
  }
};

module.exports = {
  getCustomerBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  updateBookingStatus,
  completeBooking,
  updatePaymentStatus,
  addBookingReview,
  handlePaymentSuccess
}; 