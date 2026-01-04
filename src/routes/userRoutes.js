const express = require('express');

const router = express.Router();
const passport = require('passport');
const userAuth = require('../middleware/userAuth');
const User = require('../models/userModel');
const authController = require('../controllers/authController');
const {
  signupValidation,
  loginValidation,
  validate,
} = require('../middleware/validators/authValidator');
const { authLimiter } = require('../middleware/rateLimiter');
require('../services/passport');

router.use(passport.initialize());
router.use(passport.session());

// Google OAuth routes
router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['email', 'profile'],
  })
);

// Auth Callback
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/success',
    failureRedirect: '/failure',
  })
);

// Success
router.get('/success', authController.successGoogleLogin);

// failure
router.get('/failure', authController.failureGoogleLogin);

router.get('/', (req, res) => {
  res.render('layout', {
    title: 'Audify',
    header: req.session.user ? 'partials/login_header' : 'partials/header',
    viewName: 'users/home',
    activePage: 'home',
    isAdmin: false,
  });
});

router.get('/signup', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('layout', {
    title: 'Sign Up',
    header: 'partials/header',
    viewName: 'users/signup',
    activePage: 'home',
    isAdmin: false,
  });
});

router.post(
  '/signup',
  authLimiter,
  signupValidation,
  validate,
  authController.sendOtp
);

router.get('/signup/resend-otp', authController.resendOtp);

router.post('/verify-otp', authLimiter, authController.verifyAndSignUp);

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('layout', {
    title: 'Login',
    header: 'partials/header',
    viewName: 'users/login',
    activePage: 'home',
    isAdmin: false,
  });
});

router.post(
  '/login',
  authLimiter,
  loginValidation,
  validate,
  authController.loginUser
);

router.get('/login/forgot-password', (req, res) => {
  res.render('layout', {
    title: 'Login',
    header: 'partials/header',
    viewName: 'users/forgotPassword',
    activePage: 'home',
    isAdmin: false,
  });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  req.session.email = email;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('Email not found');
    }

    res.render('layout', {
      title: 'Login',
      header: 'partials/header',
      viewName: 'users/resetPassword',
      activePage: 'home',
      isAdmin: false,
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/login/reset-password', authLimiter, authController.resetPassword);

router.post('/logout', userAuth, authController.logoutUser);

module.exports = router;
