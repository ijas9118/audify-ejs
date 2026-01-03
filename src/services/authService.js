const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.generateHash = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

exports.comparePassword = async (enteredPassword, storedPassword) =>
  bcrypt.compare(enteredPassword, storedPassword);

exports.findUserByEmail = async (email) => User.findOne({ email });

exports.createUser = async (userData) => {
  const user = new User(userData);
  return user.save();
};

exports.handleGoogleLogin = async (profile) => {
  let user = await User.findOne({ email: profile.email });

  if (!user) {
    const hashedPassword = await exports.generateHash('123456'); // Default password for Google users
    user = new User({
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email: profile.email,
      password: hashedPassword,
      status: 'Active',
      isGoogleUser: true,
    });
    await user.save();
  }
  return user;
};

exports.sendOtp = async (email) => {
  const otp = crypto.randomInt(100000, 999999);
  const otpExpiry = Date.now() + 5 * 60 * 1000;

  const mailOptions = {
    from: process.env.EMAIL_USER || 'ahammedijas9118@gmail.com', // Fallback for safety, but prefers env
    to: email,
    subject: 'Your OTP for Signup',
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
  return { otp, otpExpiry };
};

exports.updatePassword = async (userId, newPassword) => {
  const hashedPassword = await exports.generateHash(newPassword);
  return User.findByIdAndUpdate(userId, { password: hashedPassword });
};

exports.resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }
  const hashedPassword = await exports.generateHash(newPassword);
  return User.findByIdAndUpdate(user._id, { password: hashedPassword });
};
