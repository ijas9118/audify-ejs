const moment = require('moment');
const PDFDocument = require('pdfkit');
const User = require('../models/userModel');
const Address = require('../models/address');
const Order = require('../models/order');

/**
 * User Account Operations
 */

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
 */
exports.getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

/**
 * Update user account with email uniqueness validation
 * @param {string} userId - User ID to update
 * @param {Object} updateData - Data to update
 * @param {string} currentEmail - Current email being set
 * @returns {Promise<Object>} Updated user
 */
exports.updateUserAccount = async (userId, updateData, currentEmail) => {
  // Check if email is already in use by another user
  const existingUser = await User.findOne({
    email: currentEmail,
    _id: { $ne: userId },
  });

  if (existingUser) {
    throw new Error('Email already in use');
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error('User not found');
  }

  return updatedUser;
};

/**
 * Get user with wallet information
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object with wallet data
 */
exports.getUserWithWallet = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

/**
 * Address Management Operations
 */

/**
 * Get all addresses for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of address objects
 */
exports.getUserAddresses = async (userId) => {
  const addresses = await Address.find({ user: userId });
  return addresses;
};

/**
 * Get address details combined with user information
 * @param {string} addressId - Address ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Combined address and user details
 */
exports.getAddressWithUserDetails = async (addressId, userId) => {
  const user = await User.findById(userId);
  const address = await Address.findById(addressId);

  if (!user) {
    throw new Error('User not found');
  }

  if (!address) {
    throw new Error('Address not found');
  }

  return {
    name: user.firstName + user.lastName,
    mobile: user.mobile,
    location: address.location,
    city: address.city,
    state: address.state,
    landmark: address.landmark || '',
    zip: address.zip,
  };
};

/**
 * Create a new address for a user
 * @param {string} userId - User ID
 * @param {Object} addressData - Address data
 * @returns {Promise<Object>} Created address
 */
exports.createAddress = async (userId, addressData) => {
  const userAddresses = await Address.find({ user: userId });

  // If this is set as default, unset all other defaults
  if (addressData.isDefault === 'true' || addressData.isDefault === true) {
    await Address.updateMany({ user: userId }, { $set: { isDefault: false } });
  }

  const newAddress = new Address({
    user: userId,
    location: addressData.location,
    city: addressData.city,
    state: addressData.state,
    country: addressData.country,
    zip: addressData.zip,
    addressType: addressData.addressType,
    customName: addressData.customName,
    // First address is always default, or if explicitly set
    isDefault: userAddresses.length === 0 || addressData.isDefault,
  });

  await newAddress.save();

  // Add address to user's addresses array
  await User.findByIdAndUpdate(userId, {
    $push: { addresses: newAddress._id },
  });

  return newAddress;
};

/**
 * Update which address is the default
 * @param {string} newDefaultId - ID of address to set as default
 * @returns {Promise<Object>} Updated address
 */
exports.updateDefaultAddress = async (newDefaultId) => {
  // Unset all defaults
  await Address.updateMany({}, { $set: { isDefault: false } });

  // Set new default
  const updatedAddress = await Address.findByIdAndUpdate(
    newDefaultId,
    { $set: { isDefault: true } },
    { new: true }
  );

  if (!updatedAddress) {
    throw new Error('Address not found');
  }

  return updatedAddress;
};

/**
 * Get address by ID
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} Address object
 */
exports.getAddressById = async (addressId) => {
  const address = await Address.findById(addressId);
  if (!address) {
    throw new Error('Address not found');
  }
  return address;
};

/**
 * Update an existing address
 * @param {string} addressId - Address ID
 * @param {Object} addressData - Updated address data
 * @returns {Promise<Object>} Updated address
 */
exports.updateAddress = async (addressId, addressData) => {
  const updatedAddress = {
    customName: addressData.customName,
    addressType: addressData.addressType,
    location: addressData.location,
    city: addressData.city,
    state: addressData.state,
    zip: addressData.zip,
    country: addressData.country,
  };

  const result = await Address.findByIdAndUpdate(addressId, updatedAddress, {
    new: true,
  });

  if (!result) {
    throw new Error('Address not found');
  }

  return result;
};

/**
 * Delete an address
 * @param {string} addressId - Address ID
 * @returns {Promise<Object>} Deleted address
 */
exports.deleteAddress = async (addressId) => {
  const result = await Address.findByIdAndDelete(addressId);

  if (!result) {
    throw new Error('Address not found');
  }

  return result;
};

/**
 * Invoice Generation Operations
 */

/**
 * Generate PDF invoice for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Object containing order and PDF document
 */
exports.generateInvoicePDF = async (orderId) => {
  const order = await Order.findById(orderId).populate({
    path: 'orderItems',
    populate: 'product',
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Create a PDF document
  const doc = new PDFDocument({ margin: 50 });

  // Header
  doc.fillColor('#5a31a8').fontSize(26).text('INVOICE', { align: 'center' });
  doc.moveDown();
  doc
    .fillColor('#000')
    .fontSize(14)
    .text(`Invoice for Order ID: ${orderId}`, { align: 'center' });
  doc.moveDown(2);

  // Order details
  doc
    .fillColor('#333')
    .fontSize(12)
    .text(`Order Date: ${moment(order.dateOrdered).format('MMMM Do, YYYY')}`);
  doc.text(`Payment Method: ${order.paymentMethod}`);
  doc.text(`Total Amount: ${order.totalAmount}`);
  doc.text(`Discount Applied: ${order.discountApplied}`);
  doc.text(`Final Total: ${order.finalTotal}`);
  doc.moveDown();

  // Shipping Address
  doc
    .fillColor('#5a31a8')
    .fontSize(14)
    .text('Shipping Address:', { underline: true });
  doc.fillColor('#000').fontSize(12).text(`Name: ${order.name}`);
  doc.text(`Mobile: ${order.mobile}`);
  if (order.alternateMobile) {
    doc.text(`Alternate Mobile: ${order.alternateMobile}`);
  }
  doc.text(
    `Location: ${order.location}, ${order.city}, ${order.state} - ${order.zip}`
  );
  doc.moveDown();

  // Ordered Items Header
  doc
    .fillColor('#5a31a8')
    .fontSize(14)
    .text('Ordered Items:', { underline: true });
  doc.moveDown();

  // Table Header
  const tableTop = doc.y;
  doc.fillColor('#5a31a8').fontSize(12).text('Product', 50, tableTop);
  doc.text('Quantity', 300, tableTop);
  doc.text('Price', 450, tableTop);
  doc.moveDown(2);

  // Table Rows
  doc.fillColor('#000').fontSize(12);
  const rowHeight = 20; // Define a fixed height for the rows
  order.orderItems.forEach((item) => {
    const productDetails = item.product.name;
    const { quantity } = item;
    const { price } = item.product;

    // Move to a new y position for each row
    doc.text(productDetails, 50, doc.y); // Product name at x=50
    doc.text(quantity.toString(), 300, doc.y); // Quantity at x=300
    doc.text(`${price}`, 450, doc.y); // Price at x=450

    // Move the y position down for the next row
    doc.moveDown(rowHeight / 14); // Adjust the movement as necessary for spacing
  });

  // Finalize the PDF
  doc.moveDown(10);
  doc
    .fillColor('#5a31a8')
    .fontSize(12)
    .text('Thank you for your order!', { align: 'center' });

  return { order, pdfDoc: doc };
};
