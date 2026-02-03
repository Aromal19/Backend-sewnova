const GarmentType = require('../models/GarmentType');
const FabricBaseline = require('../models/FabricBaseline');
const SizeChart = require('../models/SizeChart');

class FabricCalculationService {
    /**
     * Calculate final fabric meters.
     * @param {string} garmentTypeCode 
     * @param {object} sizeSelectionResult - { selectedSize: 'L', isOversize: boolean, reasoning: [] }
     * @param {object} userMeasurements - { chest: 41, length: 45 ... }
     * @returns {Promise<object>}
     */
    async calculateFabric(garmentTypeCode, sizeSelectionResult, userMeasurements) {
        // 1. Fetch Garment Type
        const garmentType = await GarmentType.findOne({ code: garmentTypeCode.toUpperCase() });
        if (!garmentType) {
            throw new Error(`Garment type not found: ${garmentTypeCode}`);
        }

        // 2. Fetch Baseline for the Selected Size
        const baseline = await FabricBaseline.findOne({
            garmentType: garmentType._id,
            sizeLabel: sizeSelectionResult.selectedSize
        });

        if (!baseline) {
            throw new Error(`Baseline not found for size ${sizeSelectionResult.selectedSize}`);
        }

        // 3. Fetch Standard Measurements for that Size (to compute deviations)
        const sizeChart = await SizeChart.findOne({
            garmentType: garmentType._id,
            sizeLabel: sizeSelectionResult.selectedSize
        });

        if (!sizeChart) {
            throw new Error(`Size chart not found for size ${sizeSelectionResult.selectedSize}`);
        }

        const standardMeasurements = sizeChart.measurements;
        let adjustmentMeters = 0;
        let explanation = [];

        explanation.push(`Baseline for ${sizeSelectionResult.selectedSize}: ${baseline.baseFabricMeters}m`);

        // 4. Calculate Deviations (Length/Sleeve mainly affect linear meters)
        // We look for specific keys that imply length. 
        // For generic safety, we look at 'length', 'sleeve', 'fullLength', 'topLength'.
        const lengthKeys = ['length', 'sleeve', 'fullLength', 'topLength', 'bottomLength'];

        for (const key of Object.keys(userMeasurements)) {
            // Only consider if defined in standard measurements
            if (standardMeasurements[key] !== undefined) {
                const userVal = parseFloat(userMeasurements[key]);
                const stdVal = parseFloat(standardMeasurements[key]);

                if (userVal > stdVal) {
                    const diff = userVal - stdVal;
                    // Only add to meterage if it's a length dimension
                    // OR if it's generic oversize handling. 
                    // Requirement: "Convert deviations into a conservative fabric adjustment."

                    if (lengthKeys.includes(key.toLowerCase()) || key.toLowerCase().includes('length')) {
                        const addMeters = diff * 0.0254; // Inch to Meter
                        adjustmentMeters += addMeters;
                        explanation.push(`Adjustment: +${addMeters.toFixed(3)}m due to ${key} (+${diff}")`);
                    } else {
                        // Width deviation (Chest/Waist). 
                        // Typically doesn't add linear meters unless we cross width threshold.
                        // We ignore for now unless oversize logic kicks in.
                        explanation.push(`Note: ${key} deviation (+${diff}") handled by width/oversize logic.`);
                    }
                }
            }
        }

        // 5. Force adjustment for Oversize
        if (sizeSelectionResult.isOversize) {
            if (adjustmentMeters <= 0.05) { // Minimal buffer
                adjustmentMeters = 0.25; // Force a quarter meter extra for oversize if lengths are standard
                explanation.push(`Oversize Safety: Forced min +0.25m adjustment.`);
            } else {
                // Add a small safety buffer on top of length adjustments for oversize widths
                adjustmentMeters += 0.10;
                explanation.push(`Oversize Safety: Added +0.10m buffer.`);
            }
        }

        // 6. Apply Bounds & Clamping
        const baseMeters = baseline.baseFabricMeters;
        const rawEstimate = baseMeters + adjustmentMeters;
        const maxAllowed = baseMeters + 1.0;

        let finalMeters = Math.max(baseMeters, rawEstimate); // Lower bound
        if (finalMeters > maxAllowed) {
            finalMeters = maxAllowed; // Upper bound
            explanation.push(`Capped at max allowed (+1.0m above baseline).`);
        }

        // 7. Rounding (Round up to nearest 0.05)
        finalMeters = Math.ceil(finalMeters * 20) / 20;

        return {
            baselineMeters: baseMeters,
            adjustmentMeters: parseFloat(adjustmentMeters.toFixed(3)),
            finalMeters: finalMeters,
            fabricWidth: garmentType.defaultFabricWidth,
            explanation: explanation
        };
    }
}

module.exports = new FabricCalculationService();
