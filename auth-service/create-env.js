const fs = require('fs');
const path = require('path');

console.log('🔧 Creating .env file...\n');

const envContent = `# Server Configuration
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb+srv://aromalgirish00:aromal00@sewnova.tlnzt4i.mongodb.net/?retryWrites=true&w=majority&appName=sewnova

# JWT Configuration
JWT_SECRET=b8d2f8b9c24a17e1d1e1a2f6b5c3a8791e9b47a1e3c38a7216e7bbf7f28d194d

# Email Configuration (Gmail SMTP)
EMAIL_USER=aromalgirish00@gmail.com
EMAIL_PASS=xwvtnhuirlhgefny

# Email Verification Encryption
ENCRYPTION_KEY=1ef44580a37ba5a66fa5aa6de4d82129

# Google OAuth
GOOGLE_CLIENT_ID=648036319844-qp2nk1cg25ukh0j9ritk0mtbslbbccqk.apps.googleusercontent.com

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
`;

const envPath = path.join(__dirname, '.env');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log(`Location: ${envPath}`);
  console.log('');
  console.log('📋 Environment variables set:');
  console.log('   - PORT: 3000');
  console.log('   - MONGODB_URI: [configured]');
  console.log('   - JWT_SECRET: [configured]');
  console.log('   - EMAIL_USER: aromalgirish00@gmail.com');
  console.log('   - EMAIL_PASS: [configured]');
  console.log('   - ENCRYPTION_KEY: [configured]');
  console.log('   - GOOGLE_CLIENT_ID: [configured]');
  console.log('   - FRONTEND_URL: http://localhost:5173');
  console.log('');
  console.log('🧪 Now test the email verification:');
  console.log('node test_email_sending.js');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
} 