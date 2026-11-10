// FixIt Frontend Application Logic
const app = document.querySelector('#app');
let page = 'home';
let orders = [];
let claims = [];
let products = [];
let stores = [];
let simulatorData = null;
let simulatorFilter = 'all';
let shippingFilter = 'all';
let reconciliationFilter = 'all';
let invoiceFilter = 'all';
let inventorySubTab = 'sku';
let reportsData = null;
let modalGeneration = 0;
let orderFilter = 'all';
let searchQuery = '';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + 'đ';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return String(d);
  }
};

async function api(url, opts = {}) {
  const r = await fetch('/api' + url, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Có lỗi xảy ra khi gọi máy chủ.');
  return d;
}

function json(body) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

// Chuyển trang
document.querySelectorAll('.nav').forEach((n) => {
  n.onclick = () => go(n.dataset.page);
});

async function go(p) {
  page = p;
  document.querySelectorAll('.nav').forEach((n) => n.classList.toggle('on', n.dataset.page === p));
  await loadCurrentPageData();
  render();
}

async function init() {
  try {
    const h = await api('/health');
    const dbElem = document.querySelector('#dbstate');
    if (h.database === 'connected') {
      dbElem.textContent = 'MongoDB Atlas: Đã kết nối';
      dbElem.className = 'pill online';
    } else {
      dbElem.textContent = 'Chưa kết nối CSDL';
      dbElem.className = 'pill';
    }
  } catch {
    document.querySelector('#dbstate').textContent = 'Mất kết nối máy chủ';
  }

  await loadAllData();
  render();
}

async function refreshWalletState() {
  try {
    const data = await api('/simulator/claims');
    const walletBalanceElem = document.querySelector('#walletBalance');
    if (walletBalanceElem && data?.stats) {
      walletBalanceElem.textContent = formatMoney(data.stats.walletBalance);
    }
    const badge = document.querySelector('#simBadge');
    if (badge && data?.stats) {
      if (data.stats.pendingReview > 0) {
        badge.textContent = data.stats.pendingReview;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
    return data;
  } catch (e) {
    console.warn('Lỗi cập nhật số dư ví:', e);
  }
}

async function loadAllData() {
  try {
    [orders, claims] = await Promise.all([api('/orders'), api('/claims')]);
    await refreshWalletState();
  } catch (e) {
    console.error('Lỗi tải dữ liệu:', e);
  }
}

async function loadCurrentPageData() {
  try {
    if (page === 'orders' || page === 'home' || page === 'returns' || page === 'evidence') {
      orders = await api('/orders' + (searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''));
    }
    if (page === 'claims' || page === 'home') {
      claims = await api('/claims');
    }
    if (page === 'simulator') {
      simulatorData = await api('/simulator/claims');
    }
    if (page === 'products') {
      products = await api('/products');
    }
    if (page === 'stores') {
      stores = await api('/stores');
    }
    if (page === 'inventory') {
      inventoryData = await api('/inventory');
    }
    if (page === 'reports') {
      reportsData = await api('/reports');
    }
    await refreshWalletState();
  } catch (e) {
    console.warn('Lỗi tải trang:', e);
  }
}

// Khôi phục dữ liệu mẫu
async function resetSeedData() {
  if (!await confirmModal('Bạn có muốn nạp lại toàn bộ dữ liệu mẫu đầy đủ cho tất cả các trang không?', { title: 'Xác nhận nạp lại dữ liệu', confirmText: 'Nạp lại ngay' })) return;
  try {
    const res = await api('/seed/reset', { method: 'POST' });
    alert(res.message || 'Đã nạp lại dữ liệu thành công!');
    await loadAllData();
    render();
  } catch (e) {
    alert('Lỗi nạp dữ liệu: ' + e.message);
  }
}

// Xử lý sự kiện từ table component
document.addEventListener('fixit-order-action', async (event) => {
  const { action, code } = event.detail;
  if (action === 'confirm') {
    await setStatus(code, 'Chờ đóng gói');
  } else if (action === 'pack') {
    scan(code, 'packing');
  } else if (action === 'return-inspect') {
    scan(code, 'return');
  } else if (action === 'claim-review') {
    comparison(code);
  } else if (action === 'view-evidence') {
    viewEvidenceModal(code);
  } else if (action === 'view-detail') {
    viewOrderDetailModal(code);
  } else if (action === 'view-simulator') {
    go('simulator');
  } else if (action === 'view-wallet') {
    viewWalletModal();
  }
});

// Render hàm chính
async function render() {
  const titles = {
    home: 'Tổng quan vận hành & Hàng hoàn',
    orders: 'Quản lý đơn hàng đa kênh',
    shipping: 'Xử lý giao hàng & Điều phối vận chuyển',
    products: 'Danh mục sản phẩm & Rủi ro hoàn',
    inventory: 'Quản lý tồn kho & Nhập - Xuất - Tồn',
    stores: 'Gian hàng & Kênh bán hàng tập trung',
    returns: 'Tiếp nhận kiện hàng hoàn về',
    evidence: 'Kho video & Bằng chứng đóng hàng',
    claims: 'Hồ sơ tranh chấp & Khiếu nại sàn',
    simulator: 'Sàn TMĐT Giả lập (Dispute Resolution Portal)',
    reconciliation: 'Đối soát tiền sàn & Khấu trừ phí',
    invoices: 'Quản lý Hóa đơn VAT & Kế toán TMĐT',
    reports: 'Báo cáo kinh doanh & Phân tích tài chính',
    settings: 'Cài đặt hệ thống',
  };

  let h = `
    <div class="heading">
      <div>
        <h1>${titles[page]}</h1>
        <small class="sub">Hệ thống gom bằng chứng tự động, đối soát AI và theo dõi tiền bồi hoàn.</small>
      </div>
      <div>
        ${page === 'orders' ? '<button class="btn" onclick="newOrderModal()">＋ Thêm đơn hàng</button>' : ''}
        ${page === 'shipping' ? '<button class="btn" onclick="openCreateShipmentModal()">＋ Tạo phiếu gửi hàng</button>' : ''}
        ${page === 'returns' ? '<button class="btn danger" onclick="scan(\'\',\'return\')">＋ Tiếp nhận kiện hoàn</button>' : ''}
        ${page === 'products' ? '<button class="btn" onclick="newProductModal()">＋ Thêm sản phẩm</button>' : ''}
        ${page === 'stores' ? '<button class="btn" onclick="openConnectStoreModal()">＋ Kết nối kênh mới</button>' : ''}
        ${page === 'reconciliation' ? '<button class="btn" onclick="exportReconciliationReport()">📥 Xuất bảng đối soát</button>' : ''}
        ${page === 'invoices' ? '<button class="btn" onclick="openBulkInvoiceIssueModal()">⚡ Phát hành HĐ hàng loạt</button>' : ''}
      </div>
    </div>
  `;

  if (page === 'home') {
    renderHome(h);
  } else if (page === 'orders') {
    renderOrders(h);
  } else if (page === 'shipping') {
    renderShipping(h);
  } else if (page === 'products') {
    renderProducts(h);
  } else if (page === 'inventory') {
    renderInventory(h);
  } else if (page === 'stores') {
    renderStores(h);
  } else if (page === 'returns') {
    renderReturns(h);
  } else if (page === 'evidence') {
    renderEvidence(h);
  } else if (page === 'claims') {
    renderClaims(h);
  } else if (page === 'simulator') {
    renderSimulator(h);
  } else if (page === 'reconciliation') {
    renderReconciliation(h);
  } else if (page === 'invoices') {
    renderInvoices(h);
  } else if (page === 'reports') {
    renderReports(h);
  } else if (page === 'settings') {
    renderSettings(h);
  }
}

// 1. TRANG TỔNG QUAN (HOME)
function renderHome(header) {
  const totalOrders = orders.length;
  const returnCount = orders.filter((o) => o.returnReason || o.status.includes('hoàn') || o.status.includes('kiểm tra')).length;
  const activeClaims = claims.filter((c) => ['Bản nháp', 'Chờ gửi sàn', 'Đang khiếu nại'].includes(c.status)).length;
  const totalRecovered = claims.reduce((sum, c) => sum + (c.receivedAmount || 0), 0);

  // Đơn hàng hoàn gấp (dưới 48h deadline)
  const urgentReturns = orders.filter(
    (o) => (o.status === 'Đang kiểm tra hàng hoàn' || o.status === 'Đang hoàn về' || o.status === 'Chờ người bán duyệt khiếu nại')
  );

  app.innerHTML = `
    ${header}
    
    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Tổng đơn hàng</div>
        <div class="number">${totalOrders}</div>
        <small class="sub">Đa kênh Shopee & TikTok</small>
      </div>
      <div class="metric">
        <div class="metric-title">Hàng hoàn cần kiểm tra</div>
        <div class="number amber">${returnCount}</div>
        <small class="sub">Cần bóc kiện trước 48h</small>
      </div>
      <div class="metric">
        <div class="metric-title">Hồ sơ đang khiếu nại</div>
        <div class="number danger">${activeClaims}</div>
        <small class="sub">Đang đòi bồi thường sàn</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tiền đã thu hồi</div>
        <div class="number" style="color:#107c41">${formatMoney(totalRecovered)}</div>
        <small class="sub">Đã hoàn vào ví người bán</small>
      </div>
    </div>

    ${urgentReturns.length
      ? `
      <div class="panel" style="border-left: 4px solid var(--danger);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2 style="color:var(--danger);margin:0">⚠️ Cảnh báo hạn chót khiếu nại (SLA 48h của sàn)</h2>
          <small class="sub">Quá 48h sàn sẽ tự động duyệt hoàn tiền cho khách</small>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>Mã đơn / Vận đơn hoàn</th>
                <th>Sản phẩm</th>
                <th>Lý do hoàn</th>
                <th>Thời hạn còn lại</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${urgentReturns
        .map(
          (o) => `
                <tr>
                  <td><b>${esc(o.code)}</b><br><small class="sub">${esc(o.returnTrackingCode || o.trackingCode || 'Chưa có mã VĐ')}</small></td>
                  <td>${esc(o.product)}</td>
                  <td><span class="tag tag-danger" style="display:inline-flex;align-items:center;padding:4px 10px">${esc(o.returnReason || 'Kiểm tra mở kiện')}</span></td>
                  <td><span class="sla-badge">⏳ Còn 18 giờ</span></td>
                  <td style="text-align:right">
                    ${o.status === 'Chờ người bán duyệt khiếu nại'
              ? `<button class="btn-action-main warning" style="width:165px" onclick="comparison('${esc(o.code)}')">Duyệt đối chiếu AI</button>`
              : `<button class="btn-action-main danger" style="width:165px" onclick="scan('${esc(o.code)}','return')">Mở kiện & Quay video</button>`
            }
                  </td>
                </tr>
              `
        )
        .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
      : ''
    }

    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h2 style="margin:0">Đơn hàng gần đây</h2>
        <button class="btn-xs secondary" onclick="go('orders')">Xem tất cả đơn →</button>
      </div>
      <fixit-order-table>${window.FixItOrderTable.template(orders.slice(0, 7), esc)}</fixit-order-table>
    </div>
  `;
}

// 2. TRANG ĐƠN HÀNG (ORDERS)
function renderOrders(header) {
  const filters = [
    ['all', 'Tất cả đơn'],
    ['Chờ xác nhận', 'Chờ xác nhận'],
    ['Chờ đóng gói', 'Chờ đóng gói'],
    ['Đã đóng gói', 'Đã đóng gói'],
    ['Đang giao hàng', 'Đang giao'],
    ['Đang kiểm tra hàng hoàn', 'Hàng hoàn'],
  ];

  const filtered =
    orderFilter === 'all'
      ? orders
      : orders.filter((o) => (orderFilter === 'Đang kiểm tra hàng hoàn' ? o.status.includes('hoàn') || o.status.includes('kiểm tra') : o.status === orderFilter));

  app.innerHTML = `
    ${header}

    <div class="panel" style="padding:14px 18px;margin-bottom:14px">
      <div class="formrow">
        <input id="orderSearch" placeholder="Tìm kiếm theo mã đơn (FX-1025), mã vận đơn (SPX-VN...), tên khách hàng..." value="${esc(searchQuery)}" onkeydown="if(event.key==='Enter') searchOrders()">
        <button class="btn secondary" onclick="searchOrders()">🔍 Tìm kiếm</button>
        ${searchQuery ? `<button class="btn secondary" onclick="clearSearch()">Xóa lọc</button>` : ''}
      </div>
    </div>

    <div class="steps">
      ${filters
      .map(
        ([val, label]) => `
        <button type="button" class="step ${orderFilter === val ? 'on' : ''}" onclick="setOrderFilter('${val}')">
          ${label}
          <span class="filter-count">
            ${val === 'all' ? orders.length : orders.filter((o) => (val === 'Đang kiểm tra hàng hoàn' ? o.status.includes('hoàn') || o.status.includes('kiểm tra') : o.status === val)).length}
          </span>
        </button>
      `
      )
      .join('')}
    </div>

    <div class="panel">
      <fixit-order-table>${window.FixItOrderTable.template(filtered, esc)}</fixit-order-table>
    </div>
  `;
}

function setOrderFilter(filter) {
  orderFilter = filter;
  render();
}

function searchOrders() {
  searchQuery = document.querySelector('#orderSearch').value.trim();
  loadCurrentPageData().then(render);
}

function clearSearch() {
  searchQuery = '';
  loadCurrentPageData().then(render);
}

// ==================== XỬ LÝ GIAO HÀNG & LOGISTICS (SHIPPING) ====================
function getMockShippingData() {
  return [
    {
      trackingCode: 'SPX-VN-884210',
      orderCode: 'FX-1025',
      channel: 'Shopee',
      carrier: 'SPX Express',
      carrierClass: 'carrier-spx',
      customerName: 'Hoàng Minh Tuấn',
      customerPhone: '0912***891',
      senderHub: 'Kho FixIt Tân Bình, TP.HCM',
      destination: 'Hà Đông, Hà Nội',
      status: 'Đang trung chuyển',
      statusClass: 'tag-info',
      shipper: 'Trần Văn Mạnh (SPX)',
      shipperPhone: '0978***112',
      updatedAt: '10/11/2026 14:20',
      note: 'Rời kho trung chuyển HN SOC đang đến bưu cục phát',
      isDelayed: false,
      timeline: [
        { time: '10/11/2026 14:20', desc: 'Đang luân chuyển qua Hub Hà Nội SOC' },
        { time: '09/11/2026 21:05', desc: 'Rời kho tổng Tân Bình SOC' },
        { time: '09/11/2026 16:30', desc: 'Đã lấy hàng thành công tại shop' },
        { time: '09/11/2026 11:15', desc: 'Người gửi đã tạo vận đơn' },
      ]
    },
    {
      trackingCode: 'JNT-TK-901142',
      orderCode: 'FX-1026',
      channel: 'TikTok Shop',
      carrier: 'J&T Express',
      carrierClass: 'carrier-jnt',
      customerName: 'Nguyễn Thu Trang',
      customerPhone: '0988***452',
      senderHub: 'Kho FixIt Tân Bình, TP.HCM',
      destination: 'Quận Cẩm Lệ, Đà Nẵng',
      status: 'Đang giao hàng',
      statusClass: 'tag-warn',
      shipper: 'Lê Hữu Đạt (J&T)',
      shipperPhone: '0905***631',
      updatedAt: '10/11/2026 09:45',
      note: 'Bưu tá đang phát hàng lần 1',
      isDelayed: false,
      timeline: [
        { time: '10/11/2026 09:45', desc: 'Bưu tá Lê Hữu Đạt đang đi phát hàng' },
        { time: '10/11/2026 06:15', desc: 'Đến bưu cục Cẩm Lệ, Đà Nẵng' },
        { time: '08/11/2026 18:00', desc: 'Đã lấy hàng từ người bán' },
      ]
    },
    {
      trackingCode: 'GHTK-HN-441209',
      orderCode: 'FX-1031',
      channel: 'Website',
      carrier: 'GHTK',
      carrierClass: 'carrier-ghtk',
      customerName: 'Phạm Thanh Bình',
      customerPhone: '0934***782',
      senderHub: 'Kho FixIt Tân Bình, TP.HCM',
      destination: 'TP. Biên Hòa, Đồng Nai',
      status: 'Giao trễ / Cảnh báo',
      statusClass: 'tag-danger',
      shipper: 'Nguyễn Tuấn Kiệt (GHTK)',
      shipperPhone: '0943***998',
      updatedAt: '10/11/2026 11:00',
      note: 'Khách hẹn giao lại sau 18h (Quá SLA 48h giao tiêu chuẩn)',
      isDelayed: true,
      timeline: [
        { time: '10/11/2026 11:00', desc: 'Giao không thành công lần 1 (Khách hẹn lại sau 18h tối)' },
        { time: '10/11/2026 08:30', desc: 'Bưu tá đang phát hàng' },
        { time: '07/11/2026 15:00', desc: 'Bưu cục Biên Hòa đã nhận kiện hàng' },
      ]
    },
    {
      trackingCode: 'VT-VN-339182',
      orderCode: 'FX-1032',
      channel: 'KiotViet POS',
      carrier: 'Viettel Post',
      carrierClass: 'carrier-viettel',
      customerName: 'Võ Minh Quân',
      customerPhone: '0918***664',
      senderHub: 'FixIt Flagship Store Q.1',
      destination: 'Ninh Kiều, Cần Thơ',
      status: 'Chờ lấy hàng',
      statusClass: 'tag-info',
      shipper: 'Bưu tá Viettel Post Q.1',
      shipperPhone: '19008095',
      updatedAt: '10/11/2026 15:10',
      note: 'Đã tạo vận đơn, chờ bưu tá đến lấy trước 17h',
      isDelayed: false,
      timeline: [
        { time: '10/11/2026 15:10', desc: 'Tạo phiếu giao hàng thành công trên hệ thống Viettel Post' },
      ]
    },
    {
      trackingCode: 'SPX-RT-23194',
      orderCode: 'FX-1028',
      channel: 'Shopee',
      carrier: 'SPX Express',
      carrierClass: 'carrier-spx',
      customerName: 'Trịnh Hoài Nam',
      customerPhone: '0966***812',
      senderHub: 'Kho Hoàn Kiếm, HN',
      destination: 'Kho FixIt Tân Bình, TP.HCM',
      status: 'Đang hoàn về',
      statusClass: 'tag-danger',
      shipper: 'Phan Hùng Sơn (SPX Return)',
      shipperPhone: '0971***329',
      updatedAt: '10/11/2026 13:00',
      note: 'Hàng trả về do người mua khiếu nại bể vỡ',
      isDelayed: true,
      timeline: [
        { time: '10/11/2026 13:00', desc: 'Đang luân chuyển về kho bóc hoàn Tân Bình' },
        { time: '09/11/2026 10:20', desc: 'Shopee chấp thuận khiếu nại hoàn trả' },
      ]
    },
    {
      trackingCode: 'JNT-TK-88412',
      orderCode: 'FX-1029',
      channel: 'TikTok Shop',
      carrier: 'J&T Express',
      carrierClass: 'carrier-jnt',
      customerName: 'Đặng Ngọc Ánh',
      customerPhone: '0903***771',
      senderHub: 'Kho Buôn Ma Thuột',
      destination: 'Kho FixIt Tân Bình, TP.HCM',
      status: 'Đang hoàn về',
      statusClass: 'tag-danger',
      shipper: 'Vũ Đức Nam (J&T)',
      shipperPhone: '0935***224',
      updatedAt: '10/11/2026 10:15',
      note: 'Kiện hoàn trả đã đến bưu cục phát, chuẩn bị giao shop',
      isDelayed: false,
      timeline: [
        { time: '10/11/2026 10:15', desc: 'Đến bưu cục Tân Bình, chuẩn bị hoàn trả shop' },
      ]
    }
  ];
}

function setShippingFilter(f) {
  shippingFilter = f;
  render();
}

function renderShipping(header) {
  const list = getMockShippingData();
  const filters = [
    ['all', 'Tất cả'],
    ['spx', 'SPX Express'],
    ['jnt', 'J&T Express'],
    ['ghtk', 'GHTK'],
    ['viettel', 'Viettel Post'],
    ['delayed', '⚠️ Cảnh báo giao trễ'],
  ];

  const filtered = list.filter((item) => {
    if (shippingFilter === 'all') return true;
    if (shippingFilter === 'spx') return item.carrier.includes('SPX');
    if (shippingFilter === 'jnt') return item.carrier.includes('J&T');
    if (shippingFilter === 'ghtk') return item.carrier.includes('GHTK');
    if (shippingFilter === 'viettel') return item.carrier.includes('Viettel');
    if (shippingFilter === 'delayed') return item.isDelayed;
    return true;
  });

  app.innerHTML = `
    ${header}

    <div class="notice dev-notice">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Quản lý điều phối đơn vị vận chuyển (SPX Express, J&T, GHTK, Viettel Post), theo dõi lộ trình thời gian thực và cảnh báo rủi ro giao hàng trễ / thất lạc.
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Đang chờ bưu tá lấy</div>
        <div class="number">18</div>
        <small class="sub">Tạo vận đơn, chờ lấy hàng</small>
      </div>
      <div class="metric">
        <div class="metric-title">Đang trung chuyển</div>
        <div class="number amber">42</div>
        <small class="sub">Luân chuyển giữa các Hub SOC</small>
      </div>
      <div class="metric">
        <div class="metric-title">Đang giao hàng</div>
        <div class="number" style="color:var(--green)">29</div>
        <small class="sub">Bưu tá đang trên đường phát</small>
      </div>
      <div class="metric">
        <div class="metric-title">Cảnh báo giao trễ / Chờ hoàn</div>
        <div class="number danger">5</div>
        <small class="sub">Khách hẹn lại > 2 lần hoặc quá SLA</small>
      </div>
    </div>

    <div class="steps">
      ${filters
        .map(
          ([val, label]) => `
        <button type="button" class="step ${shippingFilter === val ? 'on' : ''}" onclick="setShippingFilter('${val}')">
          ${label}
          <span class="filter-count">
            ${
              val === 'all'
                ? list.length
                : val === 'delayed'
                ? list.filter((s) => s.isDelayed).length
                : list.filter((s) => s.carrier.toLowerCase().includes(val)).length
            }
          </span>
        </button>
      `
        )
        .join('')}
    </div>

    <div class="panel">
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Mã vận đơn / Đơn hàng</th>
              <th>Kênh & Khách hàng</th>
              <th>Tuyến hành trình</th>
              <th style="width:145px;text-align:center">Trạng thái vận chuyển</th>
              <th>Shipper phụ trách</th>
              <th style="width:190px;text-align:right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (s) => `
              <tr>
                <td>
                  <b style="color:var(--ink)">${esc(s.trackingCode)}</b>
                  <br>
                  <small class="sub">Đơn: <b>${esc(s.orderCode)}</b></small>
                  <span class="carrier-pill ${s.carrierClass}" style="margin-left:4px">${esc(s.carrier)}</span>
                </td>
                <td>
                  <b>${esc(s.customerName)}</b> · <small class="sub">${esc(s.customerPhone)}</small>
                  <br>
                  <span class="channel-pill channel-${s.channel.toLowerCase().includes('shopee') ? 'shopee' : s.channel.toLowerCase().includes('tiktok') ? 'tiktok' : s.channel.toLowerCase().includes('kiotviet') ? 'pos' : 'web'}">
                    ${esc(s.channel)}
                  </span>
                </td>
                <td>
                  <div style="font-size:12px;color:var(--muted)">Từ: ${esc(s.senderHub)}</div>
                  <div style="font-size:12.5px;font-weight:600">Đến: ${esc(s.destination)}</div>
                </td>
                <td style="text-align:center">
                  <span class="tag-status ${s.statusClass}">${esc(s.status)}</span>
                  <br><small class="sub" style="font-size:11px;color:${s.isDelayed ? '#cf3737' : 'inherit'}">${esc(s.note)}</small>
                </td>
                <td>
                  <b>${esc(s.shipper)}</b>
                  <br><small class="sub">📞 ${esc(s.shipperPhone)} · ${esc(s.updatedAt)}</small>
                </td>
                <td style="text-align:right">
                  <button class="btn-action-main primary" onclick="viewTrackingModal('${esc(s.trackingCode)}')">Lộ trình</button>
                  <button class="btn-action-sub secondary" onclick="nudgeShipper('${esc(s.trackingCode)}')">Giục phát</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 3. TRANG SẢN PHẨM (PRODUCTS)
function renderProducts(header) {
  app.innerHTML = `
    ${header}
    <div class="notice info">
      💡 <b>Phân tích rủi ro sản phẩm:</b> Hệ thống tự động đo lường tỷ lệ hoàn trả của từng SKU để giúp shop phát hiện các mặt hàng có nguy cơ bị gian lận, tráo đổi hoặc dễ hư hỏng khi vận chuyển.
    </div>

    <div class="panel">
      <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Mã SKU / Tên sản phẩm</th>
            <th>Danh mục</th>
            <th>Giá niêm yết</th>
            <th>Tồn kho khả dụng</th>
            <th style="width:125px;text-align:center">Đang đóng gói</th>
            <th>Tỷ lệ hoàn hàng</th>
            <th style="width:115px;text-align:center">Mức độ rủi ro</th>
          </tr>
        </thead>
        <tbody>
          ${(products.length ? products : getMockProducts())
      .map(
        (p) => `
            <tr>
              <td>
                <b>${esc(p.name)}</b>
                <br><small class="sub">SKU: <b>${esc(p.sku)}</b></small>
              </td>
              <td><span class="tag">${esc(p.category || 'Thời trang')}</span></td>
              <td><b>${formatMoney(p.price)}</b></td>
              <td><b>${p.stock}</b> cái</td>
              <td style="text-align:center"><span class="tag-fixed tag-warn">${p.reserved || 0} đang giữ</span></td>
              <td>
                <b style="color:${p.returnRate > 10 ? '#cf3737' : p.returnRate > 5 ? '#d97706' : '#107c41'}">
                  ${p.returnRate || 0}%
                </b>
                <small class="sub">(${p.totalReturns || 0}/${p.totalOrders || 0} đơn)</small>
              </td>
              <td style="text-align:center">
                <span class="tag-risk ${p.riskLevel === 'Cao' ? 'tag-danger' : p.riskLevel === 'Trung bình' ? 'tag-warn' : 'tag-success'}">
                  ${esc(p.riskLevel || 'Thấp')}
                </span>
              </td>
            </tr>
          `
      )
      .join('')}
        </tbody>
      </table>
      </div>
    </div>
  `;
}

function getMockProducts() {
  return [
    { sku: 'TN-TWS-PRO', name: 'Tai nghe Bluetooth chống ồn TWS Pro Max', category: 'Phụ kiện điện tử', price: 590000, stock: 64, reserved: 12, returnRate: 14.2, totalReturns: 44, totalOrders: 310, riskLevel: 'Cao' },
    { sku: 'SM-WHT-M', name: 'Áo sơ mi Oxford trắng cao cấp (Size M)', category: 'Thời trang', price: 289000, stock: 145, reserved: 8, returnRate: 2.4, totalReturns: 10, totalOrders: 420, riskLevel: 'Thấp' },
    { sku: 'TS-BLK-L', name: 'Áo thun Streetwear phản quang Oversize (Size L)', category: 'Thời trang', price: 199000, stock: 82, reserved: 15, returnRate: 3.1, totalReturns: 9, totalOrders: 280, riskLevel: 'Thấp' },
    { sku: 'KD-B5-LARO', name: 'Kem dưỡng ẩm phục hồi Panthenol B5 100ml', category: 'Mỹ phẩm', price: 360000, stock: 110, reserved: 20, returnRate: 7.2, totalReturns: 28, totalOrders: 390, riskLevel: 'Trung bình' },
    { sku: 'BLZ-KOR-S', name: 'Áo Blazer Unisex form rộng Hàn Quốc (Size S)', category: 'Thời trang', price: 480000, stock: 35, reserved: 6, returnRate: 8.5, totalReturns: 14, totalOrders: 160, riskLevel: 'Trung bình' },
  ];
}

// 4. TRANG KHO HÀNG (INVENTORY)
let inventoryData = null;

function setInventorySubTab(tab) {
  inventorySubTab = tab;
  render();
}

function getMockStockLedgerData() {
  return [
    {
      time: '10/11/2026 15:10',
      sku: 'SM-WHT-M',
      productName: 'Áo sơ mi Oxford trắng cao cấp (Size M)',
      type: 'Xuất bán KiotViet POS',
      typeClass: 'tag-warn',
      qty: -1,
      stockAfter: 145,
      docCode: 'FX-1032',
      actor: 'Nhân viên POS Q.1'
    },
    {
      time: '10/11/2026 14:00',
      sku: 'TN-TWS-PRO',
      productName: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      type: 'Nhập hoàn kho (Kiểm tra đạt)',
      typeClass: 'tag-success',
      qty: +1,
      stockAfter: 64,
      docCode: 'FX-1030 (SPX-RT-5512)',
      actor: 'Kho Hàng Hoàn - FixIt'
    },
    {
      time: '10/11/2026 11:20',
      sku: 'TS-BLK-L',
      productName: 'Áo thun Streetwear phản quang (Size L)',
      type: 'Xuất bán Website Shopify',
      typeClass: 'tag-warn',
      qty: -1,
      stockAfter: 82,
      docCode: 'FX-1031',
      actor: 'Hệ thống tự động'
    },
    {
      time: '09/11/2026 16:30',
      sku: 'TN-TWS-PRO',
      productName: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      type: 'Xuất đóng hàng Shopee',
      typeClass: 'tag-warn',
      qty: -1,
      stockAfter: 63,
      docCode: 'FX-1025',
      actor: 'Đóng gói Tân Bình'
    },
    {
      time: '08/11/2026 09:00',
      sku: 'KD-B5-LARO',
      productName: 'Kem dưỡng ẩm phục hồi Panthenol B5 100ml',
      type: 'Nhập hàng từ Nhà Cung Cấp',
      typeClass: 'tag-info',
      qty: +50,
      stockAfter: 110,
      docCode: 'PO-2026-B5-01',
      actor: 'Thủ kho Nguyễn Huy'
    },
    {
      time: '07/11/2026 17:30',
      sku: 'TN-TWS-PRO',
      productName: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      type: 'Tạm giữ làm vật chứng khiếu nại',
      typeClass: 'tag-danger',
      qty: -1,
      stockAfter: 62,
      docCode: 'CLAIM-FX-1028',
      actor: 'Bộ phận Pháp chế FixIt'
    }
  ];
}

function getMockSkuMappingData() {
  return [
    {
      internalSku: 'TN-TWS-PRO',
      name: 'Tai nghe Bluetooth chống ồn TWS Pro Max',
      shopeeSku: 'SP-TWS-PRO-ANC',
      tiktokSku: 'TK-TWS-PROMAX-V1',
      webSku: 'WEB-TWS-PRO',
      syncStatus: 'Đồng bộ tự động',
      syncClass: 'tag-success',
      totalAvailable: 64
    },
    {
      internalSku: 'SM-WHT-M',
      name: 'Áo sơ mi Oxford trắng cao cấp (Size M)',
      shopeeSku: 'SP-OXFORD-WHT-M',
      tiktokSku: 'TK-SHIRT-OXF-M',
      webSku: 'WEB-OXFORD-M',
      syncStatus: 'Đồng bộ tự động',
      syncClass: 'tag-success',
      totalAvailable: 145
    },
    {
      internalSku: 'TS-BLK-L',
      name: 'Áo thun Streetwear phản quang Oversize (Size L)',
      shopeeSku: 'SP-TEE-STREET-BLK-L',
      tiktokSku: 'TK-TEE-STREET-L',
      webSku: 'WEB-TEE-BLK-L',
      syncStatus: 'Đồng bộ tự động',
      syncClass: 'tag-success',
      totalAvailable: 82
    },
    {
      internalSku: 'KD-B5-LARO',
      name: 'Kem dưỡng ẩm phục hồi Panthenol B5 100ml',
      shopeeSku: 'SP-CREAM-B5-100',
      tiktokSku: 'TK-LARO-B5-100ML',
      webSku: 'WEB-B5-100ML',
      syncStatus: 'Đồng bộ tự động',
      syncClass: 'tag-success',
      totalAvailable: 110
    },
    {
      internalSku: 'BLZ-KOR-S',
      name: 'Áo Blazer Unisex form rộng Hàn Quốc (Size S)',
      shopeeSku: 'SP-BLAZER-KOR-S',
      tiktokSku: 'Chưa liên kết',
      webSku: 'WEB-BLAZER-S',
      syncStatus: '⚠️ Thiếu kênh TikTok',
      syncClass: 'tag-warn',
      totalAvailable: 35
    }
  ];
}

function renderInventory(header) {
  const pList = inventoryData?.products || products || getMockProducts();
  const summary = inventoryData?.summary || {
    totalStock: 726,
    totalReserved: 86,
    totalInInspection: 12,
    totalRestockedCount: 18,
    totalDisputedCount: 4,
  };
  const ledgerList = getMockStockLedgerData();
  const mappingList = getMockSkuMappingData();

  app.innerHTML = `
    ${header}

    <div class="notice dev-notice">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Theo dõi biến động thẻ kho nhập-xuất-tồn và liên kết mã SKU đa kênh (Mapping) đồng bộ giữa Shopee, TikTok Shop, Website và Kho tổng FixIt.
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Tổng tồn kho thực tế</div>
        <div class="number">${summary.totalStock}</div>
        <small class="sub">Số lượng khả dụng trong kho</small>
      </div>
      <div class="metric">
        <div class="metric-title">Đang đóng gói / Chờ giao</div>
        <div class="number amber">${summary.totalReserved}</div>
        <small class="sub">Đã giữ chỗ cho đơn mới</small>
      </div>
      <div class="metric">
        <div class="metric-title">Hàng hoàn đã nhập lại kho</div>
        <div class="number" style="color:#107c41">${summary.totalRestockedCount}</div>
        <small class="sub">Kiểm tra nguyên vẹn, không lỗi</small>
      </div>
      <div class="metric">
        <div class="metric-title">Hàng lỗi / Đang khiếu nại</div>
        <div class="number danger">${summary.totalDisputedCount}</div>
        <small class="sub">Giữ làm vật chứng đối soát</small>
      </div>
    </div>

    <div class="steps" style="margin-bottom:14px">
      <button type="button" class="step ${inventorySubTab === 'sku' ? 'on' : ''}" onclick="setInventorySubTab('sku')">
        📦 Cân đối tồn kho SKU
      </button>
      <button type="button" class="step ${inventorySubTab === 'ledger' ? 'on' : ''}" onclick="setInventorySubTab('ledger')">
        📋 Lịch sử Nhập - Xuất - Tồn <span class="tag-dev">Mới</span>
      </button>
      <button type="button" class="step ${inventorySubTab === 'mapping' ? 'on' : ''}" onclick="setInventorySubTab('mapping')">
        🔗 Liên kết SKU đa kênh (Mapping) <span class="tag-dev">Mới</span>
      </button>
    </div>

    ${inventorySubTab === 'sku' ? `
      <div class="panel">
        <h2>Cân đối kho hàng theo SKU</h2>
        <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Mã SKU</th>
              <th>Tên sản phẩm</th>
              <th>Tồn sẵn sàng</th>
              <th style="width:125px;text-align:center">Đang giữ chỗ</th>
              <th style="width:135px;text-align:center">Trạng thái tồn kho</th>
            </tr>
          </thead>
          <tbody>
            ${pList
              .map(
                (p) => `
              <tr>
                <td><b>${esc(p.sku)}</b></td>
                <td>${esc(p.name)}</td>
                <td><b style="color:var(--green)">${p.stock}</b></td>
                <td style="text-align:center"><span class="tag-fixed tag-warn">${p.reserved || 0}</span></td>
                <td style="text-align:center">
                  <span class="tag-fixed ${p.stock < 40 ? 'tag-danger' : 'tag-success'}">
                    ${p.stock < 40 ? 'Sắp hết hàng' : 'Đủ hàng bán'}
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        </div>
      </div>
    ` : inventorySubTab === 'ledger' ? `
      <div class="panel">
        <h2>Lịch sử biến động thẻ kho (Nhập - Xuất - Tồn)</h2>
        <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Mã SKU & Sản phẩm</th>
              <th style="width:170px;text-align:center">Loại giao dịch</th>
              <th style="width:100px;text-align:center">Biến động</th>
              <th>Tồn sau GD</th>
              <th>Chứng từ / Mã đơn</th>
              <th>Người thực hiện</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerList
              .map(
                (item) => `
              <tr>
                <td><small class="sub">${esc(item.time)}</small></td>
                <td>
                  <b>${esc(item.productName)}</b>
                  <br><small class="sub">SKU: <b>${esc(item.sku)}</b></small>
                </td>
                <td style="text-align:center">
                  <span class="tag-status ${item.typeClass}">${esc(item.type)}</span>
                </td>
                <td style="text-align:center">
                  <b style="font-size:14px;color:${item.qty > 0 ? '#107c41' : '#cf3737'}">
                    ${item.qty > 0 ? '+' + item.qty : item.qty}
                  </b>
                </td>
                <td><b>${item.stockAfter}</b> cái</td>
                <td><b>${esc(item.docCode)}</b></td>
                <td><small class="sub">${esc(item.actor)}</small></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        </div>
      </div>
    ` : `
      <div class="panel">
        <h2>Ánh xạ & Liên kết mã SKU giữa các kênh bán</h2>
        <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>SKU Kho tổng</th>
              <th>Tên sản phẩm</th>
              <th>Mã SKU Shopee</th>
              <th>Mã SKU TikTok Shop</th>
              <th>Mã SKU Website / POS</th>
              <th style="width:150px;text-align:center">Trạng thái đồng bộ</th>
              <th style="width:110px;text-align:right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${mappingList
              .map(
                (m) => `
              <tr>
                <td><b style="color:var(--ink)">${esc(m.internalSku)}</b></td>
                <td>${esc(m.name)}</td>
                <td><span class="channel-pill channel-shopee">${esc(m.shopeeSku)}</span></td>
                <td><span class="channel-pill channel-tiktok">${esc(m.tiktokSku)}</span></td>
                <td><span class="channel-pill channel-web">${esc(m.webSku)}</span></td>
                <td style="text-align:center">
                  <span class="tag-status ${m.syncClass}">${esc(m.syncStatus)}</span>
                </td>
                <td style="text-align:right">
                  <button class="btn-xs secondary" onclick="alert('Đã cập nhật liên kết ánh xạ cho SKU ${esc(m.internalSku)}')">Sửa mapping</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        </div>
      </div>
    `}
  `;
}

// 5. TRANG GIAN HÀNG TMĐT & KÊNH BÁN HÀNG (STORES)
function renderStores(header) {
  const storeList = [
    { code: 'SHOP-SP-TECH', name: 'FixIt Tech & Gear Flagship', platform: 'Shopee', shopType: 'Shop Mall', status: 'Đang kết nối', activeOrders: 312, returnRate: 6.2, totalRevenue: 382400000, rating: 4.9 },
    { code: 'SHOP-TK-FASHION', name: 'FixIt Fashion Official Store', platform: 'TikTok Shop', shopType: 'Shop Mall', status: 'Đang kết nối', activeOrders: 184, returnRate: 4.5, totalRevenue: 145200000, rating: 4.8 },
    { code: 'SHOP-SP-BEAUTY', name: 'FixIt Skincare & Cosmetics', platform: 'Shopee', shopType: 'Shop Yêu Thích', status: 'Đang kết nối', activeOrders: 98, returnRate: 3.1, totalRevenue: 86900000, rating: 4.7 },
    { code: 'SHOP-TK-HOME', name: 'FixIt Home & Living', platform: 'TikTok Shop', shopType: 'Shop Thường', status: 'Đang kết nối', activeOrders: 64, returnRate: 2.0, totalRevenue: 52300000, rating: 4.9 },
    { code: 'SHOP-WEB-DIRECT', name: 'FixIt Official Web Store', platform: 'Shopify Website', shopType: 'Website Brand', status: 'Đang kết nối', activeOrders: 52, returnRate: 1.8, totalRevenue: 78500000, rating: 5.0 },
    { code: 'SHOP-POS-Q1', name: 'FixIt Flagship Store Q.1 TP.HCM', platform: 'KiotViet POS', shopType: 'Cửa hàng Offline', status: 'Đang kết nối', activeOrders: 38, returnRate: 0.5, totalRevenue: 51200000, rating: 4.9 },
  ];

  app.innerHTML = `
    ${header}

    <div class="notice dev-notice">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Gom hoạt động từ cửa hàng vật lý (POS), website độc lập và các sàn TMĐT về một hệ thống quản lý tập trung.
    </div>

    <div class="card-grid">
      ${storeList
      .map(
        (s) => {
          const isShopee = s.platform.toLowerCase().includes('shopee');
          const isTiktok = s.platform.toLowerCase().includes('tiktok');
          const isPos = s.platform.toLowerCase().includes('kiotviet') || s.platform.toLowerCase().includes('pos');
          const channelClass = isShopee ? 'shopee' : isTiktok ? 'tiktok' : isPos ? 'pos' : 'web';
          return `
          <div class="card">
            <div class="card-header">
              <div>
                <span class="channel-pill channel-${channelClass}">${esc(s.platform)}</span>
                <div class="card-title" style="margin-top:6px">${esc(s.name)}</div>
                <div class="card-sub">${esc(s.shopType)} · Đánh giá ⭐ ${s.rating}</div>
              </div>
              <span class="tag tag-success">${esc(s.status)}</span>
            </div>
            <div class="card-stat">
              <span class="sub">Doanh số tháng:</span>
              <b>${formatMoney(s.totalRevenue)}</b>
            </div>
            <div class="card-stat">
              <span class="sub">Đơn hàng đang xử lý:</span>
              <b>${s.activeOrders} đơn</b>
            </div>
            <div class="card-stat">
              <span class="sub">Tỷ lệ hoàn hàng:</span>
              <b style="color:${s.returnRate > 5 ? '#cf3737' : '#107c41'}">${s.returnRate}%</b>
            </div>
            <div class="end" style="margin-top:12px">
              <button class="btn-xs secondary" onclick="alert('Đã đồng bộ trạng thái đơn hàng và tồn kho mới nhất từ kênh ${esc(s.name)}')">Đồng bộ API</button>
            </div>
          </div>
        `;
        }
      )
      .join('')}
    </div>
  `;
}

// 6. TRANG HÀNG HOÀN VỀ (RETURNS)
function renderReturns(header) {
  const returnOrders = orders.filter((o) => o.returnReason || o.status.includes('hoàn') || o.status.includes('kiểm tra'));

  app.innerHTML = `
    ${header}

    <div class="panel">
      <h2>Quét mã nhận kiện hàng hoàn</h2>
      <p class="sub">Nhập mã đơn hàng hoặc quét mã vận đơn trên nhãn kiện hàng hoàn (SPX-RT..., JNT-RT...).</p>
      <div class="formrow">
        <input id="returnInput" placeholder="VD: FX-1029 hoặc SPX-RT-23194" onkeydown="if(event.key==='Enter') scanReturnQuick()">
        <button class="btn danger" onclick="scanReturnQuick()">Tiếp nhận & Mở kiện</button>
      </div>
    </div>

    <div class="panel">
      <h2>Danh sách kiện hoàn đang kiểm tra / chờ đối soát (${returnOrders.length})</h2>
      <fixit-order-table>${window.FixItOrderTable.template(returnOrders, esc)}</fixit-order-table>
    </div>
  `;
}

function scanReturnQuick() {
  const code = document.querySelector('#returnInput').value.trim();
  if (!code) return alert('Vui lòng nhập mã đơn hoặc mã vận đơn hoàn.');
  scan(code, 'return');
}

// 7. TRANG VIDEO ĐÃ ĐÓNG GÓI (EVIDENCE)
function renderEvidence(header) {
  const ordersWithEvidence = orders.filter((o) => o.evidence && o.evidence.length > 0);

  app.innerHTML = `
    ${header}

    <div class="panel">
      <h2>Tra cứu video đóng gói theo mã</h2>
      <div class="formrow">
        <input id="findcode" placeholder="Nhập mã đơn hàng (FX-1026) hoặc mã vận đơn (JNT-TK-901142)..." onkeydown="if(event.key==='Enter') findEvidence()">
        <button class="btn" onclick="findEvidence()">🔍 Tìm video</button>
      </div>
      <div id="result" style="margin-top:16px"></div>
    </div>

    <div class="panel">
      <h2>Danh sách đơn đã có video bằng chứng (${ordersWithEvidence.length})</h2>
      <fixit-order-table>${window.FixItOrderTable.template(ordersWithEvidence, esc)}</fixit-order-table>
    </div>
  `;
}

// 8. TRANG HỒ SƠ KHIẾU NẠI (CLAIMS)
function renderClaims(header) {
  const totalAmount = claims.reduce((s, c) => s + (c.claimAmount || 0), 0);
  const totalApproved = claims.reduce((s, c) => s + (c.approvedAmount || 0), 0);
  const totalReceived = claims.reduce((s, c) => s + (c.receivedAmount || 0), 0);

  app.innerHTML = `
    ${header}

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Tiền yêu cầu bồi hoàn</div>
        <div class="number amber">${formatMoney(totalAmount)}</div>
        <small class="sub">Tổng giá trị đang tranh chấp</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tiền sàn đã duyệt</div>
        <div class="number" style="color:#0369a1">${formatMoney(totalApproved)}</div>
        <small class="sub">Shopee & TikTok phê duyệt</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tiền đã thực nhận về ví</div>
        <div class="number" style="color:#107c41">${formatMoney(totalReceived)}</div>
        <small class="sub">Đã cộng vào số dư tài khoản</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tổng hồ sơ khiếu nại</div>
        <div class="number">${claims.length}</div>
        <small class="sub">Được bảo vệ bằng chứng</small>
      </div>
    </div>

    <div class="panel">
      <h2>Danh sách hồ sơ tranh chấp hàng hoàn</h2>
      ${claims.length
      ? `
        <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Mã đơn / Vận đơn</th>
              <th style="width:115px;text-align:center">Sàn</th>
              <th>Lý do khiếu nại</th>
              <th style="width:130px;text-align:center">Cấp độ bằng chứng</th>
              <th>Số tiền yêu cầu</th>
              <th style="width:145px;text-align:center">Trạng thái hồ sơ</th>
              <th style="width:190px;text-align:right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${claims
        .map(
          (c) => `
              <tr>
                <td>
                  <b>${esc(c.orderCode)}</b>
                  <br><small class="sub">${esc(c.trackingCode || 'N/A')}</small>
                </td>
                <td style="text-align:center">
                  <span class="channel-pill channel-${(c.channel || '').toLowerCase().includes('shopee') ? 'shopee' : 'tiktok'}">
                    ${esc(c.channel || 'Shopee')}
                  </span>
                </td>
                <td>
                  <b>${esc(c.reason)}</b>
                  <br><small class="sub">${esc(c.description || '').slice(0, 70)}...</small>
                </td>
                <td style="text-align:center">
                  <span class="tag-fixed ${c.evidenceStrength === 'Mạnh nhất' ? 'tag-success' : c.evidenceStrength === 'Mạnh' ? 'tag-info' : 'tag-warn'}">
                    ⭐ ${esc(c.evidenceStrength || 'Mạnh')}
                  </span>
                </td>
                <td><b>${formatMoney(c.claimAmount)}</b></td>
                <td style="text-align:center">
                  <span class="tag-status ${c.status === 'Đã bồi hoàn' ? 'tag-success' : c.status === 'Bị từ chối' ? 'tag-danger' : 'tag-warn'}">
                    ${esc(c.status)}
                  </span>
                </td>
                <td style="text-align:right">
                  <button class="btn-action-main primary" style="width:175px" onclick="viewClaimDetailModal('${c._id}')">Xem & Copy đơn gửi sàn</button>
                </td>
              </tr>
            `
        )
        .join('')}
          </tbody>
        </table>
        </div>
      `
      : '<div class="empty-state">Chưa có hồ sơ khiếu nại nào. Khi phát hiện hàng hoàn sai khác, bấm Tạo hồ sơ khiếu nại.</div>'
    }
    </div>
  `;
}

// 8.5. TRANG SÀN GIẢ LẬP (DISPUTE SIMULATOR & ARBITRATION)
function renderSimulator(header) {
  const stats = simulatorData?.stats || {
    totalSubmitted: claims.length,
    pendingReview: claims.filter((c) => ['Đang khiếu nại', 'Chờ gửi sàn', 'Bản nháp'].includes(c.status)).length,
    approvedCount: claims.filter((c) => c.status === 'Đã bồi hoàn').length,
    rejectedCount: claims.filter((c) => c.status === 'Bị từ chối').length,
    totalCompensated: claims.reduce((s, c) => s + (c.receivedAmount || 0), 0),
    approvalRate: 85,
    walletBalance: 15420000,
  };

  const allClaims = simulatorData?.claims || claims || [];
  let filtered = allClaims;
  if (simulatorFilter === 'pending') {
    filtered = allClaims.filter((c) => ['Đang khiếu nại', 'Chờ gửi sàn', 'Bản nháp'].includes(c.status));
  } else if (simulatorFilter === 'approved') {
    filtered = allClaims.filter((c) => c.status === 'Đã bồi hoàn');
  } else if (simulatorFilter === 'rejected') {
    filtered = allClaims.filter((c) => c.status === 'Bị từ chối');
  }

  app.innerHTML = `
    ${header}

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Tổng hồ sơ sàn tiếp nhận</div>
        <div class="number">${stats.totalSubmitted}</div>
        <small class="sub">Hồ sơ từ shop gửi qua Open API</small>
      </div>
      <div class="metric">
        <div class="metric-title">Chờ trọng tài sàn duyệt</div>
        <div class="number ${stats.pendingReview > 0 ? 'amber' : ''}">${stats.pendingReview}</div>
        <small class="sub">Cần phán quyết đối chiếu video</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tỷ lệ duyệt bồi hoàn</div>
        <div class="number" style="color:#0284c7">${stats.approvalRate}%</div>
        <small class="sub">Bằng chứng video FixIt bảo vệ</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tổng tiền đã đền bù vào ví</div>
        <div class="number" style="color:#059669">${formatMoney(stats.totalCompensated)}</div>
        <small class="sub">Đã giải ngân về số dư ví người bán</small>
      </div>
    </div>

    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        <div>
          <h2 style="margin:0 0 4px">⚖️ Cổng Trọng tài Giải quyết Tranh chấp Sàn TMĐT (Dispute Arbitrator)</h2>
          <small class="sub">Mô phỏng bộ phận Trọng tài Khiếu nại Shopee / TikTok Shop xem xét bằng chứng và ra phán quyết</small>
        </div>
        <button class="btn secondary" onclick="viewWalletModal()">💳 Xem Ví Người Bán</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px;overflow-x:auto">
        <button class="step ${simulatorFilter === 'all' ? 'on' : ''}" onclick="setSimulatorFilter('all')">
          Tất cả <span class="filter-count">${stats.totalSubmitted}</span>
        </button>
        <button class="step ${simulatorFilter === 'pending' ? 'on' : ''}" onclick="setSimulatorFilter('pending')">
          ⏳ Chờ sàn duyệt <span class="filter-count" style="background:#fee2e2;color:#b91c1c">${stats.pendingReview}</span>
        </button>
        <button class="step ${simulatorFilter === 'approved' ? 'on' : ''}" onclick="setSimulatorFilter('approved')">
          ✅ Đã chấp thuận <span class="filter-count" style="background:#dcfce7;color:#15803d">${stats.approvedCount}</span>
        </button>
        <button class="step ${simulatorFilter === 'rejected' ? 'on' : ''}" onclick="setSimulatorFilter('rejected')">
          ❌ Đã từ chối <span class="filter-count">${stats.rejectedCount}</span>
        </button>
      </div>

      ${filtered.length ? `
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>Mã tranh chấp / Ngày gửi</th>
                <th>Mã đơn / Kênh</th>
                <th>Lý do & Khác biệt AI</th>
                <th style="width:125px;text-align:center">Cấp độ chứng cứ</th>
                <th>Số tiền yêu cầu</th>
                <th style="width:145px;text-align:center">Trạng thái sàn</th>
                <th style="width:180px;text-align:right">Phán quyết</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((c) => {
                const isPending = ['Đang khiếu nại', 'Chờ gửi sàn', 'Bản nháp'].includes(c.status);
                const isApproved = c.status === 'Đã bồi hoàn';
                const isShopee = (c.channel || '').toLowerCase().includes('shopee');
                return `
                  <tr>
                    <td>
                      <b style="color:var(--ink)">${esc(c.apiDisputeId || `DISPUTE-#${c._id.slice(-6).toUpperCase()}`)}</b>
                      <br><small class="sub">${formatDate(c.submittedAt || c.createdAt)}</small>
                    </td>
                    <td>
                      <b>#${esc(c.orderCode)}</b>
                      <br>
                      <span class="channel-pill channel-${isShopee ? 'shopee' : 'tiktok'}" style="margin-top:2px">
                        ${esc(c.channel || 'Shopee')}
                      </span>
                    </td>
                    <td>
                      <b>${esc(c.reason)}</b>
                      <br><small class="sub">${esc(c.description || '').slice(0, 75)}${(c.description || '').length > 75 ? '...' : ''}</small>
                    </td>
                    <td style="text-align:center">
                      <span class="tag-fixed ${c.evidenceStrength === 'Mạnh nhất' ? 'tag-success' : 'tag-info'}">
                        ⭐ ${esc(c.evidenceStrength || 'Mạnh')}
                      </span>
                    </td>
                    <td><b>${formatMoney(c.claimAmount)}</b></td>
                    <td style="text-align:center">
                      <span class="tag-status ${isApproved ? 'tag-success' : isPending ? 'tag-warn' : 'tag-danger'}">
                        ${isApproved ? 'Đã bồi hoàn' : isPending ? 'Chờ sàn duyệt' : 'Bị từ chối'}
                      </span>
                    </td>
                    <td style="text-align:right">
                      ${isPending
                        ? `<button class="btn-action-main danger" style="width:160px" onclick="openDisputeJudgeModal('${c._id}')">⚖️ Trọng tài phán quyết</button>`
                        : `<button class="btn-action-main secondary" style="width:160px" onclick="openDisputeJudgeModal('${c._id}')">👁️ Xem phán quyết</button>`
                      }
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">Không có hồ sơ nào trong mục này.</div>
      `}
    </div>
  `;
}

function setSimulatorFilter(filter) {
  simulatorFilter = filter;
  render();
}

// ==================== ĐỐI SOÁT TIỀN SÀN & CHIẾT KHẤU PHÍ (RECONCILIATION) ====================
function getMockReconciliationData() {
  return {
    metrics: {
      totalGMV: 128450000,
      totalFees: 14129500,
      totalNet: 114320500,
      feePercentage: 11.0,
      disputedCount: 2,
      disputedAmount: 56000
    },
    periods: [
      {
        id: 'REC-2026-W45',
        name: 'Kỳ đối soát Tuần 45/2026 (03/11 - 09/11)',
        platform: 'Shopee',
        orderCount: 142,
        gmv: 78200000,
        fees: 8602000,
        netPayout: 69598000,
        bankAccount: 'Techcombank - ****6886',
        payoutDate: '10/11/2026',
        status: 'Đã quyết toán',
        statusClass: 'tag-success'
      },
      {
        id: 'REC-2026-TK-W45',
        name: 'Kỳ thanh toán TikTok Shop Tuần 45 (02/11 - 08/11)',
        platform: 'TikTok Shop',
        orderCount: 88,
        gmv: 50250000,
        fees: 5527500,
        netPayout: 44722500,
        bankAccount: 'Vietcombank - ****3999',
        payoutDate: '09/11/2026',
        status: 'Đã quyết toán',
        statusClass: 'tag-success'
      },
      {
        id: 'REC-2026-W46-PENDING',
        name: 'Kỳ đối soát Tuần 46/2026 (10/11 - 16/11)',
        platform: 'Shopee',
        orderCount: 45,
        gmv: 24800000,
        fees: 2728000,
        netPayout: 22072000,
        bankAccount: 'Techcombank - ****6886',
        payoutDate: 'Dự kiến 17/11/2026',
        status: 'Đang tích lũy',
        statusClass: 'tag-warn'
      }
    ],
    items: [
      {
        orderCode: 'FX-1025',
        trackingCode: 'SPX-VN-884210',
        channel: 'Shopee',
        gmv: 590000,
        fixedFee: 23600,
        paymentFee: 19470,
        voucherFee: 15000,
        shippingFee: 32000,
        shippingSubsidy: 32000,
        actualShippingFee: 32000,
        netPayout: 531930,
        matchStatus: 'Khớp chuẩn 100%',
        matchClass: 'tag-success',
        hasAnomaly: false,
        feeBreakdown: 'Phí cố định: 23.600đ (4%) | Phí TT: 19.470đ (3.3%) | Voucher shop: 15.000đ | Cước VC: Miễn phí'
      },
      {
        orderCode: 'FX-1026',
        trackingCode: 'JNT-TK-901142',
        channel: 'TikTok Shop',
        gmv: 480000,
        fixedFee: 19200,
        paymentFee: 15840,
        voucherFee: 0,
        shippingFee: 28000,
        shippingSubsidy: 28000,
        actualShippingFee: 28000,
        netPayout: 444960,
        matchStatus: 'Khớp chuẩn 100%',
        matchClass: 'tag-success',
        hasAnomaly: false,
        feeBreakdown: 'Phí giao dịch: 19.200đ | Phí kỹ thuật: 15.840đ'
      },
      {
        orderCode: 'FX-1027',
        trackingCode: 'SPX-VN-331092',
        channel: 'Shopee',
        gmv: 360000,
        fixedFee: 14400,
        paymentFee: 11880,
        voucherFee: 10000,
        shippingFee: 22000,
        shippingSubsidy: 22000,
        actualShippingFee: 50000,
        netPayout: 295720,
        matchStatus: '⚠️ Lệch cước (+28.000đ)',
        matchClass: 'tag-danger',
        hasAnomaly: true,
        feeBreakdown: 'Đơn vị VC tính phụ phí vượt cân 28.000đ (Khai báo 200g, Cân thực tế 850g)'
      },
      {
        orderCode: 'FX-1030',
        trackingCode: 'SPX-RT-5512',
        channel: 'Shopee',
        gmv: 590000,
        fixedFee: 0,
        paymentFee: 0,
        voucherFee: 0,
        shippingFee: 28000,
        shippingSubsidy: 0,
        actualShippingFee: 56000,
        netPayout: -28000,
        matchStatus: '⚠️ Lệch phí hoàn (+28.000đ)',
        matchClass: 'tag-danger',
        hasAnomaly: true,
        feeBreakdown: 'Sàn khấu trừ thêm cước trả hàng chiều về vượt cam kết Freeship'
      },
      {
        orderCode: 'FX-1033',
        trackingCode: 'JNT-TK-771120',
        channel: 'TikTok Shop',
        gmv: 289000,
        fixedFee: 11560,
        paymentFee: 9537,
        voucherFee: 10000,
        shippingFee: 24000,
        shippingSubsidy: 24000,
        actualShippingFee: 24000,
        netPayout: 257903,
        matchStatus: 'Khớp chuẩn 100%',
        matchClass: 'tag-success',
        hasAnomaly: false,
        feeBreakdown: 'Phí sàn: 21.097đ | Voucher hỗ trợ shop: 10.000đ'
      }
    ]
  };
}

function setReconciliationFilter(filter) {
  reconciliationFilter = filter;
  render();
}

function renderReconciliation(header) {
  const data = getMockReconciliationData();
  const filters = [
    ['all', 'Tất cả đơn đối soát'],
    ['shopee', 'Shopee'],
    ['tiktok', 'TikTok Shop'],
    ['disputed', '⚠️ Lệch cước nghi vấn'],
  ];

  const filteredItems = data.items.filter((item) => {
    if (reconciliationFilter === 'all') return true;
    if (reconciliationFilter === 'shopee') return item.channel.toLowerCase().includes('shopee');
    if (reconciliationFilter === 'tiktok') return item.channel.toLowerCase().includes('tiktok');
    if (reconciliationFilter === 'disputed') return item.hasAnomaly;
    return true;
  });

  app.innerHTML = `
    ${header}

    <div class="notice dev-notice">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Tự động đối chiếu đơn hàng thành công, khấu trừ chiết khấu sàn (Phí cố định, Phí thanh toán, Voucher, Freeship Xtra), kiểm tra lệch cước vận chuyển và đối soát tiền thực nhận về tài khoản ngân hàng.
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Tổng GMV đã bán</div>
        <div class="number">${formatMoney(data.metrics.totalGMV)}</div>
        <small class="sub">Doanh số gộp đơn hoàn tất</small>
      </div>
      <div class="metric">
        <div class="metric-title">Phí sàn khấu trừ</div>
        <div class="number amber">${formatMoney(data.metrics.totalFees)}</div>
        <small class="sub">Chiết khấu sàn ~${data.metrics.feePercentage}%</small>
      </div>
      <div class="metric">
        <div class="metric-title">Thực nhận về ngân hàng</div>
        <div class="number" style="color:#107c41">${formatMoney(data.metrics.totalNet)}</div>
        <small class="sub">Đã quyết toán vào tài khoản</small>
      </div>
      <div class="metric">
        <div class="metric-title">Lệch cước nghi vấn</div>
        <div class="number danger">${data.metrics.disputedCount} đơn</div>
        <small class="sub">Chênh lệch ${formatMoney(data.metrics.disputedAmount)}</small>
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px">
      <h2>Các kỳ quyết toán & Chuyển khoản ngân hàng gần đây</h2>
      <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Kỳ đối soát</th>
            <th style="width:115px;text-align:center">Sàn</th>
            <th>Số đơn</th>
            <th>Doanh thu gộp</th>
            <th>Phí sàn trừ</th>
            <th>Tiền thực nhận</th>
            <th>Tài khoản nhận</th>
            <th style="width:130px;text-align:center">Trạng thái</th>
            <th style="width:120px;text-align:right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${data.periods.map((p) => {
            const isShopee = p.platform.toLowerCase().includes('shopee');
            return `
              <tr>
                <td><b>${esc(p.name)}</b></td>
                <td style="text-align:center">
                  <span class="channel-pill channel-${isShopee ? 'shopee' : 'tiktok'}">${esc(p.platform)}</span>
                </td>
                <td><b>${p.orderCount}</b> đơn</td>
                <td><b>${formatMoney(p.gmv)}</b></td>
                <td style="color:#cf3737">-${formatMoney(p.fees)}</td>
                <td style="color:#107c41"><b>${formatMoney(p.netPayout)}</b></td>
                <td><small class="sub">${esc(p.bankAccount)}<br>${esc(p.payoutDate)}</small></td>
                <td style="text-align:center">
                  <span class="tag-status ${p.statusClass}">${esc(p.status)}</span>
                </td>
                <td style="text-align:right">
                  <button class="btn-xs secondary" onclick="alert('Xem bảng sao kê chi tiết kỳ ${esc(p.id)}')">Chi tiết</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>

    <div class="steps">
      ${filters.map(([val, label]) => `
        <button type="button" class="step ${reconciliationFilter === val ? 'on' : ''}" onclick="setReconciliationFilter('${val}')">
          ${label}
          <span class="filter-count">
            ${
              val === 'all'
                ? data.items.length
                : val === 'disputed'
                ? data.items.filter((i) => i.hasAnomaly).length
                : data.items.filter((i) => i.channel.toLowerCase().includes(val)).length
            }
          </span>
        </button>
      `).join('')}
    </div>

    <div class="panel">
      <h2>Chi tiết đối soát đơn hàng & Khấu trừ chi phí</h2>
      <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Mã đơn / Vận đơn</th>
            <th style="width:115px;text-align:center">Kênh</th>
            <th>Doanh thu gộp</th>
            <th>Phí sàn trừ</th>
            <th>Thực nhận (Net)</th>
            <th style="width:170px;text-align:center">Đối soát cước</th>
            <th style="width:190px;text-align:right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${filteredItems.map((item) => {
            const isShopee = item.channel.toLowerCase().includes('shopee');
            const totalFee = item.fixedFee + item.paymentFee + item.voucherFee;
            return `
              <tr>
                <td>
                  <b style="color:var(--ink)">#${esc(item.orderCode)}</b>
                  <br><small class="sub">${esc(item.trackingCode)}</small>
                </td>
                <td style="text-align:center">
                  <span class="channel-pill channel-${isShopee ? 'shopee' : 'tiktok'}">${esc(item.channel)}</span>
                </td>
                <td><b>${formatMoney(item.gmv)}</b></td>
                <td>
                  <span style="color:#cf3737">-${formatMoney(totalFee)}</span>
                  <br><small class="sub" style="font-size:11px">${esc(item.feeBreakdown).slice(0, 40)}...</small>
                </td>
                <td style="color:${item.netPayout >= 0 ? '#107c41' : '#cf3737'}">
                  <b>${formatMoney(item.netPayout)}</b>
                </td>
                <td style="text-align:center">
                  <span class="tag-status ${item.matchClass}">${esc(item.matchStatus)}</span>
                </td>
                <td style="text-align:right">
                  <button class="btn-action-main primary" onclick="viewReconciliationDetailModal('${esc(item.orderCode)}')">Chi tiết phí</button>
                  ${item.hasAnomaly ? `
                    <button class="btn-action-sub danger" onclick="claimShippingDiscrepancy('${esc(item.orderCode)}')">Khiếu nại</button>
                  ` : `
                    <button class="btn-action-sub secondary" onclick="viewReconciliationDetailModal('${esc(item.orderCode)}')">Xem</button>
                  `}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>
  `;
}

// ==================== HÓA ĐƠN VAT & NGHĨA VỤ THUẾ TMĐT (INVOICES) ====================
function getMockInvoicesData() {
  return [
    {
      id: 'INV-2026-00486',
      number: '0000486',
      series: '1C26TMA',
      orderCode: 'FX-1025',
      channel: 'Shopee',
      customerName: 'Hoàng Minh Tuấn',
      taxCode: 'Cá nhân (Không MST)',
      buyerAddress: 'Hà Đông, Hà Nội',
      subtotal: 546296,
      vatRate: '8%',
      vatAmount: 43704,
      total: 590000,
      issueDate: '10/11/2026 10:15',
      status: 'Đã ký số CQT',
      statusClass: 'tag-success',
      provider: 'MISA meInvoice',
      cqtCode: 'TCT-00192847120'
    },
    {
      id: 'INV-2026-00485',
      number: '0000485',
      series: '1C26TMA',
      orderCode: 'FX-1026',
      channel: 'TikTok Shop',
      customerName: 'CÔNG TY TNHH GIẢI PHÁP SỐ TECHVIET',
      taxCode: '0315892401',
      buyerAddress: 'Quận Cẩm Lệ, TP. Đà Nẵng',
      subtotal: 444444,
      vatRate: '8%',
      vatAmount: 35556,
      total: 480000,
      issueDate: '09/11/2026 16:40',
      status: 'Đã ký số CQT',
      statusClass: 'tag-success',
      provider: 'VNPT-Invoice',
      cqtCode: 'TCT-00192846985'
    },
    {
      id: 'INV-2026-00487',
      number: '0000487',
      series: '1C26TMA',
      orderCode: 'FX-1031',
      channel: 'Website',
      customerName: 'Phạm Thanh Bình',
      taxCode: 'Cá nhân',
      buyerAddress: 'TP. Biên Hòa, Đồng Nai',
      subtotal: 184259,
      vatRate: '8%',
      vatAmount: 14741,
      total: 199000,
      issueDate: '10/11/2026 11:30',
      status: 'Chờ ký số',
      statusClass: 'tag-warn',
      provider: 'MISA meInvoice',
      cqtCode: 'Đang cấp mã'
    },
    {
      id: 'INV-2026-00480',
      number: '0000480',
      series: '1C26TMA',
      orderCode: 'FX-1028',
      channel: 'Shopee',
      customerName: 'Trịnh Hoài Nam',
      taxCode: 'Cá nhân',
      buyerAddress: 'Kho Hoàn Kiếm, HN',
      subtotal: 546296,
      vatRate: '8%',
      vatAmount: 43704,
      total: 590000,
      issueDate: '07/11/2026 14:00',
      status: 'Đã hủy do hoàn tiền',
      statusClass: 'tag-danger',
      provider: 'MISA meInvoice',
      cqtCode: 'BIÊN BẢN HỦY SỐ BB-0811'
    },
    {
      id: 'INV-2026-00488',
      number: 'Chưa cấp',
      series: '1C26TMA',
      orderCode: 'FX-1032',
      channel: 'KiotViet POS',
      customerName: 'Võ Minh Quân',
      taxCode: 'Cá nhân',
      buyerAddress: 'Ninh Kiều, Cần Thơ',
      subtotal: 267593,
      vatRate: '8%',
      vatAmount: 21407,
      total: 289000,
      issueDate: '10/11/2026 15:15',
      status: 'Chờ xuất HĐ',
      statusClass: 'tag-info',
      provider: 'Chưa xuất',
      cqtCode: '-'
    }
  ];
}

function setInvoiceFilter(filter) {
  invoiceFilter = filter;
  render();
}

function renderInvoices(header) {
  const invoices = getMockInvoicesData();
  const filters = [
    ['all', 'Tất cả hóa đơn'],
    ['issued', 'Đã ký số CQT'],
    ['pending', 'Chờ xuất HĐ'],
    ['cancelled', 'Hủy do hoàn tiền'],
  ];

  const filtered = invoices.filter((inv) => {
    if (invoiceFilter === 'all') return true;
    if (invoiceFilter === 'issued') return inv.status === 'Đã ký số CQT';
    if (invoiceFilter === 'pending') return inv.status.includes('Chờ');
    if (invoiceFilter === 'cancelled') return inv.status.includes('hủy');
    return true;
  });

  app.innerHTML = `
    ${header}

    <div class="notice dev-notice">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Kết nối hệ thống Hóa đơn điện tử (MISA meInvoice / VNPT-Invoice), tự động xuất hóa đơn VAT theo Nghị định 123/2020/NĐ-CP và đồng bộ dữ liệu kê khai thuế TMĐT.
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Tổng HĐ đã phát hành</div>
        <div class="number">486</div>
        <small class="sub">Hóa đơn điện tử có mã CQT</small>
      </div>
      <div class="metric">
        <div class="metric-title">Doanh thu tính thuế GTGT</div>
        <div class="number">${formatMoney(164200000)}</div>
        <small class="sub">Doanh số chịu thuế kỳ này</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tiền thuế GTGT ước tính</div>
        <div class="number amber">${formatMoney(13136000)}</div>
        <small class="sub">Thuế suất 8% & 10%</small>
      </div>
      <div class="metric">
        <div class="metric-title">Chờ xuất hóa đơn</div>
        <div class="number danger">14 đơn</div>
        <small class="sub">Cần phát hành trong 24h</small>
      </div>
    </div>

    <div class="steps">
      ${filters.map(([val, label]) => `
        <button type="button" class="step ${invoiceFilter === val ? 'on' : ''}" onclick="setInvoiceFilter('${val}')">
          ${label}
          <span class="filter-count">
            ${
              val === 'all'
                ? invoices.length
                : val === 'issued'
                ? invoices.filter((i) => i.status === 'Đã ký số CQT').length
                : val === 'pending'
                ? invoices.filter((i) => i.status.includes('Chờ')).length
                : invoices.filter((i) => i.status.includes('hủy')).length
            }
          </span>
        </button>
      `).join('')}
    </div>

    <div class="panel">
      <h2>Danh sách Hóa đơn Giá trị Gia tăng điện tử (VAT)</h2>
      <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Ký hiệu / Số HĐ</th>
            <th>Mã đơn & Kênh</th>
            <th>Khách hàng & MST</th>
            <th>Tổng tiền HĐ</th>
            <th>Tiền thuế (8%)</th>
            <th style="width:145px;text-align:center">Trạng thái HĐ</th>
            <th>Mã CQT cấp</th>
            <th style="width:190px;text-align:right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((inv) => {
            const isShopee = inv.channel.toLowerCase().includes('shopee');
            const isTiktok = inv.channel.toLowerCase().includes('tiktok');
            const isPos = inv.channel.toLowerCase().includes('kiotviet') || inv.channel.toLowerCase().includes('pos');
            const channelClass = isShopee ? 'shopee' : isTiktok ? 'tiktok' : isPos ? 'pos' : 'web';
            return `
              <tr>
                <td>
                  <b style="color:var(--ink)">${esc(inv.series)} - ${esc(inv.number)}</b>
                  <br><small class="sub">${esc(inv.issueDate)}</small>
                </td>
                <td>
                  <b>#${esc(inv.orderCode)}</b>
                  <br>
                  <span class="channel-pill channel-${channelClass}">${esc(inv.channel)}</span>
                </td>
                <td>
                  <b>${esc(inv.customerName)}</b>
                  <br><small class="sub">MST: <b>${esc(inv.taxCode)}</b></small>
                </td>
                <td><b>${formatMoney(inv.total)}</b></td>
                <td style="color:#107c41"><b>${formatMoney(inv.vatAmount)}</b></td>
                <td style="text-align:center">
                  <span class="tag-status ${inv.statusClass}">${esc(inv.status)}</span>
                </td>
                <td><small class="sub">${esc(inv.cqtCode)}</small></td>
                <td style="text-align:right">
                  <button class="btn-action-main primary" onclick="viewInvoiceModal('${esc(inv.id)}')">👁️ Xem HĐ</button>
                  <button class="btn-action-sub secondary" onclick="downloadInvoiceXml('${esc(inv.id)}')">XML</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>
  `;
}

// 9. TRANG BÁO CÁO (REPORTS)
function renderReports(header) {
  const r = reportsData || {
    financials: { totalClaimAmount: 1370000, totalReceivedAmount: 420000, winRate: 85, pendingClaimsCount: 2 },
    byChannel: {
      Shopee: { orders: 6, returns: 4, claims: 2, recovered: 0 },
      'TikTok Shop': { orders: 4, returns: 2, claims: 1, recovered: 420000 },
    },
    topReasons: [
      { reason: 'Sản phẩm bị hư hỏng', count: 3 },
      { reason: 'Khách đổi ý', count: 2 },
      { reason: 'Trả sai sản phẩm', count: 1 },
      { reason: 'Thiếu sản phẩm', count: 1 },
    ],
  };

  app.innerHTML = `
    ${header}

    <div class="notice dev-notice">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Báo cáo hợp nhất doanh thu, chi phí sàn, tỷ lệ hoàn trả và phân tích lợi nhuận ròng đa kênh bán hàng.
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-title">Tỷ lệ thắng khiếu nại</div>
        <div class="number" style="color:#107c41">${r.financials?.winRate || 85}%</div>
        <small class="sub">Nhờ video đóng gói chuẩn 6 mặt</small>
      </div>
      <div class="metric">
        <div class="metric-title">Tiền đã cứu vãn được</div>
        <div class="number" style="color:#107c41">${formatMoney(r.financials?.totalReceivedAmount)}</div>
        <small class="sub">Tránh mất trắng do tráo hàng</small>
      </div>
      <div class="metric">
        <div class="metric-title">Doanh thu hợp nhất</div>
        <div class="number" style="color:var(--green)">657.300.000đ</div>
        <small class="sub">Tất cả kênh sàn, web & POS</small>
      </div>
      <div class="metric">
        <div class="metric-title">Lợi nhuận ròng ước tính</div>
        <div class="number" style="color:#107c41">148.600.000đ</div>
        <small class="sub">Biên lợi nhuận ròng 22.6%</small>
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px">
      <h2>Cơ cấu doanh thu & Hiệu quả bán hàng đa kênh (Omnichannel)</h2>
      <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Kênh bán hàng</th>
            <th>Loại mô hình</th>
            <th>Số đơn hoàn tất</th>
            <th>Doanh thu gộp</th>
            <th>Tỷ trọng</th>
            <th>Tỷ lệ hoàn hàng</th>
            <th>Chi phí kênh / Phí sàn</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="channel-pill channel-shopee">Shopee Mall</span> <b>FixIt Tech & Gear Flagship</b></td>
            <td>Sàn TMĐT</td>
            <td>312 đơn</td>
            <td><b>382.400.000đ</b></td>
            <td><b>58.2%</b></td>
            <td style="color:#cf3737"><b>6.2%</b></td>
            <td>42.064.000đ (~11%)</td>
          </tr>
          <tr>
            <td><span class="channel-pill channel-tiktok">TikTok Shop Mall</span> <b>FixIt Fashion Official</b></td>
            <td>Sàn TMĐT</td>
            <td>184 đơn</td>
            <td><b>145.200.000đ</b></td>
            <td><b>22.1%</b></td>
            <td style="color:#cf3737"><b>4.5%</b></td>
            <td>15.972.000đ (~11%)</td>
          </tr>
          <tr>
            <td><span class="channel-pill channel-web">Website Brand</span> <b>FixIt Official Store (Shopify)</b></td>
            <td>Website D2C</td>
            <td>52 đơn</td>
            <td><b>78.500.000đ</b></td>
            <td><b>11.9%</b></td>
            <td style="color:#107c41"><b>1.8%</b></td>
            <td>2.355.000đ (~3% cổng TT)</td>
          </tr>
          <tr>
            <td><span class="channel-pill channel-pos">Cửa hàng POS</span> <b>Flagship Store Q.1 TP.HCM</b></td>
            <td>Bán tại quầy</td>
            <td>38 đơn</td>
            <td><b>51.200.000đ</b></td>
            <td><b>7.8%</b></td>
            <td style="color:#107c41"><b>0.5%</b></td>
            <td>768.000đ (~1.5% quẹt thẻ)</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>

    <div class="row">
      <div class="panel">
        <h2>Hiệu quả theo sàn thương mại điện tử</h2>
        <table>
          <thead>
            <tr>
              <th>Sàn</th>
              <th>Số đơn hoàn</th>
              <th>Số khiếu nại</th>
              <th>Tiền đã thu hồi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="channel-pill channel-shopee">Shopee</span></td>
              <td><b>${r.byChannel?.Shopee?.returns || 0}</b></td>
              <td>${r.byChannel?.Shopee?.claims || 0}</td>
              <td style="color:#107c41"><b>${formatMoney(r.byChannel?.Shopee?.recovered || 0)}</b></td>
            </tr>
            <tr>
              <td><span class="channel-pill channel-tiktok">TikTok Shop</span></td>
              <td><b>${r.byChannel?.['TikTok Shop']?.returns || 0}</b></td>
              <td>${r.byChannel?.['TikTok Shop']?.claims || 0}</td>
              <td style="color:#107c41"><b>${formatMoney(r.byChannel?.['TikTok Shop']?.recovered || 0)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h2>Top lý do người mua yêu cầu hoàn hàng</h2>
        <table>
          <thead>
            <tr>
              <th>Lý do hoàn</th>
              <th>Số lượng đơn</th>
              <th>Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            ${(r.topReasons || [])
      .map(
        (item) => `
              <tr>
                <td><b>${esc(item.reason)}</b></td>
                <td>${item.count} đơn</td>
                <td><span class="tag tag-warn">${Math.round((item.count / (orders.length || 1)) * 100)}%</span></td>
              </tr>
            `
      )
      .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// 10. TRANG CÀI ĐẶT (SETTINGS)
function renderSettings(header) {
  app.innerHTML = `
    ${header}
    <div class="panel">
      <h2>Dữ liệu & Khôi phục mẫu</h2>
      <p class="sub">Khôi phục lại toàn bộ dữ liệu mẫu (10+ đơn hàng, sản phẩm, kho, gian hàng và hồ sơ khiếu nại).</p>
      <button class="btn danger" onclick="resetSeedData()">↻ Khôi phục toàn bộ dữ liệu mẫu (Reset Data)</button>
    </div>
  `;
}

// ================= MODALS & LUỒNG NGHIỆP VỤ =================

// Modal thêm đơn hàng mới
function newOrderModal() {
  const genCode = 'FX-' + Math.floor(1000 + Math.random() * 9000);
  const genTrack = 'SPX-VN-' + Math.floor(100000 + Math.random() * 900000);

  show(`
    <h2>Thêm đơn hàng mới</h2>
    <div class="row">
      <div class="field">
        <label>Mã đơn hàng *</label>
        <input id="newCode" value="${genCode}">
      </div>
      <div class="field">
        <label>Mã vận đơn (SPX / J&T / GHN)</label>
        <input id="newTrack" value="${genTrack}">
      </div>
    </div>
    <div class="field">
      <label>Tên sản phẩm *</label>
      <input id="newProduct" placeholder="VD: Tai nghe Bluetooth TWS Pro Max">
    </div>
    <div class="row">
      <div class="field">
        <label>Kênh bán hàng</label>
        <select id="newChannel">
          <option>Shopee</option>
          <option>TikTok Shop</option>
          <option>Khác</option>
        </select>
      </div>
      <div class="field">
        <label>Tổng tiền (VND)</label>
        <input id="newTotal" type="number" value="350000">
      </div>
    </div>
    <div class="row">
      <div class="field">
        <label>Tên khách hàng</label>
        <input id="newCust" value="Nguyễn Văn A">
      </div>
      <div class="field">
        <label>Số điện thoại</label>
        <input id="newPhone" value="098***1234">
      </div>
    </div>
    <div class="end">
      <button class="btn secondary" onclick="closeModal()">Hủy</button>
      <button class="btn" onclick="saveNewOrder()">Lưu đơn hàng</button>
    </div>
  `);
}

async function saveNewOrder() {
  const code = document.querySelector('#newCode').value.trim();
  const product = document.querySelector('#newProduct').value.trim();
  if (!code || !product) return alert('Vui lòng điền mã đơn và tên sản phẩm.');

  try {
    await api('/orders', json({
      code,
      trackingCode: document.querySelector('#newTrack').value.trim(),
      product,
      channel: document.querySelector('#newChannel').value,
      total: +document.querySelector('#newTotal').value,
      customerName: document.querySelector('#newCust').value,
      customerPhone: document.querySelector('#newPhone').value,
    }));
    closeModal();
    await loadAllData();
    render();
    alert('Đã thêm đơn hàng ' + code + ' thành công!');
  } catch (e) {
    alert(e.message);
  }
}

// Quét mã & Quay video (Đóng gói hoặc Mở kiện)
function scan(code, kind) {
  show(
    `
    <h2>${kind === 'packing' ? '📦 Quay video đóng gói hàng' : '↩️ Tiếp nhận & Mở kiện hàng hoàn'}</h2>
    <div class="field">
      <label>Mã đơn hàng hoặc Mã vận đơn *</label>
      <input id="scancode" value="${esc(code)}" placeholder="VD: FX-1025 hoặc SPX-VN-882194">
    </div>
    ${kind === 'return'
      ? `
      <div class="field">
        <label>Mã vận đơn hoàn (nếu có)</label>
        <input id="returnTracking" placeholder="VD: SPX-RT-23194">
      </div>
      <div class="field">
        <label>Lý do khách hàng yêu cầu hoàn trả</label>
        <select id="reason">
          <option>Sản phẩm bị hư hỏng / Bể vỡ</option>
          <option>Thiếu sản phẩm / Thiếu phụ kiện</option>
          <option>Khách trả sai sản phẩm / Nghi tráo hàng</option>
          <option>Khách đổi ý (Chưa bóc tem seal)</option>
          <option>Khác</option>
        </select>
      </div>
    `
      : ''
    }

    <div class="notice info">
      ${kind === 'packing'
      ? '<b>Chuẩn bằng chứng sàn:</b> Quay rõ mã vận đơn trên kiện hàng, 6 mặt gói hàng và toàn bộ quá trình đóng gói liền mạch không cắt ghép.'
      : '<b>Chuẩn bằng chứng mở kiện:</b> Quay rõ nhãn vận đơn hoàn, quay 6 mặt kiện hàng trước khi cắt băng keo và quay quá trình lấy sản phẩm ra đối chứng.'
    }
    </div>

    <div class="field" style="border: 1px dashed var(--line); padding: 12px; border-radius: 8px;">
      <label><b>Tải tệp video/ảnh có sẵn từ máy tính:</b></label>
      <input type="file" id="directfile" accept="video/*,image/*" style="margin-top:6px">
    </div>

    <div class="end">
      <button class="btn secondary" onclick="closeModal()">Hủy</button>
      <button class="btn secondary" onclick="uploadDirect('${kind}')">Tải tệp đã chọn</button>
      <button class="btn ${kind === 'return' ? 'danger' : ''}" onclick="startCamera('${kind}')">📷 Mở camera & Quay ngay</button>
    </div>
  `,
    () => window.FixItMediaCapture?.cancel()
  );
}

async function uploadDirect(kind) {
  const code = document.querySelector('#scancode').value.trim();
  const file = document.querySelector('#directfile')?.files?.[0];
  if (!code) return alert('Vui lòng nhập mã đơn hoặc mã vận đơn.');
  if (!file) return alert('Vui lòng chọn 1 tệp video hoặc ảnh từ máy tính trước.');

  const btn = document.querySelector("button[onclick*='uploadDirect']");
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Đang tải tệp lên máy chủ…';
  }

  try {
    if (kind === 'return') {
      await api(
        '/returns/scan',
        json({
          code,
          reason: document.querySelector('#reason').value,
          returnTrackingCode: document.querySelector('#returnTracking')?.value?.trim(),
        })
      );
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    await api(`/orders/${encodeURIComponent(code)}/evidence`, { method: 'POST', body: fd });

    await loadAllData();
    if (kind === 'return') {
      comparison(code);
    } else {
      closeModal();
      render();
      alert('Đã tải video đóng gói thành công và gắn với đơn ' + code);
    }
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Tải tệp đã chọn';
    }
    alert(e.message);
  }
}

// Bật Camera quay video trực tiếp
async function startCamera(kind) {
  const code = document.querySelector('#scancode').value.trim();
  if (!code) return alert('Vui lòng nhập mã đơn trước khi mở camera.');

  const requestId = window.FixItMediaCapture.beginRequest();
  try {
    if (kind === 'return') {
      await api(
        '/returns/scan',
        json({
          code,
          reason: document.querySelector('#reason').value,
          returnTrackingCode: document.querySelector('#returnTracking')?.value?.trim(),
        })
      );
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
    }

    if (!window.FixItMediaCapture.isCurrent(requestId)) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1', 'video/mp4'];
    const chosenMime = candidates.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    let recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
    let chunks = [];

    show(
      `
      <h2>${kind === 'packing' ? '📦 Đang quay đóng gói' : '↩️ Đang quay mở kiện hoàn'} · ${esc(code)}</h2>
      <div class="camera"><video id="preview" autoplay muted playsinline></video></div>
      <p class="notice">${kind === 'packing' ? 'Quay rõ nhãn vận đơn và toàn bộ quá trình đóng gói.' : 'Quay 6 mặt kiện hàng nguyên vẹn và quá trình bóc kiện.'}</p>
      <div class="end">
        <button class="btn secondary" onclick="stopCamera()">Hủy</button>
        <button id="rec" class="btn ${kind === 'return' ? 'danger' : ''}" onclick="recordNow()">● Bắt đầu quay</button>
      </div>
    `,
      () => window.FixItMediaCapture.cancel()
    );

    window.FixItMediaCapture.attach(stream, recorder);
    document.querySelector('#preview').srcObject = stream;

    window.recordNow = () => {
      if (recorder.state === 'inactive') {
        chunks = [];
        recorder.start(1000);
        document.querySelector('#rec').textContent = '■ Dừng & Lưu video';
        document.querySelector('#rec').className = 'btn danger';
      } else {
        recorder.stop();
        document.querySelector('#rec').disabled = true;
        document.querySelector('#rec').textContent = 'Đang lưu video…';
      }
    };

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (window.FixItMediaCapture.wasCancelled(recorder)) {
        window.FixItMediaCapture.cleanup();
        return;
      }
      if (!chunks.length) return alert('Chưa thu được video. Vui lòng quay lại.');

      const rawMime = (chunks[0] && chunks[0].type) || recorder.mimeType || chosenMime || 'video/webm';
      const cleanMime = rawMime.split(';')[0] || 'video/mp4';
      const ext = cleanMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: cleanMime });

      const fd = new FormData();
      fd.append('file', blob, `${code}-${kind}.${ext}`);
      fd.append('kind', kind);

      try {
        await api(`/orders/${encodeURIComponent(code)}/evidence`, { method: 'POST', body: fd });
        await loadAllData();
        if (kind === 'return') {
          comparison(code);
        } else {
          closeModal();
          render();
          alert('Đã lưu video đóng gói thành công cho đơn ' + code);
        }
      } catch (err) {
        alert(err.message);
        closeModal();
      }
    };
  } catch (e) {
    alert(e.message || 'Không truy cập được camera. Hãy cấp quyền camera trong trình duyệt hoặc sử dụng nút Tải tệp từ máy.');
  }
}

function stopCamera() {
  window.FixItMediaCapture.cancel();
  closeModal();
}

// ================= LUỒNG ĐỐI CHIẾU VIDEO & XỬ LÝ RẼ NHÁNH =================
async function comparison(code) {
  try {
    const evidence = await api(`/orders/${encodeURIComponent(code)}/evidence`);
    const order = orders.find((item) => item.code === code) || (await api(`/orders/${encodeURIComponent(code)}`));
    renderComparison(code, evidence, order?.aiAnalysis || null, order);
  } catch (e) {
    alert(e.message);
  }
}

function seekVideo(id, ts) {
  const v = document.getElementById(id);
  if (!v) return;
  const parts = String(ts || '0').split(':').map(Number);
  let sec = 0;
  if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
  else sec = Number(parts[0]) || 0;
  v.currentTime = sec;
  v.play().catch(() => { });
}

function renderComparison(code, evidence, analysis, order) {
  const packings = evidence.filter((x) => x.kind === 'packing');
  const returns = evidence.filter((x) => x.kind === 'return');
  const packing = packings.at(-1);
  const returned = returns.at(-1);
  const differences = analysis?.differences || [];

  let diffHtml = '';
  if (differences.length) {
    diffHtml = `
      <div class="notice danger" style="background:#fef2f2;border-color:#fecaca;color:#991b1b">
        <b>⚠️ AI phát hiện ${differences.length} điểm bất thường nghi vấn:</b>
        <br><small>Vui lòng tick chọn các lỗi xác nhận đúng, chỉnh sửa hoặc gõ bổ sung mô tả thực tế.</small>
      </div>
      <div class="ai-list">
        ${differences
        .map(
          (item, index) => `
          <label class="ai-diff">
            <input type="checkbox" class="ai-check" value="${index}" checked>
            <div style="flex:1">
              <span class="ai-badge">${esc(item.confidence || 'Độ tin cậy cao')}</span>
              <div style="font-weight:700">${esc(item.description)}</div>
              <div style="margin-top:4px;font-size:12px">
                ⏱️ Video gửi: 
                <button type="button" class="btn-xs secondary" style="padding:1px 6px;font-size:11px" onclick="seekVideo('videoPacking','${esc(item.packingTimestamp)}')">
                  ▶ ${esc(item.packingTimestamp || '00:00')}
                </button>
                ⟷ Video hoàn: 
                <button type="button" class="btn-xs danger" style="padding:1px 6px;font-size:11px" onclick="seekVideo('videoReturn','${esc(item.returnTimestamp)}')">
                  ▶ ${esc(item.returnTimestamp || '00:00')}
                </button>
                <small class="sub" style="margin-left:4px">(Bấm vào mốc giờ để tua video)</small>
              </div>
              <div style="color:var(--muted);font-size:12px;margin-top:2px">Dẫn chứng: ${esc(item.evidence || '')}</div>
            </div>
          </label>
        `
        )
        .join('')}
      </div>
      <p class="sub" style="font-size:12.5px;margin:8px 0">${esc(analysis.summary || '')}</p>
    `;
  } else if (analysis) {
    diffHtml = `
      <div class="notice info">
        ℹ️ <b>AI chưa phát hiện khác biệt rõ ràng giữa 2 video.</b>
        <br>Nếu bằng mắt thường bạn phát hiện sản phẩm bị tráo, hư hỏng hoặc lỗi, hãy gõ mô tả vào ô bên dưới.
      </div>
    `;
  } else {
    diffHtml = `
      <div class="ai-empty">
        <b>✨ Đối chiếu thị giác bằng Google Gemini 2.5 Flash Vision</b>
        <p class="sub" style="margin:6px 0 12px">AI sẽ trích xuất khung hình từ 2 video, so sánh sản phẩm gửi và sản phẩm nhận lại để phát hiện lỗi tráo hàng, rách bao bì hoặc thiếu phụ kiện.</p>
        <button class="btn light" onclick="analyzeVideos('${esc(code)}', this)">🤖 Bắt đầu Phân tích bằng AI</button>
      </div>
    `;
  }

  show(`
    <h2>🔍 Đối chiếu video & Bằng chứng · Đơn #${esc(code)}</h2>
    <p class="sub">So sánh bằng chứng đóng gói lúc gửi và tình trạng kiện hàng lúc nhận hoàn.</p>

    <div class="row">
      <div class="panel" style="padding:12px;margin:8px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <b>1. Video đóng gói (Lúc gửi đi)</b>
          ${packings.length > 1 ? `<span class="tag" style="font-size:10px">Tệp #${packings.length} mới nhất</span>` : ''}
        </div>
        ${packing
      ? `
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(packing.originalName || packing.filename)}">
              📁 ${esc(packing.originalName || packing.filename)} (${(packing.size / 1024 / 1024).toFixed(1)} MB)
            </div>
            <video id="videoPacking" controls width="100%" src="${packing.url}" style="border-radius:8px;max-height:220px;background:#000"></video>
          `
      : '<p class="sub" style="padding:30px 0;text-align:center">Chưa có video đóng gói</p>'
    }
      </div>

      <div class="panel" style="padding:12px;margin:8px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <b>2. Video mở kiện (Lúc nhận về)</b>
          ${returns.length > 1 ? `<span class="tag tag-success" style="font-size:10px">Tệp #${returns.length} mới nhất</span>` : ''}
        </div>
        ${returned
      ? `
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(returned.originalName || returned.filename)}">
              📁 ${esc(returned.originalName || returned.filename)} (${(returned.size / 1024 / 1024).toFixed(1)} MB)
            </div>
            <video id="videoReturn" controls width="100%" src="${returned.url}" style="border-radius:8px;max-height:220px;background:#000"></video>
          `
      : '<p class="sub" style="padding:30px 0;text-align:center">Chưa có video mở kiện</p>'
    }
      </div>
    </div>

    <div class="panel" style="padding:14px;margin:10px 0">
      ${diffHtml}

      <div class="field" style="margin-top:14px">
        <label>Mô tả điểm khác biệt (Người bán bổ sung thủ công):</label>
        <textarea id="manualdiff" placeholder="VD: Khách trả lại tai nghe màu trắng cũ trầy xước, không phải tai nghe màu đen mới của shop..."></textarea>
      </div>

      <div class="field">
        <label>Tải ảnh chụp cận cảnh bằng chứng hư hại / tráo hàng:</label>
        <input id="photos" type="file" accept="image/*" multiple>
      </div>

      <div class="field">
        <label>Số tiền yêu cầu sàn bồi hoàn (VND):</label>
        <input id="claimAmountInput" type="number" value="${order?.total || 350000}">
      </div>
    </div>

    <!-- KHU VỰC CÁC NÚT BẤM RẼ NHÁNH LOGIC THEO TÀI LIỆU -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;flex-wrap:wrap;gap:10px">
      <!-- NHÁNH 1: XÁC NHẬN HÀNG NGUYÊN VẸN, KHÔNG CÓ LỖI -> DỪNG LUỒNG, NHẬP KHO -->
      <button class="btn secondary" style="color:#15803d;border-color:#bbf7d0;background:#f0fdf4" onclick="confirmNoFault('${esc(code)}')">
        ✓ Hàng nguyên vẹn - Đóng & Nhập kho (Không lỗi)
      </button>

      <div style="display:flex;gap:8px">
        <button class="btn secondary" onclick="closeModal()">Để sau</button>
        <!-- NHÁNH 2: CÓ LỖI -> TẠO HỒ SƠ KHIẾU NẠI SÀN -->
        <button class="btn danger" onclick="submitClaimWorkflow('${esc(code)}')">
          ⚖️ Xác nhận lỗi & Tạo hồ sơ khiếu nại
        </button>
      </div>
    </div>
  `);
}

// Xử lý AI phân tích
async function analyzeVideos(code, button) {
  button.disabled = true;
  button.textContent = '⏳ Đang tải video lên AI và phân tích…';
  try {
    const result = await api(`/orders/${encodeURIComponent(code)}/analyze`, { method: 'POST' });
    await loadAllData();
    const evidence = await api(`/orders/${encodeURIComponent(code)}/evidence`);
    const order = orders.find((o) => o.code === code);
    renderComparison(code, evidence, result, order);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Thử phân tích lại';
    alert(error.message);
  }
}

// NHÁNH: XÁC NHẬN HÀNG NGUYÊN VẸN (KHÔNG CÓ LỖI) -> DỪNG KHIẾU NẠI, NHẬP LẠI KHO
async function confirmNoFault(code) {
  if (!await confirmModal('Bạn xác nhận kiện hàng hoàn này NGUYÊN VẸN, không bị hư hỏng hay tráo đổi và muốn NHẬP LẠI KHO?\n\n(Hệ thống sẽ kết thúc quy trình và KHÔNG tạo hồ sơ khiếu nại)', { title: 'Xác nhận kiện hàng hoàn', confirmText: 'Xác nhận nhập kho' })) {
    return;
  }

  try {
    await api(`/orders/${encodeURIComponent(code)}/dismiss-return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'Người bán kiểm tra và xác nhận kiện hoàn nguyên vẹn, nhập lại kho.' }),
    });

    closeModal();
    await loadAllData();
    render();
    alert('✅ Đã xác nhận hàng hoàn nguyên vẹn và nhập lại kho thành công cho đơn ' + code);
  } catch (e) {
    alert('Lỗi: ' + e.message);
  }
}

// NHÁNH: XÁC NHẬN CÓ LỖI -> TẠO BỘ HỒ SƠ KHIẾU NẠI HOÀN CHỈNH
async function submitClaimWorkflow(code) {
  try {
    const order = orders.find((o) => o.code === code);
    const evidence = await api(`/orders/${encodeURIComponent(code)}/evidence`);
    const evidenceIds = evidence.map((item) => item._id).filter(Boolean);

    // Tải thêm ảnh bổ sung nếu có
    const photos = document.querySelector('#photos');
    if (photos && photos.files.length > 0) {
      for (const file of photos.files) {
        const form = new FormData();
        form.append('file', file);
        form.append('kind', 'photo');
        const saved = await api(`/orders/${encodeURIComponent(code)}/evidence`, { method: 'POST', body: form });
        if (saved._id) evidenceIds.push(saved._id);
      }
    }

    // Gom các điểm khác biệt được chọn
    const selected = [...document.querySelectorAll('.ai-check:checked')]
      .map((input) => {
        const item = order?.aiAnalysis?.differences?.[Number(input.value)];
        return item ? `${item.description} (Lúc gửi: ${item.packingTimestamp || '00:00'}, Lúc hoàn: ${item.returnTimestamp || '00:00'})` : '';
      })
      .filter(Boolean);

    const manual = document.querySelector('#manualdiff')?.value.trim();
    if (manual) selected.push(manual);

    if (!selected.length) {
      if (!await confirmModal('Bạn chưa chọn hoặc nhập điểm khác biệt nào. Bạn có chắc chắn vẫn muốn tạo hồ sơ khiếu nại thủ công?', { title: 'Cảnh báo thiếu dữ liệu', confirmText: 'Vẫn tạo hồ sơ', isDanger: true })) {
        return;
      }
      selected.push('Hàng hoàn về bị sai khác, hư hỏng so với kiện hàng gửi đi ban đầu.');
    }

    const claimAmount = Number(document.querySelector('#claimAmountInput')?.value) || order?.total || 0;

    await api(
      `/orders/${encodeURIComponent(code)}/claims`,
      json({
        reason: 'Tráo hàng / Khác biệt giữa video gửi và hàng hoàn',
        description: selected.join('\n'),
        differences: selected,
        evidenceIds,
        claimAmount,
        evidenceStrength: 'Mạnh nhất',
        submitToPlatform: true,
      })
    );

    closeModal();
    await loadAllData();
    go('claims');
    alert('⚖️ Đã khởi tạo hồ sơ khiếu nại sàn thành công! Đang chuyển đến danh sách Hồ sơ khiếu nại.');
  } catch (error) {
    alert(error.message);
  }
}

// Modal xem chi tiết hồ sơ khiếu nại & Copy/Tải video / Gửi qua API
async function viewClaimDetailModal(claimId) {
  try {
    const c = await api(`/claims/${claimId}`);
    const files = c.evidenceFiles || [];
    const isSubmitted = !!c.isSubmittedViaApi;
    const isShopee = (c.channel || '').toLowerCase().includes('shopee');

    show(`
      <h2>⚖️ Hồ sơ khiếu nại #${esc(c.orderCode)}</h2>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span class="channel-pill channel-${isShopee ? 'shopee' : 'tiktok'}">${esc(c.channel || 'Shopee')}</span>
        <span class="tag-status ${c.status === 'Đã bồi hoàn' ? 'tag-success' : c.status === 'Bị từ chối' ? 'tag-danger' : c.status === 'Đang khiếu nại' ? 'tag-warn' : 'tag-info'}">${esc(c.status)}</span>
      </div>

      ${c.status === 'Đã bồi hoàn'
        ? `
        <div class="notice success" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;margin-bottom:14px">
          <b style="font-size:13.5px">🎉 SÀN ĐÃ CHẤP THUẬN BỒI HOÀN ${formatMoney(c.receivedAmount || c.approvedAmount)}</b>
          <div style="margin-top:4px;font-size:12px">Tiền đã được giải ngân trực tiếp vào Ví Người Bán. ${c.notes ? `<br><b>Ghi chú:</b> ${esc(c.notes)}` : ''}</div>
          <div style="margin-top:8px">
            <button class="btn-xs secondary" onclick="closeModal(); viewWalletModal()">💳 Xem số dư Ví Người Bán</button>
          </div>
        </div>
        `
        : c.status === 'Bị từ chối'
        ? `
        <div class="notice danger" style="background:#fef2f2;border-color:#fecaca;color:#991b1b;margin-bottom:14px">
          <b style="font-size:13.5px">⚠️ KHIẾU NẠI BỊ TỪ CHỐI BỒI HOÀN</b>
          <div style="margin-top:4px;font-size:12px"><b>Lý do từ chối:</b> ${esc(c.notes || 'Không đủ chứng cứ')}</div>
        </div>
        `
        : isSubmitted
        ? `
        <div class="notice success" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;margin-bottom:14px">
          <b>🚀 ĐÃ NỘP QUA OPEN API SÀN ${esc(c.channel || 'TMĐT').toUpperCase()} THÀNH CÔNG</b>
          <div style="margin-top:6px;font-size:12.5px">
            • <b>Mã hồ sơ tranh chấp (Dispute ID):</b> <code style="background:#e8f5e9;padding:2px 6px;border-radius:4px;color:#1b5e20">${esc(c.apiDisputeId)}</code><br>
            • <b>Thời gian gửi:</b> ${formatDate(c.submittedAt)}<br>
            • <b>Cổng tiếp nhận:</b> ${esc(c.platformResponse?.provider || 'Open API Gateway')}<br>
            • <b>Thời hạn sàn cam kết xử lý:</b> <b>${esc(c.platformResponse?.estimatedReviewTime || '48 giờ')}</b>
          </div>
          <div style="margin-top:8px">
            <button class="btn-xs danger" style="padding:4px 10px;font-weight:700;cursor:pointer" onclick="closeModal(); go('simulator'); setTimeout(() => openDisputeJudgeModal('${c._id}'), 200)">
              ⚖️ Mở tab Sàn giả lập để phán quyết ngay
            </button>
          </div>
        </div>
      `
        : ''
      }

      <div class="panel" style="padding:14px;background:#f9fbfb;margin-top:0">
        <div class="row">
          <div><small class="sub">Mã vận đơn gửi:</small><br><b>${esc(c.trackingCode || 'N/A')}</b></div>
          <div><small class="sub">Mã vận đơn hoàn:</small><br><b>${esc(c.returnTrackingCode || 'N/A')}</b></div>
        </div>
        <hr style="border:0;border-top:1px dashed var(--line);margin:10px 0">
        <div class="row">
          <div><small class="sub">Tiền yêu cầu bồi hoàn:</small><br><b style="color:var(--green);font-size:16px">${formatMoney(c.claimAmount)}</b></div>
          <div><small class="sub">Cấp độ bằng chứng:</small><br><span class="tag tag-success">⭐ ${esc(c.evidenceStrength || 'Mạnh nhất')}</span></div>
        </div>
      </div>

      <div style="margin:12px 0">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px">📁 Tệp bằng chứng đính kèm (${files.length} tệp):</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${files.length
        ? files
          .map(
            (f) => `
                <a href="${f.url}" download="${esc(f.downloadName)}" class="tag" style="background:#ffffff;border:1px solid var(--line);text-decoration:none;display:inline-flex;align-items:center;gap:6px;padding:5px 9px">
                  ${f.kind === 'packing' ? '📦 Video đóng gói' : f.kind === 'return' ? '↩️ Video mở kiện' : '📷 Ảnh chứng cứ'}:
                  <b style="color:var(--green)">${esc(f.downloadName)}</b> ⬇️
                </a>
              `
          )
          .join('')
        : '<span class="sub" style="font-size:12px">Chưa có tệp bằng chứng đính kèm.</span>'
      }
        </div>
      </div>

      <h3>Vấn đề phát hiện</h3>
      <div class="notice danger">${esc(c.reason)}<br><small>${esc(c.description || '')}</small></div>

      <h3>Văn bản giải trình gửi sàn (Đã soạn sẵn chuẩn Shopee/TikTok):</h3>
      <textarea id="claimText" readonly style="width:100%;min-height:120px;background:#f5f8f7;font-family:monospace;font-size:12px;padding:10px">${esc(c.claimTemplateText || '')}</textarea>

      <!-- KHU VỰC CÁC NÚT HÀNH ĐỘNG -->
      <div class="end" style="gap:10px;flex-wrap:wrap;margin-top:18px">
        <button class="btn secondary" onclick="closeModal()">Đóng</button>
        
        <!-- TRƯỜNG HỢP 1: TỰ GỬI THỦ CÔNG -> COPY VĂN BẢN VÀ AUTO DOWNLOAD VIDEO -->
        <button class="btn secondary" onclick="copyAndDownloadEvidence('${c._id}')" title="Sao chép văn bản giải trình và tự động tải video đóng gói + video mở kiện về máy">
          📋 Sao chép & Tải video bằng chứng
        </button>

        <!-- TRƯỜNG HỢP 2: GỬI TRỰC TIẾP QUA OPEN API SÀN -->
        ${isSubmitted
        ? `
          <button class="btn" style="background:#107c41;cursor:default" disabled>
            ✓ Đã gửi qua API sàn (${esc(c.apiDisputeId)})
          </button>
        `
        : `
          <button class="btn ${isShopee ? '' : 'danger'}" id="btnSubmitApi" style="${isShopee ? 'background:#ee4d2d' : 'background:#000'}" onclick="submitClaimViaApi('${c._id}')">
            🚀 Gửi khiếu nại qua API sàn
          </button>
        `
      }
      </div>
    `);
  } catch (e) {
    alert(e.message);
  }
}

// TRƯỜNG HỢP 1: Sao chép văn bản & Tự động download toàn bộ video/ảnh bằng chứng
async function copyAndDownloadEvidence(claimId) {
  const text = document.querySelector('#claimText');
  if (text) {
    text.select();
    navigator.clipboard.writeText(text.value);
  }

  try {
    const c = await api(`/claims/${claimId}`);
    const files = c.evidenceFiles || [];

    if (!files.length) {
      alert('📋 Đã sao chép văn bản giải trình vào bộ nhớ tạm!\n(Hồ sơ này hiện chưa có video đính kèm để tải về)');
      return;
    }

    // Tự động tải xuống từng file video/ảnh về máy với khoảng cách 350ms để trình duyệt không chặn popup
    files.forEach((f, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = f.url;
        a.download = f.downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, idx * 350);
    });

    alert(
      `📋 ĐÃ SAO CHÉP VĂN BẢN GIẢI TRÌNH!\n\n` +
      `📥 Đồng thời hệ thống đang tự động tải xuống ${files.length} tệp bằng chứng (video đóng hàng & mở kiện) về máy tính của bạn.\n\n` +
      `Bạn có thể dán ngay văn bản vào Seller Center và đính kèm video vừa tải về!`
    );
  } catch (e) {
    alert('Đã sao chép văn bản, nhưng gặp lỗi khi tải file: ' + e.message);
  }
}

// TRƯỜNG HỢP 2: Gửi khiếu nại trực tiếp qua Open API của sàn
async function submitClaimViaApi(claimId) {
  try {
    const c = await api(`/claims/${claimId}`);
    const channelName = c.channel || 'Shopee';

    if (
      !await confirmModal(
        `Bạn có chắc chắn muốn gửi tự động toàn bộ hồ sơ khiếu nại #${c.orderCode} cùng video bằng chứng lên cổng Open API của sàn ${channelName} không?\n\n` +
        `• Số tiền bồi hoàn: ${formatMoney(c.claimAmount)}\n` +
        `• Hồ sơ sẽ được đẩy trực tiếp lên Seller Center của shop.`,
        { title: `Gửi khiếu nại lên sàn ${channelName}`, confirmText: 'Gửi khiếu nại ngay' }
      )
    ) {
      return;
    }

    const btn = document.querySelector('#btnSubmitApi');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Đang gửi hồ sơ & video lên sàn…';
    }

    const res = await api(`/claims/${claimId}/submit-platform`, { method: 'POST' });

    alert(
      `🚀 GỬI KHIẾU NẠI QUA OPEN API THÀNH CÔNG!\n\n` +
      `• Mã tranh chấp trên sàn: ${res.claim.apiDisputeId}\n` +
      `• Sàn tiếp nhận: ${channelName}\n` +
      `• Thời gian sàn cam kết phản hồi: ${res.claim.platformResponse?.estimatedReviewTime || '48 giờ'}`
    );

    await loadAllData();
    // Tải lại modal với giao diện đã gửi thành công
    viewClaimDetailModal(claimId);
    if (page === 'claims' || page === 'home') render();
  } catch (e) {
    const btn = document.querySelector('#btnSubmitApi');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 Gửi khiếu nại qua API sàn';
    }
    alert('Lỗi gửi hồ sơ qua API sàn: ' + e.message);
  }
}

// Modal xem chi tiết đơn hàng & timeline
async function viewOrderDetailModal(code) {
  try {
    const order = await api(`/orders/${encodeURIComponent(code)}`);
    const timeline = order.timeline || [];

    show(`
      <h2>Chi tiết đơn hàng #${esc(order.code)}</h2>
      <div class="row">
        <div><small class="sub">Khách hàng:</small><br><b>${esc(order.customerName || 'Khách hàng')}</b> (${esc(order.customerPhone || '')})</div>
        <div><small class="sub">Kênh bán hàng:</small><br><span class="channel-pill channel-${order.channel.toLowerCase().includes('shopee') ? 'shopee' : 'tiktok'}">${esc(order.channel)}</span></div>
      </div>
      <div class="row" style="margin-top:10px">
        <div><small class="sub">Mã vận đơn gửi:</small><br><b>${esc(order.trackingCode || 'Chưa cấp')}</b></div>
        <div><small class="sub">Mã vận đơn hoàn:</small><br><b>${esc(order.returnTrackingCode || 'Không có')}</b></div>
      </div>
      <div style="margin-top:10px">
        <small class="sub">Sản phẩm & Giá trị:</small><br><b>${esc(order.product)}</b> (x${order.quantity || 1}) — <b style="color:var(--green)">${formatMoney(order.total)}</b>
      </div>

      <h3 style="margin-top:18px">Nhật ký hành trình đơn hàng</h3>
      <div class="timeline">
        ${timeline.length
        ? timeline
          .map(
            (t) => `
          <div class="timeline-item">
            <div class="timeline-time">${formatDate(t.time)} · ${esc(t.actor || 'Hệ thống')}</div>
            <div class="timeline-title">${esc(t.title)}</div>
            <div class="sub">${esc(t.description || '')}</div>
          </div>
        `
          )
          .join('')
        : '<p class="sub">Chưa có nhật ký hành trình.</p>'
      }
      </div>

      <div class="end">
        <button class="btn secondary" onclick="closeModal()">Đóng</button>
        ${order.status === 'Chờ đóng gói'
        ? `<button class="btn" onclick="scan('${esc(order.code)}','packing')">Quay đóng hàng</button>`
        : order.status === 'Đang kiểm tra hàng hoàn'
          ? `<button class="btn danger" onclick="scan('${esc(order.code)}','return')">Mở kiện hoàn</button>`
          : ''
      }
      </div>
    `);
  } catch (e) {
    alert(e.message);
  }
}

// Modal xem nhanh video đóng gói
async function viewEvidenceModal(code) {
  try {
    const list = await api(`/orders/${encodeURIComponent(code)}/evidence`);
    const packing = list.filter((x) => x.kind === 'packing').at(-1);
    if (!packing) return alert('Đơn hàng này chưa có video đóng gói.');

    show(`
      <h2>Video đóng gói · Đơn #${esc(code)}</h2>
      <p class="sub">Thời gian quay: ${formatDate(packing.recordedAt)} · Tệp: ${esc(packing.originalName || packing.filename)}</p>
      <video controls autoplay width="100%" src="${packing.url}" style="border-radius:10px;background:#000;max-height:360px"></video>
      <div class="end">
        <button class="btn secondary" onclick="closeModal()">Đóng</button>
      </div>
    `);
  } catch (e) {
    alert(e.message);
  }
}

// Tìm kiếm video bằng chứng theo mã đơn / mã vận đơn
async function findEvidence() {
  const code = document.querySelector('#findcode').value.trim();
  if (!code) return alert('Vui lòng nhập mã đơn hoặc mã vận đơn.');

  try {
    const list = await api(`/orders/${encodeURIComponent(code)}/evidence`);
    const packing = list.filter((x) => x.kind === 'packing').at(-1);
    const returned = list.filter((x) => x.kind === 'return').at(-1);
    const container = document.querySelector('#result');

    if (!packing && !returned) {
      container.innerHTML = `<div class="notice">Không tìm thấy video bằng chứng cho mã “${esc(code)}”.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="panel" style="background:#f9fbfb">
        <h3>Kết quả tra cứu cho: ${esc(code)}</h3>
        <div class="row">
          <div>
            <b>Video đóng gói (Gửi đi)</b>
            ${packing ? `
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">📁 ${esc(packing.originalName || packing.filename)}</div>
              <video controls width="100%" src="${packing.url}" style="border-radius:8px;background:#000"></video>
            ` : '<p class="sub">Chưa có video đóng gói</p>'}
          </div>
          <div>
            <b>Video mở kiện (Hoàn về)</b>
            ${returned ? `
              <div style="font-size:11px;color:var(--muted);margin-bottom:4px">📁 ${esc(returned.originalName || returned.filename)}</div>
              <video controls width="100%" src="${returned.url}" style="border-radius:8px;background:#000"></video>
            ` : '<p class="sub">Chưa có video mở kiện hoàn</p>'}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    alert(e.message);
  }
}

// Modal trọng tài sàn TMĐT thẩm định & phán quyết khiếu nại
async function openDisputeJudgeModal(claimId) {
  try {
    const c = await api(`/claims/${claimId}`);
    const isPending = ['Đang khiếu nại', 'Chờ gửi sàn', 'Bản nháp'].includes(c.status);
    const isApproved = c.status === 'Đã bồi hoàn';
    const isRejected = c.status === 'Bị từ chối';
    const isShopee = (c.channel || '').toLowerCase().includes('shopee');
    const platformName = isShopee ? 'Shopee Dispute Resolution Portal' : 'TikTok Shop Reverse Dispute Portal';
    const files = c.evidenceFiles || [];
    const packingFile = files.find((f) => f.kind === 'packing');
    const returnFile = files.find((f) => f.kind === 'return');
    const differences = c.differences && c.differences.length ? c.differences : (c.order?.aiAnalysis?.differences || []);

    const content = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="channel-pill channel-${isShopee ? 'shopee' : 'tiktok'}">${esc(c.channel || 'Shopee')}</span>
            <b style="font-size:13px;color:var(--muted)">${esc(platformName)}</b>
          </div>
          <h2 style="margin:4px 0 0;font-size:20px">⚖️ Thẩm định & Phán quyết hồ sơ #${esc(c.apiDisputeId || c._id)}</h2>
          <small class="sub">Đơn hàng #${esc(c.orderCode)} · Khách hàng: ${esc(c.order?.customerName || 'N/A')}</small>
        </div>
        <span class="tag-status ${isApproved ? 'tag-success' : isPending ? 'tag-warn' : 'tag-danger'}" style="font-size:12px">
          ${isApproved ? 'Đã bồi hoàn' : isPending ? 'Chờ trọng tài duyệt' : 'Bị từ chối'}
        </span>
      </div>

      ${isApproved ? `
        <div class="notice success" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;margin-bottom:14px">
          <b style="font-size:14px">🎉 PHÁN QUYẾT: SÀN CHẤP THUẬN BỒI HOÀN ${formatMoney(c.receivedAmount || c.approvedAmount)} CHO NGƯỜI BÁN</b>
          <div style="margin-top:6px;font-size:12.5px">
            • <b>Số tiền đã giải ngân vào ví người bán:</b> <span style="font-weight:700;color:#059669">${formatMoney(c.receivedAmount || c.approvedAmount)}</span><br>
            • <b>Ghi chú trọng tài:</b> ${esc(c.notes || 'Bằng chứng video đối chiếu hợp lệ 100%.')}<br>
            • <b>Thời gian giải quyết:</b> ${formatDate(c.updatedAt)}
          </div>
          <div style="margin-top:8px">
            <button class="btn-xs secondary" onclick="viewWalletModal()">💳 Xem biến động Số dư Ví Người Bán</button>
          </div>
        </div>
      ` : isRejected ? `
        <div class="notice danger" style="background:#fef2f2;border-color:#fecaca;color:#991b1b;margin-bottom:14px">
          <b style="font-size:14px">⚠️ PHÁN QUYẾT: SÀN TỪ CHỐI YÊU CẦU BỒI HOÀN CỦA NGƯỜI BÁN</b>
          <div style="margin-top:6px;font-size:12.5px">
            • <b>Lý do từ chối:</b> <span style="font-weight:700">${esc(c.notes || 'Bằng chứng chưa đạt tiêu chuẩn sàn')}</span><br>
            • <b>Thời gian giải quyết:</b> ${formatDate(c.updatedAt)}
          </div>
        </div>
      ` : ''}

      <div class="panel" style="padding:12px;background:#f9fbfb;margin:0 0 14px">
        <div class="row">
          <div><small class="sub">Mã vận đơn gửi:</small><br><b>${esc(c.trackingCode || c.order?.trackingCode || 'N/A')}</b></div>
          <div><small class="sub">Mã vận đơn hoàn:</small><br><b>${esc(c.returnTrackingCode || c.order?.returnTrackingCode || 'N/A')}</b></div>
        </div>
        <div class="row" style="margin-top:8px">
          <div><small class="sub">Lý do khách trả hàng:</small><br><b>${esc(c.order?.returnReason || 'Không rõ')}</b></div>
          <div><small class="sub">Số tiền yêu cầu bồi hoàn:</small><br><b style="color:var(--green);font-size:15px">${formatMoney(c.claimAmount)}</b></div>
        </div>
      </div>

      <!-- VIDEO ĐỐI SOÁT TRỰC TIẾP -->
      <div style="margin-bottom:14px">
        <b style="font-size:13.5px">📹 Bằng chứng video đối soát từ FixIt:</b>
        <div class="row" style="margin-top:8px">
          <div class="panel" style="padding:10px;margin:0">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <b>1. Video đóng gói lúc gửi</b>
              <span class="tag tag-success" style="font-size:10px">Kho Shop</span>
            </div>
            ${packingFile ? `
              <video id="simVideoPacking" controls width="100%" src="${packingFile.url}" style="border-radius:8px;max-height:220px;background:#000"></video>
            ` : '<p class="sub" style="padding:40px 0;text-align:center">Không có video đóng gói</p>'}
          </div>

          <div class="panel" style="padding:10px;margin:0">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <b>2. Video mở kiện lúc nhận hoàn</b>
              <span class="tag tag-danger" style="font-size:10px">Khách trả</span>
            </div>
            ${returnFile ? `
              <video id="simVideoReturn" controls width="100%" src="${returnFile.url}" style="border-radius:8px;max-height:220px;background:#000"></video>
            ` : '<p class="sub" style="padding:40px 0;text-align:center">Không có video mở kiện</p>'}
          </div>
        </div>
      </div>

      <!-- KẾT QUẢ AI & GIẢI TRÌNH -->
      <div class="panel" style="padding:14px;background:#fbfdfe;margin:0 0 14px">
        <b style="color:var(--green)">🤖 Kết quả phân tích đối soát từ AI Vision:</b>
        ${differences && differences.length ? `
          <ul style="margin:8px 0;padding-left:18px;font-size:13px;line-height:1.5">
            ${differences.map((d) => `<li><b>${typeof d === 'object' ? esc(d.description || JSON.stringify(d)) : esc(d)}</b></li>`).join('')}
          </ul>
        ` : `
          <div style="margin:6px 0;font-size:13px;color:var(--muted)">${esc(c.description || 'Không có mô tả chi tiết khác biệt')}</div>
        `}
        <div style="margin-top:10px;border-top:1px dashed var(--line);padding-top:8px">
          <small class="sub">Văn bản người bán giải trình:</small>
          <div style="background:#fff;padding:8px 10px;border-radius:6px;border:1px solid var(--line);font-size:12px;margin-top:4px;white-space:pre-wrap;max-height:90px;overflow-y:auto">
            ${esc(c.claimTemplateText || c.description || 'Không có văn bản')}
          </div>
        </div>
      </div>

      <!-- FORM PHÁN QUYẾT TRỌNG TÀI SÀN -->
      ${isPending ? `
        <div class="panel" style="padding:16px;background:#fefce8;border:1px solid #fef08a;margin:0 0 14px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
            <span style="font-size:18px">⚖️</span>
            <b style="font-size:14px;color:#854d0e">Bảng điều khiển Trọng tài Sàn TMĐT</b>
          </div>

          <div class="field" style="margin:8px 0">
            <label>Số tiền sàn chấp thuận bồi hoàn (VNĐ):</label>
            <input type="number" id="judgeAmount" value="${c.claimAmount || 0}" style="font-size:15px;font-weight:700;color:#047857" />
            <small class="sub">Mặc định bồi hoàn 100% giá trị đơn hàng yêu cầu.</small>
          </div>

          <div class="field" style="margin:8px 0">
            <label>Lý do từ chối (Chỉ áp dụng nếu Trọng tài chọn Từ chối):</label>
            <select id="judgeRejectReason">
              <option value="Bằng chứng video không quay đủ 6 mặt kiện hàng theo chuẩn sàn">Bằng chứng video không quay đủ 6 mặt kiện hàng theo chuẩn sàn</option>
              <option value="Không có video hoặc tem niêm phong đã bị rách trước khi quay">Không có video hoặc tem niêm phong đã bị rách trước khi quay</option>
              <option value="Sản phẩm hoàn về đúng với đơn hàng gốc, không có hư hại thực tế">Sản phẩm hoàn về đúng với đơn hàng gốc, không có hư hại thực tế</option>
              <option value="Quá thời hạn khiếu nại (quá 48h kể từ khi nhận kiện hoàn)">Quá thời hạn khiếu nại (quá 48h kể từ khi nhận kiện hoàn)</option>
            </select>
          </div>

          <div class="field" style="margin:8px 0">
            <label>Ghi chú phán quyết của trọng tài:</label>
            <input type="text" id="judgeNote" placeholder="VD: Đã xác thực video đóng gói có mã vận đơn trùng khớp..." />
          </div>

          <div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end">
            <button class="btn danger" style="padding:10px 16px;font-weight:700;border-radius:8px" onclick="executeJudgeDecision('${c._id}', 'reject')">
              ❌ Từ chối khiếu nại
            </button>
            <button class="btn" style="background:#059669;color:white;padding:10px 18px;font-weight:700;border-radius:8px" onclick="executeJudgeDecision('${c._id}', 'approve')">
              ✅ Chấp thuận & Giải ngân vào ví
            </button>
          </div>
        </div>
      ` : ''}

      <div class="end">
        <button class="btn secondary" onclick="closeModal()">Đóng cửa sổ</button>
      </div>
    `;

    show(content, null, 'large');
  } catch (e) {
    alert('Lỗi tải hồ sơ thẩm định: ' + e.message);
  }
}

// Thực thi quyết định của trọng tài sàn (Chấp thuận hoặc Từ chối)
async function executeJudgeDecision(claimId, action) {
  try {
    const approvedAmount = Number(document.querySelector('#judgeAmount')?.value) || 0;
    const rejectionReason = document.querySelector('#judgeRejectReason')?.value;
    const note = document.querySelector('#judgeNote')?.value || '';

    if (action === 'approve') {
      if (!await confirmModal(`Bạn có chắc chắn muốn CHẤP THUẬN bồi hoàn số tiền ${formatMoney(approvedAmount)} và giải ngân ngay vào Ví Người Bán?`, { title: 'Xác nhận Chấp thuận bồi hoàn', confirmText: 'Chấp thuận & Giải ngân' })) {
        return;
      }
    } else if (action === 'reject') {
      if (!await confirmModal(`Bạn có chắc chắn muốn TỪ CHỐI khiếu nại này với lý do:\n\n"${rejectionReason}"?`, { title: 'Xác nhận Từ chối khiếu nại', confirmText: 'Từ chối khiếu nại', isDanger: true })) {
        return;
      }
    }

    const res = await api('/simulator/resolve', json({
      claimId,
      action,
      approvedAmount,
      rejectionReason,
      note,
    }));

    if (action === 'approve') {
      alert(`🎉 ĐÃ CHẤP THUẬN BỒI HOÀN!\n\n• Sàn đã hoàn ${formatMoney(res.wallet?.transactions?.[0]?.amount || approvedAmount)} vào Số dư Ví Người Bán.\n• Trạng thái đơn và lịch sử timeline đã được cập nhật.`);
    } else {
      alert(`❌ ĐÃ TỪ CHỐI KHIẾU NẠI!\n\n• Đơn hàng đã chuyển sang trạng thái "Khiếu nại bị từ chối".\n• Không phát sinh giải ngân tiền.`);
    }

    await loadAllData();
    if (page === 'simulator') {
      simulatorData = await api('/simulator/claims');
      render();
    }
    // Cập nhật lại nội dung modal với trạng thái mới
    openDisputeJudgeModal(claimId);
  } catch (e) {
    alert('Lỗi phán quyết: ' + e.message);
  }
}

// Modal xem thông tin ví người bán & lịch sử biến động số dư
async function viewWalletModal() {
  try {
    const wallet = await api('/simulator/wallet');
    const transactions = wallet.transactions || [];

    const content = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px">
        <div>
          <h2 style="margin:0;font-size:20px">💳 Ví Người Bán & Quỹ Bồi Hoàn Hàng Hoàn</h2>
          <small class="sub">${esc(wallet.shopName || 'Shop Minh An')} · Mã shop: <code>${esc(wallet.shopCode || 'MINH-AN-SHOP')}</code></small>
        </div>
        <span class="pill online">Đang hoạt động</span>
      </div>

      <div class="row" style="margin-bottom:16px">
        <div class="panel" style="background:#ecfdf5;border-color:#a7f3d0;padding:16px;margin:0">
          <small class="sub" style="color:#065f46;font-weight:600">SỐ DƯ KHẢ DỤNG HIỆN TẠI</small>
          <div style="font-size:28px;font-weight:800;color:#047857;margin-top:4px" id="modalWalletBalance">
            ${formatMoney(wallet.balance)}
          </div>
          <small class="sub" style="color:#047857">Sẵn sàng rút về tài khoản ngân hàng</small>
        </div>

        <div class="panel" style="background:#f0f9ff;border-color:#bae6fd;padding:16px;margin:0">
          <small class="sub" style="color:#0369a1;font-weight:600">TỔNG TIỀN ĐÃ ĐƯỢC BỒI HOÀN</small>
          <div style="font-size:28px;font-weight:800;color:#0284c7;margin-top:4px">
            ${formatMoney(wallet.totalCompensated)}
          </div>
          <small class="sub" style="color:#0284c7">Shopee & TikTok Shop đã đền bù thành công</small>
        </div>
      </div>

      <div class="notice info" style="margin:0 0 16px">
        💡 <b>Cơ chế bồi hoàn tự động:</b> Khi hồ sơ khiếu nại được Trọng tài trên <b>Sàn Giả Lập</b> chấp thuận, toàn bộ số tiền đền bù sẽ lập tức được cộng trực tiếp vào Số Dư Ví này và hiển thị trong danh sách giao dịch dưới đây.
      </div>

      <div class="panel" style="padding:14px;margin:0 0 14px">
        <h3 style="margin:0 0 12px;font-size:15px">Lịch sử giao dịch bồi hoàn & biến động số dư</h3>
        ${transactions.length ? `
          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th style="width:115px;text-align:center">Sàn</th>
                  <th>Mã đơn</th>
                  <th>Nội dung giao dịch</th>
                  <th style="text-align:right">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map((t) => {
                  const isShopee = (t.channel || '').toLowerCase().includes('shopee');
                  return `
                    <tr>
                      <td style="font-size:12px;color:var(--muted)">${formatDate(t.date)}</td>
                      <td style="text-align:center">
                        <span class="channel-pill channel-${isShopee ? 'shopee' : 'tiktok'}">
                          ${esc(t.channel || 'Shopee')}
                        </span>
                      </td>
                      <td><b>#${esc(t.orderCode)}</b></td>
                      <td>
                        <b>${esc(t.title)}</b>
                        <br><small class="sub">${esc(t.note || '')}</small>
                      </td>
                      <td style="text-align:right">
                        <b style="color:#059669;font-size:14px">+${formatMoney(t.amount)}</b>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">Chưa có giao dịch biến động số dư nào.</div>
        `}
      </div>

      <div class="end">
        <button class="btn secondary" onclick="closeModal()">Đóng</button>
      </div>
    `;

    show(content, null, 'large');
  } catch (e) {
    alert('Lỗi tải thông tin ví: ' + e.message);
  }
}

async function setStatus(code, status) {
  try {
    await api(`/orders/${encodeURIComponent(code)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAllData();
    render();
  } catch (e) {
    alert(e.message);
  }
}

// ==================== MODALS CHO TÍNH NĂNG MỚI (OMNICHANNEL & LOGISTICS) ====================
function viewTrackingModal(trackingCode) {
  const list = getMockShippingData();
  const shipment = list.find((s) => s.trackingCode === trackingCode) || list[0];

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <h2 style="margin:0">Hành trình vận chuyển: ${esc(shipment.trackingCode)}</h2>
        <small class="sub">Mã đơn: <b>#${esc(shipment.orderCode)}</b> · Đơn vị: <b>${esc(shipment.carrier)}</b></small>
      </div>
      <span class="carrier-pill ${shipment.carrierClass}" style="font-size:13px;padding:4px 10px">${esc(shipment.carrier)}</span>
    </div>

    <div class="notice dev-notice" style="margin-bottom:14px">
      ⚠️ <b>Dữ liệu mô phỏng:</b> API Webhook kết nối trực tiếp với cổng ${esc(shipment.carrier)}.
    </div>

    <div class="row" style="margin-bottom:14px">
      <div class="panel" style="margin:0;padding:12px">
        <small class="sub">TUYẾN VẬN CHUYỂN</small>
        <div style="font-size:13px;font-weight:600;margin-top:4px">Từ: ${esc(shipment.senderHub)}</div>
        <div style="font-size:13px;font-weight:600;color:var(--green)">Đến: ${esc(shipment.destination)}</div>
      </div>
      <div class="panel" style="margin:0;padding:12px">
        <small class="sub">SHIPPER PHỤ TRÁCH</small>
        <div style="font-size:13px;font-weight:600;margin-top:4px">${esc(shipment.shipper)}</div>
        <div style="font-size:13px;color:#0369a1">📞 <a href="tel:${shipment.shipperPhone}">${esc(shipment.shipperPhone)}</a></div>
      </div>
    </div>

    <div class="panel" style="margin:0 0 14px">
      <h3 style="margin:0 0 10px;font-size:14px">Lịch trình chi tiết theo mốc thời gian</h3>
      <div class="timeline">
        ${shipment.timeline.map((step) => `
          <div class="timeline-item">
            <div class="timeline-title">${esc(step.desc)}</div>
            <div class="timeline-time">${esc(step.time)}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="end">
      <button class="btn secondary" onclick="closeModal()">Đóng</button>
      <button class="btn" onclick="nudgeShipper('${esc(shipment.trackingCode)}')">⚡ Giục phát hàng gấp</button>
    </div>
  `;
  show(content, null, 'large');
}

function nudgeShipper(trackingCode) {
  alert(`Đã gửi lệnh nhắc nhở & giục giao hàng ưu tiên đến hệ thống điều phối của vận đơn ${trackingCode}!`);
}

function openCreateShipmentModal() {
  const pendingOrders = orders.filter((o) => !o.trackingCode || o.status === 'Chờ đóng gói' || o.status === 'Chờ xác nhận');
  const genTrack = 'SPX-VN-' + Math.floor(100000 + Math.random() * 900000);

  const content = `
    <h2>Tạo phiếu gửi hàng & Bàn giao vận chuyển</h2>
    <div class="notice dev-notice" style="margin-bottom:14px">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Kết nối API đẩy đơn trực tiếp sang SPX, J&T, GHTK, Viettel Post.
    </div>

    <div class="field">
      <label>Chọn đơn hàng cần gửi *</label>
      <select id="shipOrderCode">
        ${pendingOrders.length ? pendingOrders.map((o) => `
          <option value="${esc(o.code)}">${esc(o.code)} - ${esc(o.product)} (${formatMoney(o.total)})</option>
        `).join('') : `
          <option value="FX-1035">FX-1035 - Tai nghe Bluetooth TWS Pro Max (590.000đ)</option>
          <option value="FX-1036">FX-1036 - Áo sơ mi Oxford trắng cao cấp (289.000đ)</option>
        `}
      </select>
    </div>

    <div class="row">
      <div class="field">
        <label>Đơn vị vận chuyển liên kết *</label>
        <select id="shipCarrier">
          <option>SPX Express (Shopee Logistics)</option>
          <option>J&T Express</option>
          <option>Giao Hàng Tiết Kiệm (GHTK)</option>
          <option>Viettel Post</option>
        </select>
      </div>
      <div class="field">
        <label>Gói dịch vụ</label>
        <select id="shipService">
          <option>Giao Tiêu Chuẩn (2-3 ngày)</option>
          <option>Giao Nhanh Express (24h)</option>
          <option>Hỏa tốc nội thành (2h)</option>
        </select>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label>Kho lấy hàng</label>
        <input value="Kho FixIt Tân Bình - 142 Cộng Hòa, Q. Tân Bình, TP.HCM" readonly style="background:#f4f7f6">
      </div>
      <div class="field">
        <label>Mã vận đơn dự kiến cấp</label>
        <input id="shipNewTrack" value="${genTrack}">
      </div>
    </div>

    <div class="field">
      <label>Ghi chú cho bưu tá lấy hàng</label>
      <input id="shipNote" value="Cho xem hàng, không cho thử. Hàng điện tử dễ vỡ xin nhẹ tay.">
    </div>

    <div class="end">
      <button class="btn secondary" onclick="closeModal()">Hủy</button>
      <button class="btn" onclick="submitCreateShipment()">Bàn giao & In phiếu gửi</button>
    </div>
  `;
  show(content, null, 'large');
}

function submitCreateShipment() {
  const orderCode = document.querySelector('#shipOrderCode').value;
  const carrier = document.querySelector('#shipCarrier').value;
  const track = document.querySelector('#shipNewTrack').value;
  closeModal();
  alert(`✅ Tạo phiếu gửi hàng thành công!\n- Mã đơn: ${orderCode}\n- Vận đơn: ${track}\n- Đơn vị: ${carrier}\nBưu tá sẽ ghé lấy hàng trong khung giờ hẹn.`);
}

function viewReconciliationDetailModal(orderCode) {
  const data = getMockReconciliationData();
  const item = data.items.find((i) => i.orderCode === orderCode) || data.items[0];

  const content = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <h2 style="margin:0">Bảng kê chi tiết phí đơn hàng #${esc(item.orderCode)}</h2>
        <small class="sub">Vận đơn: <b>${esc(item.trackingCode)}</b> · Kênh: <b>${esc(item.channel)}</b></small>
      </div>
      <span class="tag-status ${item.matchClass}">${esc(item.matchStatus)}</span>
    </div>

    <div class="notice dev-notice" style="margin-bottom:14px">
      ⚠️ <b>Dữ liệu mô phỏng:</b> Đối chiếu tự động giữa báo cáo GMV và sao kê cước sàn TMĐT.
    </div>

    <div class="panel" style="background:#fafafa;padding:14px;margin-bottom:14px">
      <table style="width:100%;font-size:13px">
        <tr>
          <td><b>Tổng giá trị đơn hàng (GMV):</b></td>
          <td style="text-align:right"><b>${formatMoney(item.gmv)}</b></td>
        </tr>
        <tr>
          <td>- Phí cố định sàn (Fixed Fee ~4%):</td>
          <td style="text-align:right;color:#cf3737">-${formatMoney(item.fixedFee)}</td>
        </tr>
        <tr>
          <td>- Phí dịch vụ & thanh toán (Payment Fee ~3.3%):</td>
          <td style="text-align:right;color:#cf3737">-${formatMoney(item.paymentFee)}</td>
        </tr>
        <tr>
          <td>- Voucher do người bán tài trợ:</td>
          <td style="text-align:right;color:#cf3737">-${formatMoney(item.voucherFee)}</td>
        </tr>
        <tr>
          <td>- Cước vận chuyển thực tế tính cho shop:</td>
          <td style="text-align:right;color:#cf3737">-${formatMoney(item.actualShippingFee - item.shippingSubsidy)}</td>
        </tr>
        <tr style="border-top:2px solid var(--line);font-size:14px">
          <td><b>TIỀN THỰC NHẬN VỀ VÍ NGƯỜI BÁN (NET):</b></td>
          <td style="text-align:right;color:${item.netPayout >= 0 ? '#107c41' : '#cf3737'};font-size:16px">
            <b>${formatMoney(item.netPayout)}</b>
          </td>
        </tr>
      </table>
    </div>

    <div class="notice ${item.hasAnomaly ? 'danger' : 'info'}" style="margin-bottom:14px">
      <b>Ghi chú đối soát hệ thống:</b> ${esc(item.feeBreakdown)}
    </div>

    <div class="end">
      <button class="btn secondary" onclick="closeModal()">Đóng</button>
      ${item.hasAnomaly ? `
        <button class="btn danger" onclick="claimShippingDiscrepancy('${esc(item.orderCode)}')">⚖️ Khiếu nại lệch cước sàn</button>
      ` : ''}
    </div>
  `;
  show(content, null, 'large');
}

function claimShippingDiscrepancy(orderCode) {
  closeModal();
  alert(`Đã tự động lập biên bản đối soát và gửi yêu cầu khiếu nại lệch cước cho đơn hàng #${orderCode} lên sàn! Mã vụ việc: DISPUTE-FEE-${orderCode}`);
}

function exportReconciliationReport() {
  alert('Đã xuất bảng đối soát tiền sàn và khấu trừ chi phí chu kỳ Tuần 45/2026 sang file Excel (FixIt_Reconciliation_W45.xlsx)!');
}

function viewInvoiceModal(invoiceId) {
  const invoices = getMockInvoicesData();
  const inv = invoices.find((i) => i.id === invoiceId) || invoices[0];

  const content = `
    <div style="background:white;padding:10px">
      <div style="border:2px solid #1e3a8a;border-radius:8px;padding:20px;background:#fcfdff">
        <div style="display:flex;justify-content:space-between;border-bottom:1.5px solid #1e3a8a;padding-bottom:12px;margin-bottom:14px">
          <div>
            <div style="font-size:16px;font-weight:800;color:#1e3a8a;text-transform:uppercase">CÔNG TY CỔ PHẦN CÔNG NGHỆ BÁN LẺ FIXIT</div>
            <div style="font-size:12px;color:var(--muted)">Địa chỉ: Tầng 6, Tòa nhà Retail Tower, P. Tân Bình, TP. Hồ Chí Minh</div>
            <div style="font-size:12px;color:var(--muted)">Mã số thuế: <b>0317892345</b> · Điện thoại: 028.7300.9999</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:700;color:#1e3a8a">Mẫu số: ${esc(inv.series)}</div>
            <div style="font-size:18px;font-weight:800;color:#cf3737">Số: ${esc(inv.number)}</div>
            <div style="font-size:11px;color:var(--muted)">Ngày: ${esc(inv.issueDate)}</div>
          </div>
        </div>

        <div style="text-align:center;margin:16px 0">
          <div style="font-size:20px;font-weight:800;color:#1e3a8a;letter-spacing:1px">HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)</div>
          <div style="font-size:12px;color:var(--muted)">(Bản thể hiện của hóa đơn điện tử theo Nghị định 123/2020/NĐ-CP)</div>
        </div>

        <div style="background:#f8fafc;padding:12px;border-radius:6px;font-size:12.5px;margin-bottom:14px;border:1px solid #e2e8f0">
          <div>Họ tên người mua hàng: <b>${esc(inv.customerName)}</b></div>
          <div>Mã số thuế / CCCD: <b>${esc(inv.taxCode)}</b></div>
          <div>Địa chỉ nhận hàng: ${esc(inv.buyerAddress)}</div>
          <div>Đơn hàng TMĐT: <b>#${esc(inv.orderCode)}</b> · Kênh bán: <b>${esc(inv.channel)}</b></div>
        </div>

        <table style="width:100%;font-size:12.5px;margin-bottom:14px;border-collapse:collapse">
          <thead>
            <tr style="background:#e0e7ff;border:1px solid #c7d2fe">
              <th style="padding:6px;border:1px solid #c7d2fe">STT</th>
              <th style="padding:6px;border:1px solid #c7d2fe">Tên hàng hóa, dịch vụ</th>
              <th style="padding:6px;border:1px solid #c7d2fe;text-align:center">ĐVT</th>
              <th style="padding:6px;border:1px solid #c7d2fe;text-align:center">SL</th>
              <th style="padding:6px;border:1px solid #c7d2fe;text-align:right">Đơn giá</th>
              <th style="padding:6px;border:1px solid #c7d2fe;text-align:right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:6px;border:1px solid #c7d2fe;text-align:center">1</td>
              <td style="padding:6px;border:1px solid #c7d2fe">Sản phẩm theo đơn hàng TMĐT #${esc(inv.orderCode)}</td>
              <td style="padding:6px;border:1px solid #c7d2fe;text-align:center">Cái</td>
              <td style="padding:6px;border:1px solid #c7d2fe;text-align:center">1</td>
              <td style="padding:6px;border:1px solid #c7d2fe;text-align:right">${formatMoney(inv.subtotal)}</td>
              <td style="padding:6px;border:1px solid #c7d2fe;text-align:right">${formatMoney(inv.subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div style="border:1.5px dashed #107c41;background:#f0fdf4;padding:8px 12px;border-radius:6px;font-size:11px">
            <div style="color:#107c41;font-weight:700">✓ CHỮ KÝ SỐ ĐIỆN TỬ HỢP LỆ</div>
            <div>Ký bởi: CÔNG TY CỔ PHẦN CÔNG NGHỆ BÁN LẺ FIXIT</div>
            <div>Mã CQT cấp: <b>${esc(inv.cqtCode)}</b></div>
          </div>
          <div style="text-align:right;font-size:13px">
            <div>Cộng tiền hàng: <b>${formatMoney(inv.subtotal)}</b></div>
            <div>Thuế suất GTGT (${esc(inv.vatRate)}): <b>${formatMoney(inv.vatAmount)}</b></div>
            <div style="font-size:16px;font-weight:800;color:#cf3737;margin-top:4px">
              TỔNG TIỀN THANH TOÁN: ${formatMoney(inv.total)}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="end" style="margin-top:14px">
      <button class="btn secondary" onclick="closeModal()">Đóng</button>
      <button class="btn secondary" onclick="downloadInvoiceXml('${esc(inv.id)}')">📥 Tải file XML hóa đơn</button>
      <button class="btn" onclick="alert('Đã gửi liên kết hóa đơn điện tử số ${esc(inv.number)} qua SMS & Email cho khách hàng!')">📧 Gửi HĐ cho khách</button>
    </div>
  `;
  show(content, null, 'large');
}

function downloadInvoiceXml(invoiceId) {
  alert(`Đã tải xuống file dữ liệu XML gốc có chữ ký điện tử hợp lệ của Hóa đơn ${invoiceId}!`);
}

function openBulkInvoiceIssueModal() {
  const content = `
    <h2>⚡ Phát hành Hóa đơn VAT điện tử hàng loạt</h2>
    <div class="notice dev-notice" style="margin-bottom:14px">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Đồng bộ hóa đơn sang MISA meInvoice / VNPT-Invoice & Ký số USB Token / HSM.
    </div>

    <div class="panel" style="padding:14px;margin-bottom:14px">
      <div style="font-size:14px;font-weight:600">Tìm thấy 14 đơn hàng đã giao thành công đủ điều kiện xuất HĐ</div>
      <small class="sub">Bao gồm 8 đơn Shopee, 4 đơn TikTok Shop, 2 đơn Website</small>
      <div style="font-size:18px;font-weight:800;color:var(--green);margin-top:8px">
        Tổng giá trị xuất HĐ: 4.820.000 VND (Thuế GTGT 8%: 357.037 VND)
      </div>
    </div>

    <div class="field">
      <label>Chọn nhà cung cấp giải pháp HĐĐT</label>
      <select id="invoiceProvider">
        <option>MISA meInvoice (API Cloud)</option>
        <option>VNPT-Invoice</option>
        <option>Viettel S-Invoice</option>
      </select>
    </div>

    <div class="field">
      <label>Hình thức ký số</label>
      <select id="signMethod">
        <option>Chữ ký số Server HSM Cloud (Ký tự động tức thời)</option>
        <option>USB Token vật lý cắm máy tính</option>
      </select>
    </div>

    <div class="end">
      <button class="btn secondary" onclick="closeModal()">Hủy</button>
      <button class="btn" onclick="submitBulkInvoiceIssue()">Ký số & Phát hành 14 hóa đơn</button>
    </div>
  `;
  show(content, null, 'large');
}

function submitBulkInvoiceIssue() {
  closeModal();
  alert('✅ Đã ký số và phát hành thành công 14 hóa đơn điện tử lên Cơ quan Thuế!\nDữ liệu đã được cập nhật vào sổ kế toán thuế TMĐT.');
}

function openConnectStoreModal() {
  const channels = [
    { name: 'Shopee', desc: 'Sàn TMĐT phổ biến nhất Việt Nam', logo: '🟠', type: 'Sàn TMĐT' },
    { name: 'TikTok Shop', desc: 'Thương mại điện tử mạng xã hội video ngắn', logo: '⬛', type: 'Sàn TMĐT' },
    { name: 'Lazada', desc: 'Sàn thương mại điện tử Lazada Open Platform', logo: '🔵', type: 'Sàn TMĐT' },
    { name: 'Shopify', desc: 'Nền tảng website bán hàng D2C chuẩn quốc tế', logo: '🟢', type: 'Website D2C' },
    { name: 'WooCommerce', desc: 'Website thương mại điện tử nền tảng WordPress', logo: '🟣', type: 'Website D2C' },
    { name: 'KiotViet POS', desc: 'Phần mềm quản lý bán hàng tại quầy Offline', logo: '🔷', type: 'Cửa hàng POS' },
    { name: 'Sapo POS', desc: 'Hệ thống quản lý bán hàng đa kênh & cửa hàng', logo: '🔶', type: 'Cửa hàng POS' },
  ];

  const content = `
    <h2>Kết nối kênh bán hàng & Cửa hàng mới</h2>
    <div class="notice dev-notice" style="margin-bottom:14px">
      ⚠️ <b>Chức năng đang phát triển (Dữ liệu mô phỏng - Hardcoded):</b> Ủy quyền OAuth2 kết nối Open API đa nền tảng.
    </div>

    <div class="card-grid" style="grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:12px">
      ${channels.map((c) => `
        <div class="card" style="padding:14px">
          <div style="font-size:24px;margin-bottom:6px">${c.logo}</div>
          <div style="font-weight:700;font-size:15px">${esc(c.name)}</div>
          <small class="sub" style="display:block;margin:4px 0 10px">${esc(c.desc)}</small>
          <button class="btn-xs primary" style="width:100%" onclick="submitConnectChannel('${esc(c.name)}')">Kết nối ngay</button>
        </div>
      `).join('')}
    </div>

    <div class="end" style="margin-top:16px">
      <button class="btn secondary" onclick="closeModal()">Đóng</button>
    </div>
  `;
  show(content, null, 'large');
}

function submitConnectChannel(channelName) {
  closeModal();
  alert(`Đang mở cổng ủy quyền OAuth2 cho kênh ${channelName}...\nĐã cấp quyền kết nối thành công vào hệ sinh thái FixIt Omnichannel!`);
}

function show(html, onClose = null, extraClass = '') {
  modalGeneration++;
  window.FixItModal.show(html, onClose, extraClass);
}

function closeModal() {
  modalGeneration++;
  window.FixItModal.close();
}

// Khởi chạy
init();
