# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env` file in the `backend/auth-service/` directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/sewnova

# JWT Configuration (must be at least 32 characters)
JWT_SECRET=your-super-secret-jwt-key-that-is-at-least-32-characters-long

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Encryption Key (must be exactly 32 characters)
ENCRYPTION_KEY=your32characterencryptionkey123

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=5000
NODE_ENV=development
```

## How to Set Up Each Variable

### 1. Database Configuration
```env
MONGODB_URI=mongodb://localhost:27017/sewnova
```
- For local development: Use the above
- For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/sewnova`

### 2. JWT Secret
```env
JWT_SECRET=your-super-secret-jwt-key-that-is-at-least-32-characters-long
```
- Must be at least 32 characters long
- Use a strong, random string
- Example: `my-super-secret-jwt-key-for-sewnova-2024`

### 3. Email Configuration (Gmail)

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Enable 2-Factor Authentication

#### Step 2: Generate App Password
1. Go to Google Account → Security
2. Find "App passwords" under 2-Step Verification
3. Generate a new app password for "Mail"
4. Use this password in `EMAIL_PASS`

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### 4. Encryption Key
```env
ENCRYPTION_KEY=your32characterencryptionkey123
```
- Must be exactly 32 characters
- Use a random string
- Example: `my32charactersencryptionkey123`

### 5. Google OAuth Client ID

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one

#### Step 2: Enable Google+ API
1. Go to APIs & Services → Library
2. Search for "Google+ API" and enable it

#### Step 3: Create OAuth Credentials
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized origins: `http://localhost:5173`
5. Add authorized redirect URIs: `http://localhost:5173`
6. Copy the Client ID

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
```

## Quick Setup Commands

### Generate Secure Keys
```bash
# Generate JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Create .env File
```bash
# Copy the example and edit
cp .env.example .env

# Or create manually
touch .env
```

## Testing Your Configuration

After setting up your `.env` file, test it:

```bash
cd backend/auth-service
node test_email_verification_improved.js
```

## Common Issues

### 1. "Missing required environment variables"
- Check that your `.env` file exists in the correct location
- Ensure all required variables are set
- Verify no extra spaces or quotes around values

### 2. "ENCRYPTION_KEY must be exactly 32 characters"
- Count the characters in your ENCRYPTION_KEY
- Use exactly 32 characters, no more, no less

### 3. "JWT_SECRET must be at least 32 characters"
- Ensure your JWT_SECRET is at least 32 characters long

### 4. Email sending fails
- Verify EMAIL_USER is a valid Gmail address
- Ensure EMAIL_PASS is an app password, not your regular password
- Check that 2-Factor Authentication is enabled on your Google account

## Security Notes

1. **Never commit `.env` files to version control**
2. **Use different keys for development and production**
3. **Rotate keys regularly in production**
4. **Keep your app passwords secure**

## Production Configuration

For production, use:
```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
MONGODB_URI=your-production-mongodb-uri
```

## Troubleshooting

If you're still having issues:

1. **Check file location**: `.env` must be in `backend/auth-service/`
2. **Restart server**: After changing `.env`, restart your server
3. **Check syntax**: No spaces around `=` in `.env` file
4. **Verify encoding**: Use UTF-8 encoding for `.env` file 