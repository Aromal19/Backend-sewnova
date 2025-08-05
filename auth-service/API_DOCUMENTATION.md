# Authentication API Documentation

## Overview
The authentication system has been redesigned to automatically detect user roles and provide enhanced security features. The system supports three user types: Customer, Tailor, and Seller.

## Base URL
```
http://localhost:5000/api/
```

## Endpoints

### 1. Login User
**POST** `/login`

Authenticates a user with email and password, automatically detecting their role.

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

#### Response (Success - 200)
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

#### Response (Error - 400/401)
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

### 2. Get User Role
**POST** `/get-role`

Retrieves the user role by email (useful for frontend routing).

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "role": "customer",
  "message": "User role retrieved successfully"
}
```

#### Response (Error - 404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### 3. Validate Token
**GET** `/validate-token`

Validates a JWT token and returns user information.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response (Success - 200)
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

#### Response (Error - 401)
```json
{
  "success": false,
  "message": "Invalid token"
}
```

## User Roles and Specific Fields

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

## Error Handling

All endpoints return consistent error responses with:
- `success`: boolean indicating success/failure
- `message`: descriptive error message
- Appropriate HTTP status codes

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Tokens**: Secure token-based authentication
3. **Role-based Access**: Automatic role detection and validation
4. **Input Validation**: Comprehensive validation for all inputs
5. **Error Sanitization**: Generic error messages to prevent information leakage

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