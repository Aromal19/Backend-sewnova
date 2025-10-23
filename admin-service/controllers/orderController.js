const axios = require('axios');

// Configuration for customer service
const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3002';

// Get all bookings from customer service (for admin orders page)
const getAllOrders = async (req, res) => {
  try {
    console.log('🔍 Admin Service: Fetching bookings...');
    console.log('📋 Request headers:', req.headers);
    
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

    // Build query parameters for customer service
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (status) queryParams.append('status', status);
    if (customerId) queryParams.append('customerId', customerId);
    if (bookingType) queryParams.append('bookingType', bookingType);
    if (search) queryParams.append('search', search);

    const customerServiceUrl = `${CUSTOMER_SERVICE_URL}/api/simple-bookings?${queryParams.toString()}`;
    console.log('🌐 Calling customer service:', customerServiceUrl);
    console.log('🔑 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');

    // Make request to customer service for bookings (not orders) - NO auth required
    const response = await axios.get(customerServiceUrl, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('✅ Customer service response status:', response.status);
    console.log('📊 Response data:', response.data);

    if (response.data.success) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      console.log('❌ Customer service returned success: false');
      res.status(400).json({
        success: false,
        message: response.data.message || 'Failed to fetch bookings'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching bookings:', error.message);
    console.error('❌ Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      headers: error.config?.headers
    });
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || 'Failed to fetch bookings from customer service'
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        success: false,
        message: 'Customer service is unavailable'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching bookings'
      });
    }
  }
};

// Get booking by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`${CUSTOMER_SERVICE_URL}/api/simple-bookings/${id}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: response.data.message || 'Booking not found'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching booking by ID:', error);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || 'Failed to fetch booking'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching booking'
      });
    }
  }
};

// Update booking status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const response = await axios.put(`${CUSTOMER_SERVICE_URL}/api/simple-bookings/${id}/status`, {
      status,
      notes
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      res.json({
        success: true,
        data: response.data.data,
        message: 'Booking status updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: response.data.message || 'Failed to update booking status'
      });
    }
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || 'Failed to update booking status'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating booking status'
      });
    }
  }
};

// Get booking statistics
const getOrderStatistics = async (req, res) => {
  try {
    const response = await axios.get(`${CUSTOMER_SERVICE_URL}/api/simple-bookings/statistics`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: response.data.message || 'Failed to fetch booking statistics'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching booking statistics:', error);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || 'Failed to fetch booking statistics'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching booking statistics'
      });
    }
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStatistics
};
