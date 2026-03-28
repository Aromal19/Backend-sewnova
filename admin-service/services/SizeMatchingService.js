const GarmentType = require('../models/GarmentType');
const SizeChart = require('../models/SizeChart');

const CM_TO_INCH = 0.393701;

/**
 * Auto-detect if measurements are in cm and convert to inches.
 * Heuristic: if any primary measurement (chest/bust/waist/hip) > 50, it's likely cm.
 */
function autoConvertToInches(measurements) {
    const converted = { ...measurements };
    const indicators = ['chest', 'bust', 'waist', 'hip'];

    let detectedUnit = 'inch';
    for (const key of indicators) {
        const val = parseFloat(converted[key]);
        if (!isNaN(val) && val > 50) {
            detectedUnit = 'cm';
            break;
        }
    }

    if (detectedUnit === 'cm') {
        console.log('📐 Auto-detected measurements in CM — converting to inches');
        for (const [key, value] of Object.entries(converted)) {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                converted[key] = parseFloat((num * CM_TO_INCH).toFixed(1));
            }
        }
    }

    return converted;
}

/**
 * Dimensions used for SIZE DETERMINATION (fit measurements).
 * Length-class measurements (length, sleeve, inseam) are EXCLUDED because
 * AI body measurements (body length ~41") differ fundamentally from
 * garment measurements (shirt length ~29", blouse length ~19").
 * Length dimensions are only used for fabric ADJUSTMENTS, not size matching.
 */
const FIT_DIMENSIONS = ['chest', 'bust', 'waist', 'hip', 'shoulder'];

class SizeMatchingService {
    /**
     * Determine the smallest standard size that fits the user.
     * Only uses FIT_DIMENSIONS (chest, bust, waist, hip, shoulder) for size determination.
     * Length/sleeve/inseam inform fabric adjustments but do NOT affect size selection.
     */
    async determineSize(garmentTypeCode, userMeasurements) {
        // 1. Fetch Garment Type
        const garmentType = await GarmentType.findOne({ code: garmentTypeCode.toUpperCase() });
        if (!garmentType) {
            throw new Error(`Garment type not configured: ${garmentTypeCode}`);
        }

        // 2. Fetch Size Charts sorted by primary measurement ascending
        const sortKey = `measurements.${garmentType.primaryMeasurement}`;
        const sizeCharts = await SizeChart.find({ garmentType: garmentType._id })
            .sort({ [sortKey]: 1 });

        if (!sizeCharts || sizeCharts.length === 0) {
            throw new Error(`No size charts configured for garment type: ${garmentTypeCode}`);
        }

        // 3. Auto-convert cm → inches
        const inchMeasurements = autoConvertToInches(userMeasurements);
        console.log('📏 Measurements (inches):', JSON.stringify(inchMeasurements));

        // 4. Determine garment-relevant FIT keys (exclude length/sleeve/inseam)
        const firstChart = sizeCharts[0].toObject();
        const allGarmentKeys = Object.keys(firstChart.measurements).filter(key =>
            key !== 'unit' && key !== '_id' && firstChart.measurements[key] != null
        );
        const fitKeys = allGarmentKeys.filter(key => FIT_DIMENSIONS.includes(key));

        console.log(`📏 Size matching using FIT keys only: [${fitKeys.join(', ')}]`);
        console.log(`   (Excluded from size matching: [${allGarmentKeys.filter(k => !FIT_DIMENSIONS.includes(k)).join(', ')}])`);

        // 5. Build complete measurements with smart defaults
        const completeMeasurements = { ...inchMeasurements };

        // Cross-map bust ↔ chest
        if (completeMeasurements.chest && !completeMeasurements.bust) {
            completeMeasurements.bust = completeMeasurements.chest;
        }
        if (completeMeasurements.bust && !completeMeasurements.chest) {
            completeMeasurements.chest = completeMeasurements.bust;
        }

        for (const key of allGarmentKeys) {
            if (completeMeasurements[key] !== undefined && completeMeasurements[key] !== null) continue;

            const chest = completeMeasurements.chest || completeMeasurements.bust;

            if (key === 'waist' && chest) {
                completeMeasurements[key] = chest - 4;
            } else if (key === 'hip' && (completeMeasurements.waist || chest)) {
                completeMeasurements[key] = (completeMeasurements.waist || chest) + 4;
            } else if (key === 'shoulder' && chest) {
                completeMeasurements[key] = Math.round(chest * 0.45);
            } else if (key === 'length') {
                // Don't default body length — it's not used for size matching
                completeMeasurements[key] = firstChart.measurements[key] || 0;
            } else if (key === 'sleeve') {
                completeMeasurements[key] = firstChart.measurements[key] || 0;
            } else if (key === 'inseam') {
                completeMeasurements[key] = firstChart.measurements[key] || 0;
            } else if (key === 'bust' && chest) {
                completeMeasurements[key] = chest;
            } else {
                completeMeasurements[key] = firstChart.measurements[key] || 0;
            }
            console.log(`   ⚠️ Defaulted '${key}' to: ${completeMeasurements[key]}"`);
        }

        // Push normalized values back
        Object.assign(userMeasurements, completeMeasurements);

        // 6. Evaluate sizes using ONLY fit dimensions
        let selectedSize = null;
        const reasoning = [];

        for (const size of sizeCharts) {
            const chartMeasurements = size.measurements;
            let fitsAll = true;
            const sizeReasoning = [];

            for (const key of fitKeys) {
                const stdVal = chartMeasurements[key] != null ? parseFloat(chartMeasurements[key]) : null;
                if (stdVal === null) continue;

                const userVal = parseFloat(completeMeasurements[key]);
                if (isNaN(userVal)) continue;

                if (stdVal < userVal) {
                    fitsAll = false;
                    sizeReasoning.push(`${key}: ${userVal}" > ${size.sizeLabel} std ${stdVal}"`);
                }
            }

            if (fitsAll) {
                selectedSize = size;
                reasoning.push(`✅ Fits ${size.sizeLabel} on fit dimensions: [${fitKeys.join(', ')}]`);
                break;
            } else {
                reasoning.push(`Skipped ${size.sizeLabel}: ${sizeReasoning.join(', ')}`);
            }
        }

        // 7. Oversize fallback
        if (!selectedSize) {
            const largestSize = sizeCharts[sizeCharts.length - 1];
            return {
                selectedSize: largestSize.sizeLabel,
                isOversize: true,
                reasoning: [
                    ...reasoning,
                    `User exceeds largest size (${largestSize.sizeLabel}) on fit dimensions. Using as base.`
                ]
            };
        }

        return {
            selectedSize: selectedSize.sizeLabel,
            isOversize: false,
            reasoning
        };
    }
}

module.exports = new SizeMatchingService();
