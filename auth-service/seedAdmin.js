require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/admin');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('❌ Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('admin@123', salt);

    // Create admin user
    const admin = new Admin({
      firstname: 'System',
      lastname: 'Administrator',
      email: 'admin@gmail.com',
      phone: '+919876543210',
      countryCode: '+91',
      password: hashedPassword,
      isEmailVerified: true,
      role: 'admin',
      permissions: ['users', 'designs', 'analytics', 'orders', 'settings', 'platform'],
      isActive: true,
      address: 'Admin Office',
      pincode: '110001',
      district: 'New Delhi',
      state: 'Delhi',
      country: 'India'
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Password: admin@123');
    console.log('👤 Role: admin');
    console.log('🔐 Permissions:', admin.permissions);

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedAdmin();
