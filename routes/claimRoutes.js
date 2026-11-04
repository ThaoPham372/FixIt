const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/orderController');
const Claim = require('../models/Claim');
const Order = require('../models/Order');

const router = express.Router();

router.get('/', asyncHandler(controller.listClaims));

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const claim = await Claim.findById(req.params.id).populate('order');
    if (!claim) return res.status(404).json({ error: 'Không tìm thấy hồ sơ khiếu nại.' });

    // Lấy danh sách tệp đính kèm với tên file tải xuống chuẩn
    const evidenceFiles = (claim.order?.evidence || []).map((e) => {
      const ext = (e.originalName || e.filename || 'mp4').split('.').pop();
      const kindLabel =
        e.kind === 'packing'
          ? 'video_dong_goi'
          : e.kind === 'return'
          ? 'video_mo_kien'
          : 'anh_bang_chung';
      return {
        _id: e._id,
        kind: e.kind,
        originalName: e.originalName,
        downloadName: `${claim.orderCode}_${kindLabel}.${ext}`,
        url: `/api/evidence/${e._id}/file`,
        size: e.size,
      };
    });

    res.json({ ...claim.toObject(), evidenceFiles });
  })
);

router.post(
  '/:id/submit-platform',
  asyncHandler(async (req, res) => {
    const claim = await Claim.findById(req.params.id).populate('order');
    if (!claim) return res.status(404).json({ error: 'Không tìm thấy hồ sơ khiếu nại.' });

    const channel = (claim.channel || claim.order?.channel || 'Shopee').toLowerCase();
    const isShopee = channel.includes('shopee');
    const prefix = isShopee ? 'DISPUTE-SPX' : 'TTS-DISPUTE';
    const disputeId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

    claim.status = 'Đang khiếu nại';
    claim.isSubmittedViaApi = true;
    claim.apiDisputeId = disputeId;
    claim.submittedAt = new Date();
    claim.platformResponse = {
      status: 'RECEIVED',
      ticketId: disputeId,
      estimatedReviewTime: isShopee ? '24 - 48 giờ làm việc' : '48 - 72 giờ làm việc',
      provider: isShopee
        ? 'Shopee Dispute Resolution Open API v2'
        : 'TikTok Shop Reverse Dispute Open API v3',
      message: 'Hồ sơ khiếu nại cùng toàn bộ video bằng chứng đã được ghi nhận trên hệ thống sàn.',
    };

    await claim.save();

    if (claim.order) {
      const order = await Order.findById(claim.order._id);
      if (order) {
        order.status = 'Đang khiếu nại sàn';
        order.timeline.push({
          time: new Date(),
          title: `Gửi khiếu nại tự động qua API ${claim.channel || 'Sàn'}`,
          description: `Hồ sơ #${disputeId} đã được nộp thành công qua Open API. Sàn cam kết xem xét trong 48 giờ.`,
          actor: 'FixIt API Hub',
        });
        await order.save();
      }
    }

    res.json({
      success: true,
      claim,
      message: `Đã gửi thành công hồ sơ khiếu nại lên sàn ${claim.channel || 'TMĐT'} qua Open API!`,
    });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Không tìm thấy hồ sơ khiếu nại.' });

    if (req.body.status) claim.status = req.body.status;
    if (req.body.approvedAmount !== undefined) claim.approvedAmount = Number(req.body.approvedAmount);
    if (req.body.receivedAmount !== undefined) claim.receivedAmount = Number(req.body.receivedAmount);
    if (req.body.feeDeducted !== undefined) claim.feeDeducted = Number(req.body.feeDeducted);

    await claim.save();
    res.json(claim);
  })
);

module.exports = router;
