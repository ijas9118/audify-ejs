const asyncHandler = require('express-async-handler');
const authService = require('../services/authService');

exports.successGoogleLogin = async (req, res) => {
  if (!req.user) res.redirect('/failure');
  try {
    const user = await authService.handleGoogleLogin(req.user);
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
  const findUser = await authService.findUserByEmail(email);

  if (!findUser) {
    // Generate Hash for password BEFORE storing in session
    // This fixes the security issue of plain text password in session
    const hashedPassword = await authService.generateHash(password);

    const { otp, otpExpiry } = await authService.sendOtp(email);

    req.session.otp = otp;
    req.session.otpExpiry = otpExpiry;
    // Store HASHED password in session
    req.session.tempUser = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
    };

    res.render('layout', {
      title: 'Verify OTP',
      header: 'partials/header',
      viewName: 'users/verifyOtp',
      error: null,
      isAdmin: false,
      activePage: 'home',
    });
  } else {
    throw new Error('User Already Exists');
  }
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.session.tempUser;
  if (!email) {
    return res
      .status(400)
      .json({ error: 'No user data in session. Please sign up again.' });
  }

  const { otp, otpExpiry } = await authService.sendOtp(email);

  req.session.otp = otp;
  req.session.otpExpiry = otpExpiry;

  res.json({ message: 'New OTP sent successfully!' });
});

exports.verifyAndSignUp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (req.session.otp && req.session.otpExpiry > Date.now()) {
    if (Number(req.session.otp) === Number(otp)) {
      const { firstName, lastName, email, password } = req.session.tempUser;

      // Password is ALREADY HASHED from sendOtp step
      const newUser = await authService.createUser({
        firstName,
        lastName,
        email,
        password, // This is hashed
      });

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
  const findUser = await authService.findUserByEmail(email);

  if (
    findUser &&
    (await authService.comparePassword(password, findUser.password)) &&
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
    await authService.updatePassword(userId, newPassword);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const { email } = req.session;

  if (!email) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    await authService.resetPassword(email, newPassword);
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
