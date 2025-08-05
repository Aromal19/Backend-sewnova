# Email Validation and JWT Token Implementation

## Overview

This document outlines the implementation of comprehensive email validation and JWT token generation for all user registration processes in the SewNova authentication system.

## Key Features Implemented

### 1. Centralized Email Validation

- **Cross-Collection Validation**: Email addresses are now checked across all user types (Customer, Seller, Tailor) before registration
- **Format Validation**: Email format is validated using regex pattern
- **Duplicate Prevention**: No email can be used by multiple user types
- **Consistent Error Messages**: Clear, user-friendly error messages indicating which user type already uses the email

### 2. JWT Token Generation on Signup

- **All User Types**: JWT tokens are now generated for all user types during registration
- **Consistent Token Structure**: All tokens include `userId`, `role`, and `email`
- **7-Day Expiration**: Tokens expire after 7 days for security
- **Standardized Response Format**: All registration responses follow the same structure

### 3. Enhanced Security

- **Token Blacklisting**: Logout functionality properly invalidates tokens
- **Role-Based Access**: Tokens include user role for authorization
- **Consistent Authentication**: All user types use the same authentication flow

## Implementation Details

### Email Validation Utility (`utils/emailValidation.js`)

```javascript
// Functions available:
- checkEmailExists(email) // Check if email exists in any collection
- validateEmailFormat(email) // Validate email format
- validateEmailForRegistration(email) // Comprehensive validation
```

### Updated Controllers

#### Customer Controller (`controllers/customerController.js`)
- ✅ JWT token generation on signup
- ✅ Cross-collection email validation
- ✅ Google OAuth email validation
- ✅ Consistent response format

#### Seller Controller (`controllers/sellerController.js`)
- ✅ JWT token generation on signup
- ✅ Cross-collection email validation
- ✅ Consistent response format

#### Tailor Controller (`controllers/tailorController.js`)
- ✅ **NEW**: JWT token generation on signup
- ✅ **NEW**: Cross-collection email validation
- ✅ **NEW**: Consistent response format

### API Endpoints

#### Registration Endpoints
- `POST /api/customers/register` - Customer registration
- `POST /api/sellers/register` - Seller registration  
- `POST /api/tailors/register` - Tailor registration

#### Email Validation Endpoint
- `GET /api/auth/check-email?email=user@example.com` - Check email availability

## Response Format

### Successful Registration Response
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "role": "customer",
    "phone": "1234567890"
  },
  "token": "jwt_token_here"
}
```

### Email Validation Response
```json
{
  "success": true,
  "available": false,
  "message": "Email is already registered as a customer",
  "userType": "customer"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Email is already registered as a seller"
}
```

## Validation Rules

### Email Validation
1. **Required**: Email field is mandatory
2. **Format**: Must be a valid email format (user@domain.com)
3. **Uniqueness**: Email cannot exist in any user collection (Customer, Seller, Tailor)
4. **Case Insensitive**: Email addresses are normalized to lowercase

### Phone Validation
1. **Required**: Phone field is mandatory for non-Google users
2. **Uniqueness**: Phone number must be unique within the same user type
3. **Format**: Basic phone number validation

## Security Features

### JWT Token Structure
```javascript
{
  userId: "user_id",
  role: "customer|seller|tailor",
  email: "user@example.com",
  exp: "expiration_timestamp"
}
```

### Token Security
- **Secret Key**: Uses environment variable `JWT_SECRET`
- **Expiration**: 7-day token lifetime
- **Blacklisting**: Tokens are invalidated on logout
- **Role-Based**: Tokens include user role for authorization

## Testing

### Email Validation Tests
1. Try registering with existing email from different user type
2. Try registering with invalid email format
3. Try registering with empty email field
4. Verify email availability endpoint works correctly

### JWT Token Tests
1. Verify token is generated on all user type registrations
2. Verify token structure includes userId, role, and email
3. Verify token can be used for authentication
4. Verify token is invalidated on logout

## Migration Notes

### Breaking Changes
- Registration response format changed from `customer/seller/tailor` to `user`
- Added `success` field to all responses
- JWT token structure now includes `role` and `email` fields

### Frontend Updates Required
- Update registration response handling to use `user` instead of `customer/seller/tailor`
- Add `success` field checking in response handling
- Update JWT token storage to handle new token structure
- Implement email availability checking before registration

## Environment Variables

Ensure these environment variables are set:
```env
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
```

## Error Handling

### Common Error Scenarios
1. **Email Already Exists**: Clear message indicating which user type uses the email
2. **Invalid Email Format**: User-friendly validation message
3. **Phone Already Exists**: Clear message for phone number conflicts
4. **Server Errors**: Generic error messages for security

### Error Response Format
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

## Future Enhancements

1. **Email Verification**: Implement email verification for new registrations
2. **Password Strength**: Add password strength validation
3. **Rate Limiting**: Implement rate limiting for registration endpoints
4. **Audit Logging**: Add comprehensive audit logging for security
5. **Multi-Factor Authentication**: Implement MFA for enhanced security 