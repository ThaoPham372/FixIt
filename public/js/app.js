// FixIt Frontend Application Logic
const app = document.querySelector('#app');
let page = 'home';
let orders = [];
let claims = [];
let products = [];
let stores = [];
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

async function loadAllData() {
  try {
    [orders, claims] = await Promise.all([api('/orders'), api('/claims')]);
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
  } catch (e) {
    console.warn('Lỗi tải trang:', e);
  }
}

// Khôi phục dữ liệu mẫu
async function resetSeedData() {
  if (!confirm('Bạn có muốn nạp lại toàn bộ dữ liệu mẫu đầy đủ cho tất cả các trang không?')) return;
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
  }
});

// Render hàm chính
async function render() {
  const titles = {
    home: 'Tổng quan vận hành & Hàng hoàn',
    orders: 'Quản lý đơn hàng đa kênh',
    products: 'Danh mục sản phẩm & Rủi ro hoàn',
    inventory: 'Quản lý tồn kho & Hàng hoàn',
    stores: 'Gian hàng TMĐT liên kết',
    returns: 'Tiếp nhận kiện hàng hoàn về',
    evidence: 'Kho video & Bằng chứng đóng hàng',
    claims: 'Hồ sơ tranh chấp & Khiếu nại sàn',
    reports: 'Báo cáo tài chính & Thu hồi tiền',
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
        ${page === 'returns' ? '<button class="btn danger" onclick="scan(\'\',\'return\')">＋ Tiếp nhận kiện hoàn</button>' : ''}
        ${page === 'products' ? '<button class="btn" onclick="newProductModal()">＋ Thêm sản phẩm</button>' : ''}
      </div>
    </div>
  `;

  if (page === 'home') {
    renderHome(h);
  } else if (page === 'orders') {
    renderOrders(h);
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
function renderInventory(header) {
  const pList = inventoryData?.products || products || getMockProducts();
  const summary = inventoryData?.summary || {
    totalStock: 726,
    totalReserved: 86,
    totalInInspection: 12,
    totalRestockedCount: 18,
    totalDisputedCount: 4,
  };

  app.innerHTML = `
    ${header}

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
  `;
}

// 5. TRANG GIAN HÀNG TMĐT (STORES)
function renderStores(header) {
  const storeList = stores.length
    ? stores
    : [
      { code: 'SHOP-SP-TECH', name: 'FixIt Tech & Gear Flagship', platform: 'Shopee', shopType: 'Shop Mall', status: 'Đang kết nối', activeOrders: 312, returnRate: 6.2, totalRevenue: 382400000, rating: 4.9 },
      { code: 'SHOP-TK-FASHION', name: 'FixIt Fashion Official Store', platform: 'TikTok Shop', shopType: 'Shop Mall', status: 'Đang kết nối', activeOrders: 184, returnRate: 4.5, totalRevenue: 145200000, rating: 4.8 },
      { code: 'SHOP-SP-BEAUTY', name: 'FixIt Skincare & Cosmetics', platform: 'Shopee', shopType: 'Shop Yêu Thích', status: 'Đang kết nối', activeOrders: 98, returnRate: 3.1, totalRevenue: 86900000, rating: 4.7 },
      { code: 'SHOP-TK-HOME', name: 'FixIt Home & Living', platform: 'TikTok Shop', shopType: 'Shop Thường', status: 'Đang kết nối', activeOrders: 64, returnRate: 2.0, totalRevenue: 52300000, rating: 4.9 },
    ];

  app.innerHTML = `
    ${header}
    <div class="card-grid">
      ${storeList
      .map(
        (s) => `
        <div class="card">
          <div class="card-header">
            <div>
              <span class="channel-pill channel-${s.platform.toLowerCase().includes('shopee') ? 'shopee' : 'tiktok'}">${esc(s.platform)}</span>
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
            <button class="btn-xs secondary" onclick="alert('Đã đồng bộ trạng thái đơn hàng mới nhất từ ${esc(s.name)}')">Đồng bộ API</button>
          </div>
        </div>
      `
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
        <div class="metric-title">Hồ sơ chờ sàn giải quyết</div>
        <div class="number amber">${r.financials?.pendingClaimsCount || 0} vụ</div>
        <small class="sub">Đang trong thời hạn 72h</small>
      </div>
      <div class="metric">
        <div class="metric-title">Đơn hàng bị hoàn</div>
        <div class="number danger">${orders.filter((o) => o.returnReason).length} đơn</div>
        <small class="sub">Tỷ lệ hoàn trung bình ~5.2%</small>
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
  if (!confirm('Bạn xác nhận kiện hàng hoàn này NGUYÊN VẸN, không bị hư hỏng hay tráo đổi và muốn NHẬP LẠI KHO?\n(Hệ thống sẽ kết thúc quy trình và KHÔNG tạo hồ sơ khiếu nại)')) {
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
      if (!confirm('Bạn chưa chọn hoặc nhập điểm khác biệt nào. Bạn có chắc chắn vẫn muốn tạo hồ sơ khiếu nại thủ công?')) {
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
        <span class="tag ${c.status === 'Đã bồi hoàn' ? 'tag-success' : c.status === 'Đang khiếu nại' ? 'tag-warn' : 'tag-info'}">${esc(c.status)}</span>
      </div>

      ${isSubmitted
        ? `
        <div class="notice success" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;margin-bottom:14px">
          <b>🚀 ĐÃ NỘP QUA OPEN API SÀN ${esc(c.channel || 'TMĐT').toUpperCase()} THÀNH CÔNG</b>
          <div style="margin-top:6px;font-size:12.5px">
            • <b>Mã hồ sơ tranh chấp (Dispute ID):</b> <code style="background:#e8f5e9;padding:2px 6px;border-radius:4px;color:#1b5e20">${esc(c.apiDisputeId)}</code><br>
            • <b>Thời gian gửi:</b> ${formatDate(c.submittedAt)}<br>
            • <b>Cổng tiếp nhận:</b> ${esc(c.platformResponse?.provider || 'Open API Gateway')}<br>
            • <b>Thời hạn sàn cam kết xử lý:</b> <b>${esc(c.platformResponse?.estimatedReviewTime || '48 giờ')}</b>
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
      !confirm(
        `Bạn có chắc chắn muốn gửi tự động toàn bộ hồ sơ khiếu nại #${c.orderCode} cùng video bằng chứng lên cổng Open API của sàn ${channelName} không?\n\n` +
        `• Số tiền bồi hoàn: ${formatMoney(c.claimAmount)}\n` +
        `• Hồ sơ sẽ được đẩy trực tiếp lên Seller Center của shop.`
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

function show(html, onClose = null) {
  modalGeneration++;
  window.FixItModal.show(html, onClose);
}

function closeModal() {
  modalGeneration++;
  window.FixItModal.close();
}

// Khởi chạy
init();
