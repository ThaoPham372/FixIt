const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  kind: { type: String, enum: ['packing', 'return', 'photo'], required: true },
  filename: { type: String, required: true },
  originalName: String,
  mimeType: String,
  size: Number,
  note: String,
  gridFsId: { type: mongoose.Schema.Types.ObjectId, default: null },
  storageType: { type: String, default: 'gridfs' },
  recordedAt: { type: Date, default: Date.now },
});

const differenceSchema = new mongoose.Schema(
  {
    description: String,
    packingTimestamp: String,
    returnTimestamp: String,
    confidence: String,
    evidence: String,
  },
  { _id: true }
);

const analysisSchema = new mongoose.Schema(
  {
    summary: String,
    differences: [differenceSchema],
    limitations: String,
    provider: String,
    analyzedAt: Date,
  },
  { _id: false }
);

const timelineSchema = new mongoose.Schema(
  {
    time: { type: Date, default: Date.now },
    title: { type: String, required: true },
    description: String,
    actor: { type: String, default: 'Hệ thống' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, index: true },
    trackingCode: { type: String, trim: true, index: true },
    returnTrackingCode: { type: String, trim: true, index: true },
    channel: { type: String, enum: ['TikTok Shop', 'Shopee', 'Khác'], default: 'Khác' },
    product: { type: String, required: true },
    sku: String,
    quantity: { type: Number, default: 1 },
    total: { type: Number, default: 0 },
    customerName: { type: String, default: 'Khách hàng' },
    customerPhone: { type: String, default: '098***' },
    status: {
      type: String,
      default: 'Chờ xác nhận',
      enum: [
        'Chờ xác nhận',
        'Chờ đóng gói',
        'Đã đóng gói',
        'Đang giao hàng',
        'Đang hoàn về',
        'Đang kiểm tra hàng hoàn',
        'Chờ người bán duyệt khiếu nại',
        'Đang khiếu nại sàn',
        'Đã giải quyết - Hoàn tiền',
        'Khiếu nại bị từ chối',
        'Hàng hoàn nguyên vẹn (Đã nhập kho)',
      ],
    },
    returnReason: String,
    returnDeadline: Date,
    evidence: [evidenceSchema],
    aiAnalysis: analysisSchema,
    timeline: [timelineSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
