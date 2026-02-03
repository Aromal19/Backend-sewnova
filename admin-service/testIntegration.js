require('dotenv').config();
const mongoose = require('mongoose');
const fabricController = require('./controllers/fabricController');

// Mock Request and Response
const mockReq = (body) => ({
    body
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.body = data;
        return res;
    };
    return res;
};

const runIntegrationTest = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const testPayload = {
            garmentType: "mens-kurta",
            measurements: {
                chest: 42,
                waist: 40,
                length: 44,
                sleeve: 25,
                shoulder: 19, // Required
                hip: 42       // Required
            }
        };

        console.log('\n--- Testing POST /api/fabric/estimate ---');
        console.log('Request:', JSON.stringify(testPayload, null, 2));

        const req = mockReq(testPayload);
        const res = mockRes();

        await fabricController.estimateFabricRequirements(req, res);

        console.log(`\nResponse Status: ${res.statusCode}`);
        console.log('Response Body:', JSON.stringify(res.body, null, 2));

        if (res.statusCode === 200 && res.body.finalMeters) {
            console.log('✅ Integration Test PASSED');
        } else {
            console.error('❌ Integration Test FAILED');
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runIntegrationTest();
