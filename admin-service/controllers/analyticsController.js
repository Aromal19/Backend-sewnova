const getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Mock analytics data
    const analytics = {
      overview: {
        totalUsers: 1250,
        totalOrders: 3420,
        totalRevenue: 125000,
        activeTailors: 45,
        activeSellers: 32,
        pendingOrders: 156,
        completedOrders: 3264
      },
      revenue: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [15000, 18000, 22000, 25000, 20000, 25000]
      },
      orders: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [45, 52, 38, 65, 58, 42, 35]
      },
      userGrowth: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        data: [120, 145, 168, 195]
      },
      topTailors: [
        { name: 'Sarah Johnson', orders: 45, rating: 4.9, revenue: 12500 },
        { name: 'Mike Chen', orders: 38, rating: 4.8, revenue: 9800 },
        { name: 'Emma Davis', orders: 32, rating: 4.7, revenue: 8500 }
      ],
      topSellers: [
        { name: 'Fashion Store', products: 25, sales: 120, revenue: 15000 },
        { name: 'Style Hub', products: 20, sales: 95, revenue: 12000 },
        { name: 'Trendy Shop', products: 18, sales: 88, revenue: 11000 }
      ],
      orderStatus: {
        completed: 3264,
        pending: 156,
        inProgress: 89,
        cancelled: 23
      }
    };

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
