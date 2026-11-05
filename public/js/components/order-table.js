class OrderTable extends HTMLElement {
  static template(orders, escape) {
    if (!orders || !orders.length) {
      return `<p class="sub" style="padding:24px 8px;text-align:center">Chưa có dữ liệu đơn hàng phù hợp.</p>`;
    }

    const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + 'đ';

    const getStatusBadge = (status) => {
      let cls = 'tag-status';
      if (status === 'Chờ xác nhận') cls += ' tag-info';
      else if (status === 'Chờ đóng gói') cls += ' tag-warn';
      else if (status === 'Đã đóng gói') cls += ' tag-success';
      else if (status === 'Đang giao hàng') cls += ' tag-info';
      else if (status === 'Đã giải quyết - Hoàn tiền') cls += ' tag-success';
      else if (status === 'Khiếu nại bị từ chối') cls += ' tag-danger';
      else if (status.includes('nguyên vẹn')) cls += ' tag-success';
      else if (status.includes('hoàn') || status.includes('kiểm tra')) cls += ' tag-danger';
      else if (status.includes('khiếu nại')) cls += ' tag-danger';
      return `<span class="${cls}">${escape(status)}</span>`;
    };

    return `
      <div style="overflow-x:auto">
      <table>
        <thead>
          <tr>
            <th>Mã đơn / Vận đơn</th>
            <th>Sản phẩm & Khách hàng</th>
            <th class="hide" style="width:115px;text-align:center">Kênh</th>
            <th>Tổng tiền</th>
            <th style="width:175px">Trạng thái</th>
            <th style="width:215px;text-align:right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map(
              (o) => `
            <tr>
              <td>
                <b style="color:var(--green)">${escape(o.code)}</b>
                ${
                  o.trackingCode
                    ? `<br><small class="sub">Mã VĐ: ${escape(o.trackingCode)}</small>`
                    : ''
                }
                ${
                  o.returnTrackingCode
                    ? `<br><small style="color:#d9534f;font-weight:600">VĐ Hoàn: ${escape(o.returnTrackingCode)}</small>`
                    : ''
                }
              </td>
              <td>
                <div style="font-weight:600">${escape(o.product)}</div>
                <small class="sub">${escape(o.customerName || 'Khách hàng')} · SKU: ${escape(o.sku || 'N/A')}</small>
              </td>
              <td class="hide" style="text-align:center">
                <span class="channel-pill channel-${(o.channel || '').toLowerCase().includes('shopee') ? 'shopee' : 'tiktok'}">
                  ${escape(o.channel || 'Khác')}
                </span>
              </td>
              <td><b>${formatMoney(o.total)}</b></td>
              <td>
                ${getStatusBadge(o.status)}
                ${
                  o.returnReason
                    ? `<br><small style="color:var(--muted)">Lý do: ${escape(o.returnReason)}</small>`
                    : ''
                }
              </td>
              <td style="text-align:right">
                <div class="action-cell">
                  ${
                    o.status === 'Chờ xác nhận'
                      ? `<button class="btn-action-main primary" data-action="confirm" data-code="${escape(o.code)}">Xác nhận</button>`
                      : ''
                  }
                  ${
                    o.status === 'Chờ đóng gói'
                      ? `<button class="btn-action-main success" data-action="pack" data-code="${escape(o.code)}">Quay đóng hàng</button>`
                      : ''
                  }
                  ${
                    o.status === 'Đã đóng gói'
                      ? `<button class="btn-action-main secondary" data-action="view-evidence" data-code="${escape(o.code)}">Xem video</button>`
                      : ''
                  }
                  ${
                    o.status === 'Đang kiểm tra hàng hoàn' || o.status === 'Đang hoàn về'
                      ? `<button class="btn-action-main danger" data-action="return-inspect" data-code="${escape(o.code)}">Mở kiện hoàn</button>`
                      : ''
                  }
                  ${
                    o.status === 'Chờ người bán duyệt khiếu nại'
                      ? `<button class="btn-action-main warning" data-action="claim-review" data-code="${escape(o.code)}">Duyệt khiếu nại</button>`
                      : ''
                  }
                  ${
                    o.status === 'Đang khiếu nại sàn'
                      ? `<button class="btn-action-main danger" data-action="view-simulator" data-code="${escape(o.code)}">Sàn đang xử lý</button>`
                      : ''
                  }
                  ${
                    o.status === 'Đã giải quyết - Hoàn tiền'
                      ? `<button class="btn-action-main success" data-action="view-wallet" data-code="${escape(o.code)}">Đã hoàn tiền</button>`
                      : ''
                  }
                  ${
                    o.status === 'Khiếu nại bị từ chối'
                      ? `<button class="btn-action-main secondary" data-action="view-simulator" data-code="${escape(o.code)}">Bị sàn từ chối</button>`
                      : ''
                  }
                  <button class="btn-action-sub" data-action="view-detail" data-code="${escape(o.code)}">Chi tiết</button>
                </div>
              </td>
            </tr>
          `
            )
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
