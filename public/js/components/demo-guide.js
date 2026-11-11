/**
 * FixIt Demo Guide Widget - Floating Onboarding Assistant
 * Hiển thị hướng dẫn 6 bước demo luồng chính dưới dạng widget nổi góc dưới phải
 * Không làm ảnh hưởng đến bất kỳ logic nghiệp vụ nào
 */
(function () {
  'use strict';

  /* ─── CẤU HÌNH CÁC BƯỚC HƯỚNG DẪN ─────────────────────────────────────── */
  const GUIDE_STEPS = [
    {
      id: 'create-order',
      page: 'orders',
      title: '1. Tạo đơn hàng mới',
      icon: '📦',
      shortTitle: 'Tạo đơn',
      content: `
        <p class="dg-desc">Mô phỏng một đơn hàng mới từ sàn Shopee cần được đóng gói và giao cho shipper.</p>
        <div class="dg-step-block">
          <div class="dg-step-row"><span class="dg-num">1</span><span>Bấm nút <strong style="color:var(--ember)">＋ Thêm đơn hàng</strong> ở góc phải trên.</span></div>
          <div class="dg-step-row"><span class="dg-num">2</span><span>Điền theo dữ liệu gợi ý dưới đây hoặc bấm nút để tự điền:</span></div>
        </div>
        <div class="dg-prefill-box">
          <div class="dg-prefill-row"><span class="dg-label">Mã đơn</span><span id="dg-demo-code" class="dg-val">FX-DEMO1</span><button class="dg-copy-btn" onclick="window.FixItDemoGuide.copyText('FX-DEMO1')">📋</button></div>
          <div class="dg-prefill-row"><span class="dg-label">Sản phẩm</span><span class="dg-val" style="font-size:11px">Áo thun Streetwear phản quang Oversize (Size L)</span></div>
          <div class="dg-prefill-row"><span class="dg-label">Kênh</span><span class="dg-val">Shopee</span></div>
          <div class="dg-prefill-row"><span class="dg-label">Giá</span><span class="dg-val">199.000đ</span></div>
        </div>
        <div class="dg-step-block" style="margin-top:8px">
          <div class="dg-step-row"><span class="dg-num">3</span><span>Bấm <strong>Tạo đơn hàng</strong> → Đơn xuất hiện đầu danh sách.</span></div>
        </div>
        <div class="dg-result-badge">✅ Kết quả: Trạng thái <strong>Chờ đóng gói</strong></div>
      `,
      cta: { label: '→ Đi tới trang Đơn hàng đa kênh', page: 'orders', icon: '📋' },
      ctaAction: () => { if (typeof window.go === 'function') window.go('orders'); },
    },
    {
      id: 'packing-video',
      page: 'orders',
      title: '2. Quay / Tải video đóng gói',
      icon: '🎥',
      shortTitle: 'Video đóng gói',
      content: `
        <p class="dg-desc">Ghi lại bằng chứng video đóng gói niêm phong 6 mặt trước khi giao bưu tá — đây là "bảo bối" chống tráo hàng.</p>
        <div class="dg-step-block">
          <div class="dg-step-row"><span class="dg-num">1</span><span>Tìm đơn vừa tạo, bấm nút xanh <strong>Quay đóng hàng</strong>.</span></div>
          <div class="dg-step-row"><span class="dg-num">2</span><span>Trong popup, chọn tab <strong>"Tải tệp video lên"</strong>.</span></div>
          <div class="dg-step-row"><span class="dg-num">3</span><span>Dùng video mẫu áo đen bên dưới để demo:</span></div>
        </div>
        <div class="dg-video-preview">
          <video src="/samples/demo-packing-aoden.mp4" controls muted preload="metadata" style="width:100%;border-radius:10px;max-height:160px;background:#000"></video>
          <div class="dg-video-actions">
            <a class="dg-dl-btn" href="/samples/demo-packing-aoden.mp4" download="demo-packing-aoden.mp4">📥 Tải video đóng gói về máy</a>
            <span class="dg-video-hint">→ Kéo thả file vào ô upload trong popup</span>
          </div>
        </div>
        <div class="dg-step-block" style="margin-top:8px">
          <div class="dg-step-row"><span class="dg-num">4</span><span>Bấm <strong>Lưu bằng chứng đóng gói</strong>.</span></div>
        </div>
        <div class="dg-result-badge">✅ Kết quả: Trạng thái → <strong>Đã đóng gói</strong>, có nút "Xem video"</div>
      `,
      cta: { label: '→ Trang Đơn hàng đa kênh', page: 'orders', icon: '📋' },
      ctaAction: () => { if (typeof window.go === 'function') window.go('orders'); },
    },
    {
      id: 'return-unbox',
      page: 'returns',
      title: '3. Tiếp nhận kiện hoàn & Mở kiện',
      icon: '📬',
      shortTitle: 'Tiếp nhận hoàn',
      content: `
        <p class="dg-desc">Khách hàng hoàn hàng về. Bạn ghi hình mở kiện 6 mặt để bảo vệ quyền lợi trước sàn — không ghi hình = không đủ bằng chứng.</p>
        <div class="dg-step-block">
          <div class="dg-step-row"><span class="dg-num">1</span><span>Vào trang <strong>Hàng hoàn về</strong>.</span></div>
          <div class="dg-step-row"><span class="dg-num">2</span><span>Nhập mã đơn hàng vừa tạo (VD: <strong>FX-DEMO1</strong>) vào ô quét mã.</span></div>
          <div class="dg-step-row"><span class="dg-num">3</span><span>Bấm nút cam <strong>Tiếp nhận &amp; Mở kiện</strong>.</span></div>
          <div class="dg-step-row"><span class="dg-num">4</span><span>Chọn tab <strong>"Tải tệp video lên"</strong>, dùng video khui hàng mẫu:</span></div>
        </div>
        <div class="dg-video-preview">
          <video src="/samples/demo-return-khuihang.mp4" controls muted preload="metadata" style="width:100%;border-radius:10px;max-height:160px;background:#000"></video>
          <div class="dg-video-actions">
            <a class="dg-dl-btn" href="/samples/demo-return-khuihang.mp4" download="demo-return-khuihang.mp4">📥 Tải video khui hàng về máy</a>
            <span class="dg-video-hint">→ Kéo thả file vào ô upload trong popup</span>
          </div>
        </div>
        <div class="dg-step-block" style="margin-top:8px">
          <div class="dg-step-row"><span class="dg-num">5</span><span>Bấm <strong>Lưu bằng chứng mở kiện</strong>.</span></div>
        </div>
        <div class="dg-result-badge">✅ Kết quả: Trạng thái → <strong>Đang kiểm tra hàng hoàn</strong></div>
      `,
      cta: { label: '→ Trang Hàng hoàn về', page: 'returns', icon: '↩' },
      ctaAction: () => { if (typeof window.go === 'function') window.go('returns'); },
    },
    {
      id: 'ai-analysis',
      page: 'evidence',
      title: '4. Đối chiếu video kép bằng AI',
      icon: '🤖',
      shortTitle: 'Phân tích AI',
      content: `
        <p class="dg-desc">Hệ thống đặt 2 video song song — đóng gói vs mở kiện — rồi Gemini AI tự động phát hiện sai khác với độ chính xác cao.</p>
        <div class="dg-step-block">
          <div class="dg-step-row"><span class="dg-num">1</span><span>Vào trang <strong>Hồ sơ khiếu nại</strong>, bấm đơn hàng vừa xử lý.</span></div>
          <div class="dg-step-row"><span class="dg-num">2</span><span>Bấm nút <strong style="color:#8B5CF6">⚡ Phân tích bằng AI (Gemini Flash)</strong>.</span></div>
          <div class="dg-step-row"><span class="dg-num">3</span><span>AI trả về bảng sai lệch gồm: mô tả, mốc thời gian (timestamp) và mức độ tin cậy.</span></div>
          <div class="dg-step-row"><span class="dg-num">4</span><span>Chọn các điểm sai lệch phù hợp → Bấm <strong>Tạo hồ sơ khiếu nại</strong>.</span></div>
        </div>
        <div class="dg-info-box">
          <span style="font-size:16px">💡</span>
          <span>Video đóng gói: <strong>Áo đen mới 100%</strong><br>Video khui hàng: <strong>Có thể đã bị tráo/thiếu</strong><br>AI sẽ phát hiện sự khác biệt tự động!</span>
        </div>
        <div class="dg-result-badge">✅ Kết quả: Có bằng chứng AI xác thực chống chối cãi</div>
      `,
      cta: { label: '→ Trang Thư viện Video', page: 'evidence', icon: '🎬' },
      ctaAction: () => { if (typeof window.go === 'function') window.go('evidence'); },
    },
    {
      id: 'claim-file',
      page: 'claims',
      title: '5. Lập hồ sơ tranh chấp đòi bồi hoàn',
      icon: '📄',
      shortTitle: 'Hồ sơ khiếu nại',
      content: `
        <p class="dg-desc">FixIt tự động sinh hồ sơ tranh chấp chuẩn pháp lý Shopee / TikTok Shop với đầy đủ bằng chứng video và phân tích AI đính kèm.</p>
        <div class="dg-step-block">
          <div class="dg-step-row"><span class="dg-num">1</span><span>Vào trang <strong>Hồ sơ khiếu nại</strong>, bấm nút <strong>Mở kiện hoàn</strong> tại đơn hàng.</span></div>
          <div class="dg-step-row"><span class="dg-num">2</span><span>Bấm nút <strong>Phán quyết</strong> để xem mô phỏng Trọng tài sàn xem xét bằng chứng.</span></div>
          <div class="dg-step-row"><span class="dg-num">3</span><span>Hồ sơ tự động bao gồm: Video đóng gói + Video mở kiện + Phân tích AI + Thông tin đơn hàng đầy đủ.</span></div>
          <div class="dg-step-row"><span class="dg-num">4</span><span>Bấm <strong>Duyệt đối chiếu AI</strong> trên các đơn hoàn trong bảng khiếu nại.</span></div>
        </div>
        <div class="dg-info-box">
          <span style="font-size:16px">⚖️</span>
          <span>Bằng chứng video kép kết hợp AI phân tích có <strong>tỷ lệ thắng kiện 100%</strong> trong dữ liệu mô phỏng!</span>
        </div>
        <div class="dg-result-badge">✅ Kết quả: Hồ sơ trạng thái <strong>Chờ sàn duyệt</strong></div>
      `,
      cta: { label: '→ Trang Hồ sơ khiếu nại', page: 'claims', icon: '📋' },
      ctaAction: () => { if (typeof window.go === 'function') window.go('claims'); },
    },
    {
      id: 'verdict-wallet',
      page: 'simulator',
      title: '6. Phán quyết & Tiền về Ví Shop',
      icon: '💰',
      shortTitle: 'Tiền về ví',
      content: `
        <p class="dg-desc">Bước cuối! Trọng tài sàn ra phán quyết bồi hoàn 100%. Tiền giải ngân thẳng vào Ví Shop người bán.</p>
        <div class="dg-step-block">
          <div class="dg-step-row"><span class="dg-num">1</span><span>Vào trang <strong>Sàn giả lập</strong> để mô phỏng Trọng tài Shopee/TikTok Shop xét xử.</span></div>
          <div class="dg-step-row"><span class="dg-num">2</span><span>Bấm nút <strong>Phán quyết</strong> tại hồ sơ tranh chấp để xem kết quả.</span></div>
          <div class="dg-step-row"><span class="dg-num">3</span><span>Quan sát số dư <strong>Chip Ví Shop</strong> trên Header đỉnh trang tăng lên!</span></div>
          <div class="dg-step-row"><span class="dg-num">4</span><span>Bấm vào <strong>Ví Shop</strong> trên Header để xem sao kê biến động số dư chi tiết.</span></div>
        </div>
        <div class="dg-info-box" style="background:rgba(47,143,91,0.1);border-color:rgba(47,143,91,0.3)">
          <span style="font-size:20px">🎉</span>
          <span><strong>Chúc mừng!</strong> Bạn vừa hoàn thành toàn bộ luồng demo FixIt. Muốn chạy lại từ đầu, bấm nút <strong>Nạp dữ liệu</strong> trên header để khôi phục dữ liệu mẫu!</span>
        </div>
        <div class="dg-result-badge" style="background:rgba(47,143,91,0.1);border-color:rgba(47,143,91,0.3);color:#1e7a4a">🏆 Demo hoàn thành! Bồi hoàn 100% thành công!</div>
      `,
      cta: { label: '→ Trang Sàn giả lập', page: 'simulator', icon: '⚖️' },
      ctaAction: () => { if (typeof window.go === 'function') window.go('simulator'); },
    },
  ];

  /* ─── STATE ─────────────────────────────────────────────────────────────── */
  let currentStep = 0;
  let isMinimized = false;
  let isOpen = false;
  let widgetEl = null;
  let triggerEl = null;

  /* ─── HELPERS ────────────────────────────────────────────────────────────── */
  function saveState() {
    try {
      localStorage.setItem('fixit_demo_guide', JSON.stringify({ step: currentStep, open: isOpen, minimized: isMinimized }));
    } catch {}
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem('fixit_demo_guide') || '{}');
      currentStep = Math.max(0, Math.min(GUIDE_STEPS.length - 1, s.step || 0));
      isMinimized = !!s.minimized;
      isOpen = !!s.open;
    } catch {}
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof window.FixItAlert === 'function') {
        window.FixItAlert('success', 'Đã sao chép: ' + text);
      }
    }).catch(() => {});
  }

  /* ─── RENDER ─────────────────────────────────────────────────────────────── */
  function renderWidget() {
    if (!widgetEl) return;
    const step = GUIDE_STEPS[currentStep];
    const totalSteps = GUIDE_STEPS.length;

    if (!isOpen) {
      widgetEl.style.display = 'none';
      return;
    }
    widgetEl.style.display = 'flex';

    const dotsHtml = GUIDE_STEPS.map((s, i) => `
      <button class="dg-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}"
        onclick="window.FixItDemoGuide.goStep(${i})" title="${s.title}">
        ${i < currentStep ? '✓' : i + 1}
      </button>
    `).join('');

    widgetEl.innerHTML = `
      <div class="dg-header">
        <div class="dg-header-left">
          <span class="dg-icon">${step.icon}</span>
          <div>
            <div class="dg-title">Hướng dẫn Demo</div>
            <div class="dg-step-label">Bước ${currentStep + 1} / ${totalSteps}</div>
          </div>
        </div>
        <div class="dg-header-actions">
          <button class="dg-ctrl-btn" onclick="window.FixItDemoGuide.toggle()" title="Thu nhỏ">—</button>
          <button class="dg-ctrl-btn" onclick="window.FixItDemoGuide.close()" title="Đóng">✕</button>
        </div>
      </div>

      <div class="dg-progress-dots">${dotsHtml}</div>

      <div class="dg-step-title">${step.title}</div>

      <div class="dg-body" id="dg-body-scroll">
        ${step.content}
      </div>

      <div class="dg-footer">
        <button class="dg-cta-btn" onclick="(${step.ctaAction.toString()})()">
          <span>${step.cta.icon}</span> ${step.cta.label}
        </button>
        <div class="dg-nav-btns">
          <button class="dg-nav-btn" onclick="window.FixItDemoGuide.prev()" ${currentStep === 0 ? 'disabled' : ''}>◀ Trước</button>
          <button class="dg-nav-btn primary" onclick="window.FixItDemoGuide.next()" ${currentStep === totalSteps - 1 ? 'disabled' : ''}>Tiếp ▶</button>
        </div>
      </div>
    `;

    // Apply minimize state
    widgetEl.classList.toggle('dg-minimized', isMinimized);
  }

  function renderMinimizedPill() {
    if (!widgetEl) return;
    if (!isOpen) {
      widgetEl.style.display = 'none';
      return;
    }
    if (isMinimized) {
      const step = GUIDE_STEPS[currentStep];
      widgetEl.style.display = 'flex';
      widgetEl.classList.add('dg-minimized');
      widgetEl.innerHTML = `
        <div class="dg-mini-pill" onclick="window.FixItDemoGuide.toggle()">
          <span>${step.icon}</span>
          <span class="dg-mini-label">Hướng dẫn Demo <span class="dg-mini-step">${currentStep + 1}/${GUIDE_STEPS.length}</span></span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
        </div>
      `;
    }
  }

  function refresh() {
    if (isMinimized) {
      renderMinimizedPill();
    } else {
      renderWidget();
    }
    updateTriggerBtn();
    saveState();
  }

  function updateTriggerBtn() {
    if (!triggerEl) return;
    triggerEl.style.display = isOpen ? 'none' : 'flex';
  }

  /* ─── ACTIONS ────────────────────────────────────────────────────────────── */
  const API = {
    open() {
      isOpen = true;
      isMinimized = false;
      refresh();
    },
    close() {
      isOpen = false;
      refresh();
    },
    toggle() {
      isMinimized = !isMinimized;
      refresh();
    },
    next() {
      if (currentStep < GUIDE_STEPS.length - 1) {
        currentStep++;
        isMinimized = false;
        refresh();
        const bodyEl = document.querySelector('#dg-body-scroll');
        if (bodyEl) bodyEl.scrollTop = 0;
      }
    },
    prev() {
      if (currentStep > 0) {
        currentStep--;
        isMinimized = false;
        refresh();
        const bodyEl = document.querySelector('#dg-body-scroll');
        if (bodyEl) bodyEl.scrollTop = 0;
      }
    },
    goStep(idx) {
      currentStep = Math.max(0, Math.min(GUIDE_STEPS.length - 1, idx));
      isMinimized = false;
      refresh();
    },
    copyText,
  };

  window.FixItDemoGuide = API;

  /* ─── INJECT CSS ─────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.querySelector('#fixit-demo-guide-styles')) return;
    const style = document.createElement('style');
    style.id = 'fixit-demo-guide-styles';
    style.textContent = `
      /* ═══════════════════════════════════════════════════════
         FIXIT DEMO GUIDE WIDGET
      ═══════════════════════════════════════════════════════ */
      #fixit-demo-guide-widget {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 1050;
        width: 370px;
        max-height: 580px;
        background: rgba(255, 250, 245, 0.97);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,140,66,0.18);
        border-radius: 20px;
        box-shadow: 0 8px 40px rgba(16,26,43,0.22), 0 2px 8px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: dg-slide-up 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
        transition: width 0.28s ease, max-height 0.28s ease, border-radius 0.28s ease;
      }

      #fixit-demo-guide-widget.dg-minimized {
        width: auto;
        max-height: 56px;
        min-width: 220px;
        border-radius: 28px;
        overflow: visible;
      }

      @keyframes dg-slide-up {
        from { opacity: 0; transform: translateY(20px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0)   scale(1); }
      }

      /* Header */
      .dg-header {
        background: linear-gradient(135deg, #101A2B 0%, #1D2E45 100%);
        padding: 14px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        gap: 8px;
      }
      .dg-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .dg-icon {
        font-size: 22px;
        line-height: 1;
      }
      .dg-title {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.01em;
      }
      .dg-step-label {
        font-size: 11px;
        color: rgba(255,255,255,0.55);
        margin-top: 1px;
      }
      .dg-header-actions {
        display: flex;
        gap: 4px;
      }
      .dg-ctrl-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 6px;
        color: rgba(255,255,255,0.75);
        width: 26px;
        height: 26px;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }
      .dg-ctrl-btn:hover {
        background: rgba(255,255,255,0.2);
        color: #fff;
      }

      /* Progress dots */
      .dg-progress-dots {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px 6px;
        flex-shrink: 0;
        background: #fff;
        border-bottom: 1px solid rgba(0,0,0,0.05);
      }
      .dg-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid var(--sand-200, #E5DDD5);
        background: #fff;
        color: #aaa;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .dg-dot.active {
        background: #FF8C42;
        border-color: #FF8C42;
        color: #fff;
        transform: scale(1.15);
        box-shadow: 0 0 0 3px rgba(255,140,66,0.2);
      }
      .dg-dot.done {
        background: #2F8F5B;
        border-color: #2F8F5B;
        color: #fff;
      }
      .dg-dot:hover:not(.active) {
        border-color: #FF8C42;
        color: #FF8C42;
      }

      /* Step title */
      .dg-step-title {
        font-size: 14px;
        font-weight: 700;
        color: #101A2B;
        padding: 10px 16px 2px;
        flex-shrink: 0;
      }

      /* Body scroll area */
      .dg-body {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 8px 16px 12px;
        scrollbar-width: thin;
        scrollbar-color: rgba(0,0,0,0.12) transparent;
      }
      .dg-body::-webkit-scrollbar { width: 4px; }
      .dg-body::-webkit-scrollbar-track { background: transparent; }
      .dg-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }

      /* Content elements */
      .dg-desc {
        font-size: 12.5px;
        color: #5a6476;
        line-height: 1.55;
        margin: 0 0 10px 0;
      }
      .dg-step-block {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-bottom: 10px;
      }
      .dg-step-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 12.5px;
        color: #2a3344;
        line-height: 1.5;
      }
      .dg-num {
        min-width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FF8C42, #FFAD6B);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .dg-prefill-box {
        background: #F7F3EE;
        border: 1px solid #E5DDD5;
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin-bottom: 8px;
      }
      .dg-prefill-row {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11.5px;
      }
      .dg-label {
        color: #888;
        min-width: 60px;
        font-weight: 500;
      }
      .dg-val {
        color: #101A2B;
        font-weight: 600;
        flex: 1;
      }
      .dg-copy-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        padding: 0 2px;
        opacity: 0.6;
        transition: opacity 0.15s;
      }
      .dg-copy-btn:hover { opacity: 1; }

      /* Video preview */
      .dg-video-preview {
        background: #0a0a0a;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .dg-video-actions {
        background: #fff;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-top: 1px solid #eee;
      }
      .dg-dl-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: linear-gradient(135deg, #FF8C42, #FFAD6B);
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 11.5px;
        font-weight: 600;
        width: fit-content;
        transition: opacity 0.15s;
      }
      .dg-dl-btn:hover { opacity: 0.88; }
      .dg-video-hint {
        font-size: 11px;
        color: #888;
      }

      /* Info box */
      .dg-info-box {
        background: rgba(255,140,66,0.08);
        border: 1px solid rgba(255,140,66,0.2);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 12px;
        color: #2a3344;
        line-height: 1.5;
        margin-bottom: 8px;
      }

      /* Result badge */
      .dg-result-badge {
        background: rgba(47,143,91,0.08);
        border: 1px solid rgba(47,143,91,0.2);
        border-radius: 8px;
        padding: 7px 12px;
        font-size: 12px;
        color: #1e5c3b;
        margin-top: 4px;
      }

      /* Footer */
      .dg-footer {
        padding: 10px 14px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid rgba(0,0,0,0.06);
        flex-shrink: 0;
        background: rgba(255,250,245,0.9);
      }
      .dg-cta-btn {
        width: 100%;
        background: linear-gradient(135deg, #101A2B, #1D2E45);
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 9px 14px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: opacity 0.15s, transform 0.15s;
      }
      .dg-cta-btn:hover { opacity: 0.88; transform: translateY(-1px); }
      .dg-nav-btns {
        display: flex;
        gap: 7px;
        justify-content: space-between;
      }
      .dg-nav-btn {
        flex: 1;
        background: #F0EBE5;
        border: none;
        border-radius: 9px;
        padding: 7px 12px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        color: #2a3344;
        transition: background 0.15s;
      }
      .dg-nav-btn:hover:not(:disabled) { background: #E5DDD5; }
      .dg-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      .dg-nav-btn.primary {
        background: linear-gradient(135deg, #FF8C42, #FFAD6B);
        color: #fff;
      }
      .dg-nav-btn.primary:hover:not(:disabled) { opacity: 0.88; }

      /* Minimized pill */
      .dg-mini-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        cursor: pointer;
        background: linear-gradient(135deg, #101A2B, #1D2E45);
        border-radius: 28px;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        animation: dg-pulse 2.5s infinite;
        user-select: none;
      }
      .dg-mini-label {
        display: flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
      }
      .dg-mini-step {
        background: #FF8C42;
        border-radius: 10px;
        padding: 1px 7px;
        font-size: 11px;
      }
      @keyframes dg-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(255,140,66,0.2); }
        50%       { box-shadow: 0 4px 28px rgba(255,140,66,0.45); }
      }

      /* Trigger button (always visible on header area) */
      #fixit-demo-trigger {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: linear-gradient(135deg, #FF8C42, #FFAD6B);
        color: #fff;
        border: none;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.15s;
        white-space: nowrap;
        box-shadow: 0 2px 10px rgba(255,140,66,0.3);
      }
      #fixit-demo-trigger:hover { opacity: 0.88; transform: translateY(-1px); }

      /* Mobile responsive */
      @media (max-width: 768px) {
        #fixit-demo-guide-widget:not(.dg-minimized) {
          width: calc(100vw - 24px);
          right: 12px;
          bottom: 12px;
          max-height: 70vh;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── MOUNT ──────────────────────────────────────────────────────────────── */
  function mount() {
    injectStyles();
    loadState();

    // Create widget container
    widgetEl = document.createElement('div');
    widgetEl.id = 'fixit-demo-guide-widget';
    widgetEl.style.display = 'none';
    document.body.appendChild(widgetEl);

    // Create header trigger button
    const topActions = document.querySelector('.top-actions');
    if (topActions) {
      triggerEl = document.createElement('button');
      triggerEl.id = 'fixit-demo-trigger';
      triggerEl.innerHTML = '💡 Hướng dẫn Demo';
      triggerEl.onclick = () => API.open();
      // Insert before the first child of top-actions
      topActions.insertBefore(triggerEl, topActions.firstChild);
    }

    // Auto-open on first visit
    if (!localStorage.getItem('fixit_demo_guide')) {
      setTimeout(() => API.open(), 800);
    } else {
      refresh();
    }
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    setTimeout(mount, 100);
  }
})();
