// Mock data for Customer Service testing

// Mock Measurements Data
const mockMeasurements = [
  {
    _id: '1',
    customerId: 'customer123',
    measurementName: 'Casual Wear',
    measurementType: 'casual',
    gender: 'male',
    ageGroup: 'adult',
    chest: 42,
    waist: 34,
    hip: 40,
    shoulder: 18,
    sleeveLength: 24,
    neck: 16,
    inseam: 32,
    customMeasurements: {
      'armhole': 22,
      'bicep': 14
    },
    notes: 'Prefer loose fit for comfort',
    preferences: {
      fit: 'loose',
      style: 'casual'
    },
    isActive: true,
    isDefault: true,
    lastUsed: new Date('2024-01-15'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15')
  },
  {
    _id: '2',
    customerId: 'customer123',
    measurementName: 'Formal Suit',
    measurementType: 'formal',
    gender: 'male',
    ageGroup: 'adult',
    chest: 42,
    waist: 34,
    hip: 40,
    shoulder: 18,
    sleeveLength: 25,
    neck: 16.5,
    inseam: 32,
    customMeasurements: {
      'armhole': 21,
      'bicep': 13.5,
      'cuff': 9
    },
    notes: 'Slim fit for professional look',
    preferences: {
      fit: 'slim',
      style: 'formal'
    },
    isActive: true,
    isDefault: false,
    lastUsed: new Date('2024-01-25'),
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25')
  },
  {
    _id: '3',
    customerId: 'customer123',
    measurementName: 'Wedding Sherwani',
    measurementType: 'traditional',
    gender: 'male',
    ageGroup: 'adult',
    chest: 43,
    waist: 35,
    hip: 41,
    shoulder: 19,
    sleeveLength: 26,
    neck: 17,
    inseam: 33,
    customMeasurements: {
      'armhole': 23,
      'bicep': 15,
      'cuff': 10,
      'length': 45
    },
    notes: 'Traditional fit with modern styling',
    preferences: {
      fit: 'regular',
      style: 'traditional'
    },
    isActive: true,
    isDefault: false,
    lastUsed: new Date('2024-02-01'),
    createdAt: new Date('2024-01-30'),
    updatedAt: new Date('2024-02-01')
  }
];

// Mock Bookings Data
const mockBookings = [
  {
    _id: '1',
    customerId: 'customer123',
    bookingType: 'complete',
    tailorId: 'tailor001',
    fabricId: 'fabric001',
    measurementId: '1',
    orderDetails: {
      garmentType: 'shirt',
      quantity: 2,
      design: 'Casual cotton shirt',
      instructions: 'Loose fit, short sleeves',
      deliveryDate: new Date('2024-02-15')
    },
    pricing: {
      fabricCost: 800,
      tailoringCost: 600,
      totalAmount: 1400,
      advancePaid: 700,
      remainingAmount: 700
    },
    deliveryAddress: '1',
    status: 'in_progress',
    timeline: {
      orderPlaced: new Date('2024-01-20'),
      measurementTaken: new Date('2024-01-22'),
      fabricSelected: new Date('2024-01-25'),
      tailoringStarted: new Date('2024-01-28'),
      expectedDelivery: new Date('2024-02-15')
    },
    messages: [
      {
        sender: 'tailor',
        message: 'Measurements received, starting work',
        timestamp: new Date('2024-01-22')
      },
      {
        sender: 'customer',
        message: 'Can you send progress photos?',
        timestamp: new Date('2024-01-25')
      }
    ],
    review: null,
    cancellation: null,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-28')
  },
  {
    _id: '2',
    customerId: 'customer123',
    bookingType: 'tailor',
    tailorId: 'tailor002',
    fabricId: null,
    measurementId: '2',
    orderDetails: {
      garmentType: 'suit',
      quantity: 1,
      design: 'Formal business suit',
      instructions: 'Slim fit, single breasted',
      deliveryDate: new Date('2024-03-01')
    },
    pricing: {
      fabricCost: 0,
      tailoringCost: 1200,
      totalAmount: 1200,
      advancePaid: 600,
      remainingAmount: 600
    },
    deliveryAddress: '2',
    status: 'confirmed',
    timeline: {
      orderPlaced: new Date('2024-02-01'),
      measurementTaken: new Date('2024-02-03'),
      tailoringStarted: null,
      expectedDelivery: new Date('2024-03-01')
    },
    messages: [],
    review: null,
    cancellation: null,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-03')
  }
];

// Mock Customer Profile Data
const mockCustomerProfile = {
  _id: 'customer123',
  authCustomerId: 'auth_customer_123',
  preferences: {
    preferredStyles: ['casual', 'formal', 'traditional'],
    preferredColors: ['blue', 'white', 'black'],
    preferredFabrics: ['cotton', 'linen', 'silk'],
    sizePreferences: {
      fit: 'regular',
      sleeve: 'full',
      collar: 'classic'
    },
    deliveryPreferences: {
      preferredTime: 'evening',
      contactPerson: 'self',
      specialInstructions: 'Call before delivery'
    }
  },
  stats: {
    totalBookings: 5,
    totalSpent: 8500,
    averageRating: 4.5,
    completedOrders: 3,
    pendingOrders: 2
  },
  isVerified: true,
  isActive: true,
  accountType: 'premium',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-02-01')
};

// Mock Dashboard Data
const mockDashboardData = {
  recentActivity: [
    {
      type: 'booking_created',
      title: 'New booking created',
      description: 'Casual cotton shirt order placed',
      timestamp: new Date('2024-01-28'),
      icon: 'shirt'
    },
    {
      type: 'measurement_updated',
      title: 'Measurement updated',
      description: 'Formal suit measurements modified',
      timestamp: new Date('2024-01-25'),
      icon: 'ruler'
    },
    {
      type: 'address_added',
      title: 'New address added',
      description: 'Office address in Bandra West',
      timestamp: new Date('2024-01-20'),
      icon: 'map-pin'
    }
  ],
  quickStats: {
    activeBookings: 2,
    savedMeasurements: 3,
    savedAddresses: 3,
    totalSpent: 8500
  },
  upcomingDeliveries: [
    {
      bookingId: '1',
      garmentType: 'shirt',
      deliveryDate: new Date('2024-02-15'),
      tailorName: 'Raj Tailors',
      status: 'in_progress'
    },
    {
      bookingId: '2',
      garmentType: 'suit',
      deliveryDate: new Date('2024-03-01'),
      tailorName: 'Premium Stitches',
      status: 'confirmed'
    }
  ]
};

module.exports = {
  mockMeasurements,
  mockBookings,
  mockCustomerProfile,
  mockDashboardData
}; 