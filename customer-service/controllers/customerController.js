const Customer = require('../models/customer');

// Get customer profile
const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('-password');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer profile'
    });
  }
};

// Update customer profile
const updateCustomerProfile = async (req, res) => {
  try {
    const { firstname, lastname, phone, preferences } = req.body;
    
    const customer = await Customer.findById(req.user._id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update fields
    if (firstname !== undefined) customer.firstname = firstname;
    if (lastname !== undefined) customer.lastname = lastname;
    if (phone !== undefined) customer.phone = phone;
    if (preferences !== undefined) customer.preferences = preferences;

    await customer.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer profile'
    });
  }
};

// Get customer preferences
const getCustomerPreferences = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).select('preferences');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer.preferences || {}
    });
  } catch (error) {
    console.error('Error fetching customer preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer preferences'
    });
  }
};

// Update customer preferences
const updateCustomerPreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const customer = await Customer.findById(req.user._id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.preferences = { ...customer.preferences, ...preferences };
    await customer.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: customer.preferences
    });
  } catch (error) {
    console.error('Error updating customer preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer preferences'
    });
  }
};

// Get customer dashboard data
const getCustomerDashboard = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Basic dashboard data
    const dashboardData = {
      customer: {
        name: `${customer.firstname} ${customer.lastname}`,
        email: customer.email,
        phone: customer.phone
      },
      stats: {
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        totalAddresses: 0,
        totalMeasurements: 0
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching customer dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer dashboard'
    });
  }
};

// Get customer statistics
const getCustomerStats = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Basic stats
    const stats = {
      totalBookings: 0,
      activeBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      totalSpent: 0,
      averageRating: 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer stats'
    });
  }
};

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  getCustomerPreferences,
  updateCustomerPreferences,
  getCustomerDashboard,
  getCustomerStats
}; 