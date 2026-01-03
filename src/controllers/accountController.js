const moment = require('moment');
const PDFDocument = require('pdfkit');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const Address = require('../models/address');
const Order = require('../models/order');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

exports.getUserAccount = asyncHandler(async (req, res) => {
  const id = req.session.user;
  const user = await User.findById(id);

  res.render('layout', {
    title: 'My Audify Account',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/userAccount',
    activePage: 'Home',
    isAdmin: false,
    user,
  });
});

exports.updateUserAccount = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existingUser = await User.findOne({
    email,
    _id: { $ne: req.params.id },
  });
  if (existingUser) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: RESPONSE_MESSAGES.EMAIL_IN_USE });
  }

  const updatedUser = await User.findByIdAndUpdate(req.params.id, {
    $set: req.body,
  });

  if (!updatedUser) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ success: false, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
  }

  res
    .status(StatusCodes.OK)
    .json({ success: true, message: RESPONSE_MESSAGES.ACCOUNT_UPDATED });
});

exports.getAddresses = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const addresses = await Address.find({ user: userId });

  res.render('layout', {
    title: 'Manage Address',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/manageAddress',
    activePage: 'Home',
    isAdmin: false,
    addresses,
  });
});

exports.getAddressDetails = asyncHandler(async (req, res) => {
  const addressid = req.params.id;
  const userId = req.session.user;

  const user = await User.findById(userId);
  const address = await Address.findById(addressid);

  const result = {
    name: user.firstName + user.lastName,
    mobile: user.mobile,
    location: address.location,
    city: address.city,
    state: address.state,
    landmark: address.landmark || '',
    zip: address.zip,
  };
  res.status(StatusCodes.OK).json(result);
});

exports.addAddress = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const userAddresses = await Address.find({ user: userId });

  if (req.body.isDefault === 'true')
    await Address.updateMany({}, { $set: { isDefault: false } });

  const newAddress = new Address({
    user: userId,
    location: req.body.location,
    city: req.body.city,
    state: req.body.state,
    country: req.body.country,
    zip: req.body.zip,
    addressType: req.body.addressType,
    customName: req.body.customName,
    isDefault: userAddresses.length === 0 || req.body.isDefault,
  });

  await newAddress.save();

  await User.findByIdAndUpdate(userId, {
    $push: { addresses: newAddress._id },
  });

  res.redirect('/account/addresses');
});

exports.updateDefaultAddress = asyncHandler(async (req, res) => {
  const { newDefaultId } = req.body;

  try {
    await Address.updateMany({}, { $set: { isDefault: false } });

    await Address.findByIdAndUpdate(newDefaultId, {
      $set: { isDefault: true },
    });

    res.status(StatusCodes.OK).send(RESPONSE_MESSAGES.DEFAULT_ADDRESS_UPDATED);
  } catch (error) {
    console.error('Error updating default address:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(RESPONSE_MESSAGES.SERVER_ERROR);
  }
});

exports.editAddressPage = asyncHandler(async (req, res) => {
  const addressId = req.params.id;
  const address = await Address.findById(addressId);

  res.render('layout', {
    title: 'Edit Address',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/editAddress',
    activePage: 'Home',
    isAdmin: false,
    address,
  });
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const addressId = req.params.id;
  const updatedAddress = {
    customName: req.body.customName,
    addressType: req.body.addressType,
    location: req.body.location,
    city: req.body.city,
    state: req.body.state,
    zip: req.body.zip,
    country: req.body.country,
  };

  await Address.findByIdAndUpdate(addressId, updatedAddress);

  res.redirect('/account/addresses');
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const addressId = req.params.id;

  const result = await Address.findByIdAndDelete(addressId);

  if (!result) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .send(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
  }

  res.status(StatusCodes.OK).send(RESPONSE_MESSAGES.ADDRESS_DELETED);
});

exports.walletTransactions = asyncHandler(async (req, res) => {
  const userId = req.session.user;

  const user = await User.findById(userId);

  if (!user) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ success: false, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
  }

  res.render('layout', {
    title: 'My Audify Account',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/walletTransaction',
    activePage: 'Home',
    isAdmin: false,
    user,
  });
});

exports.downloadInvoice = async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Order.findById(orderId).populate({
      path: 'orderItems',
      populate: 'product',
    });

    if (!order) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
    }

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader(
      'Content-disposition',
      `attachment; filename=invoice-${orderId}.pdf`
    );
    res.setHeader('Content-type', 'application/pdf');

    // Pipe the PDF into the response
    doc.pipe(res);

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

    // Finalize the PDF and end the stream
    doc.moveDown(10);
    doc
      .fillColor('#5a31a8')
      .fontSize(12)
      .text('Thank you for your order!', { align: 'center' });
    doc.end();
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(RESPONSE_MESSAGES.SERVER_ERROR);
  }
};
