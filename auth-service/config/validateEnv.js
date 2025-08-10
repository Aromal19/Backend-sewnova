const validateEnvironmentVariables = () => {
  const required = [
    'JWT_SECRET',
    'MONGODB_URI',
    'EMAIL_USER',
    'EMAIL_PASS',
    'ENCRYPTION_KEY',
    'GOOGLE_CLIENT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Validate specific requirements
  const validations = [
    {
      key: 'ENCRYPTION_KEY',
      test: (value) => value.length === 32,
      message: 'ENCRYPTION_KEY must be exactly 32 characters long'
    },
    {
      key: 'JWT_SECRET',
      test: (value) => value.length >= 32,
      message: 'JWT_SECRET must be at least 32 characters long'
    },
    {
      key: 'EMAIL_USER',
      test: (value) => value.includes('@'),
      message: 'EMAIL_USER must be a valid email address'
    }
  ];

  for (const validation of validations) {
    const value = process.env[validation.key];
    if (!validation.test(value)) {
      console.error(`❌ Invalid ${validation.key}: ${validation.message}`);
      process.exit(1);
    }
  }

  console.log('✅ All environment variables validated successfully');
};

module.exports = validateEnvironmentVariables; 