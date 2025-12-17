// Not Found Error
const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(`Not Found: ${req.originalUrl}`);
  next(error);
};


const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  if (statusCode === 404) {
    // Render the 404 page
    res.render('404', { title: '404 - Page Not Found', errorMessage: err.message });
  } else {
    // Render the 500 or other error page
    res.render('error', { title: '500 - Server Error', errorMessage: err.message, stack: process.env.NODE_ENV === 'production' ? null : err.stack });
  }
};

module.exports = { errorHandler, notFound };
