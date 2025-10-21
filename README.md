# SewNova Backend Services

This repository contains all the backend microservices for the SewNova application, designed to be deployed on Render using Docker Compose.

## Architecture

The backend consists of the following microservices:

- **Auth Service** (Port 3001) - Authentication & authorization
- **Customer Service** (Port 3002) - Customer management
- **Admin Service** (Port 3003) - Admin panel
- **Design Service** (Port 3004) - Design management
- **Tailor Service** (Port 3005) - Tailor management
- **Vendor Service** (Port 3006) - Vendor management
- **Payment Service** (Port 3007) - Payment processing
- **Measurement Service** (Port 8001) - AI measurement service (Python)
- **MongoDB** (Port 27017) - Database

## Deployment on Render

### Prerequisites

1. Render account with Docker support
2. Environment variables configured in Render dashboard
3. MongoDB Atlas or external MongoDB instance (recommended for production)

### Environment Variables

Configure these in your Render dashboard:

```env
# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Service
EMAIL_SERVICE_API_KEY=your_email_api_key
EMAIL_FROM=noreply@sewnova.com

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay (for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# MongoDB (use external MongoDB Atlas for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sewnova
```

### Render Deployment Steps

1. **Create a new Web Service on Render**
2. **Connect your GitHub repository** (sewnova-backend)
3. **Configure the service:**
   - **Build Command**: `docker-compose build`
   - **Start Command**: `docker-compose up`
   - **Environment**: Docker
4. **Add all environment variables** in the Render dashboard
5. **Deploy**

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/sewnova-backend.git
cd sewnova-backend

# Create environment file
cp env.example .env
# Edit .env with your local values

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Service Communication

All services communicate through the internal Docker network (`sewnova-network`). The frontend (hosted on Vercel) will communicate with these services through their public URLs.

### API Endpoints

- **Auth Service**: `https://your-render-app.onrender.com:3001`
- **Customer Service**: `https://your-render-app.onrender.com:3002`
- **Admin Service**: `https://your-render-app.onrender.com:3003`
- **Design Service**: `https://your-render-app.onrender.com:3004`
- **Tailor Service**: `https://your-render-app.onrender.com:3005`
- **Vendor Service**: `https://your-render-app.onrender.com:3006`
- **Payment Service**: `https://your-render-app.onrender.com:3007`
- **Measurement Service**: `https://your-render-app.onrender.com:8001`

## Database

For production, it's recommended to use MongoDB Atlas instead of the containerized MongoDB:

1. Create a MongoDB Atlas cluster
2. Update the `MONGODB_URI` environment variable
3. Remove the MongoDB service from docker-compose.yml

## Monitoring

- Render provides built-in monitoring and logging
- Each service can be monitored individually
- Database connections are managed through environment variables

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure all services use different ports
2. **Environment variables**: Double-check all required variables are set
3. **Database connection**: Verify MongoDB URI is correct
4. **Service dependencies**: Ensure services start in the correct order

### Logs

View logs for specific services:
```bash
docker-compose logs service-name
```

## Production Considerations

1. **Use external MongoDB** (MongoDB Atlas) for production
2. **Configure proper CORS** for frontend communication
3. **Set up monitoring** and alerting
4. **Use environment-specific configurations**
5. **Implement proper logging** and error handling
