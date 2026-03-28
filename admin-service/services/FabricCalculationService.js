const GarmentType = require('../models/GarmentType');
const FabricBaseline = require('../models/FabricBaseline');
const SizeChart = require('../models/SizeChart');

// Adjustment rates per extra inch beyond standard (indexed by garment code prefix)
const ADJUSTMENT_RATES = {
    mens: 0.05,    // 0.05m per extra inch for men's garments
    womens: 0.07   // 0.07m per extra inch for women's garments
};

class FabricCalculationService {
    /**
     * Calculate final fabric meters using dynamic measurement-aware estimation.
     *
     * Algorithm:
     *   1. Fetch garment baseline for the matched size
     *   2. Get reference measurement for that size
     *   3. Compute difference on primary + length dimensions
     *   4. finalMeters = baselineMeters + adjustments
     *   5. Round up to nearest 0.05m, enforce minimum baseline
     *
     * NOTE: userMeasurements are already converted to inches by SizeMatchingService.
     */
    async calculateFabric(garmentTypeCode, sizeSelectionResult, userMeasurements) {
        // 1. Fetch Garment Type — fail loudly
        const garmentType = await GarmentType.findOne({ code: garmentTypeCode.toUpperCase() });
        if (!garmentType) {
            throw new Error(`Garment type not configured: ${garmentTypeCode}`);
        }

        // 2. Fetch Baseline — fail loudly
        const baseline = await FabricBaseline.findOne({
            garmentType: garmentType._id,
            sizeLabel: sizeSelectionResult.selectedSize
        });
        if (!baseline) {
            throw new Error(
                `Fabric baseline not configured for "${garmentTypeCode}" size "${sizeSelectionResult.selectedSize}"`
            );
        }

        // 3. Fetch Standard Measurements — fail loudly
        const sizeChart = await SizeChart.findOne({
            garmentType: garmentType._id,
            sizeLabel: sizeSelectionResult.selectedSize
        });
        if (!sizeChart) {
            throw new Error(
                `Size chart not configured for "${garmentTypeCode}" size "${sizeSelectionResult.selectedSize}"`
            );
        }

        const standardMeasurements = sizeChart.measurements;
        const baseMeters = baseline.baseFabricMeters;

        // Determine adjustment rate
        const codePrefix = garmentTypeCode.toLowerCase().split('-')[0];
        const adjustmentPerInch = ADJUSTMENT_RATES[codePrefix] || 0.05;

        let adjustmentMeters = 0;
        const explanation = [];
        explanation.push(`Garment: ${garmentType.name} (${garmentTypeCode})`);
        explanation.push(`Matched size: ${sizeSelectionResult.selectedSize} → baseline ${baseMeters}m`);
        explanation.push(`Adjustment rate: ${adjustmentPerInch}m per extra inch`);

        // 4. Primary measurement adjustment
        const primaryKey = garmentType.primaryMeasurement;
        const primaryUserVal = parseFloat(userMeasurements[primaryKey]);
        const primaryStdVal = standardMeasurements[primaryKey] != null
            ? parseFloat(standardMeasurements[primaryKey]) : null;

        if (primaryStdVal !== null && !isNaN(primaryUserVal) && primaryUserVal > primaryStdVal) {
            const diff = primaryUserVal - primaryStdVal;
            const add = diff * adjustmentPerInch;
            adjustmentMeters += add;
            explanation.push(
                `Primary (${primaryKey}): ${primaryUserVal}" vs ${primaryStdVal}" → +${add.toFixed(3)}m`
            );
        } else {
            explanation.push(`Primary (${primaryKey}): within standard (${primaryUserVal}" ≤ ${primaryStdVal}")`);
        }

        // 5. Length-class adjustments
        const lengthKeys = ['length', 'sleeve', 'inseam'];
        for (const key of Object.keys(userMeasurements)) {
            if (key === primaryKey) continue;
            if (standardMeasurements[key] == null) continue;

            const userVal = parseFloat(userMeasurements[key]);
            const stdVal = parseFloat(standardMeasurements[key]);
            if (isNaN(userVal) || isNaN(stdVal) || userVal <= stdVal) continue;

            const diff = userVal - stdVal;

            if (lengthKeys.includes(key.toLowerCase()) || key.toLowerCase().includes('length')) {
                const add = diff * 0.0254; // inch→meter for length
                adjustmentMeters += add;
                explanation.push(`Length (${key}): +${diff}" → +${add.toFixed(3)}m`);
            } else {
                const add = diff * (adjustmentPerInch * 0.5);
                adjustmentMeters += add;
                explanation.push(`Width (${key}): +${diff}" → +${add.toFixed(3)}m`);
            }
        }

        // 6. Oversize safety
        if (sizeSelectionResult.isOversize) {
            if (adjustmentMeters <= 0.05) {
                adjustmentMeters = 0.25;
                explanation.push('Oversize safety: forced +0.25m minimum');
            } else {
                adjustmentMeters += 0.10;
                explanation.push('Oversize safety: +0.10m buffer');
            }
        }

        // 7. Final calculation with bounds
        const rawEstimate = baseMeters + adjustmentMeters;
        const maxAllowed = baseMeters + 1.5;

        let finalMeters = Math.max(baseMeters, rawEstimate);
        if (finalMeters > maxAllowed) {
            finalMeters = maxAllowed;
            explanation.push(`Capped at ${maxAllowed}m (baseline + 1.5m max)`);
        }

        // 8. Round up to nearest 0.05m
        finalMeters = Math.ceil(finalMeters * 20) / 20;
        finalMeters = parseFloat(finalMeters.toFixed(2));

        explanation.push(`──── Final: ${finalMeters}m ────`);

        return {
            baselineMeters: baseMeters,
            adjustmentMeters: parseFloat(adjustmentMeters.toFixed(3)),
            adjustmentPerInch,
            finalMeters,
            fabricWidth: garmentType.defaultFabricWidth,
            explanation
        };
    }
}

module.exports = new FabricCalculationService();
