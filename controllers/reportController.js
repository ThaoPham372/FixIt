const Claim = require('../models/Claim');
const Order = require('../models/Order');

exports.getReports = async (_req, res) => {
  const claims = await Claim.find().lean();
  const orders = await Order.find().lean();

  const totalClaimAmount = claims.reduce((acc, c) => acc + (c.claimAmount || 0), 0);
  const totalApprovedAmount = claims.reduce((acc, c) => acc + (c.approvedAmount || 0), 0);
  const totalReceivedAmount = claims.reduce((acc, c) => acc + (c.receivedAmount || 0), 0);
  const totalFeeDeducted = claims.reduce((acc, c) => acc + (c.feeDeducted || 0), 0);

  const resolvedClaims = claims.filter((c) => ['Đã bồi hoàn', 'Bị từ chối'].includes(c.status));
  const wonClaims = claims.filter((c) => c.status === 'Đã bồi hoàn');
  const winRate = resolvedClaims.length ? Math.round((wonClaims.length / resolvedClaims.length) * 100) : 85;

  // Thống kê theo sàn
  const byChannel = {
    Shopee: { orders: 0, returns: 0, claims: 0, recovered: 0 },
    'TikTok Shop': { orders: 0, returns: 0, claims: 0, recovered: 0 },
  };

  orders.forEach((o) => {
    const ch = o.channel === 'TikTok Shop' ? 'TikTok Shop' : 'Shopee';
    if (!byChannel[ch]) byChannel[ch] = { orders: 0, returns: 0, claims: 0, recovered: 0 };
    byChannel[ch].orders++;
    if (o.returnReason || o.status.includes('hoàn')) byChannel[ch].returns++;
  });

  claims.forEach((c) => {
    const ch = c.channel === 'TikTok Shop' ? 'TikTok Shop' : 'Shopee';
    if (byChannel[ch]) {
      byChannel[ch].claims++;
      byChannel[ch].recovered += c.receivedAmount || 0;
    }
  });

  // Top lý do hoàn hàng
  const reasonsMap = {};
  orders.forEach((o) => {
    if (o.returnReason) {
      reasonsMap[o.returnReason] = (reasonsMap[o.returnReason] || 0) + 1;
    }
  });
  const topReasons = Object.entries(reasonsMap)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    financials: {
      totalClaimAmount,
      totalApprovedAmount,
      totalReceivedAmount,
      totalFeeDeducted,
      winRate,
      pendingClaimsCount: claims.filter((c) => ['Bản nháp', 'Chờ gửi sàn', 'Đang khiếu nại'].includes(c.status)).length,
    },
    byChannel,
    topReasons,
    totalOrders: orders.length,
    totalReturns: orders.filter((o) => o.returnReason || o.status.includes('hoàn')).length,
  });
};

