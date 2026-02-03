require('dotenv').config();
const mongoose = require('mongoose');
const sizeMatchingService = require('./services/SizeMatchingService');

const runTests = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const garmentCode = 'mens-kurta';

        const testCases = [
            {
                name: "Exact Fit (Small)",
                measurements: { chest: 36, waist: 32, length: 40, sleeve: 24, shoulder: 17, hip: 38 },
                expectedSize: 'S',
                expectedOversize: false
            },
            {
                name: "Round Up (Chest fits S, Waist needs M)",
                measurements: { chest: 36, waist: 33, length: 40, sleeve: 24, shoulder: 17, hip: 38 }, // Waist 33 > S Waist 32
                expectedSize: 'M',
                expectedOversize: false
            },
            {
                name: "Oversize (Exceeds XL)",
                measurements: { chest: 50, waist: 50, length: 50, sleeve: 30, shoulder: 22, hip: 50 },
                expectedSize: 'XL',
                expectedOversize: true
            },
            {
                name: "Fit Logic Partial (Chest fits L, Length fits XL -> XL)",
                measurements: { chest: 40, waist: 36, length: 45, sleeve: 25.5, shoulder: 19, hip: 42 }, // Length 45 > L length 44 -> Needs XL
                expectedSize: 'XL',
                expectedOversize: false
            }
        ];

        console.log('\n--- Running Size Matching Tests ---');

        for (const test of testCases) {
            console.log(`\nTest: ${test.name}`);
            try {
                const result = await sizeMatchingService.determineSize(garmentCode, test.measurements);
                console.log('Result:', JSON.stringify(result, null, 2));

                if (result.selectedSize === test.expectedSize && result.isOversize === test.expectedOversize) {
                    console.log('✅ PASS');
                } else {
                    console.error(`❌ FAIL. Expected Size: ${test.expectedSize}, Oversize: ${test.expectedOversize}`);
                }
            } catch (err) {
                console.error('❌ ERROR:', err.message);
            }
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
        process.exit(0);
    }
};

runTests();
