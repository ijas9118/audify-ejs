/* eslint-disable no-unused-vars */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const logger = require('../config/logger');

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.generateHash = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

exports.comparePassword = async (enteredPassword, storedPassword) =>
  bcrypt.compare(enteredPassword, storedPassword);

exports.findUserByEmail = async (email) => User.findOne({ email });

exports.createUser = async (userData) => {
  const user = new User(userData);
  return user.save();
};

exports.handleGoogleLogin = async (profile) => {
  let user = await User.findOne({ email: profile.email });

  if (user && user.status !== 'Active') {
    throw new Error('Account blocked');
  }

  if (!user) {
    const hashedPassword = await exports.generateHash('123456'); // Default password for Google users
    user = new User({
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email: profile.email,
      password: hashedPassword,
      status: 'Active',
      isGoogleUser: true,
    });
    await user.save();
  }
  return user;
};

exports.sendOtp = async (email) => {
  const otp = crypto.randomInt(100000, 999999);
  const otpExpiry = Date.now() + 5 * 60 * 1000;

  if (!process.env.EMAIL_USER) {
    throw new Error('EMAIL_USER environment variable is not defined');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Signup',
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
  };

  logger.debug('OTP: ', otp);
  // await transporter.sendMail(mailOptions);
  return { otp, otpExpiry };
};

exports.updatePassword = async (userId, newPassword) => {
  const hashedPassword = await exports.generateHash(newPassword);
  return User.findByIdAndUpdate(userId, { password: hashedPassword });
};

exports.resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }
  const hashedPassword = await exports.generateHash(newPassword);
  return User.findByIdAndUpdate(user._id, { password: hashedPassword });
};

/**
 * Get or create demo user for testing purposes
 * @returns {Promise<Object>} Demo user object
 */
exports.getOrCreateDemoUser = async () => {
  const demoEmail = process.env.DEMO_USER_EMAIL || 'demo@audify.com';
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'demo123456';

  // Check if demo user already exists
  let demoUser = await User.findOne({ email: demoEmail });

  if (!demoUser) {
    // Create demo user if it doesn't exist
    const hashedPassword = await exports.generateHash(demoPassword);
    demoUser = new User({
      firstName: 'Demo',
      lastName: 'User',
      email: demoEmail,
      password: hashedPassword,
      status: 'Active',
      walletBalance: 5000, // Give demo user some wallet balance to test checkout
    });
    await demoUser.save();
  }

  return demoUser;
};

/**
 * Send order confirmation email
 * @param {Object} orderDetails - Order details object
 * @param {string} orderDetails.email - User email
 * @param {string} orderDetails.orderId - Order ID
 * @param {number} orderDetails.totalAmount - Total order amount
 * @param {Array} orderDetails.items - Order items array
 * @param {string} orderDetails.paymentMethod - Payment method used
 * @param {Object} orderDetails.shippingAddress - Shipping address details
 * @returns {Promise<void>}
 */
exports.sendOrderConfirmationEmail = async (orderDetails) => {
  const { email, orderId, totalAmount, items, paymentMethod, shippingAddress } =
    orderDetails;

  if (!process.env.EMAIL_USER) {
    throw new Error('EMAIL_USER environment variable is not defined');
  }

  // Build items list for email
  const itemsList = items
    .map(
      (item) =>
        `<li style="margin-bottom: 10px;">
          <strong>${item.name}</strong> x ${item.quantity} - ₹${item.price.toFixed(2)}
        </li>`
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        ul { list-style-type: none; padding: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎧 Audify - Order Confirmation</h1>
        </div>
        <div class="content">
          <h2>Thank you for your order!</h2>
          <p>
            ${
              paymentMethod === 'COD'
                ? 'Your order has been successfully placed and will be processed soon. Please have the amount ready at the time of delivery.'
                : 'Your order has been successfully placed and your payment has been confirmed.'
            }
          </p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> #${orderId}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
          </div>

          <div class="order-details">
            <h3>Order Items</h3>
            <ul>
              ${itemsList}
            </ul>
          </div>

          <div class="order-details">
            <h3>Shipping Address</h3>
            <p>
              ${shippingAddress.name}<br>
              ${shippingAddress.location}<br>
              ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.zip}<br>
              Mobile: ${shippingAddress.mobile}
            </p>
          </div>

          <p>We'll send you a shipping confirmation email as soon as your order ships.</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with Audify!</p>
          <p>Made with ❤️ for audio enthusiasts</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Order Confirmation - Audify

    Thank you for your order!
    
    Order Details:
    - Order ID: #${orderId}
    - Payment Method: ${paymentMethod}
    - Total Amount: ₹${totalAmount.toFixed(2)}
    
    Order Items:
    ${items.map((item) => `- ${item.name} x ${item.quantity} - ₹${item.price.toFixed(2)}`).join('\n')}
    
    Shipping Address:
    ${shippingAddress.name}
    ${shippingAddress.location}
    ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.zip}
    Mobile: ${shippingAddress.mobile}
    
    Thank you for shopping with Audify!
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Order Confirmation - Audify #${orderId}`,
    text: textContent,
    html: htmlContent,
  };

  // await transporter.sendMail(mailOptions);
};
