const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to your preferred email service
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generate verification token with improved security
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create styled email template
const createEmailTemplate = (content, primaryColor = '#0F172A') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SewNova - Email Verification</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8fafc;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #0F172A, #1E293B);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }
            .header h1 {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
            }
            .header p {
                font-size: 16px;
                opacity: 0.9;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .content h2 {
                color: #1f2937;
                font-size: 24px;
                margin-bottom: 16px;
                font-weight: 600;
            }
            .content p {
                color: #6b7280;
                font-size: 16px;
                margin-bottom: 20px;
                line-height: 1.7;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #F59E0B, #F97316);
                color: #0F172A;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                margin: 20px 0;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
            }
            .button:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(245, 158, 11, 0.4);
            }
            .warning {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 20px 0;
                border-radius: 4px;
            }
            .warning p {
                color: #92400e;
                margin: 0;
                font-size: 14px;
            }
            .footer {
                background-color: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            .footer p {
                color: #9ca3af;
                font-size: 14px;
                margin-bottom: 8px;
            }
            .footer .social-links {
                margin-top: 16px;
            }
            .footer .social-links a {
                color: #F59E0B;
                text-decoration: none;
                margin: 0 8px;
                font-weight: 500;
            }
            .logo {
                display: inline-block;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 16px;
                color: white;
                text-decoration: none;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 0 16px;
                }
                .header, .content, .footer {
                    padding: 24px 20px;
                }
                .header h1 {
                    font-size: 28px;
                }
                .button {
                    display: block;
                    width: 100%;
                    text-align: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">SewNova</div>
                <h1>Welcome to SewNova!</h1>
                <p>Your gateway to premium fabrics and tailoring services</p>
            </div>
            ${content}
            <div class="footer">
                <p>© 2024 SewNova. All rights reserved.</p>
                <p>This email was sent to verify your account. If you didn't create an account, please ignore this email.</p>
                <div class="social-links">
                    <a href="#">About Us</a>
                    <a href="#">Support</a>
                    <a href="#">Privacy Policy</a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Send verification email
const sendVerificationEmail = async (email, verificationToken, userType, userName) => {
  try {
    const transporter = createTransporter();
    
    // Create verification URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&type=${userType}`;
    
    // Role-specific content
    const roleMessages = {
      customer: {
        title: 'Verify Your Customer Account',
        description: 'Thank you for joining SewNova! You\'re one step away from accessing our marketplace of premium fabrics and connecting with skilled tailors.',
        cta: 'Start Shopping'
      },
      seller: {
        title: 'Verify Your Seller Account',
        description: 'Welcome to SewNova\'s seller community! Verify your email to start showcasing your premium fabrics to customers across the platform.',
        cta: 'Start Selling'
      },
      tailor: {
        title: 'Verify Your Tailor Account',
        description: 'Welcome to SewNova\'s tailor network! Verify your email to start accepting orders and showcase your craftsmanship to customers.',
        cta: 'Start Crafting'
      }
    };

    const roleConfig = roleMessages[userType] || roleMessages.customer;
    
    const emailContent = `
      <div class="content">
        <h2>Hello ${userName}! 👋</h2>
        <p>${roleConfig.description}</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">${roleConfig.cta} - Verify Email</a>
        </div>
        <div class="warning">
          <p><strong>Security Notice:</strong> This verification link will expire in 24 hours for your security. If you didn't create this account, please ignore this email.</p>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #0F172A; font-family: monospace; background-color: #FEF3C7; padding: 8px; border-radius: 4px; font-size: 14px;">${verificationUrl}</p>
      </div>
    `;

    const mailOptions = {
      from: {
        name: 'SewNova',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `${roleConfig.title} - SewNova`,
      html: createEmailTemplate(emailContent)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, userType, userName) => {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const roleMessages = {
      customer: {
        title: 'Welcome to SewNova!',
        description: 'Your account has been verified successfully! You can now explore our marketplace, discover premium fabrics, and connect with skilled tailors.',
        nextSteps: [
          'Browse our curated collection of premium fabrics',
          'Find and connect with verified tailors',
          'Place your first order with confidence',
          'Track your orders in real-time'
        ]
      },
      seller: {
        title: 'Welcome to SewNova Seller Community!',
        description: 'Your seller account is now active! Start showcasing your premium fabrics and grow your business with our platform.',
        nextSteps: [
          'Complete your seller profile',
          'Upload your first fabric collection',
          'Set competitive pricing',
          'Start receiving orders from customers'
        ]
      },
      tailor: {
        title: 'Welcome to SewNova Tailor Network!',
        description: 'Your tailor account is verified! Start accepting orders and showcase your craftsmanship to customers.',
        nextSteps: [
          'Complete your professional profile',
          'Showcase your portfolio and specializations',
          'Set your service rates and availability',
          'Start accepting custom orders'
        ]
      }
    };

    const roleConfig = roleMessages[userType] || roleMessages.customer;
    
    const emailContent = `
      <div class="content">
        <h2>🎉 ${roleConfig.title}</h2>
        <p>Hi ${userName},</p>
        <p>${roleConfig.description}</p>
        <h3 style="color: #1f2937; margin-top: 24px; margin-bottom: 12px;">What's next?</h3>
        <ul style="color: #6b7280; padding-left: 20px; margin-bottom: 20px;">
          ${roleConfig.nextSteps.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}
        </ul>
        <div style="text-align: center;">
          <a href="${frontendUrl}/login" class="button">Get Started</a>
        </div>
        <p>If you have any questions, our support team is here to help. Feel free to reach out!</p>
      </div>
    `;

    const mailOptions = {
      from: {
        name: 'SewNova',
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: `${roleConfig.title} - Let's Get Started!`,
      html: createEmailTemplate(emailContent)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

// Encrypt registration data for token
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'defaultsecretencryptionkey123456'; // 32 chars for AES-256
const IV_LENGTH = 16;

function encryptData(data) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(JSON.stringify(data));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptData(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString());
}

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendWelcomeEmail,
  encryptData,
  decryptData
};