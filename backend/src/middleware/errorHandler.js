'use strict';

/**
 * 404 handler – must be registered after all routes.
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Global error handler – must be the last middleware (4 args).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  console.error('Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Postgres constraint violations
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'A record with that value already exists',
      detail: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced record does not exist',
      detail: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  if (err.code === '23502') {
    return res.status(400).json({
      success: false,
      error: 'Required field is missing',
      detail: process.env.NODE_ENV === 'development' ? err.detail : undefined,
    });
  }

  // JWT errors (shouldn't reach here normally, but defensive)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }

  // Validation errors from express-validator or similar
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Default
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: statusCode === 500
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
