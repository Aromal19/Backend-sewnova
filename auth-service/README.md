# SewNova Authentication Service

## Overview
The authentication service has been redesigned to provide a more secure and user-friendly login experience. The system now automatically detects user roles and provides enhanced security features.

## Key Features

### 🔐 Enhanced Security
- **Automatic Role Detection**: No need to specify user role during login
- **Password Hashing**: All passwords are securely hashed using bcrypt
- **JWT Tokens**: Secure token-based authentication with 7-day expiration
- **Input Validation**: Comprehensive validation for all inputs
- **Error Sanitization**: Generic error messages to prevent information leakage

### 🚀 Improved User Experience
- **Single Login Endpoint**: Works for all user types (Customer, Tailor, Seller)
- **Automatic Routing**: Frontend automatically routes users based on their role
- **Token Validation**: Built-in token validation for session management
- **Role Fetching**: Separate endpoint to get user role for frontend routing

## API Endpoints

### 1. Login User
```
POST /api/auth/login
```
Authenticates a user with email and password, automatically detecting their role.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "firstname": "John",
    "lastname": "Doe",
    "email": "user@example.com",
    "role": "customer",
    "phone": "1234567890"
  },
  "token": "jwt_token_here"
}
```

### 2. Get User Role
```
POST /api/auth/get-role
```
Retrieves the user role by email (useful for frontend routing).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "role": "customer",
  "message": "User role retrieved successfully"
}
```

### 3. Validate Token
```
GET /api/auth/validate-token
```
Validates a JWT token and returns user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "firstname": "John",
    "lastname": "Doe",
    "email": "user@example.com",
    "role": "customer",
    "phone": "1234567890"
  }
}
```

## User Models

### Customer
- Basic fields: id, firstname, lastname, email, role, phone
- Additional fields: address, pincode, district, state, country, profileImage

### Tailor
- Basic fields: id, firstname, lastname, email, role, phone
- Additional fields: shopName, experience, specialization, isVerified, rating, totalOrders

### Seller
- Basic fields: id, firstname, lastname, email, role, phone
- Additional fields: businessName, businessType, gstNumber, isVerified, rating, totalSales, productsCount

## Authentication Middleware

The `auth` middleware can be used to protect routes that require authentication:

```javascript
const auth = require('../middlewares/auth');

// Protected route
router.get('/protected', auth, (req, res) => {
  // req.user contains the authenticated user
  // req.userRole contains the user's role
});
```

## Frontend Integration

### Login Flow
1. User enters email and password
2. Frontend calls `/login` endpoint
3. Backend returns user data and JWT token
4. Frontend stores token and routes based on user role

### Role-based Routing
1. Frontend can call `/get-role` with email to determine routing
2. Use the returned role to navigate to appropriate dashboard

### Token Validation
1. Frontend can validate stored tokens using `/validate-token`
2. Use this for session management and auto-login features

## Environment Variables

Make sure to set the following environment variables:

```env
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## Installation and Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env` file

3. Start the server:
```bash
npm start
```

## Error Handling

All endpoints return consistent error responses with:
- `success`: boolean indicating success/failure
- `message`: descriptive error message
- Appropriate HTTP status codes

## Security Best Practices

1. **Password Security**: All passwords are hashed using bcrypt with salt rounds
2. **Token Security**: JWT tokens are signed with a secret key and have expiration
3. **Input Validation**: All inputs are validated and sanitized
4. **Error Handling**: Generic error messages prevent information leakage
5. **Role-based Access**: Automatic role detection and validation

## Testing

You can test the API endpoints using tools like Postman or curl:

```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test get role
curl -X POST http://localhost:5000/api/auth/get-role \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test token validation
curl -X GET http://localhost:5000/api/auth/validate-token \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
``` 