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

// Security middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
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

// Database connection
mongoose.connect(process.env.MONGODB_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Customer Service connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Customer Service',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/customers', authMiddleware.authMiddleware, authMiddleware.customerOnly, customerRoutes);
app.use('/api/measurements', authMiddleware.authMiddleware, authMiddleware.customerOnly, measurementRoutes);
app.use('/api/addresses', authMiddleware.authMiddleware, authMiddleware.customerOrTailor, addressRoutes);
app.use('/api/bookings', authMiddleware.authMiddleware, authMiddleware.customerOnly, bookingRoutes);
app.use('/api/sizes', authMiddleware.authMiddleware, authMiddleware.customerOnly, sizeRoutes);
app.use('/api/tailor', authMiddleware.authMiddleware, authMiddleware.tailorOnly, tailorBookingRoutes);
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