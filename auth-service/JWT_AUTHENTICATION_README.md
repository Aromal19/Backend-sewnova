# JWT Authentication System with Token Blacklisting

## 🔐 Overview

This document explains the complete JWT (JSON Web Token) authentication system implemented in the SewNova project, including the token blacklisting mechanism for secure logout functionality.

## 🏗️ Architecture

### System Components
- **Frontend**: React application with authentication state management
- **Backend**: Node.js/Express API with JWT authentication
- **Database**: MongoDB for user data and blacklisted tokens
- **Security**: Token blacklisting for immediate logout invalidation

## 🔄 Complete Authentication Workflow

### 1. User Registration
```
User → Frontend → Backend API → MongoDB
```
- User fills registration form
- Backend validates data and creates user in appropriate collection (Customer/Tailor/Seller)
- User is redirected to login

### 2. User Login
```
User Login → Backend Validation → JWT Generation → Frontend Storage
```

#### Backend Process:
1. **Email Validation**: Check if email exists in any user collection
2. **Password Verification**: Compare with bcrypt hashed password
3. **Role Detection**: Automatically determine user role (customer/tailor/seller)
4. **JWT Creation**: Generate token with user ID, role, and email
5. **Response**: Send token + user data to frontend

#### Frontend Process:
1. **Store Token**: Save JWT in localStorage
2. **Store User Data**: Save user info in localStorage
3. **Update UI**: Display user name and role
4. **Route Redirect**: Navigate to role-specific dashboard

### 3. API Request Flow
```
Frontend Request → Token Validation → Blacklist Check → Database Query → Response
```

#### For Each Protected API Call:
1. **Token Extraction**: Get JWT from Authorization header
2. **Blacklist Check**: Verify token isn't in blacklisted collection
3. **JWT Verification**: Validate token signature and expiration
4. **User Validation**: Ensure user still exists in database
5. **Request Processing**: Execute the actual API logic

### 4. User Logout
```
Logout Request → Token Blacklisting → Frontend Cleanup → UI Update
```

#### Backend Process:
1. **Token Verification**: Validate the logout token
2. **Blacklist Addition**: Add token to BlacklistedToken collection
3. **Response**: Confirm successful logout

#### Frontend Process:
1. **Clear Storage**: Remove all auth data from localStorage
2. **UI Update**: Show guest/unauthorized state
3. **Redirect**: Navigate to login page

## 🛡️ Security Implementation

### JWT Token Structure
```javascript
// JWT Payload (what's inside the token)
{
  userId: "user_id_from_database",
  role: "customer|tailor|seller",
  email: "user@example.com",
  iat: 1234567890,  // Issued at
  exp: 1234567890   // Expires at (7 days)
}
```

### Token Blacklisting System

#### Database Schema
```javascript
// BlacklistedToken Collection
{
  token: "jwt_token_string",           // The actual JWT
  userId: "user_id",                   // Reference to user
  userModel: "Customer|Tailor|Seller", // User collection
  blacklistedAt: "2024-01-01T00:00:00Z", // When blacklisted
  expiresAt: "2024-01-08T00:00:00Z"   // When JWT expires
}
```

#### Auto-Cleanup
- **TTL Index**: Automatically deletes blacklisted tokens after 7 days
- **Memory Efficient**: Prevents database bloat
- **Performance**: Fast queries with proper indexing

### Security Features

#### 1. Immediate Token Invalidation
- ✅ **Instant Logout**: Tokens become unusable immediately
- ✅ **No Persistence**: Stolen tokens can't be used after logout
- ✅ **Database Validation**: Ensures user still exists

#### 2. Frontend Protection
- ✅ **Automatic Redirect**: Invalid tokens redirect to login
- ✅ **State Management**: UI updates immediately
- ✅ **Storage Cleanup**: localStorage cleared on logout

#### 3. Backend Security
- ✅ **Blacklist Check**: Every request verifies token status
- ✅ **JWT Verification**: Standard JWT validation
- ✅ **Role-Based Access**: Different permissions per user type

## 📁 File Structure

```
backend/auth-service/
├── models/
│   ├── blacklistedToken.js     # Token blacklist schema
│   ├── customer.js             # Customer user model
│   ├── tailor.js               # Tailor user model
│   └── seller.js               # Seller user model
├── controllers/
│   └── authController.js       # Authentication logic
├── middlewares/
│   ├── authMiddleware.js       # Complete auth middleware
│   └── checkBlacklistedToken.js # Blacklist check middleware
├── routes/
│   └── authRoutes.js           # Authentication routes
└── server.js                   # Main server file
```

## 🔧 API Endpoints

### Authentication Routes
```
POST /api/auth/login          # User login
POST /api/auth/logout         # User logout (protected)
GET  /api/auth/validate-token # Token validation (protected)
POST /api/auth/get-role       # Get user role by email
```

### Protected Routes
All protected routes use the `authMiddleware` which:
1. Checks token blacklist
2. Validates JWT
3. Verifies user exists
4. Adds user info to `req.user`

## 🚀 Usage Examples

### Frontend Authentication Check
```javascript
import { isAuthenticated, getCurrentUser, logout } from '../utils/api';

// Check if user is logged in
if (isAuthenticated()) {
  const user = getCurrentUser();
  console.log(`Welcome ${user.firstname}!`);
}

// Logout user
await logout();
```

### Backend Protected Route
```javascript
const authMiddleware = require('../middlewares/authMiddleware');

// Apply to routes
router.get('/protected-data', authMiddleware, (req, res) => {
  // req.user contains authenticated user info
  res.json({ data: 'secret', user: req.user });
});
```

## 🔍 Testing the System

### Test Token Invalidation
1. **Login** with any user account
2. **Copy JWT token** from browser localStorage
3. **Logout** the user
4. **Try API call** with copied token
5. **Result**: 401 error - "Token has been invalidated"

### Test Auto-Cleanup
1. **Check MongoDB**: `db.blacklistedtokens.find()`
2. **Wait 7 days** (or modify TTL for testing)
3. **Check again**: Tokens should be automatically deleted

## ⚠️ Important Notes

### Security Considerations
- **Token Expiration**: 7 days (configurable in JWT_SECRET)
- **HTTPS Required**: Always use HTTPS in production
- **Secret Management**: Store JWT_SECRET securely
- **Rate Limiting**: Implement rate limiting for auth endpoints

### Performance Considerations
- **Database Indexes**: Proper indexing for fast blacklist checks
- **Token Size**: Keep JWT payload minimal
- **Cleanup**: Automatic cleanup prevents database bloat

### Production Deployment
- **Environment Variables**: Set proper JWT_SECRET
- **Database**: Use production MongoDB instance
- **Monitoring**: Monitor blacklist collection size
- **Backup**: Regular database backups

## 🐛 Troubleshooting

### Common Issues

#### 1. Token Still Valid After Logout
- **Check**: Blacklist collection in MongoDB
- **Verify**: Middleware is applied to routes
- **Debug**: Check server logs for errors

#### 2. Duplicate Index Warnings
- **Cause**: Conflicting index definitions
- **Solution**: Remove duplicate `schema.index()` calls

#### 3. Performance Issues
- **Check**: Database indexes are created
- **Monitor**: Blacklist collection size
- **Optimize**: Consider Redis for high-traffic applications

### Debug Commands
```bash
# Check blacklisted tokens
db.blacklistedtokens.find().pretty()

# Check indexes
db.blacklistedtokens.getIndexes()

# Monitor collection size
db.blacklistedtokens.stats()
```

## 📈 Future Enhancements

### Potential Improvements
1. **Redis Integration**: Use Redis for faster blacklist checks
2. **Refresh Tokens**: Implement refresh token mechanism
3. **Multi-Device Logout**: Logout from all devices
4. **Session Management**: Track active sessions
5. **Audit Logging**: Log authentication events

### Scalability Considerations
- **Load Balancing**: Multiple server instances
- **Database Sharding**: For large user bases
- **CDN**: For static assets
- **Caching**: Redis for frequently accessed data

---

## 🎯 Summary

This JWT authentication system provides:
- ✅ **Secure login/logout** with immediate token invalidation
- ✅ **Role-based access control** for different user types
- ✅ **Automatic cleanup** of expired tokens
- ✅ **Frontend integration** with real-time state management
- ✅ **Production-ready security** with proper error handling

The system ensures that once a user logs out, their JWT token becomes immediately unusable, providing the security that stateless JWT tokens typically lack. 