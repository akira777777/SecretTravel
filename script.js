// SecretTravel landing — reveal-on-scroll, year stamp, scroll progress, mobile nav.
(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Reveal on scroll ----------------------------------------------------
  const targets = document.querySelectorAll('.reveal');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
  }

  // --- Scroll progress bar -------------------------------------------------
  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      progress.style.setProperty('--progress', pct.toFixed(2) + '%');
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  // --- Mobile menu toggle --------------------------------------------------
  const menuBtn = document.querySelector('.menu-toggle');
  const nav = document.getElementById('nav');
  if (menuBtn && nav) {
    const setOpen = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      nav.classList.toggle('is-open', open);
    };
    menuBtn.addEventListener('click', () => {
      const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
      setOpen(!isOpen);
    });
    nav.addEventListener('click', (e) => {
      if (e.target instanceof HTMLAnchorElement) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        menuBtn.focus();
      }
    });
  }
})();
