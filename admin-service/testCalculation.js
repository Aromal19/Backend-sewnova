require('dotenv').config();
const mongoose = require('mongoose');
const fabricCalculationService = require('./services/FabricCalculationService');
const sizeMatchingService = require('./services/SizeMatchingService');

const runTests = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const garmentCode = 'mens-kurta';

        const testCases = [
            {
                name: "Standard Fit (Exact Match)",
                measurements: { chest: 38, waist: 34, length: 42, sleeve: 25, shoulder: 18, hip: 40 },
                // Expect: Size M (Baseline 2.50), No adjustment
                expectedBase: 2.50,
                expectedFinal: 2.50
            },
            {
                name: "Tall fit (Length deviation)",
                measurements: { chest: 38, waist: 34, length: 44, sleeve: 25, shoulder: 18, hip: 40 },
                // Expect: Size M (Baseline 2.50). 
                // Length 44 > Std 42 (+2"). Adjustment = 2 * 0.0254 = 0.0508m. 
                // Final ~2.55 (rounded up to nearest 0.05) or 2.60?
                // Logic: 2.50 + 0.0508 = 2.5508 -> ceil(20) -> 2.60
                // Or if logic is just strict math: 2.50 + 0.05 = 2.55
                expectedBase: 2.50,
                // Length +2" = 0.0508m. Total 2.5508. Ceil(2.5508 * 20)/20 = 51.016 -> 52/20 = 2.60.
                expectedFinal: 2.60
            },
            {
                name: "Oversize Case",
                measurements: { chest: 50, waist: 50, length: 46, sleeve: 27, shoulder: 22, hip: 50 },
                // Expect: Size XL (Baseline 3.00), isOversize=true.
                // Length 46 > XL 45 (+1") -> 0.0254m
                // Sleeve 27 > XL 26 (+1") -> 0.0254m
                // Total Length Adj = 0.0508m
                // Oversize Buffer = +0.10m
                // Total Adj = 0.1508m
                // Final = 3.00 + 0.1508 = 3.1508 -> 3.20 (nearest 0.05)
                expectedBase: 3.00,
                expectedFinal: 3.20
            }
        ];

        console.log('\n--- Running Fabric Calculation Tests ---');

        for (const test of testCases) {
            console.log(`\nTest: ${test.name}`);
            try {
                // 1. Get Size First
                const sizeResult = await sizeMatchingService.determineSize(garmentCode, test.measurements);
                console.log(`   Selected Size: ${sizeResult.selectedSize} (Oversize: ${sizeResult.isOversize})`);

                // 2. Calculate Fabric
                const calcResult = await fabricCalculationService.calculateFabric(garmentCode, sizeResult, test.measurements);
                console.log('   Result:', JSON.stringify(calcResult, null, 2));

                const finalMatches = Math.abs(calcResult.finalMeters - test.expectedFinal) < 0.01;

                if (finalMatches) {
                    console.log('   ✅ PASS');
                } else {
                    console.error(`   ❌ FAIL. Expected Final: ${test.expectedFinal}, Got: ${calcResult.finalMeters}`);
                }

            } catch (err) {
                console.error('   ❌ ERROR:', err.message);
            }
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runTests();
