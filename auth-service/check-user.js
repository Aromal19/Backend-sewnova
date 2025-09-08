const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Customer = require('./models/customer');
const Seller = require('./models/seller');
const Tailor = require('./models/tailor');

async function checkUser() {
  try {
    console.log('🔍 Checking for user: aromalgirish00@gmail.com\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sewnova');
    console.log('✅ Connected to MongoDB');

    const email = 'aromalgirish00@gmail.com';

    // Check in Customer collection
    console.log('1️⃣ Checking Customer collection...');
    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (customer) {
      console.log('✅ Found in Customer collection');
      console.log('📊 Customer data:', {
        id: customer._id,
        firstname: customer.firstname,
        lastname: customer.lastname,
        email: customer.email,
        phone: customer.phone,
        isEmailVerified: customer.isEmailVerified,
        isGoogleUser: customer.isGoogleUser
      });
      return;
    }

    // Check in Seller collection
    console.log('2️⃣ Checking Seller collection...');
    const seller = await Seller.findOne({ email: email.toLowerCase() });
    if (seller) {
      console.log('✅ Found in Seller collection');
      console.log('📊 Seller data:', {
        id: seller._id,
        firstname: seller.firstname,
        lastname: seller.lastname,
        email: seller.email,
        businessName: seller.businessName,
        isEmailVerified: seller.isEmailVerified
      });
      return;
    }

    // Check in Tailor collection
    console.log('3️⃣ Checking Tailor collection...');
    const tailor = await Tailor.findOne({ email: email.toLowerCase() });
    if (tailor) {
      console.log('✅ Found in Tailor collection');
      console.log('📊 Tailor data:', {
        id: tailor._id,
        firstname: tailor.firstname,
        lastname: tailor.lastname,
        email: tailor.email,
        shopName: tailor.shopName,
        isEmailVerified: tailor.isEmailVerified
      });
      return;
    }

    console.log('❌ User not found in any collection');
    console.log('\n💡 Possible solutions:');
    console.log('1. Create a new user account');
    console.log('2. Check if the email is correct');
    console.log('3. Check if the user was created in a different database');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkUser(); 