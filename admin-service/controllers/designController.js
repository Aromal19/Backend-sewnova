// Mock data for demonstration - in real app, this would fetch from design service
const getDesigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    
    // Mock design data
    const mockDesigns = [
      {
        id: '1',
        name: 'Elegant Wedding Dress',
        category: 'wedding',
        description: 'Beautiful wedding dress with intricate details',
        price: 1500,
        status: 'active',
        createdDate: '2024-01-15',
        image: '/images/wedding-dress.jpg',
        tags: ['wedding', 'elegant', 'white'],
        popularity: 95
      },
      {
        id: '2',
        name: 'Casual Summer Dress',
        category: 'casual',
        description: 'Light and comfortable summer dress',
        price: 250,
        status: 'active',
        createdDate: '2024-01-10',
        image: '/images/summer-dress.jpg',
        tags: ['casual', 'summer', 'light'],
        popularity: 78
      },
      {
        id: '3',
        name: 'Business Suit',
        category: 'formal',
        description: 'Professional business suit',
        price: 800,
        status: 'active',
        createdDate: '2024-01-08',
        image: '/images/business-suit.jpg',
        tags: ['formal', 'business', 'professional'],
        popularity: 82
      }
    ];

    let filteredDesigns = mockDesigns;
    
    if (category) {
      filteredDesigns = filteredDesigns.filter(design => design.category === category);
    }
    
    if (search) {
      filteredDesigns = filteredDesigns.filter(design => 
        design.name.toLowerCase().includes(search.toLowerCase()) ||
        design.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedDesigns = filteredDesigns.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        designs: paginatedDesigns,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredDesigns.length / limit),
          totalDesigns: filteredDesigns.length,
          hasNext: endIndex < filteredDesigns.length,
          hasPrev: startIndex > 0
        }
      }
    });
  } catch (error) {
    console.error('Get designs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createDesign = async (req, res) => {
  try {
    const { name, category, description, price, tags } = req.body;

    if (!name || !category || !description || !price) {
      return res.status(400).json({ success: false, message: 'Name, category, description, and price are required' });
    }

    // Mock creation
    const newDesign = {
      id: Date.now().toString(),
      name,
      category,
      description,
      price,
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0],
      image: '/images/default-design.jpg',
      tags: tags || [],
      popularity: 0
    };

    res.status(201).json({
      success: true,
      message: 'Design created successfully',
      data: newDesign
    });
  } catch (error) {
    console.error('Create design error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Mock update
    res.json({
      success: true,
      message: 'Design updated successfully',
      data: { id, ...updateData }
    });
  } catch (error) {
    console.error('Update design error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteDesign = async (req, res) => {
  try {
    const { id } = req.params;

    // Mock deletion
    res.json({
      success: true,
      message: 'Design deleted successfully'
    });
  } catch (error) {
    console.error('Delete design error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getDesignStats = async (req, res) => {
  try {
    const stats = {
      totalDesigns: 89,
      activeDesigns: 76,
      popularDesigns: 12,
      categories: {
        wedding: 25,
        casual: 30,
        formal: 20,
        traditional: 14
      },
      averagePrice: 450,
      totalViews: 12500
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get design stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getDesigns,
  createDesign,
  updateDesign,
  deleteDesign,
  getDesignStats
};
