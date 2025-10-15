// Mock data for demonstration - in real app, this would fetch from other services
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    // Mock user data
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'customer',
        status: 'active',
        joinDate: '2024-01-15',
        totalOrders: 5,
        lastActive: '2024-01-20'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'tailor',
        status: 'active',
        joinDate: '2024-01-10',
        totalOrders: 25,
        lastActive: '2024-01-20'
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'seller',
        status: 'active',
        joinDate: '2024-01-08',
        totalOrders: 12,
        lastActive: '2024-01-19'
      }
    ];

    let filteredUsers = mockUsers;
    
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }
    
    if (search) {
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredUsers.length / limit),
          totalUsers: filteredUsers.length,
          hasNext: endIndex < filteredUsers.length,
          hasPrev: startIndex > 0
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock user data
    const mockUser = {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'customer',
      status: 'active',
      joinDate: '2024-01-15',
      totalOrders: 5,
      lastActive: '2024-01-20',
      profile: {
        phone: '+1234567890',
        address: '123 Main St, City, State',
        preferences: ['casual', 'formal']
      },
      orders: [
        { id: 'ORD-001', date: '2024-01-18', amount: 150, status: 'completed' },
        { id: 'ORD-002', date: '2024-01-20', amount: 200, status: 'pending' }
      ]
    };

    res.json({
      success: true,
      data: mockUser
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Mock update
    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { id, status }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Mock deletion
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
};
