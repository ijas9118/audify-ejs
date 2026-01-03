const { StatusCodes, RESPONSE_MESSAGES } = require('../constants/constants');

// Not Found Error
const notFound = (req, res, next) => {
  const error = new Error(`Not Found: ${req.originalUrl}`);
  res.status(StatusCodes.NOT_FOUND);
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode =
    res.statusCode === StatusCodes.OK
      ? StatusCodes.INTERNAL_SERVER_ERROR
      : res.statusCode;
  res.status(statusCode);

  if (statusCode === StatusCodes.NOT_FOUND) {
    // Render the 404 page
    res.render('404', {
      title: '404 - Page Not Found',
      errorMessage: err.message,
    });
  } else {
    // Render the 500 or other error page
    res.render('error', {
      title: '500 - Server Error',
      errorMessage: err.message || RESPONSE_MESSAGES.SERVER_ERROR,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
  }
};

module.exports = { errorHandler, notFound };
