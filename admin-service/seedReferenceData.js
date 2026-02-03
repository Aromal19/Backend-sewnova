require('dotenv').config();
const mongoose = require('mongoose');
const GarmentType = require('./models/GarmentType');
const SizeChart = require('./models/SizeChart');
const FabricBaseline = require('./models/FabricBaseline');

const seedReferenceData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Define Garment Type
        const kurtaData = {
            name: "Men's Kurta",
            code: "mens-kurta",
            defaultFabricWidth: 44,
            primaryMeasurement: 'chest',
            isActive: true,
            description: "Traditional Indian Men's Kurta"
        };

        // Upsert Garment Type
        let garmentType = await GarmentType.findOne({ code: kurtaData.code });
        if (!garmentType) {
            garmentType = new GarmentType(kurtaData);
            await garmentType.save();
            console.log(`✅ Created GarmentType: ${garmentType.name}`);
        } else {
            console.log(`ℹ️ GarmentType ${garmentType.name} already exists. Skipping.`);
        }

        // 2. Define Reference Data (Standard Indian Patterns)
        const referenceData = [
            {
                sizeLabel: 'S',
                measurements: { chest: 36, waist: 32, length: 40, sleeve: 24, shoulder: 17, hip: 38 },
                fabricMeters: 2.25
            },
            {
                sizeLabel: 'M',
                measurements: { chest: 38, waist: 34, length: 42, sleeve: 25, shoulder: 18, hip: 40 },
                fabricMeters: 2.50
            },
            {
                sizeLabel: 'L',
                measurements: { chest: 40, waist: 36, length: 44, sleeve: 25.5, shoulder: 19, hip: 42 },
                fabricMeters: 2.75
            },
            {
                sizeLabel: 'XL',
                measurements: { chest: 42, waist: 38, length: 45, sleeve: 26, shoulder: 20, hip: 44 },
                fabricMeters: 3.00
            }
        ];

        // 3. Populate Size Charts and Fabric Baselines
        console.log(`Processing ${referenceData.length} size entries for ${garmentType.name}...`);

        for (const data of referenceData) {
            // -- Size Chart --
            const sizeChartQuery = { garmentType: garmentType._id, sizeLabel: data.sizeLabel };
            const sizeChartUpdate = {
                garmentType: garmentType._id,
                sizeLabel: data.sizeLabel,
                measurements: {
                    unit: 'inch',
                    ...data.measurements
                }
            };

            const sc = await SizeChart.findOneAndUpdate(sizeChartQuery, sizeChartUpdate, { upsert: true, new: true });
            console.log(`   - SizeChart [${data.sizeLabel}] synced.`);

            // -- Fabric Baseline --
            const fabricBaselineQuery = { garmentType: garmentType._id, sizeLabel: data.sizeLabel };
            const fabricBaselineUpdate = {
                garmentType: garmentType._id,
                sizeLabel: data.sizeLabel,
                baseFabricMeters: data.fabricMeters,
                assumedFabricWidth: 44,
                notes: "Standard estimate for 44-inch width"
            };

            const fb = await FabricBaseline.findOneAndUpdate(fabricBaselineQuery, fabricBaselineUpdate, { upsert: true, new: true });
            console.log(`   - FabricBaseline [${data.sizeLabel}] synced (Req: ${data.fabricMeters}m).`);
        }

        console.log('✅ Reference Data Seeding Completed Successfully.');

    } catch (error) {
        console.error('❌ Error seeding reference data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

seedReferenceData();
