class OrderTable extends HTMLElement {
  static template(orders, escape) {
    if (!orders || !orders.length) {
      return `<p class="sub" style="padding:28px 8px;text-align:center">Chưa có dữ liệu đơn hàng phù hợp.</p>`;
    }

    const formatMoney = (v) =>
      `<span class="tabular-nums">${Number(v || 0).toLocaleString('vi-VN')}</span><small style="font-size:0.85em;color:var(--ink-muted-aa);margin-left:2px">đ</small>`;

    const getStatusBadge = (status) => {
      const s = String(status || '').trim();
      let cls = 'tag-status';
      if (s === 'Chờ xác nhận') cls += ' tag-info';
      else if (s === 'Chờ đóng gói') cls += ' tag-warn';
      else if (s === 'Đã đóng gói') cls += ' tag-success';
      else if (s === 'Đang giao hàng') cls += ' tag-info';
      else if (s === 'Đã giải quyết - Hoàn tiền') cls += ' tag-success';
      else if (s === 'Khiếu nại bị từ chối') cls += ' tag-danger';
      else if (s.includes('nguyên vẹn')) cls += ' tag-success';
      else if (s.includes('hoàn') || s.includes('kiểm tra')) cls += ' tag-danger';
      else if (s.includes('khiếu nại')) cls += ' tag-danger';
      else cls += ' tag-info';
      return `<span class="${cls}">${escape(s)}</span>`;
    };

    return `
      <div class="table-responsive" style="overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;">
      <table>
        <thead>
          <tr>
            <th>Mã đơn / Vận đơn</th>
            <th>Sản phẩm & Khách hàng</th>
            <th class="hide" style="width:120px;text-align:center">Kênh</th>
            <th style="text-align:right">Tổng tiền</th>
            <th style="width:175px">Trạng thái</th>
            <th style="width:205px;text-align:right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map((o) => {
              const channelLower = (o.channel || '').toLowerCase();
              let dotCls = 'tiktok';
              if (channelLower.includes('shopee')) dotCls = 'shopee';
              else if (channelLower.includes('web')) dotCls = 'web';
              else if (channelLower.includes('pos')) dotCls = 'pos';

              let mainActionBtn = '';
              if (o.status === 'Chờ xác nhận') {
                mainActionBtn = `<button class="btn-action-main primary" data-action="confirm" data-code="${escape(o.code)}">Xác nhận</button>`;
              } else if (o.status === 'Chờ đóng gói') {
                mainActionBtn = `<button class="btn-action-main success" data-action="pack" data-code="${escape(o.code)}">Quay đóng hàng</button>`;
              } else if (o.status === 'Đã đóng gói') {
                mainActionBtn = `<button class="btn-action-main secondary" data-action="view-evidence" data-code="${escape(o.code)}">Xem video</button>`;
              } else if (o.status === 'Đang kiểm tra hàng hoàn' || o.status === 'Đang hoàn về') {
                mainActionBtn = `<button class="btn-action-main danger" data-action="return-inspect" data-code="${escape(o.code)}">Mở kiện hoàn</button>`;
              } else if (o.status === 'Chờ người bán duyệt khiếu nại') {
                mainActionBtn = `<button class="btn-action-main warning" data-action="claim-review" data-code="${escape(o.code)}">Duyệt khiếu nại</button>`;
              } else if (o.status === 'Đang khiếu nại sàn') {
                mainActionBtn = `<button class="btn-action-main danger" data-action="view-simulator" data-code="${escape(o.code)}">Sàn đang xử lý</button>`;
              } else if (o.status === 'Đã giải quyết - Hoàn tiền') {
                mainActionBtn = `<button class="btn-action-main success" data-action="view-wallet" data-code="${escape(o.code)}">Đã hoàn tiền</button>`;
              } else if (o.status === 'Khiếu nại bị từ chối') {
                mainActionBtn = `<button class="btn-action-main secondary" data-action="view-simulator" data-code="${escape(o.code)}">Bị từ chối</button>`;
              }

              return `
            <tr class="reveal-stagger">
              <td>
                <b class="tabular-nums" style="color:var(--ink-900);letter-spacing:-0.01em">${escape(o.code)}</b>
                ${
                  o.trackingCode
                    ? `<br><small class="sub tabular-nums">Mã VĐ: ${escape(o.trackingCode)}</small>`
                    : ''
                }
                ${
                  o.returnTrackingCode
                    ? `<br><small class="tabular-nums" style="color:var(--status-error);font-weight:500">VĐ Hoàn: ${escape(o.returnTrackingCode)}</small>`
                    : ''
                }
              </td>
              <td>
                <div style="font-weight:600">${escape(o.product)}</div>
                <small class="sub">${escape(o.customerName || 'Khách hàng')} · SKU: <span class="tabular-nums">${escape(o.sku || 'N/A')}</span></small>
              </td>
              <td class="hide" style="text-align:center">
                <span class="channel-pill-neutral">
                  <span class="channel-brand-dot ${dotCls}"></span>
                  ${escape(o.channel || 'Khác')}
                </span>
              </td>
              <td style="text-align:right"><b>${formatMoney(o.total)}</b></td>
              <td>
                ${getStatusBadge(o.status)}
                ${
                  o.returnReason
                    ? `<div class="sub" style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px" title="Lý do hoàn: ${escape(o.returnReason)}">Lý do: ${escape(o.returnReason)}</div>`
                    : ''
                }
              </td>
              <td style="text-align:right">
                <div style="display:inline-flex;align-items:center;justify-content:flex-end;gap:6px">
                  ${mainActionBtn}
                  <button class="btn-action-sub" data-action="view-detail" data-code="${escape(o.code)}">Chi tiết</button>
                </div>
              </td>
            </tr>
          `;
            })
            .join('')}
        </tbody>
      </table>
      </div>
    `;
  }

  connectedCallback() {
    this.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (button) {
        this.dispatchEvent(
          new CustomEvent('fixit-order-action', {
            bubbles: true,
            detail: { action: button.dataset.action, code: button.dataset.code },
          })
        );
      }
    });
  }
}

window.FixItOrderTable = OrderTable;
if (!customElements.get('fixit-order-table')) {
  customElements.define('fixit-order-table', OrderTable);
}
