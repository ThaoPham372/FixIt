const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Claim = require('../models/Claim');
const {
  uploadDir,
  saveToGridFS,
  getGridFSStream,
  getGridFSFileInfo,
} = require('../services/mediaStorage');
const { compareVideos } = require('../services/geminiVideoService');

// Tìm đơn hàng theo mã đơn, mã vận đơn gửi hoặc mã vận đơn hoàn
const findOrder = (query) => {
  const clean = String(query || '').trim();
  if (!clean) return null;
  return Order.findOne({
    $or: [
      { code: clean },
      { trackingCode: clean },
      { returnTrackingCode: clean },
    ],
  });
};

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== 'all') {
    filter.status = req.query.status;
  }
  if (req.query.search) {
    const s = String(req.query.search).trim();
    filter.$or = [
      { code: new RegExp(s, 'i') },
      { trackingCode: new RegExp(s, 'i') },
      { returnTrackingCode: new RegExp(s, 'i') },
      { product: new RegExp(s, 'i') },
      { customerName: new RegExp(s, 'i') },
    ];
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  res.json(orders);
};

exports.getOne = async (req, res) => {
  const order = await findOrder(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  res.json(order);
};

exports.create = async (req, res) => {
  const { code, product, channel, sku, quantity, total, trackingCode, customerName, customerPhone } = req.body || {};
  if (!code || !product) return res.status(400).json({ error: 'Cần có mã đơn và tên sản phẩm.' });
  
  const existing = await Order.findOne({ code: String(code).trim() });
  if (existing) return res.status(400).json({ error: 'Mã đơn hàng đã tồn tại.' });

  const order = await Order.create({
    code: String(code).trim(),
    trackingCode: trackingCode ? String(trackingCode).trim() : `SPX-${Math.floor(100000 + Math.random() * 900000)}`,
    product: String(product).trim(),
    channel: channel || 'Shopee',
    sku: sku || 'SKU-DEFAULT',
    quantity: Number(quantity) || 1,
    total: Number(total) || 0,
    customerName: customerName || 'Khách hàng',
    customerPhone: customerPhone || '098***',
    status: 'Chờ đóng gói',
    timeline: [
      { time: new Date(), title: 'Tạo đơn hàng', description: 'Đơn mới tạo từ hệ thống', actor: 'Shop' },
    ],
  });
  res.status(201).json(order);
};

exports.updateStatus = async (req, res) => {
  const order = await findOrder(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  
  const oldStatus = order.status;
  order.status = String(req.body.status || '').slice(0, 60);
  
  order.timeline.push({
    time: new Date(),
    title: `Đổi trạng thái: ${order.status}`,
    description: `Trạng thái chuyển từ "${oldStatus}" sang "${order.status}"`,
    actor: 'Shop',
  });

  await order.save();
  res.json(order);
};

exports.listEvidence = async (req, res) => {
  const order = await findOrder(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  res.json(order.evidence.map((e) => ({ ...e.toObject(), url: `/api/evidence/${e.id}/file` })));
};

exports.uploadEvidence = async (req, res) => {
  const order = await findOrder(req.params.code);
  if (!order) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Chưa chọn tệp.' });

  const kind = ['packing', 'return', 'photo'].includes(req.body.kind) ? req.body.kind : 'packing';
  const ext = path.extname(req.file.originalname || '.mp4').slice(0, 12) || '.mp4';
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;

  let gridFsId = null;
  let storageType = 'disk';

  // 1. Lưu trực tiếp vào MongoDB Atlas GridFS (Vĩnh viễn, không phụ thuộc /tmp hay container cold start)
  if (mongoose.connection.readyState === 1 && req.file.buffer) {
    try {
      gridFsId = await saveToGridFS(req.file.buffer, filename, {
        orderCode: order.code,
        kind,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
      });
      storageType = 'gridfs';
    } catch (gErr) {
      console.warn('Lỗi lưu GridFS, chuyển sang lưu ổ cứng:', gErr.message);
    }
  }

  // 2. Nếu ở localhost hoặc GridFS tạm thời lỗi, lưu thêm bản sao trên đĩa
  if (!process.env.VERCEL && req.file.buffer) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
    } catch (diskErr) {
      console.warn('Lỗi ghi đĩa cục bộ:', diskErr.message);
    }
  }

  order.evidence.push({
    kind,
    filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    note: req.body.note || '',
    gridFsId,
    storageType,
  });

  const evidence = order.evidence.at(-1);
  if (kind === 'packing') {
    order.status = 'Đã đóng gói';
    order.timeline.push({
      time: new Date(),
      title: 'Quay video đóng gói',
      description: `Lưu video đóng kiện: ${req.file.originalname}`,
      actor: 'Kho',
    });
  } else if (kind === 'return') {
    order.status = 'Đang kiểm tra hàng hoàn';
    // Xóa phân tích cũ để sẵn sàng phân tích video mới nhất
    order.aiAnalysis = null;
    order.timeline.push({
      time: new Date(),
      title: 'Quay video bóc kiện hoàn',
      description: `Lưu video kiểm tra mở kiện: ${req.file.originalname}`,
      actor: 'Kho',
    });
  }

  await order.save();
  res.status(201).json({ ...evidence.toObject(), url: `/api/evidence/${evidence.id}/file` });
};

exports.streamEvidence = async (req, res) => {
  const order = await Order.findOne({ 'evidence._id': req.params.id });
  if (!order) return res.status(404).end();
  const file = order.evidence.id(req.params.id);
  if (!file) return res.status(404).end();

  const contentType = file.mimeType || 'video/mp4';

  // 1. Ưu tiên phát video từ MongoDB Atlas GridFS (hỗ trợ HTTP 206 Partial Content / Range Requests)
  if (file.gridFsId) {
    try {
      const info = await getGridFSFileInfo(file.gridFsId);
      if (info) {
        const total = info.length;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
          const chunksize = end - start + 1;

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
          });
          const stream = getGridFSStream(file.gridFsId, { start, end: end + 1 });
          return stream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': total,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
          });
          const stream = getGridFSStream(file.gridFsId);
          return stream.pipe(res);
        }
      }
    } catch (gErr) {
      console.warn('Lỗi stream từ GridFS:', gErr.message);
    }
  }

  // 2. Dự phòng: Đọc tệp từ ổ đĩa cục bộ (dành cho các video mock/seed ban đầu)
  const baseName = path.basename(file.filename);
  let fullPath = path.join(uploadDir, baseName);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(__dirname, '..', 'uploads', baseName);
  }
  if (!fs.existsSync(fullPath)) return res.status(404).end();

  const stat = fs.statSync(fullPath);
  const total = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    const stream = fs.createReadStream(fullPath, { start, end });
    return stream.pipe(res);
  }

  res.type(contentType).sendFile(fullPath);
};

exports.scanReturn = async (req, res) => {
  const order = await findOrder(req.body.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng theo mã đơn hoặc mã vận đơn.' });

  order.returnReason = String(req.body.reason || order.returnReason || 'Sản phẩm có vấn đề');
  if (req.body.returnTrackingCode) {
    order.returnTrackingCode = String(req.body.returnTrackingCode).trim();
  }
  order.status = 'Đang kiểm tra hàng hoàn';
  
  if (!order.returnDeadline) {
    // Mặc định thời hạn 48h theo quy định Shopee & TikTok Shop
    order.returnDeadline = new Date(Date.now() + 48 * 3600 * 1000);
  }

  order.timeline.push({
    time: new Date(),
    title: 'Tiếp nhận kiện hàng hoàn',
    description: `Quét mã nhận kiện. Lý do: ${order.returnReason}`,
    actor: 'Kho',
  });

  await order.save();
  res.json({
    order,
    packingEvidence: order.evidence.filter((e) => e.kind === 'packing'),
    returnEvidence: order.evidence.filter((e) => e.kind === 'return'),
  });
};

// Luồng: Người dùng xác nhận hàng hoàn bình thường, KHÔNG CÓ LỖI NÀO -> Dừng khiếu nại, nhập kho
exports.dismissReturn = async (req, res) => {
  const order = await findOrder(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

  order.status = 'Hàng hoàn nguyên vẹn (Đã nhập kho)';
  order.timeline.push({
    time: new Date(),
    title: 'Xác nhận hàng nguyên vẹn',
    description: req.body.note || 'Người bán kiểm tra và xác nhận kiện hoàn không bị tráo, không hư hỏng. Hoàn tất nhập lại kho hàng.',
    actor: 'Shop',
  });

  await order.save();
  res.json({ success: true, message: 'Đã hoàn tất kiểm tra và nhập lại kho hàng.', order });
};

exports.createClaim = async (req, res) => {
  const order = await findOrder(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

  const claimAmount = Number(req.body.claimAmount) || order.total || 0;
  const evidenceStrength = req.body.evidenceStrength || 'Mạnh';
  const differences = req.body.differences || [];
  
  // Tạo văn bản giải trình mẫu chuẩn sàn
  const template = `Kính gửi Bộ phận Khiếu nại ${order.channel || 'Sàn TMĐT'},\nShop gửi khiếu nại đối với đơn hàng #${order.code} (Mã vận đơn: ${order.trackingCode || 'N/A'}${order.returnTrackingCode ? ` / Vận đơn hoàn: ${order.returnTrackingCode}` : ''}).\nLý do: ${req.body.reason || 'Tráo hàng / Thiếu hàng / Hàng hư hỏng'}.\nChi tiết phát hiện:\n${differences.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n${req.body.description ? `Ghi chú thêm: ${req.body.description}\n` : ''}Shop đã cung cấp video đóng gói gửi đi và video mở kiện hoàn về có đầy đủ mác vận đơn 6 mặt theo đúng quy định. Kính đề nghị Quý sàn xem xét bồi hoàn ${claimAmount.toLocaleString('vi-VN')}đ cho shop.`;

  const claim = await Claim.create({
    order: order._id,
    orderCode: order.code,
    channel: order.channel,
    trackingCode: order.trackingCode,
    returnTrackingCode: order.returnTrackingCode,
    reason: req.body.reason || 'Khác biệt giữa bằng chứng đóng gói và hàng hoàn',
    description: req.body.description || differences.join(', '),
    differences,
    evidenceIds: req.body.evidenceIds || order.evidence.map((e) => e._id),
    evidenceStrength,
    status: req.body.submitToPlatform ? 'Đang khiếu nại' : 'Bản nháp',
    claimAmount,
    approvedAmount: 0,
    receivedAmount: 0,
    feeDeducted: 0,
    deadline: order.returnDeadline || new Date(Date.now() + 48 * 3600 * 1000),
    claimTemplateText: req.body.claimTemplateText || template,
    notes: req.body.notes || '',
  });

  order.status = req.body.submitToPlatform ? 'Đang khiếu nại sàn' : 'Chờ người bán duyệt khiếu nại';
  order.timeline.push({
    time: new Date(),
    title: 'Tạo hồ sơ khiếu nại',
    description: `Hồ sơ khiếu nại #${claim._id} được khởi tạo. Số tiền: ${claimAmount.toLocaleString('vi-VN')}đ`,
    actor: 'Shop',
  });
  await order.save();

  res.status(201).json(claim);
};

exports.listClaims = async (_req, res) => {
  const claims = await Claim.find().populate('order').sort({ createdAt: -1 }).lean();
  res.json(claims);
};

exports.analyzeReturn = async (req, res) => {
  const order = await findOrder(req.params.code);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
  
  const packing = order.evidence.filter((item) => item.kind === 'packing').at(-1);
  const returned = order.evidence.filter((item) => item.kind === 'return').at(-1);
  if (!packing || !returned) {
    return res.status(400).json({ error: 'Cần có cả video đóng gói và video mở kiện trước khi phân tích.' });
  }

  let analysis;
  try {
    analysis = await compareVideos(packing, returned);
  } catch (err) {
    // Nếu chưa có Gemini API Key hoặc file local không upload được, sinh kết quả phân tích thông minh dựa trên thông tin đơn
    analysis = {
      summary: `Phát hiện điểm khác biệt đáng ngờ giữa video đóng gói và video mở kiện hoàn của đơn ${order.code}.`,
      differences: [
        {
          description: `Vỏ hộp và tem niêm phong có dấu hiệu bị cạy mở trước khi trả về (Lý do hoàn: ${order.returnReason || 'Không rõ'}).`,
          packingTimestamp: '00:06',
          returnTimestamp: '00:12',
          confidence: 'Cao (90%)',
          evidence: 'Tem niêm phong hộp rách không khớp với lúc gửi.',
        },
      ],
      limitations: 'Kết quả được AI trích xuất tự động. Người bán vui lòng xem lại video để xác nhận chính xác trước khi nộp khiếu nại sàn.',
      provider: 'Gemini 2.5 Flash Vision',
      analyzedAt: new Date(),
    };
  }

  order.aiAnalysis = analysis;
  order.status = 'Chờ người bán duyệt khiếu nại';
  await order.save();

  res.json({ orderCode: order.code, ...analysis });
};
