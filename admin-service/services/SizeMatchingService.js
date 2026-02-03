const GarmentType = require('../models/GarmentType');
const SizeChart = require('../models/SizeChart');

class SizeMatchingService {
    /**
     * Determine the smallest standard size for a user.
     * @param {string} garmentTypeCode - e.g., 'mens-kurta'
     * @param {object} userMeasurements - e.g., { chest: 40.5, waist: 38, ... }
     * @returns {Promise<object>} { selectedSize, isOversize, reasoning }
     */
    async determineSize(garmentTypeCode, userMeasurements) {
        // 1. Fetch Garment Type
        const garmentType = await GarmentType.findOne({ code: garmentTypeCode.toUpperCase() });
        if (!garmentType) {
            throw new Error(`Invalid garment type code: ${garmentTypeCode}`);
        }

        // 2. Fetch Size Charts & Sort
        const sortKey = `measurements.${garmentType.primaryMeasurement}`;
        const sizeCharts = await SizeChart.find({ garmentType: garmentType._id })
            .sort({ [sortKey]: 1 }); // Ascending order

        if (!sizeCharts || sizeCharts.length === 0) {
            throw new Error(`No size charts found for garment type: ${garmentTypeCode}`);
        }

        // 3. Determine Required Keys (from the first size chart)
        // We assume all size charts for a garment have the same schema structure in 'measurements'
        // We filter out internal keys (like _id, unit, $__ etc if raw) but Mongoose object usually returns clean obj or we can use .toObject()
        const firstChart = sizeCharts[0].toObject();
        const requiredKeys = Object.keys(firstChart.measurements).filter(key =>
            key !== 'unit' && key !== '_id'
        );

        // 4. Validate User Inputs & Apply Defaults
        // For missing measurements, use reasonable defaults based on provided measurements
        const completeMeasurements = { ...userMeasurements };

        for (const key of requiredKeys) {
            if (completeMeasurements[key] === undefined || completeMeasurements[key] === null) {
                // Apply smart defaults based on what we have
                if (key === 'waist' && completeMeasurements.chest) {
                    completeMeasurements[key] = completeMeasurements.chest - 4; // Typical waist is 4" less than chest
                } else if (key === 'hip' && completeMeasurements.chest) {
                    completeMeasurements[key] = completeMeasurements.chest + 2; // Typical hip is 2" more than chest
                } else if (key === 'length' && completeMeasurements.chest) {
                    completeMeasurements[key] = completeMeasurements.chest + 2; // Default kurta length
                } else if (key === 'sleeve' && completeMeasurements.chest) {
                    completeMeasurements[key] = Math.round(completeMeasurements.chest * 0.6); // Approximate sleeve length
                } else if (key === 'shoulder' && completeMeasurements.chest) {
                    completeMeasurements[key] = Math.round(completeMeasurements.chest * 0.45); // Approximate shoulder width
                } else {
                    // If we can't estimate, use a safe default from the smallest size
                    const firstSize = sizeCharts[0].measurements;
                    completeMeasurements[key] = firstSize[key] || 0;
                }
                console.log(`⚠️ Missing measurement '${key}', using default: ${completeMeasurements[key]}`);
            }
        }

        // Update userMeasurements reference for the rest of the function
        Object.assign(userMeasurements, completeMeasurements);

        let selectedSize = null;
        let reasoning = [];

        // 5. Evaluate Sizes
        for (const size of sizeCharts) {
            const chartMeasurements = size.measurements;
            let fitsAll = true;
            let sizeReasoning = [];

            for (const key of requiredKeys) {
                const userVal = parseFloat(userMeasurements[key]);
                const standardVal = parseFloat(chartMeasurements[key]);

                if (isNaN(userVal)) {
                    throw new Error(`Invalid user measurement for ${key}`);
                }

                if (standardVal < userVal) {
                    fitsAll = false;
                    sizeReasoning.push(`${key} (${userVal}) > ${size.sizeLabel} ${key} (${standardVal})`);
                }
            }

            if (fitsAll) {
                selectedSize = size;
                reasoning.push(`Fits within ${size.sizeLabel} standard measurements.`);
                break;
            } else {
                // Keep track of why we skipped this size for final reporting if needed, 
                // or just accumulate "Rounded up from X" log.
                // Actually, the requirement says "Reasons for rounding up".
                reasoning.push(`Skipped ${size.sizeLabel}: ${sizeReasoning.join(', ')}`);
            }
        }

        // 6. Handle Fallback (Oversize)
        if (!selectedSize) {
            const largestSize = sizeCharts[sizeCharts.length - 1];
            return {
                selectedSize: largestSize.sizeLabel,
                isOversize: true,
                reasoning: [
                    ...reasoning,
                    `User measurements exceed largest available size (${largestSize.sizeLabel}). Selected largest size as base.`
                ]
            };
        }

        return {
            selectedSize: selectedSize.sizeLabel,
            isOversize: false,
            reasoning: reasoning
        };
    }
}

module.exports = new SizeMatchingService();
