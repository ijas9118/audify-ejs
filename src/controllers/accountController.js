const asyncHandler = require('express-async-handler');
const accountService = require('../services/accountService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

const getUserAccount = asyncHandler(async (req, res) => {
  const id = req.session.user;
  const user = await accountService.getUserById(id);

  res.render('layout', {
    title: 'My Audify Account',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/userAccount',
    activePage: 'Home',
    isAdmin: false,
    user,
  });
});

const updateUserAccount = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    await accountService.updateUserAccount(req.params.id, req.body, email);

    res
      .status(StatusCodes.OK)
      .json({ success: true, message: RESPONSE_MESSAGES.ACCOUNT_UPDATED });
  } catch (error) {
    if (error.message === 'Email already in use') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: RESPONSE_MESSAGES.EMAIL_IN_USE });
    }

    if (error.message === 'User not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
    }

    throw error;
  }
});

const getAddresses = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  const addresses = await accountService.getUserAddresses(userId);

  res.render('layout', {
    title: 'Manage Address',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/manageAddress',
    activePage: 'Home',
    isAdmin: false,
    addresses,
  });
});

const getAddressDetails = asyncHandler(async (req, res) => {
  const addressid = req.params.id;
  const userId = req.session.user;

  const result = await accountService.getAddressWithUserDetails(
    addressid,
    userId
  );
  res.status(StatusCodes.OK).json(result);
});

const addAddress = asyncHandler(async (req, res) => {
  const userId = req.session.user;
  await accountService.createAddress(userId, req.body);
  res.redirect('/account/addresses');
});

const updateDefaultAddress = asyncHandler(async (req, res) => {
  const { newDefaultId } = req.body;

  try {
    await accountService.updateDefaultAddress(newDefaultId);
    res.status(StatusCodes.OK).send(RESPONSE_MESSAGES.DEFAULT_ADDRESS_UPDATED);
  } catch (error) {
    console.error('Error updating default address:', error);

    if (error.message === 'Address not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
    }

    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(RESPONSE_MESSAGES.SERVER_ERROR);
  }
});

const editAddressPage = asyncHandler(async (req, res) => {
  const addressId = req.params.id;
  const address = await accountService.getAddressById(addressId);

  res.render('layout', {
    title: 'Edit Address',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/editAddress',
    activePage: 'Home',
    isAdmin: false,
    address,
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const addressId = req.params.id;
  await accountService.updateAddress(addressId, req.body);
  res.redirect('/account/addresses');
});

const deleteAddress = asyncHandler(async (req, res) => {
  const addressId = req.params.id;

  try {
    await accountService.deleteAddress(addressId);
    res.status(StatusCodes.OK).send(RESPONSE_MESSAGES.ADDRESS_DELETED);
  } catch (error) {
    if (error.message === 'Address not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ADDRESS_NOT_FOUND);
    }

    throw error;
  }
});

const walletTransactions = asyncHandler(async (req, res) => {
  const userId = req.session.user;

  try {
    const user = await accountService.getUserWithWallet(userId);

    res.render('layout', {
      title: 'My Audify Account',
      header: req.session.user ? 'partials/login_header' : 'partials/header',
      viewName: 'users/walletTransaction',
      activePage: 'Home',
      isAdmin: false,
      user,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
    }

    throw error;
  }
});

const downloadInvoice = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  try {
    const { pdfDoc } = await accountService.generateInvoicePDF(orderId);

    // Set response headers
    res.setHeader(
      'Content-disposition',
      `attachment; filename=invoice-${orderId}.pdf`
    );
    res.setHeader('Content-type', 'application/pdf');

    // Pipe the PDF into the response
    pdfDoc.pipe(res);

    // End the PDF stream
    pdfDoc.end();
  } catch (error) {
    console.error(error);

    if (error.message === 'Order not found') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .send(RESPONSE_MESSAGES.ORDER_NOT_FOUND);
    }

    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(RESPONSE_MESSAGES.SERVER_ERROR);
  }
});

module.exports = {
  getUserAccount,
  updateUserAccount,
  getAddresses,
  getAddressDetails,
  addAddress,
  updateDefaultAddress,
  editAddressPage,
  updateAddress,
  deleteAddress,
  walletTransactions,
  downloadInvoice,
};
