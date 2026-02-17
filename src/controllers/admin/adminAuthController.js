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
  return res.render('admin/adminLogin', {
    title: 'Admin Login',
    errors: {},
    formData: {},
    authError: null,
  });
});

// Handle Admin Login
const loginAdmin = asyncHandler(async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();
  const errors = {};

  if (!username) {
    errors.username = 'Username is required';
  }
  if (!password) {
    errors.password = 'Password is required';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).render('admin/adminLogin', {
      title: 'Admin Login',
      errors,
      formData: { username },
      authError: null,
    });
  }

  const findAdmin = await Admin.findOne({ username });

  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    req.session.admin = findAdmin._id;

    return res.redirect('/admin');
  }

  return res.status(StatusCodes.UNAUTHORIZED).render('admin/adminLogin', {
    title: 'Admin Login',
    errors: {},
    formData: { username },
    authError: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
  });
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
    return res.redirect('/admin/login');
  });
});

module.exports = {
  getAdminLogin,
  loginAdmin,
  getAdminHome,
  logoutAdmin,
};
