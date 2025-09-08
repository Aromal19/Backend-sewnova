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

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');

// Security middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

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