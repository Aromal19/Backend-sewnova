const axios = require('axios');

// Bulk script to create delivery records for multiple orders
const DELIVERY_SERVICE_URL = 'http://localhost:3008';

// Add order IDs here that need delivery records
const ORDER_IDS = [
    '69824d3...', // Replace with full order ID
    // Add more order IDs as needed
];

async function createDeliveryForOrder(orderId, bookingType = 'complete') {
    try {
        console.log(`\n📦 Creating delivery records for: ${orderId}`);

        const payload = {
            orderId: orderId,
            bookingType: bookingType, // 'fabric', 'tailor', or 'complete'
            items: []
        };

        const response = await axios.post(
            `${DELIVERY_SERVICE_URL}/api/order-deliveries/internal/create`,
            payload
        );

        if (response.data.success) {
            console.log(`✅ Success! Created ${response.data.deliveries.length} delivery records:`);
            response.data.deliveries.forEach(d => {
                console.log(`   - ${d.deliveryType}: ${d.status} (ID: ${d._id})`);
            });
            return true;
        }

    } catch (error) {
        if (error.response?.data) {
            console.error(`❌ Error: ${error.response.data.message || JSON.stringify(error.response.data)}`);
        } else {
            console.error(`❌ Error: ${error.message}`);
        }
        return false;
    }
}

async function main() {
    console.log('🚀 Bulk Delivery Record Creator');
    console.log('================================\n');

    // Check if order IDs provided via command line
    const orderIds = process.argv.slice(2);
    const ordersToProcess = orderIds.length > 0 ? orderIds : ORDER_IDS;

    if (ordersToProcess.length === 0 || ordersToProcess[0].includes('...')) {
        console.error('❌ No valid order IDs provided!');
        console.log('\nUsage:');
        console.log('  node create-deliveries-bulk.js <orderId1> <orderId2> ...');
        console.log('\nOr edit the ORDER_IDS array in the script.');
        process.exit(1);
    }

    console.log(`Processing ${ordersToProcess.length} order(s)...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const orderId of ordersToProcess) {
        const success = await createDeliveryForOrder(orderId);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log('\n================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('================================\n');
}

main();
