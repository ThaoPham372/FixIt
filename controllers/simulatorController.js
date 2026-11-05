const Claim = require('../models/Claim');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');

// Lấy hoặc khởi tạo ví của shop
async function getOrCreateWallet() {
  let wallet = await Wallet.findOne({ shopCode: 'MINH-AN-SHOP' });
  if (!wallet) {
    wallet = await Wallet.create({
      shopCode: 'MINH-AN-SHOP',
      shopName: 'Shop Minh An',
      balance: 15420000,
      totalCompensated: 420000,
      transactions: [
        {
          date: new Date(Date.now() - 30 * 3600 * 1000),
          orderCode: 'FX-1032',
          amount: 420000,
          type: 'compensation',
          title: 'Tiền bồi hoàn đơn #FX-1032',
          note: 'TikTok Shop bồi hoàn 100% do khách trả vỏ hộp rỗng',
          channel: 'TikTok Shop',
        },
      ],
    });
  }
  return wallet;
}

exports.getWallet = async (_req, res) => {
  const wallet = await getOrCreateWallet();
  res.json(wallet);
};

exports.getSimulatorClaims = async (req, res) => {
  const claims = await Claim.find()
    .populate('order')
    .sort({ createdAt: -1 })
    .lean();

  const wallet = await getOrCreateWallet();

  const totalSubmitted = claims.length;
  const pendingReview = claims.filter((c) =>
    ['Đang khiếu nại', 'Chờ gửi sàn', 'Bản nháp'].includes(c.status)
  ).length;
  const approvedCount = claims.filter((c) => c.status === 'Đã bồi hoàn').length;
  const rejectedCount = claims.filter((c) => c.status === 'Bị từ chối').length;

  const totalCompensated = claims.reduce((s, c) => s + (c.receivedAmount || 0), 0);
  const approvalRate =
    approvedCount + rejectedCount > 0
      ? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100)
      : 85;

  res.json({
    claims,
    stats: {
      totalSubmitted,
      pendingReview,
      approvedCount,
      rejectedCount,
      totalCompensated,
      approvalRate,
      walletBalance: wallet.balance,
    },
  });
};

exports.resolveClaim = async (req, res) => {
  const { claimId, action, approvedAmount, rejectionReason, note } = req.body || {};

  const claim = await Claim.findById(claimId).populate('order');
  if (!claim) {
    return res.status(404).json({ error: 'Không tìm thấy hồ sơ khiếu nại.' });
  }

  const wallet = await getOrCreateWallet();
  const channelName = claim.channel || claim.order?.channel || 'Shopee';

  if (action === 'approve') {
    const finalAmount = Number(approvedAmount) || claim.claimAmount || 0;

    claim.status = 'Đã bồi hoàn';
    claim.approvedAmount = finalAmount;
    claim.receivedAmount = finalAmount;
    claim.feeDeducted = 0;
    claim.notes = note || `Trọng tài ${channelName} phê duyệt bồi hoàn 100% cho người bán dựa trên bằng chứng video đối soát.`;

    // Cộng tiền vào Ví người bán
    wallet.balance += finalAmount;
    wallet.totalCompensated += finalAmount;
    wallet.transactions.unshift({
      date: new Date(),
      orderCode: claim.orderCode,
      amount: finalAmount,
      type: 'compensation',
      title: `Tiền bồi hoàn đơn #${claim.orderCode}`,
      note: `Sàn ${channelName} chấp thuận khiếu nại #${claim.apiDisputeId || claim._id}. Đã hoàn tiền vào ví.`,
      channel: channelName,
    });
    await wallet.save();

    // Cập nhật trạng thái đơn hàng
    if (claim.order) {
      const order = await Order.findById(claim.order._id);
      if (order) {
        order.status = 'Đã giải quyết - Hoàn tiền';
        order.timeline.push({
          time: new Date(),
          title: `Sàn ${channelName} phê duyệt bồi hoàn`,
          description: `Chấp thuận bồi hoàn số tiền ${finalAmount.toLocaleString('vi-VN')}đ vào Số dư Ví Người Bán.`,
          actor: `${channelName} Dispute Center`,
        });
        await order.save();
      }
    }

    await claim.save();

    return res.json({
      success: true,
      action: 'approve',
      message: `Đã phê duyệt bồi hoàn và chuyển ${finalAmount.toLocaleString('vi-VN')}đ vào Ví Người Bán!`,
      claim,
      wallet,
    });
  } else if (action === 'reject') {
    const reasonText = rejectionReason || note || 'Bằng chứng video không đủ 6 mặt kiện hàng theo quy định của sàn';

    claim.status = 'Bị từ chối';
    claim.approvedAmount = 0;
    claim.receivedAmount = 0;
    claim.notes = reasonText;

    // Cập nhật trạng thái đơn hàng
    if (claim.order) {
      const order = await Order.findById(claim.order._id);
      if (order) {
        order.status = 'Khiếu nại bị từ chối';
        order.timeline.push({
          time: new Date(),
          title: `Sàn ${channelName} từ chối bồi hoàn`,
          description: `Lý do từ chối: ${reasonText}`,
          actor: `${channelName} Dispute Center`,
        });
        await order.save();
      }
    }

    await claim.save();

    return res.json({
      success: true,
      action: 'reject',
      message: `Đã từ chối khiếu nại đơn #${claim.orderCode}. Lý do: ${reasonText}`,
      claim,
      wallet,
    });
  }

  return res.status(400).json({ error: 'Hành động không hợp lệ (chỉ nhận "approve" hoặc "reject").' });
};

