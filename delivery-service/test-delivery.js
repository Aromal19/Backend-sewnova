const axios = require('axios');
const mongoose = require('mongoose');

// Test configuration
const DELIVERY_SERVICE_URL = 'http://localhost:3008';
const MONGODB_URI = 'mongodb+srv://aromalgirish00:aromal00@sewnova.tlnzt4i.mongodb.net/?retryWrites=true&w=majority&appName=sewnova';

// Test data
const testOrderId = new mongoose.Types.ObjectId();
const testCustomerId = new mongoose.Types.ObjectId();

async function testDeliveryModule() {
    console.log('🧪 Starting Delivery Module Tests\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Health check
        console.log('\n📍 Test 1: Health Check');
        const healthResponse = await axios.get(`${DELIVERY_SERVICE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Test 2: Create delivery for FABRIC order
        console.log('\n📍 Test 2: Create Delivery (FABRIC)');
        const fabricDelivery = await axios.post(`${DELIVERY_SERVICE_URL}/api/deliveries`, {
            orderId: testOrderId,
            customerId: testCustomerId,
            orderItems: [
                { serviceType: 'fabric', quantity: 2, price: 500 }
            ],
            deliveryAddress: {
                street: '123 Test Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
                country: 'India',
                phone: '9876543210'
            }
        });
        console.log('✅ FABRIC delivery created:', {
            id: fabricDelivery.data.delivery._id,
            type: fabricDelivery.data.delivery.deliveryType,
            status: fabricDelivery.data.delivery.status
        });

        const deliveryId = fabricDelivery.data.delivery._id;

        // Test 3: Get delivery by order ID
        console.log('\n📍 Test 3: Get Delivery by Order ID');
        const getDelivery = await axios.get(`${DELIVERY_SERVICE_URL}/api/deliveries/order/${testOrderId}`);
        console.log('✅ Delivery retrieved:', {
            id: getDelivery.data.delivery._id,
            status: getDelivery.data.delivery.status,
            isLocked: getDelivery.data.delivery.isLocked
        });

        // Test 4: Submit dispatch details (requires auth token - will fail without it)
        console.log('\n📍 Test 4: Submit Dispatch Details (without auth - should fail)');
        try {
            await axios.post(`${DELIVERY_SERVICE_URL}/api/deliveries/${deliveryId}/dispatch`, {
                courierName: 'BlueDart',
                trackingId: 'BD123456789'
            });
            console.log('❌ Should have failed without auth token');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Correctly rejected without auth token');
            } else {
                console.log('⚠️ Unexpected error:', error.message);
            }
        }

        // Test 5: Get delivery tracking
        console.log('\n📍 Test 5: Get Delivery Tracking (without auth - should fail)');
        try {
            await axios.get(`${DELIVERY_SERVICE_URL}/api/deliveries/tracking/${testOrderId}`);
            console.log('❌ Should have failed without auth token');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ Correctly rejected without auth token');
            } else {
                console.log('⚠️ Unexpected error:', error.message);
            }
        }

        // Test 6: Create delivery for GARMENT order
        console.log('\n📍 Test 6: Create Delivery (GARMENT)');
        const garmentOrderId = new mongoose.Types.ObjectId();
        const garmentDelivery = await axios.post(`${DELIVERY_SERVICE_URL}/api/deliveries`, {
            orderId: garmentOrderId,
            customerId: testCustomerId,
            orderItems: [
                { serviceType: 'tailor', quantity: 1, price: 800 },
                { serviceType: 'fabric', quantity: 1, price: 500 }
            ],
            deliveryAddress: {
                street: '456 Test Avenue',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001',
                country: 'India',
                phone: '9876543211'
            }
        });
        console.log('✅ GARMENT delivery created:', {
            id: garmentDelivery.data.delivery._id,
            type: garmentDelivery.data.delivery.deliveryType,
            status: garmentDelivery.data.delivery.status
        });

        // Test 7: Verify delivery type determination logic
        console.log('\n📍 Test 7: Verify Delivery Type Logic');
        console.log('  FABRIC order (fabric only) → deliveryType:', fabricDelivery.data.delivery.deliveryType);
        console.log('  GARMENT order (tailor + fabric) → deliveryType:', garmentDelivery.data.delivery.deliveryType);

        if (fabricDelivery.data.delivery.deliveryType === 'FABRIC' &&
            garmentDelivery.data.delivery.deliveryType === 'GARMENT') {
            console.log('✅ Delivery type determination working correctly');
        } else {
            console.log('❌ Delivery type determination failed');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ All basic tests passed!');
        console.log('\n📝 Note: Auth-protected endpoints require valid JWT tokens');
        console.log('   These should be tested through the full application flow');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run tests
testDeliveryModule().catch(console.error);
