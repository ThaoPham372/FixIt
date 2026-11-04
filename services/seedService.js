const Order = require('../models/Order');
const Claim = require('../models/Claim');
const Product = require('../models/Product');
const Store = require('../models/Store');

async function seedData(forceReset = false) {
  const orderCount = await Order.countDocuments();
  if (orderCount > 0 && !forceReset) {
    return { message: 'Dữ liệu đã có sẵn, không cần seed lại.', count: orderCount };
  }

  if (forceReset) {
    await Order.deleteMany({});
    await Claim.deleteMany({});
    await Product.deleteMany({});
    await Store.deleteMany({});
  }

  // 1. Seed Products
  const sampleProducts = [
    {
      sku: 'TN-TWS-PRO',
      name: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      category: 'Phụ kiện điện tử',
      price: 590000,
      stock: 64,
      reserved: 12,
      returnedInInspection: 3,
      returnRate: 14.2,
      totalOrders: 310,
      totalReturns: 44,
      riskLevel: 'Cao',
    },
    {
      sku: 'SM-WHT-M',
      name: 'Áo sơ mi Oxford trắng cao cấp (Size M)',
      category: 'Thời trang',
      price: 289000,
      stock: 145,
      reserved: 8,
      returnedInInspection: 1,
      returnRate: 2.4,
      totalOrders: 420,
      totalReturns: 10,
      riskLevel: 'Thấp',
    },
    {
      sku: 'TS-BLK-L',
      name: 'Áo thun Streetwear phản quang Oversize (Size L)',
      category: 'Thời trang',
      price: 199000,
      stock: 82,
      reserved: 15,
      returnedInInspection: 2,
      returnRate: 3.1,
      totalOrders: 280,
      totalReturns: 9,
      riskLevel: 'Thấp',
    },
    {
      sku: 'KD-B5-LARO',
      name: 'Kem dưỡng ẩm phục hồi Panthenol B5 100ml',
      category: 'Mỹ phẩm',
      price: 360000,
      stock: 110,
      reserved: 20,
      returnedInInspection: 4,
      returnRate: 7.2,
      totalOrders: 390,
      totalReturns: 28,
      riskLevel: 'Trung bình',
    },
    {
      sku: 'BLZ-KOR-S',
      name: 'Áo Blazer Unisex form rộng Hàn Quốc (Size S)',
      category: 'Thời trang',
      price: 480000,
      stock: 35,
      reserved: 6,
      returnedInInspection: 2,
      returnRate: 8.5,
      totalOrders: 160,
      totalReturns: 14,
      riskLevel: 'Trung bình',
    },
    {
      sku: 'BCH-DIEN-S3',
      name: 'Bàn chải điện sóng âm thông minh Sonic Clean S3',
      category: 'Đồ gia dụng',
      price: 420000,
      stock: 50,
      reserved: 5,
      returnedInInspection: 0,
      returnRate: 1.8,
      totalOrders: 210,
      totalReturns: 4,
      riskLevel: 'Thấp',
    },
    {
      sku: 'OP-IP-TITAN',
      name: 'Ốp lưng từ tính MagSafe Titanium siêu mỏng',
      category: 'Phụ kiện điện tử',
      price: 150000,
      stock: 240,
      reserved: 28,
      returnedInInspection: 1,
      returnRate: 1.2,
      totalOrders: 540,
      totalReturns: 6,
      riskLevel: 'Thấp',
    },
  ];
  await Product.insertMany(sampleProducts);

  // 2. Seed Stores
  const sampleStores = [
    {
      code: 'SHOP-SP-TECH',
      name: 'FixIt Tech & Gear Flagship',
      platform: 'Shopee',
      shopType: 'Shop Mall',
      status: 'Đang kết nối',
      activeOrders: 312,
      returnRate: 6.2,
      totalRevenue: 382400000,
      rating: 4.9,
    },
    {
      code: 'SHOP-TK-FASHION',
      name: 'FixIt Fashion Official Store',
      platform: 'TikTok Shop',
      shopType: 'Shop Mall',
      status: 'Đang kết nối',
      activeOrders: 184,
      returnRate: 4.5,
      totalRevenue: 145200000,
      rating: 4.8,
    },
    {
      code: 'SHOP-SP-BEAUTY',
      name: 'FixIt Skincare & Cosmetics',
      platform: 'Shopee',
      shopType: 'Shop Yêu Thích',
      status: 'Đang kết nối',
      activeOrders: 98,
      returnRate: 3.1,
      totalRevenue: 86900000,
      rating: 4.7,
    },
    {
      code: 'SHOP-TK-HOME',
      name: 'FixIt Home & Living',
      platform: 'TikTok Shop',
      shopType: 'Shop Thường',
      status: 'Đang kết nối',
      activeOrders: 64,
      returnRate: 2.0,
      totalRevenue: 52300000,
      rating: 4.9,
    },
  ];
  await Store.insertMany(sampleStores);

  // 3. Seed Orders
  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);
  const hoursLater = (h) => new Date(now.getTime() + h * 3600 * 1000);

  const sampleOrders = [
    {
      code: 'FX-1024',
      trackingCode: 'SPX-VN-882101',
      channel: 'TikTok Shop',
      product: 'Áo sơ mi Oxford trắng cao cấp (Size M)',
      sku: 'SM-WHT-M',
      quantity: 1,
      total: 289000,
      customerName: 'Nguyễn Văn An',
      customerPhone: '098***1245',
      status: 'Chờ xác nhận',
      timeline: [
        { time: hoursAgo(5), title: 'Tạo đơn hàng', description: 'Đơn tạo từ TikTok Shop', actor: 'Khách hàng' },
      ],
    },
    {
      code: 'FX-1025',
      trackingCode: 'SPX-VN-882194',
      channel: 'Shopee',
      product: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      sku: 'TN-TWS-PRO',
      quantity: 1,
      total: 590000,
      customerName: 'Trần Thị Thu',
      customerPhone: '091***4421',
      status: 'Chờ đóng gói',
      timeline: [
        { time: hoursAgo(8), title: 'Tạo đơn hàng', description: 'Đơn tạo từ Shopee Mall', actor: 'Khách hàng' },
        { time: hoursAgo(6), title: 'Xác nhận đơn', description: 'Đơn được chuyển vào luồng đóng gói', actor: 'Shop' },
      ],
    },
    {
      code: 'FX-1026',
      trackingCode: 'JNT-TK-901142',
      channel: 'TikTok Shop',
      product: 'Áo thun Streetwear phản quang Oversize (Size L)',
      sku: 'TS-BLK-L',
      quantity: 1,
      total: 199000,
      customerName: 'Lê Hoàng Quân',
      customerPhone: '097***8901',
      status: 'Đã đóng gói',
      evidence: [
        {
          kind: 'packing',
          filename: '1793809575738-5156c84c-612f-4b77-a590-0546477fe512.webm',
          originalName: 'FX-1026-packing.webm',
          mimeType: 'video/webm',
          size: 1542000,
          note: 'Video đóng gói quét barcode JNT-TK-901142',
          recordedAt: hoursAgo(12),
        },
      ],
      timeline: [
        { time: hoursAgo(14), title: 'Tạo đơn hàng', description: 'Đơn tạo từ TikTok Shop', actor: 'Khách hàng' },
        { time: hoursAgo(12), title: 'Đóng gói xong', description: 'Quay video đóng gói thành công', actor: 'Kho' },
      ],
    },
    {
      code: 'FX-1027',
      trackingCode: 'SPX-VN-903421',
      channel: 'Shopee',
      product: 'Kem dưỡng ẩm phục hồi Panthenol B5 100ml',
      sku: 'KD-B5-LARO',
      quantity: 1,
      total: 360000,
      customerName: 'Phạm Mai Linh',
      customerPhone: '090***5532',
      status: 'Đang giao hàng',
      timeline: [
        { time: hoursAgo(24), title: 'Bàn giao vận chuyển', description: 'Đã giao cho tài xế SPX Express', actor: 'SPX' },
      ],
    },
    {
      code: 'FX-1028',
      trackingCode: 'SPX-VN-771249',
      returnTrackingCode: 'SPX-RT-23194',
      channel: 'Shopee',
      product: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      sku: 'TN-TWS-PRO',
      quantity: 1,
      total: 590000,
      customerName: 'Vũ Minh Trí',
      customerPhone: '093***7712',
      status: 'Đang hoàn về',
      returnReason: 'Sản phẩm bị hư hỏng',
      returnDeadline: hoursLater(38),
      evidence: [
        {
          kind: 'packing',
          filename: '1793809575738-5156c84c-612f-4b77-a590-0546477fe512.webm',
          originalName: 'FX-1028-packing.webm',
          mimeType: 'video/webm',
          size: 1542000,
          note: 'Video đóng gói tai nghe TWS Pro kèm phụ kiện',
          recordedAt: hoursAgo(72),
        },
      ],
      timeline: [
        { time: hoursAgo(72), title: 'Đóng gói đơn', description: 'Đã lưu video đóng kiện', actor: 'Kho' },
        { time: hoursAgo(48), title: 'Khách bấm trả hàng', description: 'Lý do: Báo sản phẩm lỗi', actor: 'Shopee' },
        { time: hoursAgo(10), title: 'Đang vận chuyển hoàn', description: 'Kiện hàng đang trung chuyển về kho shop', actor: 'SPX' },
      ],
    },
    {
      code: 'FX-1029',
      trackingCode: 'JNT-TK-77412',
      returnTrackingCode: 'JNT-RT-88412',
      channel: 'TikTok Shop',
      product: 'Áo Blazer Unisex form rộng Hàn Quốc (Size S)',
      sku: 'BLZ-KOR-S',
      quantity: 1,
      total: 480000,
      customerName: 'Đỗ Hoài Nam',
      customerPhone: '096***3318',
      status: 'Đang kiểm tra hàng hoàn',
      returnReason: 'Trả sai sản phẩm',
      returnDeadline: hoursLater(16), // Gấp, còn 16h!
      evidence: [
        {
          kind: 'packing',
          filename: '1793809575738-5156c84c-612f-4b77-a590-0546477fe512.webm',
          originalName: 'FX-1029-packing.webm',
          mimeType: 'video/webm',
          size: 1542000,
          note: 'Quay rõ tag áo Blazer nguyên vẹn',
          recordedAt: hoursAgo(90),
        },
      ],
      timeline: [
        { time: hoursAgo(90), title: 'Đóng gói đơn', description: 'Kiểm tra tem tag nguyên seal', actor: 'Kho' },
        { time: hoursAgo(4), title: 'Kho nhận kiện hoàn', description: 'Tài xế giao kiện hoàn về kho, cần mở kiện kiểm tra', actor: 'Kho' },
      ],
    },
    {
      code: 'FX-1030',
      trackingCode: 'SPX-VN-66129',
      returnTrackingCode: 'SPX-RT-5512',
      channel: 'Shopee',
      product: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      sku: 'TN-TWS-PRO',
      quantity: 1,
      total: 590000,
      customerName: 'Hoàng Quốc Bảo',
      customerPhone: '094***6619',
      status: 'Chờ người bán duyệt khiếu nại',
      returnReason: 'Khách đổi ý',
      returnDeadline: hoursLater(22),
      evidence: [
        {
          kind: 'packing',
          filename: '1793809575738-5156c84c-612f-4b77-a590-0546477fe512.webm',
          originalName: 'FX-1030-packing.webm',
          mimeType: 'video/webm',
          size: 1542000,
          note: 'Video đóng hộp tai nghe màu đen nguyên seal',
          recordedAt: hoursAgo(120),
        },
        {
          kind: 'return',
          filename: '1793811226182-ccc5881d-0f9c-4fc3-89fc-352d2980303c.webm',
          originalName: 'FX-1030-return.webm',
          mimeType: 'video/webm',
          size: 1720000,
          note: 'Video mở kiện hoàn có tài xế đồng kiểm',
          recordedAt: hoursAgo(2),
        },
      ],
      aiAnalysis: {
        summary: 'Phát hiện sự khác biệt nghiêm trọng: Sản phẩm gửi đi là tai nghe màu đen trong hộp seal nguyên vẹn. Sản phẩm trong kiện hoàn về là tai nghe màu trắng, đã cũ xước và thiếu cáp sạc.',
        differences: [
          {
            description: 'Màu sắc sản phẩm không khớp: Video đóng gửi màu Đen, Video mở hoàn màu Trắng',
            packingTimestamp: '00:08',
            returnTimestamp: '00:14',
            confidence: 'Rất cao (98%)',
            evidence: 'Frame đối chiếu hộp tai nghe bị tráo ruột',
          },
          {
            description: 'Thiếu phụ kiện cáp sạc Type-C và đệm tai nghe thay thế',
            packingTimestamp: '00:15',
            returnTimestamp: '00:22',
            confidence: 'Cao (92%)',
            evidence: 'Khay phụ kiện bên dưới hộp trống trơn',
          },
        ],
        limitations: 'AI phân tích dựa trên hình ảnh đối soát thị giác; Người bán cần xác nhận lại trước khi tạo hồ sơ khiếu nại.',
        provider: 'Gemini 2.5 Flash Vision',
        analyzedAt: hoursAgo(2),
      },
      timeline: [
        { time: hoursAgo(120), title: 'Đóng gói sản phẩm', description: 'Gửi tai nghe TWS đen', actor: 'Kho' },
        { time: hoursAgo(4), title: 'Mở kiện hoàn', description: 'Quay video đồng kiểm mở kiện', actor: 'Kho' },
        { time: hoursAgo(2), title: 'AI đối chiếu phát hiện lỗi', description: 'Phát hiện tráo màu tai nghe và thiếu phụ kiện', actor: 'FixIt AI' },
      ],
    },
    {
      code: 'FX-1031',
      trackingCode: 'SPX-VN-55219',
      returnTrackingCode: 'SPX-RT-44129',
      channel: 'Shopee',
      product: 'Kem dưỡng ẩm phục hồi Panthenol B5 100ml',
      sku: 'KD-B5-LARO',
      quantity: 1,
      total: 360000,
      customerName: 'Bùi Thu Trang',
      customerPhone: '092***8812',
      status: 'Đang khiếu nại sàn',
      returnReason: 'Sản phẩm bị hư hỏng',
      returnDeadline: hoursLater(8),
      evidence: [
        {
          kind: 'packing',
          filename: '1793809575738-5156c84c-612f-4b77-a590-0546477fe512.webm',
          originalName: 'FX-1031-packing.webm',
          mimeType: 'video/webm',
          size: 1542000,
          note: 'Chai kem còn nguyên màng bọc nilon',
          recordedAt: hoursAgo(150),
        },
        {
          kind: 'return',
          filename: '1793811226182-ccc5881d-0f9c-4fc3-89fc-352d2980303c.webm',
          originalName: 'FX-1031-return.webm',
          mimeType: 'video/webm',
          size: 1720000,
          note: 'Kiện hoàn bóc ra bên trong là chai nước lã',
          recordedAt: hoursAgo(18),
        },
      ],
      timeline: [
        { time: hoursAgo(150), title: 'Đóng hàng gửi đi', description: 'Sản phẩm mới nguyên seal', actor: 'Kho' },
        { time: hoursAgo(20), title: 'Nhận hàng hoàn & bóc kiện', description: 'Phát hiện bị tráo chai rỗng đổ nước lã', actor: 'Kho' },
        { time: hoursAgo(14), title: 'Gửi khiếu nại lên Shopee', description: 'Đã nộp hồ sơ gồm 2 video và 4 ảnh bằng chứng', actor: 'Shop' },
      ],
    },
    {
      code: 'FX-1032',
      trackingCode: 'JNT-TK-33129',
      returnTrackingCode: 'JNT-RT-22194',
      channel: 'TikTok Shop',
      product: 'Bàn chải điện sóng âm thông minh Sonic Clean S3',
      sku: 'BCH-DIEN-S3',
      quantity: 1,
      total: 420000,
      customerName: 'Nguyễn Đăng Khoa',
      customerPhone: '098***9921',
      status: 'Đã giải quyết - Hoàn tiền',
      returnReason: 'Thiếu sản phẩm',
      timeline: [
        { time: hoursAgo(200), title: 'Đóng kiện & giao hàng', description: 'Đủ thân máy và 2 đầu bàn chải', actor: 'Kho' },
        { time: hoursAgo(80), title: 'Phát hiện tráo ruột', description: 'Khách chỉ trả lại vỏ rỗng', actor: 'Kho' },
        { time: hoursAgo(30), title: 'TikTok Shop bồi hoàn 100%', description: 'Sàn chấp nhận khiếu nại dựa trên video đóng gói', actor: 'TikTok Shop' },
      ],
    },
    {
      code: 'FX-1033',
      trackingCode: 'SPX-VN-119284',
      returnTrackingCode: 'SPX-RT-99412',
      channel: 'Shopee',
      product: 'Ốp lưng từ tính MagSafe Titanium siêu mỏng',
      sku: 'OP-IP-TITAN',
      quantity: 1,
      total: 150000,
      customerName: 'Hoàng Anh Tú',
      customerPhone: '090***6643',
      status: 'Hàng hoàn nguyên vẹn (Đã nhập kho)',
      returnReason: 'Khách đổi ý',
      timeline: [
        { time: hoursAgo(100), title: 'Đóng đơn & giao đi', description: 'Sản phẩm mới 100%', actor: 'Kho' },
        { time: hoursAgo(24), title: 'Kiểm tra mở kiện hoàn', description: 'Hàng nguyên seal, không móp méo', actor: 'Kho' },
        { time: hoursAgo(20), title: 'Xác nhận không lỗi & Nhập kho', description: 'Shop xác nhận hàng nguyên vẹn, không cần khiếu nại', actor: 'Shop' },
      ],
    },
  ];

  const createdOrders = await Order.insertMany(sampleOrders);

  // 4. Seed Claims
  const order1030 = createdOrders.find((o) => o.code === 'FX-1030');
  const order1031 = createdOrders.find((o) => o.code === 'FX-1031');
  const order1032 = createdOrders.find((o) => o.code === 'FX-1032');

  const sampleClaims = [
    {
      order: order1030._id,
      orderCode: 'FX-1030',
      channel: 'Shopee',
      trackingCode: 'SPX-VN-66129',
      returnTrackingCode: 'SPX-RT-5512',
      reason: 'Gian lận tráo hàng - Tráo màu và thiếu phụ kiện',
      description: 'Khách đặt tai nghe màu Đen mới nguyên hộp, khi hoàn trả về lại là tai nghe màu Trắng trầy xước và mất toàn bộ dây sạc, đệm tai.',
      differences: [
        'Màu sắc sản phẩm không khớp (Gửi Đen, Nhận Trắng)',
        'Mất phụ kiện cáp sạc Type-C và đệm tai',
      ],
      evidenceStrength: 'Mạnh nhất',
      status: 'Bản nháp',
      claimAmount: 590000,
      approvedAmount: 0,
      receivedAmount: 0,
      feeDeducted: 0,
      deadline: hoursLater(22),
      claimTemplateText: `Kính gửi Bộ phận Khiếu nại Shopee,\nShop xin gửi khiếu nại cho đơn hàng FX-1030 (Vận đơn gửi: SPX-VN-66129, Vận đơn hoàn: SPX-RT-5512).\nKhách hàng yêu cầu hoàn với lý do "Đổi ý", tuy nhiên khi bóc kiện hoàn có sự chứng kiến của đơn vị vận chuyển, shop phát hiện sản phẩm đã bị tráo đổi hoàn toàn (tai nghe Đen gửi đi bị tráo thành tai nghe Trắng cũ, mất cáp sạc).\nShop đính kèm video đóng gói lúc gửi và video bóc kiện nguyên tem 6 mặt để Shopee xác minh và bồi hoàn thỏa đáng số tiền 590.000đ cho shop.`,
    },
    {
      order: order1031._id,
      orderCode: 'FX-1031',
      channel: 'Shopee',
      trackingCode: 'SPX-VN-55219',
      returnTrackingCode: 'SPX-RT-44129',
      reason: 'Khách tráo ruột chai mỹ phẩm thành nước lã',
      description: 'Sản phẩm gửi đi còn nguyên màng co seal nhiệt. Kiện hoàn về màng seal bị xé toạc, bên trong chai chứa nước lọc.',
      differences: [
        'Màng seal nhiệt của nhà sản xuất bị xé rách',
        'Chất lỏng bên trong là nước lã, không có mùi và hoạt chất của kem B5',
      ],
      evidenceStrength: 'Mạnh nhất',
      status: 'Đang khiếu nại',
      claimAmount: 360000,
      approvedAmount: 0,
      receivedAmount: 0,
      feeDeducted: 0,
      deadline: hoursLater(8),
      claimTemplateText: `Kính gửi Shopee Dispute Team,\nĐơn hàng FX-1031 bị tráo ruột tinh vi. Video đóng hàng chứng minh tem mác và seal nguyên bản 100%. Video mở kiện quay liên tục thấy rõ chai bị cạy nắp và thay bằng nước lã. Kính đề nghị Shopee xem xét bồi hoàn 360.000đ.`,
    },
    {
      order: order1032._id,
      orderCode: 'FX-1032',
      channel: 'TikTok Shop',
      trackingCode: 'JNT-TK-33129',
      returnTrackingCode: 'JNT-RT-22194',
      reason: 'Khách hoàn hộp rỗng, không có thân máy bàn chải',
      description: 'Khách bấm trả hàng với lý do "Thiếu sản phẩm". Thực tế kiện gửi đi đủ phụ kiện, kiện nhận về chỉ có vỏ hộp carton rỗng.',
      differences: ['Vỏ hộp rỗng, cân nặng lúc nhận chỉ 80g so với 320g lúc gửi'],
      evidenceStrength: 'Mạnh',
      status: 'Đã bồi hoàn',
      claimAmount: 420000,
      approvedAmount: 420000,
      receivedAmount: 420000,
      feeDeducted: 0,
      deadline: hoursAgo(30),
      claimTemplateText: `TikTok Shop đã xem xét video đối chiếu của shop và phê duyệt đền bù 100% giá trị đơn hàng vào Ví người bán.`,
    },
  ];

  await Claim.insertMany(sampleClaims);

  return { message: 'Nạp dữ liệu mẫu hoàn tất thành công!', ordersCount: sampleOrders.length };
}

module.exports = { seedData };

