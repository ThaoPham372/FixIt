const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');

const orderRoutes = require('./routes/orderRoutes');
const claimRoutes = require('./routes/claimRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const returnRoutes = require('./routes/returnRoutes');
const productRoutes = require('./routes/productRoutes');
const storeRoutes = require('./routes/storeRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const seedRoutes = require('./routes/seedRoutes');
const simulatorRoutes = require('./routes/simulatorRoutes');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    host: mongoose.connection.host || 'unknown',
  });
});

app.use('/api/orders', orderRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/simulator', simulatorRoutes);

app.use((err, _req, res, _next) => {
  const status =
    err.status ||
    (err.name === 'ValidationError'
      ? 400
      : err.name === 'MulterError'
      ? err.code === 'LIMIT_FILE_SIZE'
        ? 413
        : 400
      : 500);
  if (status >= 500) {
    console.error('Server error:', err);
  } else {
    console.warn(`Request error ${status}:`, err.message);
  }
  res.status(status).json({ error: err.message || 'Có lỗi máy chủ.' });
});

module.exports = app;
