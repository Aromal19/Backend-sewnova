const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// This script creates delivery records for existing orders that don't have them

const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3007';
const DELIVERY_SERVICE_URL = 'http://localhost:3008';

async function createDeliveryForOrder(orderId) {
    try {
        console.log(`\n🔍 Processing order: ${orderId}`);

        // Get order details from customer service
        const orderResponse = await axios.get(`${CUSTOMER_SERVICE_URL}/api/orders/${orderId}`);

        if (!orderResponse.data.success) {
            console.error(`❌ Order not found: ${orderId}`);
            return false;
        }

        const order = orderResponse.data.data;
        console.log(`📦 Order found: ${order.orderId}`);
        console.log(`   Customer: ${order.customerId}`);
        console.log(`   Status: ${order.status}`);

        // Get booking details to determine delivery type
        let bookingType = 'complete'; // default
        if (order.bookingId) {
            try {
                const bookingResponse = await axios.get(`${CUSTOMER_SERVICE_URL}/api/bookings/${order.bookingId._id || order.bookingId}`);
                if (bookingResponse.data.success) {
                    bookingType = bookingResponse.data.data.bookingType;
                    console.log(`   Booking Type: ${bookingType}`);
                }
            } catch (err) {
                console.log(`   ⚠️ Could not fetch booking details, using default type`);
            }
        }

        // Create delivery record (legacy system)
        try {
            const deliveryPayload = {
                orderId: order._id,
                customerId: order.customerId._id || order.customerId,
                orderItems: order.items || [],
                deliveryAddress: order.deliveryAddress || {}
            };

            console.log(`   Creating legacy delivery record...`);
            const deliveryResponse = await axios.post(
                `${DELIVERY_SERVICE_URL}/api/deliveries`,
                deliveryPayload
            );

            if (deliveryResponse.data.success) {
                console.log(`   ✅ Legacy delivery record created`);
            }
        } catch (deliveryError) {
            if (deliveryError.response?.data?.message?.includes('already exists')) {
                console.log(`   ℹ️ Legacy delivery record already exists`);
            } else {
                console.error(`   ❌ Failed to create legacy delivery:`, deliveryError.response?.data?.message || deliveryError.message);
            }
        }

        // Create order delivery records (new system)
        try {
            const orderDeliveryPayload = {
                orderId: order._id,
                bookingType: bookingType,
                items: order.items || []
            };

            console.log(`   Creating new system delivery records...`);
            const orderDeliveryResponse = await axios.post(
                `${DELIVERY_SERVICE_URL}/api/order-deliveries/internal/create`,
                orderDeliveryPayload
            );

            if (orderDeliveryResponse.data.success) {
                console.log(`   ✅ New system delivery records created (${orderDeliveryResponse.data.deliveries.length} records)`);
                orderDeliveryResponse.data.deliveries.forEach(d => {
                    console.log(`      - ${d.deliveryType}: ${d.status}`);
                });
            }
        } catch (orderDeliveryError) {
            console.error(`   ❌ Failed to create new system delivery:`, orderDeliveryError.response?.data?.message || orderDeliveryError.message);
        }

        console.log(`✅ Completed processing order: ${orderId}`);
        return true;

    } catch (error) {
        console.error(`❌ Error processing order ${orderId}:`, error.message);
        return false;
    }
}

async function main() {
    const orderId = process.argv[2];

    if (!orderId) {
        console.error('❌ Please provide an order ID as argument');
        console.log('Usage: node create-missing-delivery.js <orderId>');
        process.exit(1);
    }

    console.log('🚀 Creating delivery records for order:', orderId);
    console.log('📡 Customer Service:', CUSTOMER_SERVICE_URL);
    console.log('📡 Delivery Service:', DELIVERY_SERVICE_URL);

    const success = await createDeliveryForOrder(orderId);

    if (success) {
        console.log('\n✅ All done!');
        process.exit(0);
    } else {
        console.log('\n❌ Failed to create delivery records');
        process.exit(1);
    }
}

main();
