const asyncHandler = require('express-async-handler');
const authService = require('../services/authService');
const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

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
    throw new Error(RESPONSE_MESSAGES.USER_ALREADY_EXISTS);
  }
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.session.tempUser;
  if (!email) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: RESPONSE_MESSAGES.NO_SESSION_DATA });
  }

  const { otp, otpExpiry } = await authService.sendOtp(email);

  req.session.otp = otp;
  req.session.otpExpiry = otpExpiry;

  res.json({ message: RESPONSE_MESSAGES.OTP_RESENT });
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
        error: RESPONSE_MESSAGES.INVALID_OTP,
        isAdmin: false,
        activePage: 'home',
      });
    }
  } else {
    res.render('layout', {
      title: 'Verify OTP',
      header: 'partials/header',
      viewName: 'users/verifyOtp',
      error: RESPONSE_MESSAGES.OTP_EXPIRED,
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
    res.status(StatusCodes.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.LOGIN_SUCCESS,
      redirectUrl: '/',
    });
  } else {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
    });
  }
});

exports.logoutUser = asyncHandler(async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: 'Failed to log out' });
    }
    res.redirect('/login');
  });
});

exports.updatePassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.session.user;

  try {
    await authService.updatePassword(userId, newPassword);
    res
      .status(StatusCodes.OK)
      .json({ message: RESPONSE_MESSAGES.PASSWORD_UPDATE_SUCCESS });
  } catch (error) {
    console.error('Error updating password:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: RESPONSE_MESSAGES.SERVER_ERROR });
  }
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const { email } = req.session;

  if (!email) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ error: RESPONSE_MESSAGES.UNAUTHORIZED });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: RESPONSE_MESSAGES.PASSWORD_MISMATCH });
  }

  try {
    await authService.resetPassword(email, newPassword);
    res
      .status(StatusCodes.OK)
      .json({ message: RESPONSE_MESSAGES.PASSWORD_UPDATE_SUCCESS });
  } catch (error) {
    console.error('Error updating password:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: RESPONSE_MESSAGES.SERVER_ERROR });
  }
});
