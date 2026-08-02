const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const webhookRoutes = require('./routes/webhook.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Stripe webhook needs the raw request body to verify the signature, so it
// must be mounted BEFORE express.json() strips it away and re-parses it.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/generate', require('./routes/generation.routes'));
app.use('/api/magic', require('./routes/magic.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/modules', require('./routes/module.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/gallery', require('./routes/gallery.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
