require('dotenv').config();

/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Fails fast with clear error messages if configuration is missing
 */

// Required environment variables with descriptions
const requiredEnvVars = {
  // Database
  MONGO_URI: 'MongoDB connection string',

  // Security
  SESSION_SECRET: 'Session encryption key (minimum 32 characters)',

  // Email Service (for OTP, notifications)
  EMAIL_USER: 'Email service username/address',
  EMAIL_PASS: 'Email service password/app password',

  // Cloudinary (Image Upload Service)
  CLOUDINARY_CLOUD_NAME: 'Cloudinary cloud name',
  CLOUDINARY_API_KEY: 'Cloudinary API key',
  CLOUDINARY_API_SECRET: 'Cloudinary API secret',

  // Google OAuth (Social Login)
  GOOGLE_CLIENT_ID: 'Google OAuth 2.0 client ID',
  GOOGLE_CLIENT_SECRET: 'Google OAuth 2.0 client secret',

  // Razorpay (Payment Gateway)
  RAZORPAY_KEY_ID: 'Razorpay key ID',
  RAZORPAY_SECRET: 'Razorpay secret key',
};

// Optional environment variables with defaults
const optionalEnvVars = {
  PORT: {
    default: 3000,
    description: 'Server port number',
  },
  NODE_ENV: {
    default: 'development',
    description: 'Environment mode (development/production)',
  },
};

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check for missing required variables
  const missingVars = Object.keys(requiredEnvVars).filter(
    (key) => !process.env[key]
  );

  if (missingVars.length > 0) {
    errors.push('\n❌ Missing required environment variables:\n');
    missingVars.forEach((key) => {
      errors.push(`   • ${key} - ${requiredEnvVars[key]}`);
    });
  }

  // Validate SESSION_SECRET minimum length
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    warnings.push(
      '\n⚠️  SESSION_SECRET should be at least 32 characters for security'
    );
  }

  // Validate PORT if provided
  if (process.env.PORT && Number.isNaN(parseInt(process.env.PORT, 10))) {
    warnings.push(
      `\n⚠️  PORT must be a valid number, got: ${process.env.PORT}. Using default: ${optionalEnvVars.PORT.default}`
    );
  }

  // Display errors and exit if any
  if (errors.length > 0) {
    console.error('\n═══════════════════════════════════════════════');
    console.error('   ENVIRONMENT CONFIGURATION ERROR');
    console.error('═══════════════════════════════════════════════');
    console.error(errors.join('\n'));
    console.error('\n💡 To fix this:');
    console.error('   1. Create a .env file in the project root');
    console.error('   2. Add the missing variables');
    console.error('   3. Restart the application\n');
    console.error('═══════════════════════════════════════════════\n');
    process.exit(1);
  }

  // Display warnings if any
  if (warnings.length > 0) {
    console.warn(warnings.join('\n'));
  }
}

// Run validation
validateEnvironment();

/**
 * Export validated configuration
 * Use this instead of accessing process.env directly
 */
module.exports = {
  // Database
  MONGO_URI: process.env.MONGO_URI,

  // Server
  PORT: parseInt(process.env.PORT, 10) || optionalEnvVars.PORT.default,
  NODE_ENV: process.env.NODE_ENV || optionalEnvVars.NODE_ENV.default,

  // Security
  SESSION_SECRET: process.env.SESSION_SECRET,

  // Email
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_SECRET: process.env.RAZORPAY_SECRET,
};
