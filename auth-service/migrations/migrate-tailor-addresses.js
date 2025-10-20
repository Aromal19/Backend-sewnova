/**
 * Migration Script: Migrate Tailor Addresses
 * 
 * This script migrates old single 'address' field to new structured address fields
 * Run this once to clean up existing tailor documents
 * 
 * Usage: node backend/auth-service/migrations/migrate-tailor-addresses.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/sewnova_db';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected for migration');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Get Tailor model
const Tailor = require('../models/tailor');

const migrateTailorAddresses = async () => {
  try {
    console.log('\n🔄 Starting tailor address migration...\n');

    // Find all tailors with old 'address' field
    const tailorsWithOldAddress = await Tailor.find({ 
      address: { $exists: true, $ne: null } 
    });

    console.log(`📊 Found ${tailorsWithOldAddress.length} tailors with old address field\n`);

    if (tailorsWithOldAddress.length === 0) {
      console.log('✅ No tailors need migration. All addresses are up to date!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const tailor of tailorsWithOldAddress) {
      try {
        console.log(`\n🔄 Migrating tailor: ${tailor.email}`);
        console.log(`   Old address: "${tailor.address}"`);

        // Remove the old address field
        await Tailor.findByIdAndUpdate(
          tailor._id,
          { 
            $unset: { address: "" }
          }
        );

        console.log(`   ✅ Removed old address field`);
        console.log(`   ℹ️  Note: Tailor should update with new structured address fields from profile page`);
        
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating ${tailor.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📝 Total processed: ${tailorsWithOldAddress.length}`);
    console.log('='.repeat(60));

    if (successCount > 0) {
      console.log('\n💡 Next Steps:');
      console.log('   1. Tailors should login to their profile page');
      console.log('   2. Go to Shop tab and click "Edit Shop"');
      console.log('   3. Fill in their address using the new fields');
      console.log('   4. Use pincode auto-fill for easy entry');
      console.log('   5. Click "Save Changes"\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateTailorAddresses();
    
    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateTailorAddresses };

