const Booking = require('../models/booking');

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

// Create a new booking
const createBooking = async (req, res) => {
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

    // Validate required fields
    if (!bookingType || !tailorId || !measurementId || !addressId) {
      return res.status(400).json({
        success: false,
        message: 'Booking type, tailor, measurement, and address are required'
      });
    }

    const bookingData = {
      customerId: req.user._id,
      bookingType,
      tailorId,
      fabricId,
      measurementId,
      addressId,
      description: description || '',
      preferredDate: preferredDate || new Date(),
      budget: budget || 0,
      status: status || 'pending'
    };

    const booking = new Booking(bookingData);
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking'
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

module.exports = {
  getCustomerBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  updateBookingStatus,
  completeBooking,
  updatePaymentStatus,
  addBookingReview
}; 