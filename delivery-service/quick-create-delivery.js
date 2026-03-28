const axios = require('axios');

// Simple script to create delivery records directly
const DELIVERY_SERVICE_URL = 'http://localhost:3008';

async function createDeliveryRecords() {
    const orderId = '69825edb1bac39ac9cfacc26';

    console.log('Creating delivery records for order:', orderId);

    // Create OrderDelivery records (new system)
    try {
        const payload = {
            orderId: orderId,
            bookingType: 'complete', // Assuming complete order (fabric + garment)
            items: []
        };

        console.log('\n📦 Creating new system delivery records...');
        const response = await axios.post(
            `${DELIVERY_SERVICE_URL}/api/order-deliveries/internal/create`,
            payload
        );

        console.log('✅ Success!');
        console.log('Created deliveries:', response.data.deliveries);

        response.data.deliveries.forEach(d => {
            console.log(`  - ${d.deliveryType}: ${d.status} (ID: ${d._id})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

createDeliveryRecords();
