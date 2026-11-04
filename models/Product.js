const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    category: { type: String, default: 'Thời trang' },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 }, // đang đóng gói / chờ giao
    returnedInInspection: { type: Number, default: 0 }, // đang chờ kiểm tra hoàn
    image: { type: String, default: '' },
    returnRate: { type: Number, default: 0 }, // tỷ lệ %
    totalOrders: { type: Number, default: 0 },
    totalReturns: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['Thấp', 'Trung bình', 'Cao'], default: 'Thấp' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);

