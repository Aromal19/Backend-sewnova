const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

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

// DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Vendor Service connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Auth middleware
const auth = require('./src/middleware/authMiddleware');

// Routes
const productRoutes = require('./src/routes/productRoutes');
const publicRoutes = require('./src/routes/publicRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const sellerRoutes = require('./src/routes/sellerRoutes');

// Health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'Vendor Service', timestamp: new Date().toISOString() });
});

// API
app.use('/api/public', publicRoutes);
app.use('/api/products', auth.authMiddleware, auth.sellerOnly, productRoutes);
app.use('/api/orders', auth.authMiddleware, auth.sellerOnly, orderRoutes);
app.use('/api/sellers', auth.authMiddleware, auth.sellerOnly, sellerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.listen(PORT, () => console.log(`🚀 Vendor Service running on port ${PORT}`));

module.exports = app;