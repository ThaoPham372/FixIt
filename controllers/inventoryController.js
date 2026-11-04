const Product = require('../models/Product');
const Order = require('../models/Order');

exports.getStats = async (_req, res) => {
  const products = await Product.find().lean();
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalReserved = products.reduce((acc, p) => acc + (p.reserved || 0), 0);
  const totalInInspection = products.reduce((acc, p) => acc + (p.returnedInInspection || 0), 0);

  // Thống kê các đơn hàng hoàn đã nhập kho và đơn đang kiểm tra
  const ordersInInspection = await Order.find({ status: 'Đang kiểm tra hàng hoàn' }).lean();
  const ordersRestocked = await Order.find({ status: 'Hàng hoàn nguyên vẹn (Đã nhập kho)' }).lean();
  const ordersDisputed = await Order.find({ status: { $in: ['Đang khiếu nại sàn', 'Chờ người bán duyệt khiếu nại'] } }).lean();

  res.json({
    summary: {
      totalStock,
      totalReserved,
      totalInInspection,
      totalRestockedCount: ordersRestocked.length,
      totalDisputedCount: ordersDisputed.length,
    },
    products,
    recentRestocked: ordersRestocked.slice(0, 10),
    disputedOrders: ordersDisputed.slice(0, 10),
  });
};

