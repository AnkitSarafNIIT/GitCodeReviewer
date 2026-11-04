'use strict';

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const apiRoutes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Security headers
app.use(helmet());

// HTTP request logging (uses "dev" format for concise coloured output)
app.use(morgan('dev'));

// Parse JSON bodies and capture the raw bytes so HMAC-SHA256 can be verified
// against the exact bytes GitHub signed (the `verify` callback runs before parsing).
app.use(
  express.json({
    limit: '1mb',
    verify(req, _res, buf) {
      req.rawBody = buf;
    },
  })
);

// Mount all API routes under /api
app.use('/api', apiRoutes);

// 404 for anything that didn't match
app.use(notFound);

// Central error handler (must be last)
app.use(errorHandler);

module.exports = app;
