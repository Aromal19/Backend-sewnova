const mongoose = require('mongoose');
const Booking = require('../models/booking');
const Fabric = require('../models/fabric');
const Customer = require('../models/customer');
const Order = require('../models/order');
const Tailor = require('../models/tailor');
const { sendNewOrderNotification, sendPaymentConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/orderEmailService');

// Get customer bookings
const getCustomerBookings = async (req, res) => {
  try {
    const { status, bookingType, page = 1, limit = 10 } = req.query;
    const customerId = req.user._id;

    // Build filter object
    const filter = {
      customerId,
      isActive: true
    };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Add booking type filter if provided
    if (bookingType) {
      filter.bookingType = bookingType;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings with populated references
    const bookings = await Booking.find(filter)
      .populate('tailorId', 'firstname lastname email phone location rating specialization')
      .populate('fabricId', 'name type color pattern price sellerId')
      .populate('deliveryAddress', 'addressLine locality city district state pincode country')
      .populate('measurementId', 'measurements createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalBookings / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalBookings,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

// Get customer orders (enhanced version for orders page)
const getCustomerOrders = async (req, res) => {
  try {
    console.log('🔍 GET CUSTOMER ORDERS - PAID BOOKINGS ONLY');
    console.log('👤 Request object:', req);
    console.log('👤 User object:', req.user);

    // Check if user is authenticated
    if (!req.user) {
      console.error('❌ No user found in request');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Try different possible user ID fields
    const customerId = req.user._id || req.user.id || req.user.userId;
    if (!customerId) {
      console.error('❌ No customer ID found in user object');
      console.error('❌ User object structure:', JSON.stringify(req.user, null, 2));
      return res.status(401).json({
        success: false,
        message: 'Customer ID not found',
        userObject: req.user
      });
    }

    const { status, bookingType, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    console.log('👤 User ID:', customerId);
    console.log('📋 Query params:', { status, bookingType, page, limit, sortBy, sortOrder });

    // Build filter object - start with basic filter, then add paid requirement
    const filter = {
      customerId,
      isActive: true
    };

    // Add paid status filter
    filter['payment.status'] = 'paid';

    console.log('🔍 Filter object (paid bookings only):', filter);

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Add booking type filter if provided
    if (bookingType) {
      filter.bookingType = bookingType;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get bookings with populated references - only paid bookings
    console.log('🔍 Executing database query for PAID bookings...');
    console.log('🔍 Final filter:', filter);
    console.log('🔍 Sort object:', sort);
    console.log('🔍 Skip:', skip, 'Limit:', parseInt(limit));

    let bookings = [];
    try {
      bookings = await Booking.find(filter)
        .populate('tailorId', 'firstname lastname email phone location rating specialization')
        .populate('fabricId', 'name type color pattern price sellerId')
        .populate('deliveryAddress', 'addressLine locality city district state pincode country')
        .populate('measurementId', 'measurements createdAt')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database query failed',
        error: dbError.message
      });
    }

    console.log('📊 Found PAID bookings:', bookings.length);
    console.log('📊 First paid booking (if any):', bookings[0] || 'No paid bookings found');

    // Get total count for pagination - only paid bookings
    let totalBookings = 0;
    try {
      totalBookings = await Booking.countDocuments(filter);
      console.log('📊 Total PAID bookings count:', totalBookings);
    } catch (countError) {
      console.error('❌ Count query error:', countError);
      return res.status(500).json({
        success: false,
        message: 'Count query failed',
        error: countError.message
      });
    }

    // Debug: Check if there are any bookings in the database at all
    const allBookingsCount = await Booking.countDocuments({});
    console.log('📊 Total bookings in database:', allBookingsCount);

    // Debug: Check if there are any bookings for this customer without isActive filter
    const customerBookingsCount = await Booking.countDocuments({ customerId });
    console.log('📊 Bookings for this customer (any status):', customerBookingsCount);

    // Debug: Check paid bookings for this customer
    const paidBookingsCount = await Booking.countDocuments({
      customerId,
      'payment.status': 'paid'
    });
    console.log('📊 PAID bookings for this customer:', paidBookingsCount);

    // Debug: Check what customer IDs exist in the database
    const sampleBookings = await Booking.find({}).limit(3).select('customerId payment.status').lean();
    console.log('📊 Sample customer IDs and payment status:', sampleBookings.map(b => ({
      customerId: b.customerId,
      paymentStatus: b.payment?.status
    })));

    // Debug: Check if customerId is a string or ObjectId
    console.log('🔍 Customer ID type:', typeof customerId);
    console.log('🔍 Customer ID value:', customerId);
    console.log('🔍 Is ObjectId valid:', mongoose.Types.ObjectId.isValid(customerId));

    // Debug: Try different query variations for paid bookings
    console.log('🔍 Trying query with string customerId for paid bookings...');
    const stringQuery = await Booking.find({
      customerId: customerId.toString(),
      'payment.status': 'paid'
    }).countDocuments();
    console.log('📊 String query result (paid):', stringQuery);

    console.log('🔍 Trying query with ObjectId for paid bookings...');
    const objectIdQuery = await Booking.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      'payment.status': 'paid'
    }).countDocuments();
    console.log('📊 ObjectId query result (paid):', objectIdQuery);

    // Debug: Check all paid bookings without any filter
    const allPaidBookings = await Booking.find({ 'payment.status': 'paid' }).limit(5).select('customerId status isActive payment.status').lean();
    console.log('📊 All paid bookings sample:', allPaidBookings);

    // Calculate pagination info
    const totalPages = Math.ceil(totalBookings / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format bookings for frontend
    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      bookingType: booking.bookingType,
      status: booking.status,
      orderDetails: booking.orderDetails,
      pricing: booking.pricing,
      payment: booking.payment,
      timeline: booking.timeline,
      tailor: booking.tailorId ? {
        id: booking.tailorId._id,
        name: `${booking.tailorId.firstname} ${booking.tailorId.lastname}`,
        email: booking.tailorId.email,
        phone: booking.tailorId.phone,
        location: booking.tailorId.location,
        rating: booking.tailorId.rating,
        specialization: booking.tailorId.specialization
      } : null,
      fabric: booking.fabricId ? {
        id: booking.fabricId._id,
        name: booking.fabricId.name,
        type: booking.fabricId.type,
        color: booking.fabricId.color,
        pattern: booking.fabricId.pattern,
        price: booking.fabricId.price,
        sellerId: booking.fabricId.sellerId
      } : null,
      deliveryAddress: booking.deliveryAddress ? {
        id: booking.deliveryAddress._id,
        addressLine: booking.deliveryAddress.addressLine,
        locality: booking.deliveryAddress.locality,
        city: booking.deliveryAddress.city,
        district: booking.deliveryAddress.district,
        state: booking.deliveryAddress.state,
        pincode: booking.deliveryAddress.pincode,
        country: booking.deliveryAddress.country
      } : null,
      measurements: booking.measurementId ? {
        id: booking.measurementId._id,
        data: booking.measurementId.measurements,
        createdAt: booking.measurementId.createdAt
      } : booking.measurementSnapshot,
      messages: booking.messages || [],
      review: booking.review || null,
      cancellation: booking.cancellation || null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));

    res.json({
      success: true,
      data: formattedBookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalBookings,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      filters: {
        status: status || null,
        bookingType: bookingType || null,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
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
  console.log('🔍 CREATE BOOKING REQUEST RECEIVED');
  console.log('🌐 Request URL:', req.originalUrl);
  console.log('🔗 Request method:', req.method);
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
  console.log('👤 User:', req.user);
  console.log('🔑 Headers:', JSON.stringify(req.headers, null, 2));

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
    // Only require measurements for tailor and complete bookings, not for fabric-only
    if ((bookingType === 'tailor' || bookingType === 'complete') && !measurementId && (!measurementSnapshot || Object.keys(measurementSnapshot).length === 0)) {
      return res.status(400).json({ success: false, message: 'Provide measurementId or measurementSnapshot for tailor bookings' });
    }

    // Get customerId from request body (for payment service calls) or from authenticated user
    console.log('=== BOOKING CREATION DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('Request user:', req.user);
    console.log('Payload customerId:', payload.customerId);
    console.log('User ID from req.user:', req.user ? (req.user._id || req.user.id) : 'No user');
    console.log('Tailor ID from payload:', tailorId);
    console.log('Fabric ID from payload:', fabricId);

    const resolvedCustomerId = payload.customerId || (req.user && (req.user._id || req.user.id)) || undefined;
    console.log('Final resolved customerId:', resolvedCustomerId);
    console.log('=== END DEBUG ===');

    if (!resolvedCustomerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: customer not resolved' });
    }

    // Validate that customer and tailor IDs are different
    if (tailorId && resolvedCustomerId === tailorId) {
      console.error('❌ Customer ID and Tailor ID are the same:', resolvedCustomerId);
      return res.status(400).json({
        success: false,
        message: 'Customer ID and Tailor ID cannot be the same'
      });
    }

    // Validate that customer and fabric IDs are different (if fabricId exists)
    if (fabricId && resolvedCustomerId === fabricId) {
      console.error('❌ Customer ID and Fabric ID are the same:', resolvedCustomerId);
      return res.status(400).json({
        success: false,
        message: 'Customer ID and Fabric ID cannot be the same'
      });
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

    // ENRICH DATA: Fetch Fabric to ensure sellerId is captured
    let finalFabricDetails = fabricDetails || {};
    if (fabricObjectId) {
      try {
        const fabricDoc = await Fabric.findById(fabricObjectId);
        if (fabricDoc) {
          console.log('🧵 Found Fabric for Booking:', fabricDoc.name, 'Seller:', fabricDoc.sellerId);
          finalFabricDetails = {
            ...finalFabricDetails,
            sellerId: fabricDoc.sellerId, // Critical: Enforce Link
            name: finalFabricDetails.name || fabricDoc.name,
            type: finalFabricDetails.type || fabricDoc.type,
            price: finalFabricDetails.price || fabricDoc.price,
            color: finalFabricDetails.color || fabricDoc.color,
            pattern: finalFabricDetails.pattern || fabricDoc.pattern
          };
        } else {
          console.warn('⚠️ Fabric ID provided but Fabric not found:', fabricObjectId);
          console.warn('⚠️ Proceeding with booking creation without seller details');
        }
      } catch (err) {
        console.error('⚠️ Error fetching fabric for details:', err);
        console.warn('⚠️ Proceeding with booking creation without seller details');
      }
    }

    // Fetch customer email for the booking
    let customerEmail = null;
    try {
      // Customer data is in auth-service, get it from req.user or make API call
      if (req.user && req.user.email) {
        customerEmail = req.user.email;
        console.log('✅ Customer email from req.user:', customerEmail);
      } else {
        // Fallback: try to get from customer service database
        const Customer = mongoose.model('Customer');
        const customer = await Customer.findById(resolvedCustomerId).select('email');
        customerEmail = customer?.email;
        console.log('✅ Customer email from database:', customerEmail);
      }
    } catch (emailError) {
      console.error('❌ Error fetching customer email:', emailError);
      // Don't fail the booking creation, but log the issue
      customerEmail = 'unknown@example.com'; // Fallback email
    }

    // Ensure we have an email
    if (!customerEmail) {
      console.warn('⚠️ No customer email found, using fallback');
      customerEmail = 'unknown@example.com';
    }

    const booking = new Booking({
      customerId: resolvedCustomerId,
      userEmail: customerEmail,
      bookingType,
      tailorId: tailorObjectId,
      sellerId: finalFabricDetails.sellerId, // Enforce Root Level Seller ID
      fabricId: fabricObjectId,
      measurementId: measurementObjectId,
      measurementSnapshot: measurementSnapshot || undefined,
      deliveryAddress: addressObjectId,
      orderDetails: {
        garmentType: orderDetails.garmentType || 'other',
        quantity: orderDetails.quantity || 1,
        designDescription: orderDetails.designDescription || '',
        specialInstructions: orderDetails.specialInstructions || '',
        deliveryDate: orderDetails.deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      pricing: (function () {
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
      fabricDetails: Object.keys(finalFabricDetails).length > 0 ? finalFabricDetails : undefined
    });

    // Save booking to database FIRST
    console.log('💾 Saving booking to database...');
    console.log('📋 Booking data before save:', JSON.stringify(booking.toObject(), null, 2));
    console.log('📧 User email being saved:', customerEmail);
    console.log('🆔 Customer ID being saved:', resolvedCustomerId);

    try {
      const savedBooking = await booking.save();
      console.log('✅ Booking saved to database successfully:', savedBooking._id);
      console.log('✅ Saved booking userEmail:', savedBooking.userEmail);
      console.log('✅ Saved booking customerId:', savedBooking.customerId);

      // Verify the booking was actually saved by querying it back
      const verificationBooking = await Booking.findById(savedBooking._id);
      if (verificationBooking) {
        console.log('✅ Booking verification successful - booking exists in database');
        console.log('✅ Verification - userEmail:', verificationBooking.userEmail);
      } else {
        console.error('❌ Booking verification failed - booking not found in database');
      }
    } catch (saveError) {
      console.error('❌ Failed to save booking to database:', saveError);
      console.error('❌ Validation errors:', saveError.errors);
      console.error('❌ Save error details:', {
        message: saveError.message,
        name: saveError.name,
        code: saveError.code,
        errors: saveError.errors
      });
      return res.status(400).json({
        success: false,
        message: 'Failed to save booking',
        error: saveError.message,
        validationErrors: saveError.errors
      });
    }

    // If payment is successful, send email notification to tailor
    if (payment.status === 'paid' && tailorId) {
      try {
        // Fetch tailor details to get email
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

      // Send confirmation email to customer
      try {
        await sendPaymentConfirmationEmail(booking);
      } catch (customerEmailError) {
        console.error('❌ Error sending confirmation email to customer:', customerEmailError);
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

    // Update booking status in database FIRST
    console.log('💾 Updating booking status in database...');
    booking.status = status;
    await booking.save();
    console.log('✅ Booking status updated in database successfully:', booking._id);

    // Send status update email to customer
    try {
      await sendOrderStatusUpdateEmail(booking);
    } catch (emailError) {
      console.error('❌ Error sending status update email to customer:', emailError);
      // Don't fail the status update if email fails
    }

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
  console.log('🔍 PAYMENT SUCCESS REQUEST RECEIVED');
  console.log('📋 Request params:', req.params);
  console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

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
      console.error('❌ Missing required payment information:', {
        bookingId: !!bookingId,
        razorpayOrderId: !!razorpayOrderId,
        razorpayPaymentId: !!razorpayPaymentId,
        razorpaySignature: !!razorpaySignature
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information',
        details: {
          bookingId: !!bookingId,
          razorpayOrderId: !!razorpayOrderId,
          razorpayPaymentId: !!razorpayPaymentId,
          razorpaySignature: !!razorpaySignature
        }
      });
    }

    // Validate Razorpay IDs format (basic validation)
    if (!razorpayOrderId.startsWith('order_') && !razorpayOrderId.startsWith('test_')) {
      console.warn('⚠️ Razorpay Order ID format might be incorrect:', razorpayOrderId);
    }

    if (!razorpayPaymentId.startsWith('pay_') && !razorpayPaymentId.startsWith('test_')) {
      console.warn('⚠️ Razorpay Payment ID format might be incorrect:', razorpayPaymentId);
    }

    // Update booking with payment success - DATABASE UPDATE FIRST
    console.log('💾 Updating booking in database...');
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

    console.log('✅ Booking updated in database successfully:', updatedBooking._id);

    // NOW send emails AFTER database is updated
    console.log('📧 Sending emails after successful database update...');

    // Send notification to tailor about new order
    try {
      await sendNewOrderNotification(updatedBooking);
    } catch (notificationError) {
      console.error('Error sending notification to tailor:', notificationError);
      // Don't fail the payment success if notification fails
    }

    // Send confirmation email to customer
    try {
      await sendPaymentConfirmationEmail(updatedBooking);
    } catch (emailError) {
      console.error('Error sending confirmation email to customer:', emailError);
      // Don't fail the payment success if email fails
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

// Simple test function without authentication
const testAPI = async (req, res) => {
  try {
    console.log('🧪 TEST API - No authentication required');

    // Test basic database connection
    const allBookings = await Booking.find({}).limit(1).lean();
    console.log('🧪 Database connection test:', allBookings.length > 0 ? 'SUCCESS' : 'NO DATA');

    res.json({
      success: true,
      message: 'API is working',
      databaseConnected: true,
      totalBookings: allBookings.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test API error:', error);
    res.status(500).json({
      success: false,
      message: 'Test API failed',
      error: error.message
    });
  }
};

// Debug user object function
const debugUser = async (req, res) => {
  try {
    console.log('🔍 DEBUG USER OBJECT');
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 User object:', req.user);
    console.log('🔍 User type:', typeof req.user);
    console.log('🔍 User keys:', req.user ? Object.keys(req.user) : 'No user');

    res.json({
      success: true,
      message: 'User debug info',
      user: req.user,
      userType: typeof req.user,
      userKeys: req.user ? Object.keys(req.user) : [],
      hasUserId: !!(req.user && (req.user._id || req.user.id || req.user.userId)),
      userId: req.user ? (req.user._id || req.user.id || req.user.userId) : null
    });
  } catch (error) {
    console.error('❌ Debug user error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug user failed',
      error: error.message
    });
  }
};

// Debug function to check database contents
const debugDatabase = async (req, res) => {
  try {
    console.log('🔍 DEBUG DATABASE CONTENTS - FOCUS ON PAID BOOKINGS');

    // Get all bookings
    const allBookings = await Booking.find({}).lean();
    console.log('📊 Total bookings in database:', allBookings.length);

    // Get current user
    const customerId = req.user._id;
    console.log('👤 Current user ID:', customerId);
    console.log('👤 User ID type:', typeof customerId);

    // Check bookings for this customer
    const userBookings = await Booking.find({ customerId }).lean();
    console.log('📊 Bookings for current user:', userBookings.length);

    // Check PAID bookings for this customer
    const userPaidBookings = await Booking.find({
      customerId,
      'payment.status': 'paid'
    }).lean();
    console.log('📊 PAID bookings for current user:', userPaidBookings.length);

    // Check all paid bookings in database
    const allPaidBookings = await Booking.find({ 'payment.status': 'paid' }).lean();
    console.log('📊 Total PAID bookings in database:', allPaidBookings.length);

    // Show sample data
    if (allBookings.length > 0) {
      console.log('📊 Sample booking from database:', {
        id: allBookings[0]._id,
        customerId: allBookings[0].customerId,
        status: allBookings[0].status,
        isActive: allBookings[0].isActive,
        bookingType: allBookings[0].bookingType,
        paymentStatus: allBookings[0].payment?.status
      });
    }

    // Show sample paid booking if exists
    if (allPaidBookings.length > 0) {
      console.log('📊 Sample PAID booking:', {
        id: allPaidBookings[0]._id,
        customerId: allPaidBookings[0].customerId,
        paymentStatus: allPaidBookings[0].payment?.status,
        status: allPaidBookings[0].status
      });
    }

    res.json({
      success: true,
      debug: {
        totalBookings: allBookings.length,
        totalPaidBookings: allPaidBookings.length,
        userBookings: userBookings.length,
        userPaidBookings: userPaidBookings.length,
        currentUserId: customerId,
        sampleBooking: allBookings[0] || null,
        samplePaidBooking: allPaidBookings[0] || null
      }
    });
  } catch (error) {
    console.error('Error debugging database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug database'
    });
  }
};

// Debug function to check recent bookings
const debugRecentBookings = async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking recent bookings...');

    // Get recent bookings from the last 24 hours
    const recentBookings = await Booking.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10);

    console.log('📊 Recent bookings count:', recentBookings.length);
    console.log('📋 Recent bookings:', JSON.stringify(recentBookings, null, 2));

    res.json({
      success: true,
      message: 'Recent bookings retrieved',
      count: recentBookings.length,
      bookings: recentBookings
    });
  } catch (error) {
    console.error('❌ Error fetching recent bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent bookings',
      error: error.message
    });
  }
};

// Debug function to create sample booking data
const createSampleBooking = async (req, res) => {
  try {
    const customerId = req.user._id;

    // Get customer email for sample booking
    const Customer = require('../models/customer');
    const customer = await Customer.findById(customerId).select('email');

    const sampleBooking = new Booking({
      customerId: customerId,
      userEmail: customer?.email || 'test@example.com',
      bookingType: 'complete',
      orderDetails: {
        garmentType: 'shirt',
        quantity: 1,
        designDescription: 'Sample shirt order',
        specialInstructions: 'Test order',
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      pricing: {
        fabricCost: 500,
        tailoringCost: 300,
        additionalCharges: 0,
        totalAmount: 800,
        advanceAmount: 200,
        remainingAmount: 600
      },
      payment: {
        status: 'paid',
        method: 'razorpay',
        paidAmount: 200,
        paidAt: new Date()
      },
      status: 'confirmed',
      timeline: {
        bookingDate: new Date(),
        confirmationDate: new Date()
      }
    });

    await sampleBooking.save();

    res.json({
      success: true,
      message: 'Sample booking created',
      data: sampleBooking
    });
  } catch (error) {
    console.error('Error creating sample booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sample booking'
    });
  }
};

module.exports = {
  getCustomerBookings,
  getCustomerOrders,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  updateBookingStatus,
  completeBooking,
  updatePaymentStatus,
  addBookingReview,
  handlePaymentSuccess,
  createSampleBooking,
  debugDatabase,
  debugRecentBookings,
  testAPI,
  debugUser
};