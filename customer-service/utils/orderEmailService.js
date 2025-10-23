const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send new order notification email to tailor
 */
const sendNewOrderNotification = async (tailorEmail, orderDetails) => {
  try {
    const transporter = createTransporter();

    const {
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      garmentType,
      quantity,
      designDescription,
      specialInstructions,
      deliveryDate,
      measurements,
      totalAmount,
      advanceAmount,
      deliveryAddress
    } = orderDetails;

    // Format measurements for email
    const measurementsHtml = measurements ? `
      <h3 style="color: #7c3aed; margin-top: 20px;">📏 Measurements:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        ${Object.entries(measurements).map(([key, value]) => `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; font-weight: 600; text-transform: capitalize;">${key.replace(/_/g, ' ')}:</td>
            <td style="padding: 8px;">${value} ${typeof value === 'number' ? 'inches' : ''}</td>
          </tr>
        `).join('')}
      </table>
    ` : '';

    const expectedDays = Math.ceil((new Date(deliveryDate) - new Date()) / (1000 * 60 * 60 * 24));

    const mailOptions = {
      from: {
        name: 'SewNova',
        address: process.env.EMAIL_USER
      },
      to: tailorEmail,
      subject: `🎉 New Order Received - ${orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✂️ New Order Received!</h1>
            <p style="color: #f3e8ff; margin: 10px 0 0 0;">You have a new order to fulfill</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: #7c3aed; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 20px;">Order ID: ${orderId}</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Payment Confirmed ✅</p>
            </div>

            <h3 style="color: #7c3aed; margin-top: 0;">👤 Customer Details:</h3>
            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0;"><strong>Name:</strong></td>
                <td style="padding: 8px 0;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Email:</strong></td>
                <td style="padding: 8px 0;">${customerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Phone:</strong></td>
                <td style="padding: 8px 0;">${customerPhone}</td>
              </tr>
            </table>

            <h3 style="color: #7c3aed;">👔 Order Details:</h3>
            <table style="width: 100%; margin-bottom: 20px; background: #f9fafb; padding: 15px; border-radius: 8px;">
              <tr>
                <td style="padding: 8px 0;"><strong>Garment Type:</strong></td>
                <td style="padding: 8px 0; text-transform: capitalize;">${garmentType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Quantity:</strong></td>
                <td style="padding: 8px 0;">${quantity}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Delivery Date:</strong></td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${new Date(deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Expected Time:</strong></td>
                <td style="padding: 8px 0; color: #7c3aed; font-weight: 600;">${expectedDays} days remaining</td>
              </tr>
            </table>

            ${designDescription ? `
              <h3 style="color: #7c3aed;">🎨 Design Description:</h3>
              <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 10px 0 20px 0;">${designDescription}</p>
            ` : ''}

            ${specialInstructions ? `
              <h3 style="color: #7c3aed;">📝 Special Instructions:</h3>
              <p style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 10px 0 20px 0;">${specialInstructions}</p>
            ` : ''}

            ${measurementsHtml}

            <h3 style="color: #7c3aed; margin-top: 20px;">📍 Delivery Address:</h3>
            <p style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 10px 0 20px 0;">
              ${deliveryAddress.addressLine}<br>
              ${deliveryAddress.locality}, ${deliveryAddress.city}<br>
              ${deliveryAddress.district}, ${deliveryAddress.state} - ${deliveryAddress.pincode}<br>
              ${deliveryAddress.country || 'India'}
            </p>

            <h3 style="color: #7c3aed;">💰 Payment Details:</h3>
            <table style="width: 100%; margin-bottom: 20px; background: #f0fdf4; padding: 15px; border-radius: 8px;">
              <tr>
                <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #059669;">₹${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Advance Paid:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #059669;">₹${advanceAmount}</td>
              </tr>
              <tr style="border-top: 2px solid #10b981;">
                <td style="padding: 8px 0;"><strong>Remaining:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">₹${totalAmount - advanceAmount}</td>
              </tr>
            </table>

            <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tailor/active-orders" 
                 style="display: inline-block; background: white; color: #7c3aed; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px;">
                View Order Details
              </a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <strong>Next Steps:</strong><br>
              1. Review the order details and measurements<br>
              2. Contact the customer if you need clarification<br>
              3. Start working on the order<br>
              4. Update progress in your dashboard<br>
              5. Mark as complete when ready for delivery
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification from SewNova</p>
            <p>© 2025 SewNova. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order notification email sent to tailor:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending order notification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send order status update email
 */
const sendOrderStatusUpdate = async (customerEmail, orderDetails) => {
  try {
    const transporter = createTransporter();

    const { orderId, status, customerName, garmentType } = orderDetails;

    const statusMessages = {
      confirmed: '✅ Your order has been confirmed',
      in_progress: '🔨 Work has started on your order',
      ready_for_fitting: '👗 Your garment is ready for fitting',
      completed: '🎉 Your order is completed',
      delivered: '📦 Your order has been delivered'
    };

    const mailOptions = {
      from: {
        name: 'SewNova',
        address: process.env.EMAIL_USER
      },
      to: customerEmail,
      subject: `Order Update - ${orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Status Updated</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2>Hi ${customerName},</h2>
            <p style="font-size: 18px; color: #7c3aed; font-weight: 600;">${statusMessages[status]}</p>
            <p>Order ID: <strong>${orderId}</strong></p>
            <p>Garment: <strong style="text-transform: capitalize;">${garmentType}</strong></p>
            
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/orders" 
                 style="color: white; text-decoration: none; font-weight: 600;">
                View Order Details →
              </a>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Status update email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending status update email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment confirmation email to customer
 */
const sendPaymentConfirmationEmail = async (booking) => {
  try {
    const transporter = createTransporter();

    // Fetch customer details
    const Customer = require('mongoose').model('Customer');
    const customer = await Customer.findById(booking.customerId).select('firstname lastname email phone');
    
    if (!customer || !customer.email) {
      console.log('❌ Customer email not found for booking:', booking._id);
      return { success: false, error: 'Customer email not found' };
    }

    const {
      _id: bookingId,
      bookingType,
      orderDetails,
      pricing,
      status,
      createdAt
    } = booking;

    const mailOptions = {
      from: {
        name: 'SewNova',
        address: process.env.EMAIL_USER
      },
      to: customer.email,
      subject: `🎉 Payment Confirmed - Order #${bookingId.toString().substring(0, 10).toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Payment Confirmed!</h1>
            <p style="color: #f3e8ff; margin: 10px 0 0 0;">Your order has been successfully confirmed</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: #10b981; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 20px;">Order Confirmed ✅</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Payment received and order is being processed</p>
            </div>

            <h3 style="color: #7c3aed; margin-top: 0;">👤 Order Details:</h3>
            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0;"><strong>Order ID:</strong></td>
                <td style="padding: 8px 0;">#${bookingId.toString().substring(0, 10).toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Order Type:</strong></td>
                <td style="padding: 8px 0; text-transform: capitalize;">${bookingType} Order</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Garment:</strong></td>
                <td style="padding: 8px 0; text-transform: capitalize;">${orderDetails?.garmentType || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Quantity:</strong></td>
                <td style="padding: 8px 0;">${orderDetails?.quantity || 1}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Order Date:</strong></td>
                <td style="padding: 8px 0;">${new Date(createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Expected Delivery:</strong></td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${new Date(orderDetails?.deliveryDate).toLocaleDateString('en-IN')}</td>
              </tr>
            </table>

            <h3 style="color: #7c3aed;">💰 Payment Summary:</h3>
            <table style="width: 100%; margin-bottom: 20px; background: #f0fdf4; padding: 15px; border-radius: 8px;">
              <tr>
                <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-size: 18px; color: #059669;">₹${pricing?.totalAmount || 0}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Amount Paid:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #059669;">₹${pricing?.advanceAmount || pricing?.totalAmount || 0}</td>
              </tr>
              <tr style="border-top: 2px solid #10b981;">
                <td style="padding: 8px 0;"><strong>Remaining:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">₹${pricing?.remainingAmount || 0}</td>
              </tr>
            </table>

            ${orderDetails?.designDescription ? `
              <h3 style="color: #7c3aed;">🎨 Design Description:</h3>
              <p style="background: #f9fafb; padding: 15px; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 10px 0 20px 0;">${orderDetails.designDescription}</p>
            ` : ''}

            ${orderDetails?.specialInstructions ? `
              <h3 style="color: #7c3aed;">📝 Special Instructions:</h3>
              <p style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 10px 0 20px 0;">${orderDetails.specialInstructions}</p>
            ` : ''}

            <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
              <h3 style="color: white; margin: 0 0 15px 0;">What's Next?</h3>
              <div style="color: #f3e8ff; text-align: left; max-width: 400px; margin: 0 auto;">
                <p style="margin: 8px 0;">✅ Your payment has been received</p>
                <p style="margin: 8px 0;">✅ Your tailor has been notified</p>
                <p style="margin: 8px 0;">⏳ Work will begin on your order</p>
                <p style="margin: 8px 0;">📱 You'll receive updates via email</p>
              </div>
            </div>

            <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/orders" 
                 style="display: inline-block; background: white; color: #7c3aed; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px;">
                Track Your Order
              </a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <strong>Thank you for choosing SewNova!</strong><br>
              We'll keep you updated on your order progress. If you have any questions, please don't hesitate to contact us.
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated confirmation from SewNova</p>
            <p>© 2025 SewNova. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Payment confirmation email sent to customer:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending payment confirmation email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send order status update email to customer
 */
const sendOrderStatusUpdateEmail = async (booking) => {
  try {
    const transporter = createTransporter();

    // Fetch customer details
    const Customer = require('mongoose').model('Customer');
    const customer = await Customer.findById(booking.customerId).select('firstname lastname email');
    
    if (!customer || !customer.email) {
      console.log('❌ Customer email not found for booking:', booking._id);
      return { success: false, error: 'Customer email not found' };
    }

    const {
      _id: bookingId,
      bookingType,
      orderDetails,
      status,
      createdAt
    } = booking;

    const statusMessages = {
      confirmed: '✅ Your order has been confirmed',
      in_progress: '🔨 Work has started on your order',
      ready_for_fitting: '👗 Your garment is ready for fitting',
      completed: '🎉 Your order is completed',
      delivered: '📦 Your order has been delivered',
      cancelled: '❌ Your order has been cancelled'
    };

    const statusColors = {
      confirmed: '#10b981',
      in_progress: '#3b82f6',
      ready_for_fitting: '#8b5cf6',
      completed: '#059669',
      delivered: '#10b981',
      cancelled: '#dc2626'
    };

    const mailOptions = {
      from: {
        name: 'SewNova',
        address: process.env.EMAIL_USER
      },
      to: customer.email,
      subject: `Order Update - ${bookingId.toString().substring(0, 10).toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📱 Order Update</h1>
            <p style="color: #f3e8ff; margin: 10px 0 0 0;">Your order status has been updated</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: ${statusColors[status] || '#6b7280'}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 20px;">${statusMessages[status] || 'Order Status Updated'}</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Order ID: #${bookingId.toString().substring(0, 10).toUpperCase()}</p>
            </div>

            <h3 style="color: #7c3aed; margin-top: 0;">📋 Order Details:</h3>
            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0;"><strong>Order Type:</strong></td>
                <td style="padding: 8px 0; text-transform: capitalize;">${bookingType} Order</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Garment:</strong></td>
                <td style="padding: 8px 0; text-transform: capitalize;">${orderDetails?.garmentType || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Quantity:</strong></td>
                <td style="padding: 8px 0;">${orderDetails?.quantity || 1}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Current Status:</strong></td>
                <td style="padding: 8px 0; text-transform: capitalize; color: ${statusColors[status] || '#6b7280'}; font-weight: 600;">${status.replace(/_/g, ' ')}</td>
              </tr>
              ${orderDetails?.deliveryDate ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Expected Delivery:</strong></td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${new Date(orderDetails.deliveryDate).toLocaleDateString('en-IN')}</td>
                </tr>
              ` : ''}
            </table>

            <div style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/orders" 
                 style="display: inline-block; background: white; color: #7c3aed; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px;">
                View Order Details
              </a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <strong>Thank you for choosing SewNova!</strong><br>
              We'll keep you updated on your order progress. If you have any questions, please don't hesitate to contact us.
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated notification from SewNova</p>
            <p>© 2025 SewNova. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Order status update email sent to customer:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Error sending order status update email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendNewOrderNotification,
  sendOrderStatusUpdate,
  sendPaymentConfirmationEmail,
  sendOrderStatusUpdateEmail
};

