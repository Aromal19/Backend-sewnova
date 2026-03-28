const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Import routes
const customerRoutes = require('./routes/customerRoutes');
const measurementRoutes = require('./routes/measurementRoutes');
const addressRoutes = require('./routes/addressRoutes');
const sizeRoutes = require('./routes/sizeRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const tailorBookingRoutes = require('./routes/tailorBookingRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authenticatedOrderRoutes = require('./routes/authenticatedOrderRoutes');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');

// CORS configuration for credentialed requests
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://frontend-sewnova.vercel.app',
  'https://sewnova.vercel.app'
];
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add COOP headers to fix postMessage issues
app.use((req, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} - Headers:`, req.headers);
  next();
});

// Database connection
console.log('🔍 Connecting to MongoDB...');
console.log('🔍 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
mongoose.connect(process.env.MONGODB_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Customer Service connected to MongoDB');
  console.log('✅ Database connection established successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('❌ Database connection failed');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Customer Service',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Customer service is working',
    timestamp: new Date().toISOString()
  });
});

// Test booking creation endpoint (no auth required for testing)
app.post('/api/test-booking', async (req, res) => {
  try {
    console.log('🔍 TEST BOOKING CREATION REQUEST');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const Booking = require('./models/booking');
    const mongoose = require('mongoose');
    
    // Create test booking data
    const testBookingData = {
      customerId: new mongoose.Types.ObjectId(),
      userEmail: 'test@example.com',
      bookingType: 'fabric',
      fabricId: new mongoose.Types.ObjectId(),
      tailorId: new mongoose.Types.ObjectId(),
      measurementId: new mongoose.Types.ObjectId(),
      deliveryAddress: new mongoose.Types.ObjectId(),
      orderDetails: {
        garmentType: 'shirt',
        quantity: 1,
        designDescription: 'Test design',
        specialInstructions: 'Test instructions',
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      pricing: {
        fabricCost: 500,
        tailoringCost: 300,
        additionalCharges: 50,
        totalAmount: 850,
        advanceAmount: 200,
        remainingAmount: 650
      },
      payment: {
        status: 'pending',
        method: 'razorpay'
      },
      status: 'pending'
    };
    
    const booking = new Booking(testBookingData);
    const savedBooking = await booking.save();
    
    console.log('✅ Test booking created successfully:', savedBooking._id);
    
    res.json({
      success: true,
      message: 'Test booking created successfully',
      bookingId: savedBooking._id,
      booking: savedBooking
    });
    
  } catch (error) {
    console.error('❌ Test booking creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test booking creation failed',
      error: error.message
    });
  }
});

// Test routes - no auth required - MUST BE BEFORE AUTHENTICATED ROUTES
app.get('/api/bookings/test', require('./controllers/bookingController').testAPI);
app.get('/api/bookings/debug-user', require('./controllers/bookingController').debugUser);
app.get('/api/bookings/debug-recent', require('./controllers/bookingController').debugRecentBookings);

// Test booking creation with minimal data (no auth required)
app.post('/api/test-booking-simple', async (req, res) => {
  try {
    console.log('🧪 SIMPLE BOOKING TEST REQUEST');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const Booking = require('./models/booking');
    const mongoose = require('mongoose');
    
    // Create minimal test booking
    const testBooking = new Booking({
      customerId: new mongoose.Types.ObjectId(),
      userEmail: 'test@example.com',
      bookingType: 'fabric',
      fabricId: new mongoose.Types.ObjectId(),
      deliveryAddress: new mongoose.Types.ObjectId(),
      orderDetails: {
        garmentType: 'shirt',
        quantity: 1,
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      pricing: {
        totalAmount: 100,
        advanceAmount: 50,
        remainingAmount: 50
      },
      payment: {
        status: 'pending',
        method: 'razorpay'
      },
      status: 'pending'
    });
    
    const savedBooking = await testBooking.save();
    console.log('✅ Simple test booking created:', savedBooking._id);
    
    res.json({
      success: true,
      message: 'Simple test booking created',
      bookingId: savedBooking._id,
      userEmail: savedBooking.userEmail
    });
    
  } catch (error) {
    console.error('❌ Simple test booking failed:', error);
    res.status(500).json({
      success: false,
      message: 'Simple test booking failed',
      error: error.message
    });
  }
});

// Payment success route - no auth required (called by payment service) - MUST BE BEFORE AUTHENTICATED ROUTES
app.put('/api/bookings/:bookingId/payment-success', require('./controllers/bookingController').handlePaymentSuccess);

// Booking creation route - no auth required (called by payment service) - MUST BE BEFORE AUTHENTICATED ROUTES
app.post('/api/payment-bookings', require('./controllers/bookingController').createBooking);

// API routes (authenticated)
app.use('/api/customers', authMiddleware.authMiddleware, authMiddleware.customerOnly, customerRoutes);
app.use('/api/measurements', authMiddleware.authMiddleware, authMiddleware.customerOnly, measurementRoutes);
app.use('/api/addresses', authMiddleware.authMiddleware, authMiddleware.customerOrTailor, addressRoutes);
app.use('/api/bookings', authMiddleware.authMiddleware, authMiddleware.customerOnly, bookingRoutes);
app.use('/api/sizes', authMiddleware.authMiddleware, authMiddleware.customerOnly, sizeRoutes);
app.use('/api/tailor', authMiddleware.authMiddleware, authMiddleware.tailorOnly, tailorBookingRoutes);
// Admin order routes (must come before general order routes to avoid conflicts)
const adminOrderRoutes = require('./routes/adminOrderRoutes');
app.use('/api/orders/admin', authMiddleware.authMiddleware, authMiddleware.adminOrTailor, adminOrderRoutes);

// Admin booking routes - NO authentication required for admin access
const adminBookingRoutes = require('./routes/adminBookingRoutes');
app.use('/api/admin-booking', adminBookingRoutes);

// Simple booking routes - direct database access, no model dependencies
const simpleBookingRoutes = require('./routes/simpleBookingRoutes');
app.use('/api/simple-bookings', simpleBookingRoutes);

// Order routes - payment service calls don't require auth
app.use('/api/orders', orderRoutes);

// Authenticated order routes for customers
app.use('/api/orders', authMiddleware.authMiddleware, authMiddleware.customerOnly, authenticatedOrderRoutes);

// Payment booking routes - payment service calls don't require auth
const paymentBookingRoutes = require('./routes/paymentBookingRoutes');
app.use('/api/payment-bookings', paymentBookingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Customer Service running on port ${PORT}`);
});

module.exports = app;