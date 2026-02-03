const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Configuration
const BASE_URL = 'http://localhost:3009/api/order-deliveries';
const ORDER_ID = new mongoose.Types.ObjectId().toString(); // Random Order ID
const SECRET = 'b8d2f8b9c24a17e1d1e1a2f6b5c3a8791e9b47a1e3c38a7216e7bbf7f28d194d';

// Generate Tokens
const adminId = new mongoose.Types.ObjectId().toString();
const vendorId = new mongoose.Types.ObjectId().toString();
const tailorId = new mongoose.Types.ObjectId().toString();

const adminToken = jwt.sign({ id: adminId, role: 'admin' }, SECRET, { expiresIn: '1h' });
const vendorToken = jwt.sign({ id: vendorId, role: 'seller' }, SECRET, { expiresIn: '1h' });
const tailorToken = jwt.sign({ id: tailorId, role: 'tailor' }, SECRET, { expiresIn: '1h' });

const authConfig = (token) => ({
    headers: { Authorization: `Bearer ${token}` }
});

async function runTest() {
    console.log(`🚀 Starting OrderDelivery Verification Flow`);
    console.log(`📦 Using Test Order ID: ${ORDER_ID}`);

    try {
        // 1. Create Order Delivery (System Internal)
        console.log(`\n[1] Testing Create (Internal Hook)...`);
        const createPayload = {
            orderId: ORDER_ID,
            items: [
                { type: 'FABRIC', name: 'Cotton Fabric' }, // Should create FABRIC delivery
                { type: 'GARMENT', name: 'Shirt' }        // Should create GARMENT delivery
            ],
            bookingType: 'complete'
        };

        const createRes = await axios.post(`${BASE_URL}/internal/create`, createPayload);
        console.log(`✅ Create Response Success:`, createRes.data.success);

        if (!createRes.data.success) throw new Error("Creation failed");

        // 2. Fetch Deliveries for Order
        console.log(`\n[2] Fetching Deliveries...`);
        const listRes = await axios.get(`${BASE_URL}/order/${ORDER_ID}`, authConfig(adminToken));
        const deliveries = listRes.data.deliveries;
        console.log(`✅ Found ${deliveries.length} delivery records.`);

        if (deliveries.length === 0) throw new Error("No deliveries found after creation");

        // 3. Test Dispatch Flow (FABRIC)
        const fabricDelivery = deliveries.find(d => d.deliveryType === 'FABRIC');
        if (fabricDelivery) {
            console.log(`\n[3] Testing Dispatch on FABRIC Delivery (${fabricDelivery._id})...`);
            const dispatchPayload = {
                courierName: 'Test Express',
                trackingId: 'TRK-123456789'
            };

            // Try with Tailor token first (Should Fail)
            try {
                await axios.post(`${BASE_URL}/${fabricDelivery._id}/dispatch`, dispatchPayload, authConfig(tailorToken));
                throw new Error("❌ Tailor was able to dispatch FABRIC! Security Flaw.");
            } catch (e) {
                if (e.response && e.response.status === 403) {
                    console.log("✅ Tailor access correctly denied for Fabric dispatch.");
                } else {
                    throw e; // Unexpected error
                }
            }

            // Retry with Vendor Token (Should Succeed)
            const dispatchRes = await axios.post(`${BASE_URL}/${fabricDelivery._id}/dispatch`, dispatchPayload, authConfig(vendorToken));
            console.log(`✅ Dispatch Response: Status is now ${dispatchRes.data.delivery.status}`);

            if (dispatchRes.data.delivery.status !== 'DISPATCHED') throw new Error("Status failed to update to DISPATCHED");
        } else {
            console.warn("⚠️ No FABRIC delivery found to test dispatch");
        }

        // 4. Test Complete Flow (FABRIC)
        if (fabricDelivery) {
            console.log(`\n[4] Testing Completion on FABRIC Delivery...`);
            const completeRes = await axios.post(`${BASE_URL}/${fabricDelivery._id}/complete`, {}, authConfig(vendorToken));
            console.log(`✅ Completion Response: Status is now ${completeRes.data.delivery.status}`);

            if (completeRes.data.delivery.status !== 'DELIVERED') throw new Error("Status failed to update to DELIVERED");
        }

        // 5. Test Garment Delivery (Optional Check)
        const garmentDelivery = deliveries.find(d => d.deliveryType === 'GARMENT');
        if (garmentDelivery) {
            console.log(`\n[5] Verified GARMENT delivery exists (Status: ${garmentDelivery.status})`);
        }

        console.log(`\n✨ VERIFICATION SUCCESSFUL! All steps passed.`);

    } catch (error) {
        console.error(`\n❌ VERIFICATION FAILED:`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runTest();
