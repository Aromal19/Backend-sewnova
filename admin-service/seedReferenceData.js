require('dotenv').config();
const mongoose = require('mongoose');
const GarmentType = require('./models/GarmentType');
const SizeChart = require('./models/SizeChart');
const FabricBaseline = require('./models/FabricBaseline');

// ─── GARMENT TYPE DEFINITIONS ───────────────────────────────────────────────
const garmentTypes = [
    // ── MEN'S ──
    {
        name: "Men's Kurta",
        code: "MENS-KURTA",
        defaultFabricWidth: 44,
        primaryMeasurement: 'chest',
        description: "Traditional Indian Men's Kurta",
        adjustmentPerInch: 0.05,
        sizes: [
            { sizeLabel: 'S', measurements: { chest: 36, waist: 32, length: 40, sleeve: 24, shoulder: 17, hip: 38 }, fabricMeters: 2.25 },
            { sizeLabel: 'M', measurements: { chest: 38, waist: 34, length: 42, sleeve: 25, shoulder: 18, hip: 40 }, fabricMeters: 2.50 },
            { sizeLabel: 'L', measurements: { chest: 40, waist: 36, length: 44, sleeve: 25.5, shoulder: 19, hip: 42 }, fabricMeters: 2.75 },
            { sizeLabel: 'XL', measurements: { chest: 42, waist: 38, length: 45, sleeve: 26, shoulder: 20, hip: 44 }, fabricMeters: 3.00 },
        ]
    },
    {
        name: "Men's Shirt",
        code: "MENS-SHIRT",
        defaultFabricWidth: 44,
        primaryMeasurement: 'chest',
        description: "Men's Formal/Casual Shirt",
        adjustmentPerInch: 0.05,
        sizes: [
            { sizeLabel: 'S', measurements: { chest: 36, waist: 32, length: 28, sleeve: 23, shoulder: 17 }, fabricMeters: 1.75 },
            { sizeLabel: 'M', measurements: { chest: 38, waist: 34, length: 29, sleeve: 24, shoulder: 18 }, fabricMeters: 2.00 },
            { sizeLabel: 'L', measurements: { chest: 40, waist: 36, length: 30, sleeve: 24.5, shoulder: 19 }, fabricMeters: 2.25 },
            { sizeLabel: 'XL', measurements: { chest: 42, waist: 38, length: 31, sleeve: 25, shoulder: 20 }, fabricMeters: 2.50 },
        ]
    },
    {
        name: "Men's Trousers",
        code: "MENS-TROUSERS",
        defaultFabricWidth: 44,
        primaryMeasurement: 'waist',
        description: "Men's Formal/Casual Trousers",
        adjustmentPerInch: 0.05,
        sizes: [
            { sizeLabel: 'S', measurements: { waist: 30, hip: 36, length: 40, inseam: 30 }, fabricMeters: 1.25 },
            { sizeLabel: 'M', measurements: { waist: 32, hip: 38, length: 41, inseam: 31 }, fabricMeters: 1.50 },
            { sizeLabel: 'L', measurements: { waist: 34, hip: 40, length: 42, inseam: 32 }, fabricMeters: 1.60 },
            { sizeLabel: 'XL', measurements: { waist: 36, hip: 42, length: 43, inseam: 33 }, fabricMeters: 1.75 },
        ]
    },
    {
        name: "Men's Suit",
        code: "MENS-SUIT",
        defaultFabricWidth: 58,
        primaryMeasurement: 'chest',
        description: "Men's Full Suit (Jacket + Trousers)",
        adjustmentPerInch: 0.05,
        sizes: [
            { sizeLabel: 'S', measurements: { chest: 36, waist: 30, length: 28, sleeve: 24, shoulder: 17, hip: 36 }, fabricMeters: 3.00 },
            { sizeLabel: 'M', measurements: { chest: 38, waist: 32, length: 29, sleeve: 25, shoulder: 18, hip: 38 }, fabricMeters: 3.25 },
            { sizeLabel: 'L', measurements: { chest: 40, waist: 34, length: 30, sleeve: 25.5, shoulder: 19, hip: 40 }, fabricMeters: 3.50 },
            { sizeLabel: 'XL', measurements: { chest: 42, waist: 36, length: 31, sleeve: 26, shoulder: 20, hip: 42 }, fabricMeters: 4.00 },
        ]
    },
    // ── WOMEN'S ──
    {
        name: "Women's Blouse",
        code: "WOMENS-BLOUSE",
        defaultFabricWidth: 44,
        primaryMeasurement: 'bust',
        description: "Women's Blouse / Top",
        adjustmentPerInch: 0.07,
        sizes: [
            { sizeLabel: 'S', measurements: { bust: 32, waist: 26, shoulder: 14, sleeve: 22, length: 18 }, fabricMeters: 1.25 },
            { sizeLabel: 'M', measurements: { bust: 34, waist: 28, shoulder: 15, sleeve: 22.5, length: 19 }, fabricMeters: 1.40 },
            { sizeLabel: 'L', measurements: { bust: 36, waist: 30, shoulder: 16, sleeve: 23, length: 20 }, fabricMeters: 1.60 },
            { sizeLabel: 'XL', measurements: { bust: 38, waist: 32, shoulder: 17, sleeve: 23.5, length: 21 }, fabricMeters: 1.75 },
        ]
    },
    {
        name: "Women's Dress",
        code: "WOMENS-DRESS",
        defaultFabricWidth: 44,
        primaryMeasurement: 'bust',
        description: "Women's Full-Length / Knee-Length Dress",
        adjustmentPerInch: 0.07,
        sizes: [
            { sizeLabel: 'S', measurements: { bust: 32, waist: 26, hip: 34, length: 38, shoulder: 14 }, fabricMeters: 2.50 },
            { sizeLabel: 'M', measurements: { bust: 34, waist: 28, hip: 36, length: 40, shoulder: 15 }, fabricMeters: 2.75 },
            { sizeLabel: 'L', measurements: { bust: 36, waist: 30, hip: 38, length: 42, shoulder: 16 }, fabricMeters: 3.00 },
            { sizeLabel: 'XL', measurements: { bust: 38, waist: 32, hip: 40, length: 44, shoulder: 17 }, fabricMeters: 3.50 },
        ]
    },
    {
        name: "Women's Lehenga",
        code: "WOMENS-LEHENGA",
        defaultFabricWidth: 44,
        primaryMeasurement: 'waist',
        description: "Traditional Women's Lehenga (Skirt portion)",
        adjustmentPerInch: 0.07,
        sizes: [
            { sizeLabel: 'S', measurements: { waist: 26, hip: 34, length: 40 }, fabricMeters: 5.00 },
            { sizeLabel: 'M', measurements: { waist: 28, hip: 36, length: 41 }, fabricMeters: 5.50 },
            { sizeLabel: 'L', measurements: { waist: 30, hip: 38, length: 42 }, fabricMeters: 6.00 },
            { sizeLabel: 'XL', measurements: { waist: 32, hip: 40, length: 43 }, fabricMeters: 6.50 },
        ]
    },
    {
        name: "Saree Blouse",
        code: "WOMENS-SAREE-BLOUSE",
        defaultFabricWidth: 44,
        primaryMeasurement: 'bust',
        description: "Saree Blouse (short, fitted upper garment)",
        adjustmentPerInch: 0.07,
        sizes: [
            { sizeLabel: 'S', measurements: { bust: 32, waist: 26, shoulder: 13, sleeve: 10, length: 14 }, fabricMeters: 0.80 },
            { sizeLabel: 'M', measurements: { bust: 34, waist: 28, shoulder: 14, sleeve: 10.5, length: 15 }, fabricMeters: 0.95 },
            { sizeLabel: 'L', measurements: { bust: 36, waist: 30, shoulder: 15, sleeve: 11, length: 15.5 }, fabricMeters: 1.00 },
            { sizeLabel: 'XL', measurements: { bust: 38, waist: 32, shoulder: 16, sleeve: 11.5, length: 16 }, fabricMeters: 1.10 },
        ]
    },
];

// ─── SEED FUNCTION ──────────────────────────────────────────────────────────
const seedReferenceData = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        for (const gt of garmentTypes) {
            console.log(`\n── Seeding: ${gt.name} (${gt.code}) ──`);

            // 1. Upsert GarmentType
            let garmentType = await GarmentType.findOneAndUpdate(
                { code: gt.code },
                {
                    name: gt.name,
                    code: gt.code,
                    defaultFabricWidth: gt.defaultFabricWidth,
                    primaryMeasurement: gt.primaryMeasurement,
                    isActive: true,
                    description: gt.description
                },
                { upsert: true, new: true }
            );
            console.log(`   ✅ GarmentType: ${garmentType.name}`);

            // 2. Upsert SizeCharts + FabricBaselines for each size
            for (const sizeData of gt.sizes) {
                // SizeChart
                await SizeChart.findOneAndUpdate(
                    { garmentType: garmentType._id, sizeLabel: sizeData.sizeLabel },
                    {
                        garmentType: garmentType._id,
                        sizeLabel: sizeData.sizeLabel,
                        measurements: {
                            unit: 'inch',
                            ...sizeData.measurements
                        }
                    },
                    { upsert: true, new: true }
                );

                // FabricBaseline
                await FabricBaseline.findOneAndUpdate(
                    { garmentType: garmentType._id, sizeLabel: sizeData.sizeLabel },
                    {
                        garmentType: garmentType._id,
                        sizeLabel: sizeData.sizeLabel,
                        baseFabricMeters: sizeData.fabricMeters,
                        assumedFabricWidth: gt.defaultFabricWidth,
                        notes: `Standard estimate for ${gt.defaultFabricWidth}-inch width. Adjustment: ${gt.adjustmentPerInch}m/inch.`
                    },
                    { upsert: true, new: true }
                );

                console.log(`   - Size [${sizeData.sizeLabel}]: ${sizeData.fabricMeters}m baseline synced`);
            }
        }

        console.log('\n✅ All reference data seeded successfully.');
        console.log(`   Total garment types: ${garmentTypes.length}`);
        console.log(`   Total size entries: ${garmentTypes.reduce((s, g) => s + g.sizes.length, 0)}`);

    } catch (error) {
        console.error('❌ Error seeding reference data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
};

seedReferenceData();
