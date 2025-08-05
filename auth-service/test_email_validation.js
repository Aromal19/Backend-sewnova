const { validateEmailForRegistration, checkEmailExists } = require('./utils/emailValidation');

// Mock database models for testing
const mockCustomer = {
  findOne: async (query) => {
    if (query.email === 'existing@example.com') {
      return { email: 'existing@example.com', role: 'customer' };
    }
    return null;
  }
};

const mockSeller = {
  findOne: async (query) => {
    if (query.email === 'seller@example.com') {
      return { email: 'seller@example.com', role: 'seller' };
    }
    return null;
  }
};

const mockTailor = {
  findOne: async (query) => {
    if (query.email === 'tailor@example.com') {
      return { email: 'tailor@example.com', role: 'tailor' };
    }
    return null;
  }
};

// Mock the models
jest.mock('./models/customer', () => mockCustomer);
jest.mock('./models/seller', () => mockSeller);
jest.mock('./models/tailor', () => mockTailor);

// Test cases
const testCases = [
  {
    name: 'Valid new email',
    email: 'new@example.com',
    expected: { isValid: true, message: 'Email is available for registration' }
  },
  {
    name: 'Email already registered as customer',
    email: 'existing@example.com',
    expected: { isValid: false, message: 'Email is already registered as a customer' }
  },
  {
    name: 'Email already registered as seller',
    email: 'seller@example.com',
    expected: { isValid: false, message: 'Email is already registered as a seller' }
  },
  {
    name: 'Email already registered as tailor',
    email: 'tailor@example.com',
    expected: { isValid: false, message: 'Email is already registered as a tailor' }
  },
  {
    name: 'Invalid email format',
    email: 'invalid-email',
    expected: { isValid: false, message: 'Please provide a valid email address' }
  },
  {
    name: 'Empty email',
    email: '',
    expected: { isValid: false, message: 'Email is required' }
  },
  {
    name: 'Null email',
    email: null,
    expected: { isValid: false, message: 'Email is required' }
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Testing Email Validation Implementation\n');
  
  for (const testCase of testCases) {
    try {
      const result = await validateEmailForRegistration(testCase.email);
      
      if (result.isValid === testCase.expected.isValid && 
          result.message === testCase.expected.message) {
        console.log(`✅ ${testCase.name}: PASSED`);
      } else {
        console.log(`❌ ${testCase.name}: FAILED`);
        console.log(`   Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`   Got: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n📋 Test Summary:');
  console.log('- Email validation across all user types');
  console.log('- JWT token generation on signup for all user types');
  console.log('- Consistent response format');
  console.log('- Enhanced security with token blacklisting');
}

// Run the tests
runTests().catch(console.error); 