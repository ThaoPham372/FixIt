const Product = require('../models/Product');

exports.list = async (_req, res) => {
  const products = await Product.find().sort({ totalReturns: -1 }).lean();
  res.json(products);
};

exports.create = async (req, res) => {
  const { sku, name, category, price, stock } = req.body || {};
  if (!sku || !name) return res.status(400).json({ error: 'Mã SKU và Tên sản phẩm là bắt buộc.' });
  const p = await Product.create({ sku, name, category, price, stock });
  res.status(201).json(p);
};

