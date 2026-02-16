const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection error', { error: error.message });
    throw error;
  }
};

module.exports = connectDB;
