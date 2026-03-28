require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./src/config/db');

const { authMiddleware } = require('./src/middleware/authMiddleware');
const verificationRoutes = require('./src/routes/verificationRoutes');
const shopRoutes = require('./src/routes/shopRoutes');

const app = express();

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 300
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/tailors', authMiddleware, verificationRoutes);
app.use('/api/tailors', shopRoutes);
app.use('/api/public', require('./src/routes/publicRoutes'));

// Mongo connection
connectDB();

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Tailor service listening on port ${PORT}`));

