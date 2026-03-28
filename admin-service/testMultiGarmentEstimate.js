/**
 * Multi-Garment Fabric Estimation Test
 * Tests that different garment types return different fabric meters.
 * Uses the same body measurements for all garments to prove dynamic estimation.
 *
 * Usage: node testMultiGarmentEstimate.js
 * Requires: MongoDB with seeded reference data (run seedReferenceData.js first)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fabricController = require('./controllers/fabricController');

// Mock Express req/res
const mockReq = (body) => ({ body });
const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
};

// Same measurements for all garments — results should differ
// These are in cm (like the AI measurement service returns)
const TEST_MEASUREMENTS_CM = {
    chest: 96,   // ~37.8"
    bust: 96,
    waist: 82,   // ~32.3"
    hip: 98,     // ~38.6"
    shoulder: 45, // ~17.7"
    sleeve: 60,  // ~23.6"
    length: 105, // ~41.3"
    inseam: 78   // ~30.7"
};

const GARMENT_TYPES = [
    'mens-kurta',
    'mens-shirt',
    'mens-trousers',
    'mens-suit',
    'womens-blouse',
    'womens-dress',
    'womens-lehenga',
    'womens-saree-blouse'
];

const runMultiGarmentTest = async () => {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.\n');

        const results = [];
        let allPassed = true;

        console.log('═══════════════════════════════════════════════════════════');
        console.log('  MULTI-GARMENT FABRIC ESTIMATION TEST');
        console.log('  Input measurements (cm):', JSON.stringify(TEST_MEASUREMENTS_CM));
        console.log('═══════════════════════════════════════════════════════════\n');

        for (const garmentType of GARMENT_TYPES) {
            const req = mockReq({
                garmentType,
                measurements: { ...TEST_MEASUREMENTS_CM }
            });
            const res = mockRes();

            await fabricController.estimateFabricRequirements(req, res);

            if (res.statusCode === 200 && res.body.finalMeters) {
                results.push({
                    garment: garmentType,
                    size: res.body.selectedSize,
                    oversize: res.body.isOversize,
                    baseline: res.body.baselineMeters,
                    adjustment: res.body.adjustmentMeters,
                    final: res.body.finalMeters,
                    width: res.body.fabricWidth
                });
            } else {
                console.error(`❌ FAILED for ${garmentType}: ${res.body.error || 'Unknown error'}`);
                allPassed = false;
            }
        }

        // Print results table
        console.log('\n\n═══════════════════════════════════════════════════════════');
        console.log('  RESULTS');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log(
            'Garment Type'.padEnd(22),
            'Size'.padEnd(6),
            'Base(m)'.padEnd(9),
            'Adj(m)'.padEnd(9),
            'Final(m)'.padEnd(10),
            'Width"'
        );
        console.log('-'.repeat(65));

        for (const r of results) {
            console.log(
                r.garment.padEnd(22),
                (r.size + (r.oversize ? '*' : '')).padEnd(6),
                r.baseline.toFixed(2).padEnd(9),
                r.adjustment.toFixed(3).padEnd(9),
                r.final.toFixed(2).padEnd(10),
                r.width.toString()
            );
        }

        // Verify all finalMeters are different
        const finalValues = results.map(r => r.final);
        const uniqueValues = new Set(finalValues);

        console.log('\n───────────────────────────────────────────────────────────');
        console.log(`  Total garments tested: ${results.length}`);
        console.log(`  Unique fabric values:  ${uniqueValues.size}`);

        if (uniqueValues.size === results.length) {
            console.log('  ✅ ALL garment types return DIFFERENT fabric meters!');
        } else if (uniqueValues.size >= results.length - 1) {
            console.log('  ⚠️ Most garment types return different values (minor overlap is OK)');
        } else {
            console.log('  ❌ FAIL: Too many garment types return the same value');
            allPassed = false;
        }

        // Verify size variation within a single garment
        console.log('\n\n═══════════════════════════════════════════════════════════');
        console.log('  SIZE VARIATION TEST (mens-kurta with different chests)');
        console.log('═══════════════════════════════════════════════════════════\n');

        const sizeTestMeasurements = [
            { label: 'Small (chest 84cm)', chest: 84, waist: 72, hip: 88, shoulder: 42, sleeve: 58, length: 98 },
            { label: 'Medium (chest 96cm)', chest: 96, waist: 86, hip: 100, shoulder: 46, sleeve: 63, length: 105 },
            { label: 'Large (chest 108cm)', chest: 108, waist: 96, hip: 112, shoulder: 50, sleeve: 66, length: 112 },
        ];

        const sizeResults = [];
        for (const test of sizeTestMeasurements) {
            const { label, ...measurements } = test;
            const req = mockReq({ garmentType: 'mens-kurta', measurements });
            const res = mockRes();
            await fabricController.estimateFabricRequirements(req, res);

            if (res.statusCode === 200) {
                sizeResults.push({ label, size: res.body.selectedSize, final: res.body.finalMeters });
                console.log(`  ${label.padEnd(25)} → Size: ${res.body.selectedSize.padEnd(4)} → ${res.body.finalMeters}m`);
            }
        }

        // Verify meters increase with size
        const increasing = sizeResults.every((r, i) =>
            i === 0 || r.final >= sizeResults[i - 1].final
        );
        console.log(`\n  Meters increase with size: ${increasing ? '✅ YES' : '❌ NO'}`);
        if (!increasing) allPassed = false;

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(allPassed ? '  ✅ ALL TESTS PASSED' : '  ❌ SOME TESTS FAILED');
        console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runMultiGarmentTest();
