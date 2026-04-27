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

  // Skip pointer-driven effects entirely on coarse pointers / reduced motion.
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const allowMotion = finePointer && !prefersReduced;

  // --- Spotlight on card groups -------------------------------------------
  if (allowMotion) {
    const groups = document.querySelectorAll('[data-spotlight-group]');
    groups.forEach((group) => {
      const cards = group.children;
      group.addEventListener('pointermove', (e) => {
        for (const card of cards) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
          card.style.setProperty('--spot-active', '1');
        }
      });
      group.addEventListener('pointerleave', () => {
        for (const card of cards) card.style.setProperty('--spot-active', '0');
      });
    });
  }

  // --- Magnetic buttons ----------------------------------------------------
  if (allowMotion) {
    const magnets = document.querySelectorAll('[data-magnetic]');
    const STRENGTH = 0.25;
    magnets.forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * STRENGTH;
        const dy = (e.clientY - cy) * STRENGTH;
        el.style.setProperty('--mx-btn', dx.toFixed(2) + 'px');
        el.style.setProperty('--my-btn', dy.toFixed(2) + 'px');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--mx-btn', '0px');
        el.style.setProperty('--my-btn', '0px');
      });
    });
  }

  // --- Active nav link based on visible section ---------------------------
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = nav ? nav.querySelectorAll('a[href^="#"]') : [];
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const linkMap = new Map();
    navLinks.forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      if (id) linkMap.set(id, a);
    });
    const setActive = (id) => {
      navLinks.forEach((a) => a.classList.remove('is-active'));
      const link = linkMap.get(id);
      if (link) link.classList.add('is-active');
    };
    const navIo = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5] });
    sections.forEach((s) => navIo.observe(s));
  }
})();
