const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Simple booking endpoint - no model imports, direct database access
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Simple Booking Endpoint: getAllBookings called');
    
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

    console.log('🔍 Filter:', filter);
    console.log('📊 Pagination:', { skip, limit: parseInt(limit) });
    console.log('🔄 Sort:', sort);

    // Get bookings directly from database without populate
    const bookings = await mongoose.connection.db.collection('bookings').find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Get total count for pagination
    const totalBookings = await mongoose.connection.db.collection('bookings').countDocuments(filter);

    console.log('✅ Found bookings:', bookings.length);
    console.log('📊 Total bookings:', totalBookings);

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
    console.error('❌ Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings: ' + error.message
    });
  }
});

// Get booking statistics
router.get('/statistics', async (req, res) => {
  try {
    const totalBookings = await mongoose.connection.db.collection('bookings').countDocuments();
    const pendingBookings = await mongoose.connection.db.collection('bookings').countDocuments({ status: 'pending' });
    const confirmedBookings = await mongoose.connection.db.collection('bookings').countDocuments({ status: 'confirmed' });
    const inProgressBookings = await mongoose.connection.db.collection('bookings').countDocuments({ status: 'in_progress' });
    const readyForFittingBookings = await mongoose.connection.db.collection('bookings').countDocuments({ status: 'ready_for_fitting' });
    const completedBookings = await mongoose.connection.db.collection('bookings').countDocuments({ status: 'completed' });
    const deliveredBookings = await mongoose.connection.db.collection('bookings').countDocuments({ status: 'delivered' });
    const cancelledBookings = await mongoose.connection.db.collection('bookings').countDocuments({ status: 'cancelled' });

    // Get total revenue from bookings
    const revenueResult = await mongoose.connection.db.collection('bookings').aggregate([
      { $match: { status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$pricing.totalAmount' } } }
    ]).toArray();
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get bookings by type
    const bookingsByType = await mongoose.connection.db.collection('bookings').aggregate([
      { $group: { _id: '$bookingType', count: { $sum: 1 } } }
    ]).toArray();

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
    const recentBookings = await mongoose.connection.db.collection('bookings').countDocuments({
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
    console.error('❌ Error fetching booking statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking statistics'
    });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await mongoose.connection.db.collection('bookings').findOne({
      _id: new mongoose.Types.ObjectId(req.params.id)
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
    console.error('❌ Error fetching booking by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking'
    });
  }
});

// Update booking status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'ready_for_fitting', 'completed', 'cancelled', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await mongoose.connection.db.collection('bookings').findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { 
        $set: {
          status,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: result.value
    });
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
});

module.exports = router;
