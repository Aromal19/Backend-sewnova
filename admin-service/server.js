const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;

// CORS configuration
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for profile pictures
app.use('/uploads', express.static('uploads'));

// Rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// DB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Admin Service connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Auth middleware
const auth = require('./middleware/authMiddleware');

// Routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const designRoutes = require('./routes/designRoutesDirect'); // Use direct design routes
const analyticsRoutes = require('./routes/analyticsRoutes');
const measurementRoutes = require('./routes/measurementRoutes');
const orderRoutes = require('./routes/orderRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const fabricRoutes = require('./routes/fabricRoutes');


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Admin Service', timestamp: new Date().toISOString() });
});

// Test analytics endpoint (no auth required for testing)
app.get('/api/test-analytics', async (req, res) => {
  try {
    const analyticsController = require('./controllers/analyticsController');
    await analyticsController.getAnalytics(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

// API Routes
// Admin routes - login is public, others require auth
app.use('/api/admin', adminRoutes);
app.use('/api/users', auth.authMiddleware, auth.adminOnly, userRoutes);
app.use('/api/designs', auth.authMiddleware, auth.adminOnly, designRoutes);
app.use('/api/analytics', analyticsRoutes); // Temporarily remove auth for testing
app.use('/api/orders', auth.authMiddleware, auth.adminOnly, orderRoutes);
app.use('/api/bookings', bookingRoutes); // Booking routes - NO authentication required
app.use('/api/measurements', measurementRoutes); // Measurement routes
app.use('/api/fabric', fabricRoutes); // Fabric estimation routes

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
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.listen(PORT, () => console.log(`🚀 Admin Service running on port ${PORT}`));

module.exports = app;
