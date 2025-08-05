# 📁 Backend Auth-Service Folder Structure

## 🏗️ Complete Directory Structure

```
backend/auth-service/
├── 📄 package.json                    # Node.js dependencies and scripts
├── 📄 package-lock.json               # Locked dependency versions
├── 📄 server.js                       # Main server entry point
├── 📄 .env                           # Environment variables (not in repo)
├── 📄 README.md                      # General project documentation
├── 📄 API_DOCUMENTATION.md           # API endpoints documentation
├── 📄 JWT_AUTHENTICATION_README.md   # JWT auth system documentation
├── 📄 AUTHENTICATION_WORKFLOW.md     # Visual workflow diagrams
├── 📄 FOLDER_STRUCTURE.md            # This file - folder structure guide
├── 📁 node_modules/                  # Installed dependencies
├── 📁 models/                        # Database schemas and models
│   ├── 📄 customer.js                # Customer user model
│   ├── 📄 tailor.js                  # Tailor user model
│   ├── 📄 seller.js                  # Seller user model
│   └── 📄 blacklistedToken.js        # JWT blacklist model
├── 📁 controllers/                   # Business logic handlers
│   ├── 📄 authController.js          # Authentication logic
│   ├── 📄 customerController.js      # Customer operations
│   ├── 📄 tailorController.js        # Tailor operations
│   └── 📄 sellerController.js        # Seller operations
├── 📁 middlewares/                   # Request processing middleware
│   ├── 📄 authMiddleware.js          # Complete auth middleware
│   ├── 📄 checkBlacklistedToken.js   # Blacklist verification
│   └── 📄 auth.js                    # Legacy auth middleware
└── 📁 routes/                        # API route definitions
    ├── 📄 authRoutes.js              # Authentication routes
    ├── 📄 customerRoutes.js          # Customer API routes
    ├── 📄 tailorRoutes.js            # Tailor API routes
    └── 📄 sellerRoutes.js            # Seller API routes
```

## 📄 Root Level Files

### **Core Configuration Files**
- **`package.json`** - Node.js project configuration, dependencies, and scripts
- **`package-lock.json`** - Locked versions of all dependencies
- **`server.js`** - Main server entry point, Express app setup, MongoDB connection
- **`.env`** - Environment variables (JWT_SECRET, MONGODB_URI, PORT, etc.)

### **Documentation Files**
- **`README.md`** - General project overview and setup instructions
- **`API_DOCUMENTATION.md`** - Complete API endpoints documentation
- **`JWT_AUTHENTICATION_README.md`** - Detailed JWT authentication system guide
- **`AUTHENTICATION_WORKFLOW.md`** - Visual diagrams and workflow explanations
- **`FOLDER_STRUCTURE.md`** - This file - complete folder structure guide

## 📁 Models Directory (`/models`)

### **User Models**
- **`customer.js`** - Customer user schema with basic fields
- **`tailor.js`** - Tailor user schema with professional fields
- **`seller.js`** - Seller user schema with business fields

### **Security Models**
- **`blacklistedToken.js`** - JWT token blacklist schema for logout security

### **Model Structure Example**
```javascript
// customer.js
const customerSchema = {
  firstname: String,
  lastname: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  createdAt: Date,
  updatedAt: Date
}

// blacklistedToken.js
const blacklistedTokenSchema = {
  token: String (unique),
  userId: ObjectId,
  userModel: String,
  blacklistedAt: Date,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 📁 Controllers Directory (`/controllers`)

### **Authentication Controller**
- **`authController.js`** - Handles login, logout, token validation, and role detection

### **User Controllers**
- **`customerController.js`** - Customer-specific operations (CRUD, profile management)
- **`tailorController.js`** - Tailor-specific operations (orders, appointments, earnings)
- **`sellerController.js`** - Seller-specific operations (products, inventory, sales)

### **Controller Functions Example**
```javascript
// authController.js
- loginUser()           // User authentication
- logoutUser()          // Secure logout with blacklisting
- validateToken()       // Token validation with blacklist check
- getUserRole()         // Role detection by email

// customerController.js
- registerCustomer()    // Customer registration
- getCustomerProfile()  // Get customer details
- updateCustomer()      // Update customer info
- deleteCustomer()      // Delete customer account
```

## 📁 Middlewares Directory (`/middlewares`)

### **Authentication Middleware**
- **`authMiddleware.js`** - Complete authentication middleware (blacklist + JWT + user validation)
- **`checkBlacklistedToken.js`** - Standalone blacklist verification middleware
- **`auth.js`** - Legacy authentication middleware (deprecated)

### **Middleware Functions**
```javascript
// authMiddleware.js
- Token extraction from headers
- Blacklist verification
- JWT signature validation
- User existence verification
- User data injection into req.user

// checkBlacklistedToken.js
- Token extraction
- Database blacklist check
- Early rejection for invalidated tokens
```

## 📁 Routes Directory (`/routes`)

### **API Route Definitions**
- **`authRoutes.js`** - Authentication endpoints (`/api/auth/*`)
- **`customerRoutes.js`** - Customer API endpoints (`/api/customers/*`)
- **`tailorRoutes.js`** - Tailor API endpoints (`/api/tailor/*`)
- **`sellerRoutes.js`** - Seller API endpoints (`/api/seller/*`)

### **Route Structure Example**
```javascript
// authRoutes.js
POST /api/auth/login          // User login
POST /api/auth/logout         // User logout (protected)
GET  /api/auth/validate-token // Token validation (protected)
POST /api/auth/get-role       // Get user role by email

// customerRoutes.js
POST /api/customers/register  // Customer registration
GET  /api/customers/profile   // Get customer profile
PUT  /api/customers/profile   // Update customer profile
DELETE /api/customers/profile // Delete customer account
```

## 🔄 Data Flow Architecture

```
Request Flow:
Client Request → Routes → Middleware → Controller → Model → Database
                ↓
Response Flow:
Database → Model → Controller → Middleware → Routes → Client Response
```

## 🛡️ Security Layer Structure

```
Request Security Check:
1. Route Definition (authRoutes.js)
2. Blacklist Check (checkBlacklistedToken.js)
3. JWT Validation (authMiddleware.js)
4. User Verification (authMiddleware.js)
5. Controller Logic (authController.js)
6. Database Operation (models/*.js)
```

## 📊 File Size and Complexity

### **Small Files (< 1KB)**
- `routes/*.js` - Route definitions only
- `checkBlacklistedToken.js` - Simple blacklist check
- `blacklistedToken.js` - Basic schema definition

### **Medium Files (1-5KB)**
- `server.js` - Server setup and configuration
- `authMiddleware.js` - Complete auth logic
- `models/*.js` - Database schemas

### **Large Files (5-10KB)**
- `authController.js` - Complete authentication logic
- `*Controller.js` - Full CRUD operations for each user type
- Documentation files - Comprehensive guides

## 🎯 Key Features by Directory

### **Models (`/models`)**
- ✅ Database schema definitions
- ✅ Validation rules
- ✅ Index configurations
- ✅ Auto-cleanup (TTL indexes)

### **Controllers (`/controllers`)**
- ✅ Business logic implementation
- ✅ Error handling
- ✅ Response formatting
- ✅ Database operations

### **Middlewares (`/middlewares`)**
- ✅ Request preprocessing
- ✅ Authentication verification
- ✅ Security checks
- ✅ User data injection

### **Routes (`/routes`)**
- ✅ API endpoint definitions
- ✅ HTTP method mapping
- ✅ Middleware chaining
- ✅ Route protection

## 🔧 Development Workflow

### **Adding New Features**
1. **Model**: Define schema in `/models`
2. **Controller**: Implement logic in `/controllers`
3. **Route**: Define endpoint in `/routes`
4. **Middleware**: Add protection if needed
5. **Documentation**: Update relevant docs

### **Security Updates**
1. **Middleware**: Update auth logic
2. **Controller**: Enhance validation
3. **Model**: Add security fields
4. **Testing**: Verify all endpoints

### **API Extensions**
1. **Route**: Add new endpoint
2. **Controller**: Implement handler
3. **Model**: Extend schema if needed
4. **Documentation**: Update API docs

## 📈 Scalability Considerations

### **Current Structure Benefits**
- ✅ **Modular Design**: Easy to extend and maintain
- ✅ **Separation of Concerns**: Clear responsibility boundaries
- ✅ **Middleware Reusability**: Shared authentication logic
- ✅ **Documentation**: Comprehensive guides for developers

### **Future Enhancements**
- 🔄 **Redis Integration**: For faster blacklist checks
- 🔄 **Microservices**: Split into separate services
- 🔄 **Caching Layer**: Add Redis for performance
- 🔄 **Monitoring**: Add logging and metrics

---

## 🎯 Summary

This folder structure provides:
- **Clear organization** with logical file grouping
- **Comprehensive documentation** for all components
- **Security-first approach** with proper middleware
- **Scalable architecture** for future enhancements
- **Production-ready structure** with proper error handling

The structure follows **MVC (Model-View-Controller)** pattern adapted for API development, with additional middleware layer for security and request processing. 