const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
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

module.exports = {
  sendNewOrderNotification,
  sendOrderStatusUpdate
};

