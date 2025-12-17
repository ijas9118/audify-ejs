const asyncHandler = require('express-async-handler');

const adminAuth = asyncHandler(async (req, res, next) => {
  if (!req.session.admin) {
    res.redirect('/admin/login');
  } else {
    next();
  }
});

module.exports = adminAuth;
