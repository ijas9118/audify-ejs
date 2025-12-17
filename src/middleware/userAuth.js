const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const userAuth = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.session.user);
  if (!req.session.user || user.status === "Inactive") {
    res.redirect('/login');
  } else {
    next();
  }
});

module.exports = userAuth;
