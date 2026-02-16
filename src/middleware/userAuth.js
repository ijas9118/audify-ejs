const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const { RESPONSE_MESSAGES } = require('../constants/constants');

const destroySession = (req) =>
  new Promise((resolve) => {
    if (!req.session) {
      resolve();
      return;
    }

    req.session.destroy(() => resolve());
  });

const respondUnauthorized = (req, res, message) => {
  const acceptsJson =
    req.xhr ||
    req.get('accept')?.includes('application/json') ||
    req.get('sec-fetch-mode') === 'cors';

  if (acceptsJson) {
    return res.status(401).json({
      success: false,
      message,
      redirectUrl: '/login',
    });
  }

  return res.redirect('/login');
};

const userAuth = asyncHandler(async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return respondUnauthorized(req, res, RESPONSE_MESSAGES.UNAUTHORIZED);
  }

  let user = req.authUser || null;
  if (!user) {
    try {
      user = await User.findById(req.session.user).select('_id status').lean();
    } catch (error) {
      user = null;
    }
  }

  if (!user || user.status !== 'Active') {
    await destroySession(req);
    res.clearCookie('connect.sid');
    return respondUnauthorized(req, res, RESPONSE_MESSAGES.ACCOUNT_BLOCKED);
  }

  req.authUser = user;
  return next();
});

module.exports = userAuth;
