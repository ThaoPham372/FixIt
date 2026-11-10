class FixItModal {
  constructor(root) { this.root = root; this.onClose = null; }
  show(content, onClose = null) {
  show(content, onClose = null, extraClass = '') {
    this.dispose(); this.onClose = onClose;
    this.root.innerHTML = `<div class="modalbg" data-modal-backdrop><div class="modal" role="dialog" aria-modal="true">${content}</div></div>`;
    this.root.innerHTML = `<div class="modalbg" data-modal-backdrop><div class="modal ${extraClass}" role="dialog" aria-modal="true">${content}</div></div>`;
    this.root.querySelector('[data-modal-backdrop]').addEventListener('click', (event) => {
      if (event.target === event.currentTarget) this.close();
    });
    this.onKey = (event) => { if (event.key === 'Escape' && this.root.innerHTML) this.close(); };
    document.addEventListener('keydown', this.onKey);
  }
  dispose() {
    if (this.onKey) document.removeEventListener('keydown', this.onKey);
    this.root.innerHTML = '';
  }
  close() {
    const callback = this.onClose; this.onClose = null; this.dispose();
    if (callback) callback();
  }
}
window.FixItModal = new FixItModal(document.querySelector('#modal'));
