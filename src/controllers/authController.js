const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.successGoogleLogin = async (req, res) => {
  if (!req.user) res.redirect('/failure');
  try {
    let user = await User.findOne({ email: req.user.email });

    if (!user) {
      user = new User({
        firstName: req.user.name.givenName,
        lastName: req.user.name.familyName,
        email: req.user.email,
        password: '123456',
        status: 'Active',
        isGoogleUser: true,
      });
      await user.save();
    }

    req.session.user = user;

    res.redirect('/');
  } catch (error) {
    console.error('Error during Google login: ', error);
    res.redirect('/login');
  }
};

exports.failureGoogleLogin = (req, res) => {
  res.send('Error');
};

exports.sendOtp = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const findUser = await User.findOne({ email });

  if (!findUser) {
    const otp = crypto.randomInt(100000, 999999);
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    req.session.otp = otp;
    req.session.otpExpiry = otpExpiry;
    req.session.tempUser = { firstName, lastName, email, password };

    const mailOptions = {
      from: 'ahammedijas9118@gmail.com',
      to: email,
      subject: 'Your OTP for Signup',
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.render('layout', {
        title: 'Verify OTP',
        header: 'partials/header',
        viewName: 'users/verifyOtp',
        error: null,
        isAdmin: false,
        activePage: 'home',
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error sending OTP' });
    }
  } else {
    throw new Error('User Already Exists');
  }
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.session.tempUser; // Fetch tempUser from session
  if (!email) {
    return res
      .status(400)
      .json({ error: 'No user data in session. Please sign up again.' });
  }

  // Generate new OTP and update session
  const otp = crypto.randomInt(100000, 999999);
  const otpExpiry = Date.now() + 5 * 60 * 1000;

  req.session.otp = otp;
  req.session.otpExpiry = otpExpiry;

  const mailOptions = {
    from: 'ahammedijas9118@gmail.com',
    to: email,
    subject: 'Your OTP for Signup',
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'New OTP sent successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

exports.verifyAndSignUp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (req.session.otp && req.session.otpExpiry > Date.now()) {
    if (req.session.otp === otp) {
      const { firstName, lastName, email, password } = req.session.tempUser;

      const newUser = new User({
        firstName,
        lastName,
        email,
        password,
      });

      await newUser.save();

      req.session.otp = null;
      req.session.otpExpiry = null;
      req.session.tempUser = null;

      req.session.user = newUser._id;
      res.redirect('/');
    } else {
      res.render('layout', {
        title: 'Verify OTP',
        header: 'partials/header',
        viewName: 'users/verifyOtp',
        error: 'Invalid OTP',
        isAdmin: false,
        activePage: 'home',
      });
    }
  } else {
    res.render('layout', {
      title: 'Verify OTP',
      header: 'partials/header',
      viewName: 'users/verifyOtp',
      error: 'OTP has expired. Please sign up again.',
      isAdmin: false,
      activePage: 'home',
    });
  }
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findUser = await User.findOne({ email });

  if (
    findUser &&
    (await findUser.isPasswordMatched(password)) &&
    findUser.status === 'Active'
  ) {
    req.session.user = findUser._id;
    res.status(200).json({
      success: true,
      message: 'Login successful',
      redirectUrl: '/',
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid Credentials',
    });
  }
});

exports.logoutUser = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to log out' });
    }
    res.redirect('/login');
  });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.session.user;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const { email } = req.session; // Assuming user ID is stored in session

  // Check if user is authenticated
  if (!email) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  // Check if passwords match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const user = await User.find({ email });
    const userId = user[0]._id;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
