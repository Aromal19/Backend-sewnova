const sizeMatchingService = require('../services/SizeMatchingService');
const fabricCalculationService = require('../services/FabricCalculationService');

exports.estimateFabricRequirements = async (req, res) => {
    try {
        const { garmentType, measurements } = req.body;

        // 1. Basic Validation
        if (!garmentType || !measurements) {
            return res.status(400).json({ error: 'Missing required fields: garmentType, measurements' });
        }

        // 2. Step 2: Size Matching
        // This is a blocking internal call to the reliable service we built
        const sizeResult = await sizeMatchingService.determineSize(garmentType, measurements);

        // 3. Step 3: Fabric Calculation
        // Uses the output of Step 2 + authoritative rules
        const fabricResult = await fabricCalculationService.calculateFabric(garmentType, sizeResult, measurements);

        // 4. Construct Response (Authoritative Data)
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

        res.status(200).json(responsePayload);

    } catch (error) {
        console.error('Fabric Estimation Error:', error);
        res.status(500).json({ error: error.message });
    }
};
