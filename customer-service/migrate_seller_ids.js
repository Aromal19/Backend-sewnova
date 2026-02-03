const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Booking = require('./models/booking');
const Fabric = require('./models/fabric');

// Load env
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sewnova';

const migrateBookings = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const bookings = await Booking.find({
            bookingType: { $in: ['fabric', 'complete'] },
            sellerId: { $exists: false }
        });

        console.log(`📦 Found ${bookings.length} bookings to migrate.`);

        let updated = 0;
        let errors = 0;

        for (const booking of bookings) {
            try {
                if (booking.fabricId) {
                    const fabric = await Fabric.findById(booking.fabricId);
                    if (fabric) {
                        booking.sellerId = fabric.sellerId;

                        // Also update nested if missing
                        if (!booking.fabricDetails) booking.fabricDetails = {};
                        if (!booking.fabricDetails.sellerId) {
                            booking.fabricDetails.sellerId = fabric.sellerId;
                        }

                        await booking.save();
                        updated++;
                        process.stdout.write('.');
                    } else {
                        console.warn(`\n⚠️ Fabric not found for booking ${booking._id}`);
                        errors++;
                    }
                }
            } catch (err) {
                console.error(`\n❌ Error updating booking ${booking._id}:`, err.message);
                errors++;
            }
        }

        console.log(`\n\n🎉 Migration Complete! Updated: ${updated}, Errors: ${errors}`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrateBookings();
