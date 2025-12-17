const express = require("express");
const router = express.Router();
const userAuth = require("../middleware/userAuth");
const passport = require("passport");
const User = require('../models/userModel.js')
require('../services/passport.js')

const {
  sendOtp,
  loginUser,
  logoutUser,
  verifyAndSignUp,
  resendOtp,
  successGoogleLogin,
  failureGoogleLogin,
  resetPassword,
} = require("../controllers/userController");

router.use(passport.initialize()); 
router.use(passport.session());

// Google OAuth routes
router.get('/auth/google' , passport.authenticate('google', { scope: 
	[ 'email', 'profile' ] 
})); 

// Auth Callback 
router.get('/auth/google/callback', 
	passport.authenticate( 'google', { 
		successRedirect: '/success', 
		failureRedirect: '/failure'
}));

// Success 
router.get('/success' , successGoogleLogin); 

// failure 
router.get('/failure' , failureGoogleLogin);

router.get("/", (req, res) => {
  res.render("layout", {
    title: "Audify",
    header: req.session.user ? "partials/login_header" : "partials/header",
    viewName: "users/home",
    activePage: "home",
    isAdmin: false,
  });
});

router.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("layout", {
    title: "Sign Up",
    header: "partials/header",
    viewName: "users/signup",
    activePage: "home",
    isAdmin: false,
  });
});

router.post("/signup", sendOtp);

router.get("/signup/resend-otp", resendOtp);

router.post("/verify-otp", verifyAndSignUp);

router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("layout", {
    title: "Login",
    header: "partials/header",
    viewName: "users/login",
    activePage: "home",
    isAdmin: false,
  });
});

router.post("/login", loginUser);

router.get('/login/forgot-password', (req, res) => {
  res.render("layout", {
    title: "Login",
    header: "partials/header",
    viewName: "users/forgotPassword",
    activePage: "home",
    isAdmin: false,
  });
});

router.post('/login/reset-password', resetPassword)

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  req.session.email = email;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('Email not found');
    }
    
    res.render("layout", {
      title: "Login",
      header: "partials/header",
      viewName: "users/resetPassword",
      activePage: "home",
      isAdmin: false,
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post("/logout", userAuth, logoutUser);

module.exports = router;
