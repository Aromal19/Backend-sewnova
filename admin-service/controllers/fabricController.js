const sizeMatchingService = require('../services/SizeMatchingService');
const fabricCalculationService = require('../services/FabricCalculationService');

exports.estimateFabricRequirements = async (req, res) => {
    try {
        const { garmentType, measurements } = req.body;

        // 1. Strict Validation — fail loudly
        if (!garmentType) {
            return res.status(400).json({ error: 'Missing required field: garmentType' });
        }
        if (!measurements || typeof measurements !== 'object' || Object.keys(measurements).length === 0) {
            return res.status(400).json({ error: 'Missing or empty measurements object' });
        }

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📐 FABRIC ESTIMATION: ${garmentType}`);
        console.log(`   Measurements:`, measurements);
        console.log(`${'═'.repeat(60)}`);

        // 2. Size Matching
        const sizeResult = await sizeMatchingService.determineSize(garmentType, measurements);
        console.log(`   Size Result: ${sizeResult.selectedSize} (oversize: ${sizeResult.isOversize})`);

        // 3. Fabric Calculation
        const fabricResult = await fabricCalculationService.calculateFabric(garmentType, sizeResult, measurements);
        console.log(`   Fabric Result: ${fabricResult.finalMeters}m`);

        // 4. Response
        const responsePayload = {
            garmentType: garmentType,
            selectedSize: sizeResult.selectedSize,
            isOversize: sizeResult.isOversize,
            baselineMeters: fabricResult.baselineMeters,
            adjustmentMeters: fabricResult.adjustmentMeters,
            finalMeters: fabricResult.finalMeters,
            fabricWidth: fabricResult.fabricWidth,
            explanation: [
                ...sizeResult.reasoning,
                ...fabricResult.explanation
            ]
        };

        console.log(`   ✅ Final: ${fabricResult.finalMeters}m for ${garmentType} (${sizeResult.selectedSize})`);
        console.log(`${'═'.repeat(60)}\n`);

        res.status(200).json(responsePayload);

    } catch (error) {
        console.error('❌ Fabric Estimation Error:', error.message);

        // Distinguish configuration errors from internal errors
        if (error.message.includes('not configured')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};
