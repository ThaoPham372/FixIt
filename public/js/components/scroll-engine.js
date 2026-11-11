/**
 * FixIt Scroll Engine - Lightweight Scroll-Driven Animations & Utilities
 * Pure vanilla JavaScript, ~60 LOC, zero dependencies.
 */
(function () {
  'use strict';

  const isReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countUp(el, targetVal, duration = 700) {
    if (isReducedMotion()) {
      el.textContent = targetVal;
      return;
    }

    // Extract numbers and clean non-digit chars for counting
    const cleanNum = parseInt(String(targetVal).replace(/\D/g, ''), 10);
    if (isNaN(cleanNum) || cleanNum === 0) {
      el.textContent = targetVal;
      return;
    }

    const isMoney = String(targetVal).includes('đ');
    const isPercent = String(targetVal).includes('%');
    const isNegative = String(targetVal).trim().startsWith('-');

    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(ease * cleanNum);

      let formatted = current.toLocaleString('vi-VN');
      if (isMoney) formatted += 'đ';
      if (isPercent) formatted += '%';
      if (isNegative) formatted = '-' + formatted;

      el.textContent = formatted;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = targetVal; // Ensure exact final value
      }
    }
    requestAnimationFrame(update);
  }

  function initScrollProgress() {
    let bar = document.getElementById('scrollProgressBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'scrollProgressBar';
      bar.className = 'scroll-progress-bar';
      document.body.appendChild(bar);
    }

    const onScroll = () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      bar.style.width = scrolled + '%';
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initHeaderElevation() {
    const header = document.querySelector('.top');
    if (!header) return;

    const onScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop;
      if (top > 12) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  let revealObserver = null;

  function refreshReveals() {
    if (isReducedMotion()) {
      document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => {
        el.classList.add('revealed');
      });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target;
              target.classList.add('revealed');

              // Trigger count-up if element has .count-up
              const countEl = target.querySelector ? target.querySelector('.count-up') : null;
              if (countEl && countEl.dataset.target && !countEl.dataset.counted) {
                countEl.dataset.counted = 'true';
                countUp(countEl, countEl.dataset.target);
              } else if (target.classList.contains('count-up') && target.dataset.target && !target.dataset.counted) {
                target.dataset.counted = 'true';
                countUp(target, target.dataset.target);
              }

              // Trigger mini progress bar animation
              const bars = target.querySelectorAll ? target.querySelectorAll('.mini-bar-fill') : [];
              bars.forEach((b) => b.classList.add('filled'));

              revealObserver.unobserve(target);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -6% 0px',
        }
      );
    }

    const elements = document.querySelectorAll('.reveal:not(.revealed), .reveal-stagger:not(.revealed)');
    elements.forEach((el, index) => {
      if (el.classList.contains('reveal-stagger')) {
        el.style.setProperty('--i', Math.min(index, 8));
      }
      revealObserver.observe(el);
    });
  }

  function init() {
    document.documentElement.classList.add('has-reveal');
    initScrollProgress();
    initHeaderElevation();
    refreshReveals();
  }

  window.FixItScrollEngine = {
    init,
    refresh: refreshReveals,
    countUp,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

