# Vendor Service

A microservice for managing fabric products, orders, and seller operations for the SewNova platform.

## Features

- **Add Fabric**: Upload fabric products with images using Cloudinary
- **Product Management**: CRUD operations for fabric products
- **Order Management**: View and update order status
- **Seller Dashboard**: Statistics and analytics
- **Image Upload**: Support for multiple product images

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3004

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Authentication Service
AUTH_SERVICE_URL=http://localhost:3000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Installation

```bash
npm install
```

## Running the Service

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Products (Requires Authentication)
- `POST /api/products` - Add new fabric
- `GET /api/products` - Get seller's products
- `GET /api/products/:id` - Get specific product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders (Requires Authentication)
- `GET /api/orders` - Get seller's orders
- `GET /api/orders/:id` - Get specific order
- `PUT /api/orders/:id/status` - Update order status

### Seller (Requires Authentication)
- `GET /api/sellers/stats` - Get seller dashboard stats
- `GET /api/sellers/profile` - Get seller profile

## Add Fabric API

### Request Format
```bash
POST /api/products
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>
```

### Form Data
- `name` (string, required): Fabric name
- `description` (string, required): Fabric description
- `category` (string, required): One of: cotton, silk, linen, wool, polyester, denim, chiffon, georgette, other
- `price` (number, required): Price per unit
- `pricePerUnit` (string, required): One of: per_meter, per_yard, per_piece
- `color` (string, required): Fabric color
- `pattern` (string, optional): One of: solid, striped, polka_dot, floral, geometric, abstract, other
- `weight` (string, required): Fabric weight
- `width` (string, required): Fabric width
- `careInstructions` (string, required): Care instructions
- `stock` (number, optional): Stock quantity (default: 0)
- `tags` (string, optional): Comma-separated tags
- `images` (files, optional): Up to 5 image files

### Response
```json
{
  "success": true,
  "message": "Fabric added successfully",
  "data": {
    "_id": "product_id",
    "sellerId": "seller_id",
    "name": "Cotton Fabric",
    "description": "High quality cotton fabric",
    "category": "cotton",
    "price": 150,
    "pricePerUnit": "per_meter",
    "color": "Blue",
    "pattern": "solid",
    "weight": "200 GSM",
    "width": "44 inches",
    "careInstructions": "Machine wash cold",
    "images": [
      {
        "url": "https://res.cloudinary.com/...",
        "publicId": "sewnova/fabrics/..."
      }
    ],
    "stock": 100,
    "isActive": true,
    "tags": ["cotton", "blue", "solid"],
    "rating": {
      "average": 0,
      "count": 0
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

## Authentication

All API endpoints (except health check) require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The token should contain:
- `userId`: Seller's user ID
- `role`: Must be "seller"
- `businessName`: Seller's business name
- `email`: Seller's email

## Database Models

### Product
- Basic product information
- Image URLs and Cloudinary public IDs
- Stock management
- Rating system
- Search indexing

### Order
- Order details with items
- Status tracking
- Customer and seller references
- Payment information

## Image Upload

Images are uploaded to Cloudinary with the following configuration:
- Folder: `sewnova/fabrics`
- Max file size: 10MB
- Supported formats: All image types
- Max images per product: 5

## Rate Limiting

- 100 requests per 15 minutes per IP
- Applied to all endpoints

## CORS

Configured to allow requests from the frontend URL specified in `FRONTEND_URL` environment variable.