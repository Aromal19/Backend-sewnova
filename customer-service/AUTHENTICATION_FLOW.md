# Authentication Flow Explanation

## How the Authentication Middleware Works

### 🔄 The Complete Flow

```
Frontend Request → Customer Service → Auth Middleware → Auth Service → Response
```

### 📋 Step-by-Step Breakdown

#### 1. Frontend Sends Request
```
GET /api/addresses
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Customer Service Receives Request
- Request hits the customer service on port 3002
- Route `/api/addresses` is protected by `authMiddleware`

#### 3. Auth Middleware Processes Request
```javascript
// Step 1: Extract token from headers
const token = req.headers.authorization?.split(' ')[1];

// Step 2: Check if token exists
if (!token) {
  return res.status(401).json({ message: "Access token required" });
}

// Step 3: Verify token with auth service
const authResponse = await axios.get(
  "http://localhost:3000/api/auth/validate-token",
  { headers: { "Authorization": `Bearer ${token}` } }
);

// Step 4: If valid, attach user to request
if (authResponse.data.success) {
  req.user = authResponse.data.user;
  next(); // Continue to the actual route
}
```

#### 4. Auth Service Validates Token
- Auth service receives the token
- Decodes the JWT token using the secret
- Checks if user exists in database
- Returns user information if valid

#### 5. Customer Service Responds
- If authentication successful: Returns the requested data
- If authentication failed: Returns 401 error

### 🛡️ Three Types of Middleware

#### 1. `authMiddleware` (Required Authentication)
```javascript
// Used for protected routes
app.use('/api/addresses', authMiddleware, customerOnly, addressRoutes);
```
- **Must have valid token**
- **Fails with 401 if no token or invalid token**
- **Attaches user info to request**

#### 2. `customerOnly` (Role Check)
```javascript
// Checks if user is a customer
if (req.user.role === 'customer') {
  next(); // Allow access
} else {
  return res.status(403).json({ message: "Customer role required" });
}
```
- **Requires user to be authenticated first**
- **Checks user role**
- **Fails with 403 if wrong role**

#### 3. `optionalAuth` (Optional Authentication)
```javascript
// Used for public routes that can work with or without auth
app.use('/api/public', optionalAuth, publicRoutes);
```
- **Tries to authenticate if token provided**
- **Continues even if no token or invalid token**
- **Doesn't fail the request**

### 🔍 Debugging the Middleware

The simplified middleware now includes detailed logging:

```
🔐 Auth Middleware: Checking authentication...
📋 Auth Header: Present
🔑 Token extracted: Yes
🔍 Verifying token with auth service...
🌐 Auth Service URL: http://localhost:3000
✅ Auth service response: 200
👤 User authenticated: user@example.com Role: customer
✅ Customer access granted
```

### 🚨 Common Issues and Solutions

#### Issue 1: "Access token required"
**Cause**: No Authorization header in request
**Solution**: Make sure frontend sends token in headers

#### Issue 2: "Token verification failed"
**Cause**: Auth service is down or token is invalid
**Solution**: Check if auth service is running on port 3000

#### Issue 3: "Customer role required"
**Cause**: User is not a customer (might be seller/tailor)
**Solution**: Login with a customer account

#### Issue 4: "Authentication service is unavailable"
**Cause**: Auth service is not running
**Solution**: Start the auth service

### 🧪 Testing the Flow

1. **Start Auth Service**: `cd backend/auth-service && node server.js`
2. **Start Customer Service**: `cd backend/customer-service && node server.js`
3. **Test with curl**:
   ```bash
   # Without token (should fail)
   curl http://localhost:3002/api/addresses
   
   # With token (should work if valid)
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3002/api/addresses
   ```

### 💡 Key Points

- **Customer Service** doesn't validate tokens itself
- **Auth Service** is responsible for token validation
- **Frontend** must send token in Authorization header
- **Middleware** acts as a security checkpoint
- **Logs** help debug authentication issues 