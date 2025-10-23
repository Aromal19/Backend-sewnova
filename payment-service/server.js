const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// CORS configuration for credentialed requests
const allowedOrigins = [
  'http://localhost:5173',
  'https://frontend-sewnova.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser or same-origin
    if (allowedOrigins.includes(origin)) return callback(null, true);
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

app.use(express.json());

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sewnova';

mongoose
  .connect(mongoUri, { autoIndex: true })
  .then(() => console.log('MongoDB connected (payment-service)'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service' });
});

// Quick config diagnostics
app.get('/api/payments/config-check', (req, res) => {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  res.json({
    ok: Boolean(id && secret),
    keyIdPresent: Boolean(id),
    keySecretPresent: Boolean(secret),
    port: process.env.PORT,
    frontendOrigin: 'all'
  });
});

app.use('/api/payments', paymentRoutes);

const port = process.env.PORT || 3010;
app.listen(port, () => console.log(`payment-service running on ${port}`));


