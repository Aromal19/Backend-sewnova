# Admin Service

This is the admin service for the SewNova platform, providing administrative functionality and user management.

## Features

- Admin authentication and authorization
- User management (customers, tailors, sellers)
- Design management
- Analytics and reporting
- Platform overview and statistics

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`:
```
PORT=3007
MONGODB_URI=mongodb://localhost:27017/sewnova
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

4. Seed admin user:
```bash
npm run seed
```

5. Start the service:
```bash
npm start
```

## Default Admin Credentials

- Email: admin@gmail.com
- Password: admin@123

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile
- `PUT /api/admin/profile` - Update admin profile
- `PUT /api/admin/change-password` - Change password

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/status` - Update user status
- `DELETE /api/users/:id` - Delete user

### Design Management
- `GET /api/designs` - Get all designs
- `POST /api/designs` - Create design
- `PUT /api/designs/:id` - Update design
- `DELETE /api/designs/:id` - Delete design
- `GET /api/designs/stats` - Get design statistics

### Analytics
- `GET /api/analytics` - Get platform analytics
- `GET /api/analytics/revenue` - Get revenue analytics
- `GET /api/analytics/users` - Get user analytics

## Frontend Integration

The admin dashboard is accessible at `/admin/dashboard` after logging in with admin credentials.

## Security

- All routes are protected with JWT authentication
- Admin-only access for sensitive operations
- Rate limiting enabled
- CORS configured for frontend integration
