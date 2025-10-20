const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Debug environment variables
console.log('🔧 Environment Variables Check:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

const app = express();
const PORT = process.env.PORT || 3006;

// Import routes
const designRoutes = require('./routes/designRoutes');
const measurementRoutes = require('./routes/measurementRoutes');
const sizingRoutes = require('./routes/sizingRoutes');

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('MONGODB_URI not found in environment variables');
      return;
    }
    
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Design Service connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Please check your MongoDB Atlas credentials and connection string');
    console.log('Continuing without MongoDB for testing...');
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Design Service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/designs', designRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/sizing', sizingRoutes);

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
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Design Service running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🎨 Designs API: http://localhost:${PORT}/api/designs`);
    console.log(`📏 Measurements API: http://localhost:${PORT}/api/measurements`);
    console.log(`📐 Sizing API: http://localhost:${PORT}/api/sizing`);
  });
};

startServer();

module.exports = app;
