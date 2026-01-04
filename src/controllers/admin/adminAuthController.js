const asyncHandler = require('express-async-handler');
const Admin = require('../../models/adminModel');
const { StatusCodes, RESPONSE_MESSAGES } = require('../../constants/constants');

// ============================
//  Admin Authentication Controllers
// ============================

// Render Admin Login Page
const getAdminLogin = asyncHandler(async (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin');
  }
  res.render('admin/adminLogin', { title: 'Admin Login' });
});

// Handle Admin Login
const loginAdmin = asyncHandler(async (req, res) => {
  const { user, password } = req.body;
  const findAdmin = await Admin.findOne({ user });

  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    req.session.admin = findAdmin._id;

    res.redirect('/admin');
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_CREDENTIALS);
  }
});

// Render Admin Home Page (Dashboard)
const getAdminHome = asyncHandler(async (req, res) => {
  res.render('layout', {
    title: 'Audify',
    viewName: 'admin/adminHome',
    activePage: 'dashboard',
    isAdmin: true,
  });
});

// Handle Admin Logout
const logoutAdmin = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: RESPONSE_MESSAGES.FAILED_TO_LOGOUT });
    }
    res.redirect('/admin/login');
  });
});

module.exports = {
  getAdminLogin,
  loginAdmin,
  getAdminHome,
  logoutAdmin,
};
