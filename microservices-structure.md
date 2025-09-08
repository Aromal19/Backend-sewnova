# SewNova Microservices Architecture with Docker

## 📁 Recommended Structure

```
backend/
├── docker-compose.yml                 # Main orchestration
├── docker-compose.dev.yml             # Development overrides
├── .env                               # Shared environment variables
├── api-gateway/                       # API Gateway Service
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── .env
├── auth-service/                      # Authentication Service
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── .env
├── customer-service/                  # Customer Management
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── .env
├── tailor-service/                    # Tailor Management
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── .env
├── seller-service/                    # Seller Management
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── .env
├── notification-service/              # Email/SMS Service
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── .env
└── shared/                           # Shared utilities
    ├── database/
    ├── middleware/
    └── utils/
```

## 🐳 Docker Configuration

### 1. Main Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - auth-service
      - customer-service
      - tailor-service
      - seller-service
    volumes:
      - ./api-gateway:/app
      - /app/node_modules

  # Authentication Service
  auth-service:
    build: ./auth-service
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/sewnova
    depends_on:
      - mongo
      - notification-service
    volumes:
      - ./auth-service:/app
      - /app/node_modules

  # Customer Service
  customer-service:
    build: ./customer-service
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/sewnova
      - AUTH_SERVICE_URL=http://auth-service:3000
    depends_on:
      - mongo
      - auth-service
    volumes:
      - ./customer-service:/app
      - /app/node_modules

  # Tailor Service
  tailor-service:
    build: ./tailor-service
    ports:
      - "3003:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/sewnova
      - AUTH_SERVICE_URL=http://auth-service:3000
    depends_on:
      - mongo
      - auth-service
    volumes:
      - ./tailor-service:/app
      - /app/node_modules

  # Seller Service
  seller-service:
    build: ./seller-service
    ports:
      - "3004:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/sewnova
      - AUTH_SERVICE_URL=http://auth-service:3000
    depends_on:
      - mongo
      - auth-service
    volumes:
      - ./seller-service:/app
      - /app/node_modules

  # Notification Service
  notification-service:
    build: ./notification-service
    ports:
      - "3005:3000"
    environment:
      - NODE_ENV=development
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
    volumes:
      - ./notification-service:/app
      - /app/node_modules

  # Database
  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  # Redis (for caching and sessions)
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

### 2. Development Overrides
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  api-gateway:
    command: npm run dev
    environment:
      - NODE_ENV=development
    volumes:
      - ./api-gateway:/app
      - /app/node_modules

  auth-service:
    command: npm run dev
    environment:
      - NODE_ENV=development
    volumes:
      - ./auth-service:/app
      - /app/node_modules

  customer-service:
    command: npm run dev
    environment:
      - NODE_ENV=development
    volumes:
      - ./customer-service:/app
      - /app/node_modules

  tailor-service:
    command: npm run dev
    environment:
      - NODE_ENV=development
    volumes:
      - ./tailor-service:/app
      - /app/node_modules

  seller-service:
    command: npm run dev
    environment:
      - NODE_ENV=development
    volumes:
      - ./seller-service:/app
      - /app/node_modules

  notification-service:
    command: npm run dev
    environment:
      - NODE_ENV=development
    volumes:
      - ./notification-service:/app
      - /app/node_modules
```

## 📦 Service Dockerfiles

### Example: Auth Service Dockerfile
```dockerfile
# auth-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
```

### Example: API Gateway Dockerfile
```dockerfile
# api-gateway/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
```

## 🚀 Development Commands

### Start All Services
```bash
# Development mode with hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or build and start
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Start Specific Service
```bash
# Start only auth service
docker-compose up auth-service

# Start auth and customer services
docker-compose up auth-service customer-service
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## 🔧 Service Communication

### Inter-Service Communication
```javascript
// customer-service/src/services/authService.js
const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';

class AuthService {
  async validateToken(token) {
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/validate-token`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw new Error('Token validation failed');
    }
  }
}

module.exports = new AuthService();
```

### API Gateway Configuration
```javascript
// api-gateway/src/routes/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Route to auth service
app.use('/api/auth', createProxyMiddleware({
  target: 'http://auth-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'
  }
}));

// Route to customer service
app.use('/api/customers', createProxyMiddleware({
  target: 'http://customer-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/customers': '/api/customers'
  }
}));

// Route to tailor service
app.use('/api/tailors', createProxyMiddleware({
  target: 'http://tailor-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/tailors': '/api/tailors'
  }
}));

// Route to seller service
app.use('/api/sellers', createProxyMiddleware({
  target: 'http://seller-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/sellers': '/api/sellers'
  }
}));
```

## 📝 Environment Variables

### Shared .env
```env
# backend/.env
NODE_ENV=development
MONGODB_URI=mongodb://mongo:27017/sewnova
JWT_SECRET=your-jwt-secret
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ENCRYPTION_KEY=your32characterencryptionkey
GOOGLE_CLIENT_ID=your-google-client-id
```

## 🎯 Benefits of This Setup

1. **Consistent Environment**: All developers work with the same setup
2. **Easy Scaling**: Can scale individual services independently
3. **Service Isolation**: Each service runs in its own container
4. **Hot Reload**: Development changes reflect immediately
5. **Easy Testing**: Can test services in isolation
6. **Production Ready**: Same containers can be used in production

## 🔄 Migration Steps

1. **Create service directories** with proper structure
2. **Set up Dockerfiles** for each service
3. **Create docker-compose files** for orchestration
4. **Move existing code** to appropriate services
5. **Update service communication** to use internal URLs
6. **Test the complete setup**

This structure will make your development much more organized and prepare you for production deployment! 🚀 