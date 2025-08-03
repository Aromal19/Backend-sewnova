# Auth Service - Customer Management

This service handles customer authentication and profile management for the SewNova application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sewnova_auth
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_secure
```

3. Start the server:
```bash
node server.js
```

## API Endpoints

### Public Routes (No Authentication Required)

#### Register Customer
- **POST** `/api/customers/register`
- **Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "password123"
}
```

#### Login Customer
- **POST** `/api/customers/login`
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Protected Routes (Authentication Required)

Add `Authorization: Bearer <token>` header to all protected routes.

#### Get Profile
- **GET** `/api/customers/profile`

#### Update Profile
- **PUT** `/api/customers/profile`
- **Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "address": "123 Main St",
  "pincode": "12345",
  "district": "Central",
  "state": "California",
  "country": "USA",
  "profileImage": "https://example.com/image.jpg"
}
```

#### Change Password
- **PUT** `/api/customers/change-password`
- **Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

#### Delete Account
- **DELETE** `/api/customers/account`

### Admin Routes

#### Get All Customers
- **GET** `/api/customers/all`

#### Get Customer by ID
- **GET** `/api/customers/:id`

## Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "customer": {
    "_id": "customer_id",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "customer",
    "address": "",
    "pincode": "",
    "district": "",
    "state": "",
    "country": "India",
    "profileImage": "",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### Error Response
```json
{
  "message": "Error description"
}
```

## Features

- ✅ Customer registration with email/phone validation
- ✅ Secure password hashing with bcrypt
- ✅ JWT-based authentication
- ✅ Profile management (view/update)
- ✅ Password change functionality
- ✅ Account deletion
- ✅ Admin routes for customer management
- ✅ Input validation and error handling
- ✅ CORS enabled for frontend integration

## Security Features

- Passwords are hashed using bcrypt with salt rounds of 10
- JWT tokens expire after 7 days
- Role-based access control (customer role is immutable)
- Input validation and sanitization
- Protected routes require valid JWT token 