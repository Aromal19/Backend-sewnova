const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
const designRoutes = require('./routes/designRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Admin Service', timestamp: new Date().toISOString() });
});

// API Routes
// Admin routes - login is public, others require auth
app.use('/api/admin', adminRoutes);
app.use('/api/users', auth.authMiddleware, auth.adminOnly, userRoutes);
app.use('/api/designs', auth.authMiddleware, auth.adminOnly, designRoutes);
app.use('/api/analytics', auth.authMiddleware, auth.adminOnly, analyticsRoutes);

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
