require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/admin');

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

    // Create admin user
    const admin = new Admin({
      email: 'admin@gmail.com',
      password: 'admin@123',
      name: 'System Administrator',
      role: 'super_admin',
      isActive: true,
      permissions: ['users', 'designs', 'analytics', 'orders', 'settings']
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@gmail.com');
    console.log('🔑 Password: admin@123');

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedAdmin();
