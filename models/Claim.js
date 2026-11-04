const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderCode: { type: String, required: true },
    channel: { type: String, default: 'Shopee' },
    trackingCode: String,
    returnTrackingCode: String,
    reason: { type: String, required: true },
    description: String,
    differences: [String],
    evidenceIds: [mongoose.Schema.Types.ObjectId],
    evidenceStrength: {
      type: String,
      enum: ['Mạnh nhất', 'Mạnh', 'Vừa', 'Yếu'],
      default: 'Mạnh',
    },
    status: {
      type: String,
      enum: ['Bản nháp', 'Chờ gửi sàn', 'Đang khiếu nại', 'Đã bồi hoàn', 'Bị từ chối', 'Đã đóng'],
      default: 'Bản nháp',
    },
    claimAmount: { type: Number, default: 0 },
    approvedAmount: { type: Number, default: 0 },
    receivedAmount: { type: Number, default: 0 },
    feeDeducted: { type: Number, default: 0 },
    deadline: Date,
    claimTemplateText: String,
    notes: String,
    // Tích hợp API Sàn TMĐT
    isSubmittedViaApi: { type: Boolean, default: false },
    apiDisputeId: String,
    submittedAt: Date,
    platformResponse: {
      status: String,
      ticketId: String,
      estimatedReviewTime: String,
      provider: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Claim || mongoose.model('Claim', claimSchema);
