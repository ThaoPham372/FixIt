const Store = require('../models/Store');

exports.list = async (_req, res) => {
  const stores = await Store.find().sort({ totalRevenue: -1 }).lean();
  res.json(stores);
};

exports.create = async (req, res) => {
  const store = await Store.create(req.body);
  res.status(201).json(store);
};

