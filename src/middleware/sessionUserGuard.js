const User = require('../models/userModel');

const destroyUserSession = (req) =>
  new Promise((resolve) => {
    if (!req.session) {
      resolve();
      return;
    }

    req.session.destroy(() => {
      resolve();
    });
  });

const sessionUserGuard = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    next();
    return;
  }

  let user = null;

  try {
    user = await User.findById(req.session.user).select('_id status').lean();
  } catch (error) {
    user = null;
  }

  if (!user || user.status !== 'Active') {
    await destroyUserSession(req);
    res.clearCookie('connect.sid');
    next();
    return;
  }

  req.authUser = user;
  next();
};

module.exports = sessionUserGuard;
