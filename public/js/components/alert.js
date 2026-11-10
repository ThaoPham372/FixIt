class FixItAlert {
  constructor(root) {
    this.root = root;
    this.onClose = null;
    this.resolvePromise = null;
    this.onKey = null;
  }

  getRoot() {
    if (!this.root || !this.root.isConnected) {
      this.root = document.querySelector('#alert-modal') || document.body;
    }
    return this.root;
  }

  detectTypeAndTitle(message, type, title) {
    const text = String(message || '');
    let resolvedType = type;
    let resolvedTitle = title;

    if (!resolvedType) {
      if (
        text.includes('✅') ||
        text.includes('🎉') ||
        text.includes('thành công') ||
        text.startsWith('Đã ')
      ) {
        resolvedType = 'success';
      } else if (
        text.includes('❌') ||
        text.toLowerCase().includes('lỗi') ||
        text.includes('thất bại') ||
        text.includes('từ chối') ||
        text.includes('không thành công')
      ) {
        resolvedType = 'error';
      } else if (
        text.includes('⚠️') ||
        text.toLowerCase().includes('cảnh báo') ||
        text.includes('chưa') ||
        text.includes('hạn chót') ||
        text.includes('vui lòng')
      ) {
        resolvedType = 'warning';
      } else {
        resolvedType = 'info';
      }
    }

    if (!resolvedTitle) {
      switch (resolvedType) {
        case 'success':
          resolvedTitle = 'Thao tác thành công';
          break;
        case 'error':
          resolvedTitle = 'Thông báo lỗi';
          break;
        case 'warning':
          resolvedTitle = 'Cảnh báo hệ thống';
          break;
        default:
          resolvedTitle = 'Thông báo hệ thống';
          break;
      }
    }

    return { type: resolvedType, title: resolvedTitle };
  }

  show(message, type = null, title = null, onClose = null) {
    return new Promise((resolve) => {
      this.close(); // Clean up any existing alert

      this.onClose = onClose;
      this.resolvePromise = resolve;

      const { type: detectedType, title: detectedTitle } = this.detectTypeAndTitle(message, type, title);

      // Clean message formatting: trim leading emojis that are now redundant with the big icon
      let displayMessage = String(message || '');
      displayMessage = displayMessage
        .replace(/^[✅❌⚠️🎉ℹ️💡]\s*/u, '')
        .trim();

      const iconSvg = {
        success: `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `,
        error: `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `,
        warning: `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        `,
        info: `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        `,
      }[detectedType] || iconSvg?.info;

      const btnLabel = detectedType === 'error' ? 'Đóng' : 'Đã hiểu';
      const root = this.getRoot();

      root.innerHTML = `
        <div class="alert-backdrop" data-alert-backdrop>
          <div class="alert-card alert-card-${detectedType}" role="alertdialog" aria-modal="true" aria-labelledby="alertTitle" aria-describedby="alertMsg">
            <div class="alert-icon-wrap alert-icon-${detectedType}">
              ${iconSvg}
            </div>
            <div class="alert-title" id="alertTitle">${this.escape(detectedTitle)}</div>
            <div class="alert-body" id="alertMsg">${this.formatBody(displayMessage)}</div>
            <button type="button" class="alert-btn alert-btn-${detectedType}" id="alertConfirmBtn" autofocus>
              ${btnLabel}
            </button>
          </div>
        </div>
      `;

      // Auto focus button
      const confirmBtn = root.querySelector('#alertConfirmBtn');
      if (confirmBtn) {
        setTimeout(() => confirmBtn.focus(), 30);
        confirmBtn.addEventListener('click', () => this.close());
      }

      // Backdrop click
      const backdrop = root.querySelector('[data-alert-backdrop]');
      if (backdrop) {
        backdrop.addEventListener('click', (event) => {
          if (event.target === event.currentTarget) this.close();
        });
      }

      // Keyboard support: Enter / Space / Escape
      this.onKey = (event) => {
        if (event.key === 'Escape' || event.key === 'Enter') {
          event.preventDefault();
          this.close();
        }
      };
      document.addEventListener('keydown', this.onKey);
    });
  }

  confirm(message, options = {}) {
    return new Promise((resolve) => {
      this.close();

      const text = String(message || '');
      const title = options.title || 'Xác nhận thao tác';
      const confirmText = options.confirmText || 'Xác nhận';
      const cancelText = options.cancelText || 'Hủy bỏ';
      const isDanger =
        options.isDanger ||
        text.toLowerCase().includes('từ chối') ||
        text.toLowerCase().includes('hủy') ||
        text.toLowerCase().includes('xóa');

      const iconSvg = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;

      const root = this.getRoot();
      root.innerHTML = `
        <div class="alert-backdrop" data-alert-backdrop>
          <div class="alert-card alert-card-confirm" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMsg">
            <div class="alert-icon-wrap ${isDanger ? 'alert-icon-error' : 'alert-icon-warning'}">
              ${iconSvg}
            </div>
            <div class="alert-title" id="confirmTitle">${this.escape(title)}</div>
            <div class="alert-body" id="confirmMsg">${this.formatBody(text)}</div>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
              <button type="button" class="alert-btn" id="confirmCancelBtn" style="flex:1;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1">
                ${this.escape(cancelText)}
              </button>
              <button type="button" class="alert-btn ${isDanger ? 'alert-btn-error' : 'alert-btn-success'}" id="confirmOkBtn" style="flex:1" autofocus>
                ${this.escape(confirmText)}
              </button>
            </div>
          </div>
        </div>
      `;

      const okBtn = root.querySelector('#confirmOkBtn');
      const cancelBtn = root.querySelector('#confirmCancelBtn');

      const cleanAndResolve = (result) => {
        if (this.onKey) {
          document.removeEventListener('keydown', this.onKey);
          this.onKey = null;
        }
        root.innerHTML = '';
        resolve(result);
      };

      if (okBtn) {
        setTimeout(() => okBtn.focus(), 30);
        okBtn.addEventListener('click', () => cleanAndResolve(true));
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => cleanAndResolve(false));
      }

      const backdrop = root.querySelector('[data-alert-backdrop]');
      if (backdrop) {
        backdrop.addEventListener('click', (event) => {
          if (event.target === event.currentTarget) cleanAndResolve(false);
        });
      }

      this.onKey = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cleanAndResolve(false);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          cleanAndResolve(true);
        }
      };
      document.addEventListener('keydown', this.onKey);
    });
  }

  formatBody(text) {
    if (!text) return '';
    // Escape HTML first
    const safe = this.escape(text);
    // Replace \n with line breaks, style bullet points if any
    return safe
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return `<div style="text-align:left;padding-left:14px;margin:2px 0;">${trimmed}</div>`;
        }
        return `<div>${line || '&nbsp;'}</div>`;
      })
      .join('');
  }

  escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  close() {
    if (this.onKey) {
      document.removeEventListener('keydown', this.onKey);
      this.onKey = null;
    }
    const root = this.getRoot();
    if (root) root.innerHTML = '';

    const callback = this.onClose;
    this.onClose = null;
    if (callback) callback();

    const resolve = this.resolvePromise;
    this.resolvePromise = null;
    if (resolve) resolve(true);
  }
}

// Khởi tạo instance toàn cục
window.FixItAlert = new FixItAlert(document.querySelector('#alert-modal') || document.body);

// Hàm tiện ích toàn cục
window.notify = function (message, type = null, title = null, onClose = null) {
  if (window.FixItAlert) {
    return window.FixItAlert.show(message, type, title, onClose);
  }
  return Promise.resolve();
};

window.confirmModal = function (message, options = {}) {
  if (window.FixItAlert) {
    return window.FixItAlert.confirm(message, options);
  }
  return Promise.resolve(window.confirm ? window.confirm(message) : true);
};

// Ghi đè window.alert để thay thế hoàn toàn dialog mặc định của trình duyệt ("localhost:3000 says")
if (typeof window !== 'undefined') {
  const _nativeAlert = window.alert;
  window.alert = function (message) {
    if (window.FixItAlert) {
      return window.FixItAlert.show(message);
    }
    return _nativeAlert ? _nativeAlert(message) : undefined;
  };
}
