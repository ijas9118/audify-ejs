const logger = require('../config/logger');

/**
 * Request logging middleware
 * Logs HTTP method, URL, status code, and response time
 * Skips static files (CSS, JS, images, fonts)
 */
const requestLogger = (req, res, next) => {
  // Skip logging for static files
  const staticFileExtensions = [
    '.css',
    '.js',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.ico',
    '.webp',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
  ];

  const isStaticFile = staticFileExtensions.some((ext) =>
    req.path.toLowerCase().endsWith(ext)
  );

  if (isStaticFile) {
    return next();
  }

  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;

    // Log with appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error(message);
    } else if (res.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });

  next();
};

module.exports = requestLogger;
