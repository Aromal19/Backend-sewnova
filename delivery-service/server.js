const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3008;

// Import routes
const deliveryRoutes = require('./routes/deliveryRoutes');
const orderDeliveryRoutes = require('./routes/orderDeliveryRoutes');

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'https://frontend-sewnova.vercel.app'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add COOP headers
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

// Debug middleware
app.use((req, res, next) => {
    console.log(`🔍 ${req.method} ${req.path}`);
    next();
});

// Database connection
console.log('🔍 Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('✅ Delivery Service connected to MongoDB');
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
    });

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'Delivery Service',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Delivery service is working',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/order-deliveries', orderDeliveryRoutes);

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
    console.log(`🚀 Delivery Service running on port ${PORT}`);
});

module.exports = app;
