# Design Service - SewNova

This service handles the design library functionality for SewNova, allowing users to browse and select outfit designs for virtual try-on.

## Features

- **Design Management**: CRUD operations for outfit designs
- **Category Filtering**: Filter designs by category (formal, casual, traditional, etc.)
- **Search Functionality**: Search designs by name, description, or tags
- **Difficulty Levels**: Designs marked with difficulty (beginner, intermediate, advanced)
- **Price Information**: Optional pricing for designs
- **Tag System**: Flexible tagging for better organization

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Designs
- `GET /api/designs` - Get all designs (with optional filtering)
- `GET /api/designs/categories` - Get all available categories
- `GET /api/designs/:id` - Get single design by ID
- `POST /api/designs` - Create new design (admin use)
- `PUT /api/designs/:id` - Update design
- `DELETE /api/designs/:id` - Soft delete design

### Query Parameters for GET /api/designs
- `category` - Filter by category (e.g., `?category=formal`)
- `search` - Search in name, description, tags (e.g., `?search=evening`)
- `isActive` - Filter by active status (default: true)

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend/design-service
npm install
```

### 2. Environment Variables
Ensure your `.env` file contains:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3006
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Seed Sample Data
```bash
node seedDesigns.js
```

### 4. Start the Service
```bash
npm start
# or
node server.js
```

### 5. Test the API
```bash
node test-api.js
```

## Database Schema

### Design Model
```javascript
{
  name: String (required),
  category: String (required, enum),
  image: String (required),
  description: String,
  tailorIds: [ObjectId],
  price: Number,
  difficulty: String (enum: beginner, intermediate, advanced),
  estimatedTime: Number (hours),
  tags: [String],
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## Categories
- formal
- casual
- traditional
- western
- ethnic
- party
- wedding
- office

## Frontend Integration

The service is integrated with the React frontend through:
- `DesignSelection.jsx` - Grid component for browsing designs
- `DesignPage.jsx` - Full page for design selection
- API configuration in `frontend/src/config/api.js`

## Sample Data

The seeding script includes 15 sample designs across all categories with:
- High-quality placeholder images from Unsplash
- Realistic pricing and difficulty levels
- Descriptive text and relevant tags
- Various estimated completion times

## Development

### Adding New Designs
1. Use the POST endpoint to add designs programmatically
2. Or modify `seedDesigns.js` and re-run the seeding script

### Custom Categories
To add new categories, update the enum in the schema and re-run migrations.

### Image Hosting
Currently uses placeholder images. For production, integrate with Cloudinary or similar service.

## Testing

Run the test suite:
```bash
node test-api.js
```

This will test all endpoints and verify the service is working correctly.

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper MongoDB connection
3. Set up image hosting (Cloudinary recommended)
4. Configure CORS for production domain
5. Set up monitoring and logging

## Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MONGODB_URI is correct
2. **CORS Errors**: Check FRONTEND_URL configuration
3. **Port Conflicts**: Ensure port 3006 is available
4. **Image Loading**: Check image URLs are accessible

### Logs
The service logs connection status and errors to console. Check for:
- MongoDB connection success/failure
- API request/response logs
- Error details for debugging
