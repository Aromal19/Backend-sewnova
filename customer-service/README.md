# Customer Service - SewNova

A microservice for managing customer-related operations including addresses, measurements, and bookings.

## 🚀 Features

### Address Management
- ✅ Add, edit, delete customer addresses
- ✅ Support for multiple address types (home, office, other)
- ✅ Location-based classification (city, district, state, pincode)
- ✅ Optional landmark information
- ✅ Default address setting
- ✅ Soft delete functionality

### Measurement Management
- ✅ Comprehensive body measurements (chest, waist, hip, etc.)
- ✅ Support for different measurement types (casual, formal, traditional)
- ✅ Gender and age group categorization
- ✅ Style preferences (fit, style)
- ✅ Custom measurement fields
- ✅ Default measurement setting

### Booking System
- ✅ Book tailors and fabrics
- ✅ Complete garment orders
- ✅ Measurement integration
- ✅ Status tracking
- ✅ Communication system
- ✅ Review and rating system

## 🏗️ Architecture

```
customer-service/
├── models/           # Database models
├── controllers/      # Business logic
├── routes/          # API endpoints
├── middleware/      # Authentication & validation
├── server.js        # Main server file
└── package.json     # Dependencies
```

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Authentication Service running
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to the service:**
   ```bash
   cd backend/customer-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start the service:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3002` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/sewnova` |
| `AUTH_SERVICE_URL` | Authentication service URL | `http://localhost:3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## 🔌 API Endpoints

### Address Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/addresses` | Get customer addresses |
| `GET` | `/api/addresses/:id` | Get specific address |
| `POST` | `/api/addresses` | Create new address |
| `PUT` | `/api/addresses/:id` | Update address |
| `DELETE` | `/api/addresses/:id` | Delete address |
| `PATCH` | `/api/addresses/:id/set-default` | Set default address |

### Measurement Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/measurements` | Get customer measurements |
| `GET` | `/api/measurements/:id` | Get specific measurement |
| `POST` | `/api/measurements` | Create new measurement |
| `PUT` | `/api/measurements/:id` | Update measurement |
| `DELETE` | `/api/measurements/:id` | Delete measurement |
| `PATCH` | `/api/measurements/:id/set-default` | Set default measurement |

## 🔐 Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## 📊 Database Models

### Address Schema
```javascript
{
  customerId: ObjectId,
  addressType: String, // home, office, other
  addressLine: String,
  landmark: String,
  city: String,
  district: String,
  state: String,
  pincode: String,
  country: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  isDefault: Boolean,
  isActive: Boolean
}
```

### Measurement Schema
```javascript
{
  customerId: ObjectId,
  measurementName: String,
  measurementType: String, // casual, formal, traditional, western, custom
  gender: String, // male, female, unisex
  ageGroup: String, // kids, teen, adult, senior
  chest: Number,
  waist: Number,
  hip: Number,
  // ... other measurements
  preferences: {
    fit: String, // loose, regular, fitted, tight
    style: String // modern, traditional, classic, trendy
  }
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Docker
```bash
# Build image
docker build -t customer-service .

# Run container
docker run -p 3002:3000 customer-service
```

### Docker Compose
```yaml
customer-service:
  build: ./customer-service
  ports:
    - "3002:3000"
  environment:
    - NODE_ENV=production
    - MONGODB_URI=mongodb://mongo:27017/sewnova
  depends_on:
    - mongo
```

## 🔍 Monitoring

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "OK",
  "service": "Customer Service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📝 Logging

The service uses structured logging with different levels:
- `info`: General information
- `warn`: Warning messages
- `error`: Error messages
- `debug`: Debug information (development only)

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Changelog

### v1.0.0
- Initial release
- Address management
- Measurement management
- Basic booking system
- Authentication integration 