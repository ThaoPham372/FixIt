const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    platform: { type: String, enum: ['TikTok Shop', 'Shopee', 'Lazada'], default: 'Shopee' },
    shopType: { type: String, default: 'Shop Mall' }, // 'Shop Mall' | 'Shop Yêu Thích' | 'Shop Thường'
    status: { type: String, enum: ['Đang kết nối', 'Mất kết nối', 'Cần xác thực lại'], default: 'Đang kết nối' },
    activeOrders: { type: Number, default: 0 },
    returnRate: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
    lastSync: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Store || mongoose.model('Store', storeSchema);

