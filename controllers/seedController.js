const { seedData } = require('../services/seedService');

exports.reset = async (_req, res) => {
  try {
    const result = await seedData(true);
    res.json({ ok: true, message: 'Đã nạp lại dữ liệu mẫu đầy đủ thành công!', result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

