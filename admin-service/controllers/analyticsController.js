const axios = require('axios');

const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3002';
const DESIGN_SERVICE_URL = process.env.DESIGN_SERVICE_URL || 'http://localhost:3006';

const getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Fetch real data from customer service
    let bookingStats = null;
    let designStats = null;
    
    try {
      // Get booking statistics from customer service
      const bookingResponse = await axios.get(`${CUSTOMER_SERVICE_URL}/api/simple-bookings/statistics`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (bookingResponse.data.success) {
        bookingStats = bookingResponse.data.data;
        console.log('✅ Fetched booking stats:', bookingStats);
      }
    } catch (error) {
      console.error('❌ Error fetching booking statistics:', error.message);
    }
    
    try {
      // Get design statistics from design service
      const designResponse = await axios.get(`${DESIGN_SERVICE_URL}/api/designs`, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (designResponse.data.success) {
        designStats = {
          totalDesigns: designResponse.data.count,
          designs: designResponse.data.data
        };
        console.log('✅ Fetched design stats:', designStats);
      }
    } catch (error) {
      console.error('❌ Error fetching design statistics:', error.message);
    }
    
    // Build analytics with real data
    const analytics = {
      overview: {
        totalUsers: 0, // This would need to be fetched from auth service
        totalOrders: bookingStats?.totalBookings || 0,
        totalRevenue: bookingStats?.totalRevenue || 0,
        activeTailors: 0, // This would need to be fetched from tailor service
        activeSellers: 0, // This would need to be fetched from vendor service
        pendingOrders: bookingStats?.bookingsByStatus?.pending || 0,
        completedOrders: bookingStats?.bookingsByStatus?.completed || 0,
        totalDesigns: designStats?.totalDesigns || 0
      },
      revenue: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [15000, 18000, 22000, 25000, 20000, 25000] // This would need real time-series data
      },
      orders: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [45, 52, 38, 65, 58, 42, 35] // This would need real time-series data
      },
      userGrowth: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        data: [120, 145, 168, 195] // This would need real time-series data
      },
      topTailors: [], // This would need to be fetched from tailor service
      topSellers: [], // This would need to be fetched from vendor service
      orderStatus: bookingStats?.bookingsByStatus || {
        completed: 0,
        pending: 0,
        in_progress: 0,
        ready_for_fitting: 0,
        delivered: 0,
        cancelled: 0
      },
      recentBookings: bookingStats?.recentBookings || 0,
      bookingsByType: bookingStats?.bookingsByType || []
    };

    console.log('📊 Analytics data prepared:', analytics);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    const revenueData = {
      monthly: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [15000, 18000, 22000, 25000, 20000, 25000]
      },
      daily: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [2500, 3200, 2800, 4100, 3800, 2200, 1900]
      },
      byCategory: {
        wedding: 45000,
        casual: 35000,
        formal: 25000,
        traditional: 20000
      }
    };

    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUserAnalytics = async (req, res) => {
  try {
    const userAnalytics = {
      totalUsers: 1250,
      newUsers: 45,
      activeUsers: 890,
      userGrowth: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        data: [120, 145, 168, 195]
      },
      userRoles: {
        customers: 1000,
        tailors: 150,
        sellers: 100
      },
      userActivity: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [120, 135, 110, 145, 130, 95, 80]
      }
    };

    res.json({
      success: true,
      data: userAnalytics
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getAnalytics,
  getRevenueAnalytics,
  getUserAnalytics
};
