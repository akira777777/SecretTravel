// SecretTravel landing — reveal-on-scroll, year stamp, scroll progress, mobile nav.
(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Note: motion is intentionally unconditional. We previously gated on
  // prefers-reduced-motion, but that left desktop visitors with the OS toggle
  // enabled looking at a static page while mobile (without the toggle) animated
  // normally. Pointer-driven effects are still skipped on coarse pointers.

  // --- Reveal on scroll ----------------------------------------------------
  const targets = document.querySelectorAll('.reveal');
  // Reveal animation is unconditional on browsers that support IntersectionObserver
  // (matches mobile behaviour for desktop visitors with reduced-motion enabled).
  if (!('IntersectionObserver' in window)) {
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
    const menuLabels = {
      ru: { open: 'Открыть меню', close: 'Закрыть меню' },
      en: { open: 'Open menu',    close: 'Close menu' },
    };
    const setOpen = (open) => {
      const lang = (document.documentElement.lang === 'en') ? 'en' : 'ru';
      const labels = menuLabels[lang];
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? labels.close : labels.open);
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

  // --- Scroll-direction nav hide/show ------------------------------------
  const topBar = document.querySelector('.top');
  if (topBar) {
    let lastScrollY = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < 80) {
        topBar.classList.remove('top--hidden');
      } else if (y > lastScrollY + 8) {
        topBar.classList.add('top--hidden');
      } else if (y < lastScrollY - 8) {
        topBar.classList.remove('top--hidden');
      }
      lastScrollY = y;
    }, { passive: true });
  }

  // --- Assign stagger indices to grouped reveal children -----------------
  document.querySelectorAll('.tiles, .bento, .timeline, .pay-grid').forEach((group) => {
    group.querySelectorAll(':scope > .reveal').forEach((el, i) => {
      el.style.setProperty('--stagger-i', i);
    });
  });

  // Pointer-driven effects (spotlight, magnetic, hero parallax, hero-trail) are
  // skipped only on coarse pointers — they are not gated on reduced-motion any
  // more, so desktop visitors with the OS-level toggle enabled see the same
  // motion as mobile visitors.
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const allowMotion = finePointer;

  // --- Spotlight on card groups (rAF-throttled) ---------------------------
  if (allowMotion) {
    const groups = document.querySelectorAll('[data-spotlight-group]');
    groups.forEach((group) => {
      const cards = group.children;
      let lastEvt = null;
      let scheduled = false;
      const flush = () => {
        scheduled = false;
        if (!lastEvt) return;
        for (const card of cards) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (lastEvt.clientX - r.left) + 'px');
          card.style.setProperty('--my', (lastEvt.clientY - r.top) + 'px');
          card.style.setProperty('--spot-active', '1');
        }
      };
      group.addEventListener('pointermove', (e) => {
        lastEvt = e;
        if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
      }, { passive: true });
      group.addEventListener('pointerleave', () => {
        lastEvt = null;
        for (const card of cards) card.style.setProperty('--spot-active', '0');
      }, { passive: true });
    });
  }

  // --- Magnetic buttons (rAF-throttled) -----------------------------------
  if (allowMotion) {
    const magnets = document.querySelectorAll('[data-magnetic]');
    const STRENGTH = 0.25;
    magnets.forEach((el) => {
      let lastEvt = null;
      let scheduled = false;
      const flush = () => {
        scheduled = false;
        if (!lastEvt) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (lastEvt.clientX - cx) * STRENGTH;
        const dy = (lastEvt.clientY - cy) * STRENGTH;
        el.style.setProperty('--mx-btn', dx.toFixed(2) + 'px');
        el.style.setProperty('--my-btn', dy.toFixed(2) + 'px');
      };
      el.addEventListener('pointermove', (e) => {
        lastEvt = e;
        if (!scheduled) { scheduled = true; requestAnimationFrame(flush); }
      }, { passive: true });
      el.addEventListener('pointerleave', () => {
        lastEvt = null;
        el.style.setProperty('--mx-btn', '0px');
        el.style.setProperty('--my-btn', '0px');
      }, { passive: true });
    });
  }

  // --- Hero mouse parallax (rAF-throttled) --------------------------------
  if (allowMotion) {
    const heroEl = document.querySelector('.hero');
    const heroTitle = document.querySelector('.hero-title');
    const heroLede = document.querySelector('.hero .lede');
    const heroOrbs = document.querySelectorAll('.hero-orb');
    if (heroEl && heroOrbs.length) {
      let lx = 0, ly = 0, pScheduled = false;
      const flushParallax = () => {
        pScheduled = false;
        const { width, height } = heroEl.getBoundingClientRect();
        const nx = (lx - width / 2) / (width / 2);
        const ny = (ly - height / 2) / (height / 2);
        if (heroTitle) heroTitle.style.transform = `translate(${nx * -7}px, ${ny * -4}px)`;
        if (heroLede) heroLede.style.transform = `translate(${nx * -3}px, ${ny * -2}px)`;
        heroOrbs.forEach((orb, i) => {
          const d = i === 0 ? 20 : 30;
          orb.style.transform = `translate(${nx * d}px, ${ny * d}px)`;
        });
      };
      heroEl.addEventListener('pointermove', (e) => {
        const rect = heroEl.getBoundingClientRect();
        lx = e.clientX - rect.left;
        ly = e.clientY - rect.top;
        if (!pScheduled) { pScheduled = true; requestAnimationFrame(flushParallax); }
      }, { passive: true });
      heroEl.addEventListener('pointerleave', () => {
        if (heroTitle) heroTitle.style.transform = '';
        if (heroLede) heroLede.style.transform = '';
        heroOrbs.forEach((orb) => { orb.style.transform = ''; });
      }, { passive: true });
    }

    // --- Hero trailing cursor orb (lerp follow) -------------------------
    const trailHero = document.querySelector('.hero');
    if (trailHero) {
      const trail = document.createElement('div');
      trail.className = 'hero-trail';
      trail.setAttribute('aria-hidden', 'true');
      trailHero.appendChild(trail);

      let tx = 0, ty = 0, cx = 0, cy = 0;
      let trailing = false;

      const lerp = () => {
        cx += (tx - cx) * 0.12;
        cy += (ty - cy) * 0.12;
        trail.style.setProperty('--tx', cx + 'px');
        trail.style.setProperty('--ty', cy + 'px');
        if (trailing) requestAnimationFrame(lerp);
      };

      trailHero.addEventListener('pointerenter', (e) => {
        const r = trailHero.getBoundingClientRect();
        cx = tx = e.clientX - r.left;
        cy = ty = e.clientY - r.top;
        trail.style.setProperty('--tx', cx + 'px');
        trail.style.setProperty('--ty', cy + 'px');
        trailHero.classList.add('is-tracking');
        if (!trailing) { trailing = true; requestAnimationFrame(lerp); }
      }, { passive: true });

      trailHero.addEventListener('pointermove', (e) => {
        const r = trailHero.getBoundingClientRect();
        tx = e.clientX - r.left;
        ty = e.clientY - r.top;
      }, { passive: true });

      trailHero.addEventListener('pointerleave', () => {
        trailHero.classList.remove('is-tracking');
        trailing = false;
      }, { passive: true });
    }
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

  // --- FAQ smooth accordion -----------------------------------------------
  {
    document.querySelectorAll('.faq-item').forEach((item) => {
      const summary = item.querySelector('summary');
      const body = item.querySelector('p');
      const icon = item.querySelector('.faq-icon');
      if (!summary || !body) return;
      const setIcon = (open) => { if (icon) icon.textContent = open ? '−' : '+'; };
      setIcon(item.open);
      summary.addEventListener('click', (e) => {
        e.preventDefault();
        if (item.open) {
          body.style.height = body.scrollHeight + 'px';
          body.style.overflow = 'hidden';
          body.offsetHeight; // commit explicit height before transition
          body.style.transition = 'height 300ms var(--ease), opacity 250ms ease';
          body.style.height = '0';
          body.style.opacity = '0';
          setIcon(false);
          setTimeout(() => { item.open = false; body.style.cssText = ''; }, 310);
        } else {
          item.open = true;
          setIcon(true);
          const h = body.scrollHeight;
          body.style.height = '0';
          body.style.overflow = 'hidden';
          body.style.opacity = '0';
          body.offsetHeight; // commit height: 0 before transition
          body.style.transition = 'height 360ms var(--ease), opacity 320ms ease 40ms';
          body.style.height = h + 'px';
          body.style.opacity = '1';
          setTimeout(() => { body.style.cssText = ''; }, 370);
        }
      });
    });
  }

  // --- Masthead date + ON DUTY indicator (UTC, refreshed every 60s) -------
  {
    const dateEl = document.getElementById('masthead-date');
    const timeEl = document.getElementById('duty-time');
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const tick = () => {
      const d = new Date();
      if (dateEl) {
        dateEl.textContent = `${months[d.getUTCMonth()]}. ${d.getUTCDate()} · ${d.getUTCFullYear()} / ${days[d.getUTCDay()]} / ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
      }
      if (timeEl) {
        timeEl.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      }
    };
    tick();
    if (dateEl || timeEl) setInterval(tick, 60_000);
  }

  // --- Booking form: mutual check_in / check_out min-max ------------------
  {
    const ci = document.querySelector('input[name="check_in"]');
    const co = document.querySelector('input[name="check_out"]');
    if (ci && co) {
      const sync = () => {
        if (ci.value) co.min = ci.value;
        if (co.value) ci.max = co.value;
      };
      ci.addEventListener('change', sync);
      co.addEventListener('change', sync);
      sync();
    }
  }

  // --- Hero stat count-up animation ----------------------------------------
  if ('IntersectionObserver' in window) {
    const countEl = document.querySelector('[data-i18n="hero.meta.1.k"]');
    if (countEl) {
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        let startTs = 0;
        const end = 100, dur = 1400;
        const tick = (ts) => {
          if (!startTs) startTs = ts;
          const p = Math.min((ts - startTs) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          countEl.textContent = Math.round(eased * end) + '%';
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { threshold: 0.6 });
      io.observe(countEl);
    }
  }

  // --- Pricing card count-up (reuses hero pattern) -------------------------
  if ('IntersectionObserver' in window
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const priceCards = document.querySelectorAll('#prices .card-price');
    if (priceCards.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          const node = entry.target.firstChild;
          if (!node || node.nodeType !== 3) return;
          const target = parseInt(node.nodeValue, 10);
          if (!Number.isFinite(target)) return;
          let startTs = 0;
          const dur = 900;
          const animTick = (ts) => {
            if (!startTs) startTs = ts;
            const p = Math.min((ts - startTs) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            node.nodeValue = String(Math.round(eased * target));
            if (p < 1) requestAnimationFrame(animTick);
          };
          requestAnimationFrame(animTick);
        });
      }, { threshold: 0.6 });
      priceCards.forEach((el) => io.observe(el));
    }
  }

  // =========================================================================
  // i18n (RU / EN)
  // =========================================================================
  const I18N = {
    ru: {
      'meta.title': 'SecretTravel — бронируем отели, авиа и экскурсии',
      'meta.description': 'SecretTravel — концьерж-бронирование отелей, апартаментов, авиабилетов, экскурсий и аренды авто. Прямое подтверждение, оплата в USDT/BTC, возврат если не вышло.',
      'a11y.skip': 'Перейти к содержимому',
      'nav.how': 'Как работаем',
      'nav.prices': 'Тарифы',
      'nav.scope': 'География',
      'nav.order': 'Как заказать',
      'nav.booking': 'Запрос',
      'nav.pay': 'Оплата',
      'nav.faq': 'FAQ',
      'nav.contact': 'Связаться',
      'masthead.title': 'The Concierge Quarterly · Вып. 01 · Весна',
      'masthead.section': 'Том VI · Бронирование, Авиа, Экскурсии · Крипто-расчёт',
      'duty.label': 'На связи',
      'hero.stamp': 'Concierge · Worldwide · Crypto-Settled',
      'hero.eyebrow': 'Концьерж‑бронирование',
      'hero.title': '<span class="word">Делаем</span> <span class="word">путешествия</span> <span class="word">и</span> <span class="word">отдых</span> <span class="word"><em>доступнее.</em></span>',
      'hero.lede': 'Помогаем комфортно и надёжно бронировать отели, апартаменты, авиабилеты и другие туристические услуги — даже в сложных ситуациях. Срочно, прозрачно, с возвратом, если не получилось.',
      'hero.cta.primary': 'Оставить запрос',
      'hero.cta.secondary': 'Посмотреть тарифы',
      'hero.meta.1.k': '100%',
      'hero.meta.1.v': 'предоплата',
      'hero.meta.2.k': 'USDT · BTC',
      'hero.meta.2.v': 'приём оплат',
      'hero.meta.3.k': 'Booking · Expedia',
      'hero.meta.3.v': 'прямое подтверждение',
      'hero.meta.4.k': 'Возврат',
      'hero.meta.4.v': 'если не вышло',
      'how.eyebrow': '§ 1 · Как мы работаем',
      'how.h2': 'Прямое подтверждение через площадки, которым доверяют миллионы.',
      'how.t1.h': 'Прямое подтверждение',
      'how.t1.p': 'Берём бронирование на себя через Booking.com, Expedia и другие платформы. Особенно удобно для срочных вариантов, self check-in и заездов «на завтра».',
      'how.t2.h': '100% предоплата',
      'how.t2.p': 'Стандартная практика, которая позволяет нам сразу начать работу над вашим запросом. Жёстких дедлайнов нет — как только бронь подтверждена, присылаем все данные.',
      'how.t3.h': 'Не вышло — вернём',
      'how.t3.p': 'Если по какой-то причине оформить не получится, деньги возвращаются в полном объёме в течение короткого времени на тот же реквизит.',
      'prices.eyebrow': '§ 2 · Стоимость наших услуг',
      'prices.h2': 'Считаем честно. Цену согласовываем до оплаты.',
      'prices.sub': 'Мы всегда заранее сообщаем точную стоимость услуги, чтобы вы могли принять взвешенное решение.',
      'prices.c1.tag': 'Отели и апартаменты',
      'prices.c1.h': 'Стандартный тариф от стоимости проживания',
      'prices.c1.li1': '<strong>65%</strong> — популярные направления: Чехия, Сербия, Польша, Грузия, Турция и др.',
      'prices.c1.li2': '<strong>70%</strong> — при бронировании день в день по этим же направлениям.',
      'prices.c1.li3': 'Минимальная сумма — <strong>$270</strong> в нашу сторону, рублёвый эквивалент по курсу на день оплаты.',
      'prices.c2.tag': 'Авиабилеты',
      'prices.c2.h': 'Комиссия от стоимости билета',
      'prices.c2.li1': 'Минимальная сумма — <strong>$270</strong> в нашу сторону.',
      'prices.c2.li2': 'Оформляем за <strong>1–7 дней</strong> до вылета.',
      'prices.c3.tag': 'Экскурсии и авто',
      'prices.c3.h': 'Экскурсии и аренда автомобиля',
      'prices.c3.li1': '<strong>Экскурсии</strong> — 50% от стоимости.',
      'prices.c3.li2': '<strong>Аренда автомобиля</strong> — 60% от стоимости.',
      'scope.eyebrow': '§ 3 · География и ограничения',
      'scope.h2': 'Что мы можем — и где честно говорим «нет».',
      'scope.yes.h': 'Берём с удовольствием',
      'scope.yes.li1': 'Большинство стран мира.',
      'scope.yes.li2': 'Европейские города — наша сильная сторона.',
      'scope.yes.li3': 'Self check-in апартаменты.',
      'scope.yes.li4': 'Срочные заезды и день в день — при оперативном диалоге.',
      'scope.no.h': 'Не оформляем',
      'scope.no.li1': 'Отели в ряде курортных направлений: <strong>Египет, Мальдивы, Индия, Вьетнам, Дубай</strong> и некоторые другие. Полный список — у нас, всегда подскажем альтернативу.',
      'scope.no.li2': 'Авиабилеты на рейсы, связанные с <strong>РФ и странами СНГ</strong>.',
      'order.eyebrow': '§ 4 · Как оформить заказ',
      'order.h2': 'Четыре шага. Без анкет и звонков.',
      'order.s1.h': 'Пришлите ссылку',
      'order.s1.p': 'На отель или рейс с желаемыми датами и пожеланиями.',
      'order.s2.h': 'Проверим и предложим',
      'order.s2.p': 'Сообщим доступность и что можем предложить, включая запасные варианты.',
      'order.s3.h': 'Подтверждение и оплата',
      'order.s3.p': 'После вашего согласия и оплаты берём заказ в работу.',
      'order.s4.h': 'Получаете бронь',
      'order.s4.p': 'Подтверждение с номером и всеми инструкциями для заселения.',
      'order.aside': 'При заселении остаёмся на связи и помогаем с возможными вопросами — депозит, late check-in и тому подобное.',
      'booking.eyebrow': '§ 4½ · Оформление запроса',
      'booking.h2': 'Заполните форму — посчитаем и вернёмся.',
      'booking.sub': 'Минимум полей. Чем точнее ссылка и даты, тем быстрее подтверждение.',
      'booking.f.service': 'Услуга',
      'booking.f.country': 'Страна',
      'booking.f.city': 'Город',
      'booking.f.property': 'Название отеля / описание',
      'booking.f.link': 'Ссылка (Booking, Airbnb, Expedia…)',
      'booking.f.checkin': 'Заезд / вылет',
      'booking.f.checkout': 'Выезд / возврат',
      'booking.f.guests': 'Гостей',
      'booking.f.email': 'Email *',
      'booking.f.tg': 'Telegram (опционально)',
      'booking.f.notes': 'Пожелания, бюджет, тип номера…',
      'booking.opt.hotel': 'Отель',
      'booking.opt.apartment': 'Апартаменты',
      'booking.opt.flight': 'Авиабилеты',
      'booking.opt.tour': 'Экскурсия',
      'booking.opt.car': 'Аренда авто',
      'booking.submit': 'Отправить запрос',
      'booking.disclaimer': 'Никакого спама. После отправки свяжемся в течение 1–2 минут в рабочее время.',
      'booking.status.sending': 'Отправляем…',
      'booking.status.ok': '✓ Запрос принят. Свяжемся в течение 1–2 минут.',
      'booking.status.err': '✗ Не удалось отправить. Попробуйте ещё раз или напишите в Telegram.',
      'booking.status.invalid': '✗ Заполните обязательные поля корректно.',
      'pay.eyebrow': '§ 5 · Оплата и возврат',
      'pay.h2': 'Принимаем удобные для вас способы.',
      'pay.rationale': 'Бронируем напрямую — на Booking, Expedia, в авиакассах, своей картой и счётом. Поэтому только крипта и только предоплата: получаем USDT или BTC, тут же закрываем бронь на нашей стороне, присылаем подтверждение от системы. Реквизиты выдаём <strong>под каждую бронь отдельно</strong> — это уникальный адрес под вашу сделку, а не общий кошелёк.',
      'pay.usdt.p': 'Сеть <strong>TRC-20</strong>.',
      'pay.usdt.note': 'Реквизиты — после подтверждения брони.',
      'pay.btc.p': 'Перевод напрямую.',
      'pay.btc.note': 'Реквизиты — после подтверждения брони.',
      'pay.refund.h': 'Возврат',
      'pay.refund.p': 'Если бронь по объективным причинам не состоится, возврат производится <strong>быстро и в полном объёме</strong> на тот же реквизит, с которого пришла оплата.',
      'faq.eyebrow': 'Частые вопросы',
      'faq.h2': 'Коротко о главном.',
      'faq.q1': 'Почему 100% предоплата?',
      'faq.a1': 'Это стандартная практика, которая позволяет нам сразу начать работу над вашим запросом. Жёстких дедлайнов нет — как только бронь будет подтверждена, мы пришлём вам все данные. Если по какой-то причине оформить не получится, деньги возвращаются в полном объёме на тот же реквизит.',
      'faq.q2': 'В какие страны вы не оформляете?',
      'faq.a2': 'Мы не работаем с отелями в ряде популярных курортных направлений: Египет, Мальдивы, Индия, Вьетнам, Дубай и некоторые другие. Полный список уточняйте у нас — мы всегда подскажем альтернативы.',
      'faq.q3': 'Какие авиабилеты вы оформляете?',
      'faq.a3': 'Только рейсы, не связанные с РФ и странами СНГ. Комиссия 50%, минимальная сумма — $270 в нашу сторону, оформляем за 1–7 дней до вылета.',
      'faq.q4': 'Можно ли забронировать «день в день»?',
      'faq.a4': 'Да, но это требует оперативности — лучше планировать хотя бы за несколько часов. По популярным направлениям при бронировании день в день действует тариф 70%.',
      'faq.q5': 'Как происходит возврат?',
      'faq.a5': 'Если бронь по объективным причинам не состоится, возврат производится быстро и в полном объёме на тот же реквизит, с которого пришла оплата.',
      'faq.q6': 'Помогаете ли при заселении?',
      'faq.a6': 'Да. При заселении в отель мы остаёмся на связи и помогаем с возможными вопросами — депозит, late check-in и так далее.',
      'faq.q7': 'Почему только крипта и почему кошелёк не виден на сайте?',
      'faq.a7': 'Мы оформляем бронь со своей стороны — нашей картой, нашим счётом, нашим аккаунтом в системе. От вас приходит крипта, мы тут же закрываем бронь и присылаем подтверждение. Под каждую бронь — отдельный адрес: так чище для нас и безопаснее для вас. Реквизиты появляются в чате после того, как вы согласовали даты и сумму.',
      'contact.eyebrow': 'Готовы помочь',
      'contact.h2': 'Пришлите ссылку — посчитаем и подтвердим.',
      'contact.lede': 'Отвечаем быстро. Чем раньше пришлёте ссылку и даты, тем больше шансов забрать вариант, особенно на день в день.',
      'contact.cta.tg': 'Написать в Telegram',
      'foot.right': 'Бронирование · Авиа · Экскурсии · Аренда авто',
      'foot.note': 'Материал на сайте описывает условия сотрудничества и не является публичной офертой. Точную стоимость услуги мы согласовываем до оплаты.',
      'chat.fab': 'Менеджер',
      'chat.title': 'Менеджер SecretTravel',
      'chat.subtitle': 'Обычно отвечаем за 1–2 минуты',
      'chat.placeholder': 'Опишите запрос: ссылка, даты, пожелания…',
      'chat.send': 'Отправить',
      'chat.greeting': 'Привет! Я виртуальный менеджер SecretTravel. Подскажу про тарифы, страны, оплату, сроки и возврат. О чём расскажу?',
      'chat.chip.prices': 'Тарифы',
      'chat.chip.payment': 'Оплата',
      'chat.chip.samedy': 'День в день',
      'chat.chip.scope': 'Куда бронируем',
      'chat.chip.timing': 'Сроки',
      'chat.chip.limit': 'Лимит',
      'chat.chip.refund': 'Возврат',
      'chat.chip.contact': 'Telegram',
      'chat.r.prices': '* отели — 60% от кассы<br>* 65% — Чехия, Сербия, Польша, Грузия, Турция<br>* 70% день в день по этим направлениям<br>* авиа — 50%<br>* экскурсии — 50%, авто — 60%<br>* минималка — $270 в нашу сторону<br>* лимит брони — $7,000',
      'chat.r.payment': 'USDT (TRC-20), Bitcoin. 100% предоплата. адрес кошелька пришлём после подтверждения.',
      'chat.r.scope': 'не делаем: отели в Египте, Мальдивах, Индии, Вьетнаме, Дубае.<br>авиа — без рейсов РФ и СНГ.<br>остальное — берём, особенно Европу.',
      'chat.r.timing': 'отели — 0–5 дней до заезда.<br>авиа — 1–7 дней до вылета.<br>экскурсии — 2–7 дней.',
      'chat.r.samedy': 'популярные направления день в день — 70% от кассы. ссылка?',
      'chat.r.limit': 'стандартный лимит — $7,000 за бронь. выше — обсуждается индивидуально, киньте параметры.',
      'chat.r.refund': 'возврат — на тот же кошелёк, в полном объёме. пришлите адрес — оформим заявку.',
      'chat.r.contact': '<a href="https://t.me/secrettravel" target="_blank" rel="noopener">@secrettravel</a> — пришлите ссылку и даты.',
      'chat.r.greet': 'киньте ссылку и даты — посчитаем.',
      'chat.r.link': 'проверим. даты?',
      'chat.r.fallback': 'пришлите ссылку (Booking / Expedia / Skyscanner) и даты — посчитаем.',
      'toast.copied': 'Адрес скопирован',
    },
    en: {
      'meta.title': 'SecretTravel — booking hotels, flights and tours',
      'meta.description': 'SecretTravel — concierge booking of hotels, apartments, flights, tours and car rentals. Direct confirmation, USDT/BTC payments, full refund if it falls through.',
      'a11y.skip': 'Skip to content',
      'nav.how': 'How it works',
      'nav.prices': 'Pricing',
      'nav.scope': 'Coverage',
      'nav.order': 'How to order',
      'nav.booking': 'Request',
      'nav.pay': 'Payment',
      'nav.faq': 'FAQ',
      'nav.contact': 'Contact',
      'masthead.title': 'The Concierge Quarterly · Iss. 01 · Spring',
      'masthead.section': 'Vol. VI · Booking, Flights, Tours · Crypto-settled',
      'duty.label': 'On duty',
      'hero.stamp': 'Concierge · Worldwide · Crypto-Settled',
      'hero.eyebrow': 'Concierge booking',
      'hero.title': '<span class="word">We</span> <span class="word">make</span> <span class="word">travel</span> <span class="word">and</span> <span class="word">leisure</span> <span class="word"><em>more&nbsp;accessible.</em></span>',
      'hero.lede': 'We help you book hotels, apartments, flights and other travel services comfortably and reliably — even in tricky situations. Fast, transparent, with a full refund if it doesn\'t work out.',
      'hero.cta.primary': 'Send a request',
      'hero.cta.secondary': 'See pricing',
      'hero.meta.1.k': '100%',
      'hero.meta.1.v': 'prepayment',
      'hero.meta.2.k': 'USDT · BTC',
      'hero.meta.2.v': 'accepted payments',
      'hero.meta.3.k': 'Booking · Expedia',
      'hero.meta.3.v': 'direct confirmation',
      'hero.meta.4.k': 'Refund',
      'hero.meta.4.v': 'if it falls through',
      'how.eyebrow': '§ 1 · How we work',
      'how.h2': 'Direct confirmation through platforms trusted by millions.',
      'how.t1.h': 'Direct confirmation',
      'how.t1.p': 'We handle bookings via Booking.com, Expedia and other platforms. Especially handy for last-minute, self check-in and "tomorrow" arrivals.',
      'how.t2.h': '100% prepayment',
      'how.t2.p': 'Standard practice that lets us start working on your request right away. No hard deadlines — once the booking is confirmed, we send you all the details.',
      'how.t3.h': 'Didn\'t work? Refund.',
      'how.t3.p': 'If for some reason we can\'t pull it off, the money is refunded in full and quickly to the same wallet.',
      'prices.eyebrow': '§ 2 · Our pricing',
      'prices.h2': 'Honest math. Price agreed before payment.',
      'prices.sub': 'We always tell you the exact cost in advance, so you can make an informed decision.',
      'prices.c1.tag': 'Hotels & apartments',
      'prices.c1.h': 'Standard rate of the stay cost',
      'prices.c1.li1': '<strong>65%</strong> — popular destinations: Czechia, Serbia, Poland, Georgia, Turkey, etc.',
      'prices.c1.li2': '<strong>70%</strong> — same-day bookings for these destinations.',
      'prices.c1.li3': 'Minimum service fee — <strong>$270</strong> our take, RUB equivalent at the day\'s rate.',
      'prices.c2.tag': 'Flights',
      'prices.c2.h': 'Commission on the ticket price',
      'prices.c2.li1': 'Minimum — <strong>$270</strong> our take.',
      'prices.c2.li2': 'Booked <strong>1–7 days</strong> before departure.',
      'prices.c3.tag': 'Tours & rentals',
      'prices.c3.h': 'Tours and car rentals',
      'prices.c3.li1': '<strong>Tours</strong> — 50% of cost.',
      'prices.c3.li2': '<strong>Car rental</strong> — 60% of cost.',
      'scope.eyebrow': '§ 3 · Coverage & limits',
      'scope.h2': 'What we cover — and where we honestly say "no".',
      'scope.yes.h': 'Happy to handle',
      'scope.yes.li1': 'Most countries worldwide.',
      'scope.yes.li2': 'European cities — our strong suit.',
      'scope.yes.li3': 'Self check-in apartments.',
      'scope.yes.li4': 'Urgent and same-day check-ins — with quick communication.',
      'scope.no.h': 'We don\'t handle',
      'scope.no.li1': 'Hotels in select resort regions: <strong>Egypt, Maldives, India, Vietnam, Dubai</strong> and a few others. Ask us for the full list — we\'ll always suggest an alternative.',
      'scope.no.li2': 'Flights connected to <strong>Russia and CIS countries</strong>.',
      'order.eyebrow': '§ 4 · How to order',
      'order.h2': 'Four steps. No forms, no calls.',
      'order.s1.h': 'Send the link',
      'order.s1.p': 'To the hotel or flight, with your dates and preferences.',
      'order.s2.h': 'We check and propose',
      'order.s2.p': 'We share availability and what we can offer, including backup options.',
      'order.s3.h': 'Confirm and pay',
      'order.s3.p': 'After your agreement and payment we take the order into work.',
      'order.s4.h': 'You get the booking',
      'order.s4.p': 'Confirmation with the booking number and all check-in instructions.',
      'order.aside': 'We stay in touch during check-in and help with any questions — deposit, late check-in and so on.',
      'booking.eyebrow': '§ 4½ · Booking request',
      'booking.h2': 'Fill in the form — we\'ll quote and follow up.',
      'booking.sub': 'Minimum fields. The sharper the link and dates, the faster the confirmation.',
      'booking.f.service': 'Service',
      'booking.f.country': 'Country',
      'booking.f.city': 'City',
      'booking.f.property': 'Hotel name / description',
      'booking.f.link': 'Link (Booking, Airbnb, Expedia…)',
      'booking.f.checkin': 'Check-in / departure',
      'booking.f.checkout': 'Check-out / return',
      'booking.f.guests': 'Guests',
      'booking.f.email': 'Email *',
      'booking.f.tg': 'Telegram (optional)',
      'booking.f.notes': 'Preferences, budget, room type…',
      'booking.opt.hotel': 'Hotel',
      'booking.opt.apartment': 'Apartment',
      'booking.opt.flight': 'Flight',
      'booking.opt.tour': 'Tour',
      'booking.opt.car': 'Car rental',
      'booking.submit': 'Send request',
      'booking.disclaimer': 'No spam. We\'ll get back to you within 1–2 minutes during working hours.',
      'booking.status.sending': 'Sending…',
      'booking.status.ok': '✓ Request received. We\'ll be in touch in 1–2 minutes.',
      'booking.status.err': '✗ Couldn\'t send. Please try again or message us on Telegram.',
      'booking.status.invalid': '✗ Please fill required fields correctly.',
      'pay.eyebrow': '§ 5 · Payment & refund',
      'pay.h2': 'Whatever\'s convenient for you.',
      'pay.rationale': 'We book directly — Booking, Expedia, airline desks — using our own card and account. That\'s why payment is crypto-only and prepaid: you send USDT or BTC, we close the booking on our side and forward the system\'s confirmation. Wallet details go out <strong>per booking</strong> — a fresh address for your transaction, not a shared one.',
      'pay.usdt.p': 'Network <strong>TRC-20</strong>.',
      'pay.usdt.note': 'Wallet shared once the booking is confirmed.',
      'pay.btc.p': 'Direct transfer.',
      'pay.btc.note': 'Wallet shared once the booking is confirmed.',
      'pay.refund.h': 'Refund',
      'pay.refund.p': 'If the booking falls through for objective reasons, we refund <strong>quickly and in full</strong> to the same wallet the payment came from.',
      'faq.eyebrow': 'FAQ',
      'faq.h2': 'Short answers to common questions.',
      'faq.q1': 'Why 100% prepayment?',
      'faq.a1': 'It\'s standard practice that lets us start working on your request right away. No hard deadlines — once the booking is confirmed, we send you all the details. If for some reason it doesn\'t work out, the money is refunded in full to the same wallet.',
      'faq.q2': 'Which countries don\'t you cover?',
      'faq.a2': 'We don\'t book hotels in some resort regions: Egypt, Maldives, India, Vietnam, Dubai and a few others. Ask us for the full list — we\'ll always suggest an alternative.',
      'faq.q3': 'Which flights do you book?',
      'faq.a3': 'Only flights not connected to Russia and CIS. 50% commission, minimum $270 our take, booked 1–7 days before departure.',
      'faq.q4': 'Can you book same-day?',
      'faq.a4': 'Yes, but it needs speed — plan at least a few hours ahead. For popular destinations, same-day bookings carry a 70% rate.',
      'faq.q5': 'How does the refund work?',
      'faq.a5': 'If the booking falls through for objective reasons, the refund is fast and in full, returned to the same wallet.',
      'faq.q6': 'Do you help during check-in?',
      'faq.a6': 'Yes. We stay in touch during check-in and help with deposit, late check-in and similar questions.',
      'faq.q7': 'Why crypto-only and why isn\'t the wallet on the site?',
      'faq.a7': 'We book on our own side — our card, our account, our login in the booking system. You send crypto, we close the booking and forward the confirmation. Each booking gets its own address: cleaner for us, safer for you. The wallet appears in the chat once the dates and the amount are agreed.',
      'contact.eyebrow': 'We\'re here to help',
      'contact.h2': 'Send a link — we\'ll quote and confirm.',
      'contact.lede': 'We reply fast. The earlier you share the link and dates, the better the chance — especially for same-day bookings.',
      'contact.cta.tg': 'Message on Telegram',
      'foot.right': 'Booking · Flights · Tours · Car rental',
      'foot.note': 'The site describes our terms of cooperation and is not a public offer. The exact cost of a service is agreed before payment.',
      'chat.fab': 'Manager',
      'chat.title': 'SecretTravel manager',
      'chat.subtitle': 'Usually replies within 1–2 minutes',
      'chat.placeholder': 'Describe your request: link, dates, preferences…',
      'chat.send': 'Send',
      'chat.greeting': 'Hi! I\'m the SecretTravel virtual manager. I can help with pricing, coverage, payment, timing and refunds. What would you like to know?',
      'chat.chip.prices': 'Pricing',
      'chat.chip.payment': 'Payment',
      'chat.chip.samedy': 'Same-day',
      'chat.chip.scope': 'Where we book',
      'chat.chip.timing': 'Timing',
      'chat.chip.limit': 'Limit',
      'chat.chip.refund': 'Refund',
      'chat.chip.contact': 'Telegram',
      'chat.r.prices': '* hotels — 60% of rack rate<br>* 65% — Czechia, Serbia, Poland, Georgia, Turkey<br>* 70% same-day on those<br>* flights — 50%<br>* tours — 50%, cars — 60%<br>* minimum — $270 our take<br>* per-booking limit — $7,000',
      'chat.r.payment': 'USDT (TRC-20), Bitcoin. 100% prepayment. wallet sent after you confirm.',
      'chat.r.scope': 'we don\'t do: hotels in Egypt, Maldives, India, Vietnam, Dubai.<br>flights — non-RU/CIS only.<br>rest — yes, especially Europe.',
      'chat.r.timing': 'hotels — 0–5 days before check-in.<br>flights — 1–7 days before departure.<br>tours — 2–7 days.',
      'chat.r.samedy': 'popular destinations same-day — 70% of rack rate. link?',
      'chat.r.limit': 'standard limit — $7,000 per booking. above is case by case, share the details.',
      'chat.r.refund': 'refund — same wallet, in full. send the address, we\'ll open a request.',
      'chat.r.contact': '<a href="https://t.me/secrettravel" target="_blank" rel="noopener">@secrettravel</a> — send the link and dates.',
      'chat.r.greet': 'send the link and dates — we\'ll quote.',
      'chat.r.link': 'we\'ll check. dates?',
      'chat.r.fallback': 'send the link (Booking / Expedia / Skyscanner) and dates — we\'ll quote.',
      'toast.copied': 'Address copied',
    },
  };

  const STORAGE_KEY = 'st-lang';
  const safeStorageGet = (k) => {
    try { return localStorage.getItem(k); } catch { return null; }
  };
  const safeStorageSet = (k, v) => {
    try { localStorage.setItem(k, v); } catch { /* private mode / quota — ignore */ }
  };
  const detectLang = () => {
    // ?lang= URL param wins (lets hreflang alternates and shared links pin a language)
    try {
      const fromUrl = new URLSearchParams(location.search).get('lang');
      if (fromUrl === 'ru' || fromUrl === 'en') {
        safeStorageSet(STORAGE_KEY, fromUrl);
        return fromUrl;
      }
    } catch { /* file:// or sandboxed — ignore */ }
    const saved = safeStorageGet(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
    const navLang = (navigator.language || 'ru').toLowerCase();
    return navLang.startsWith('ru') ? 'ru' : 'en';
  };
  let currentLang = detectLang();

  const t = (key) => (I18N[currentLang] && I18N[currentLang][key]) || key;

  const applyI18n = () => {
    document.documentElement.lang = currentLang;
    document.title = t('meta.title');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    document.querySelectorAll('.lang-toggle .lang-opt').forEach((opt) => {
      opt.classList.toggle('is-active', opt.getAttribute('data-lang') === currentLang);
    });

    // Keep FAQ structured data aligned with the visible language. The default
    // RU markup stays in HTML (so first-paint crawlers see it), and we rewrite
    // it here when the user switches language.
    const faqLd = document.getElementById('faq-jsonld');
    if (faqLd) {
      const mainEntity = [];
      for (let i = 1; i <= 6; i += 1) {
        const q = t('faq.q' + i);
        const a = t('faq.a' + i);
        if (q && a && q !== 'faq.q' + i) {
          mainEntity.push({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          });
        }
      }
      faqLd.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity,
      });
    }
  };

  applyI18n();

  // Lang toggle button
  const langBtn = document.querySelector('[data-lang-toggle]');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      currentLang = currentLang === 'ru' ? 'en' : 'ru';
      safeStorageSet(STORAGE_KEY, currentLang);
      try {
        const params = new URLSearchParams(location.search);
        params.set('lang', currentLang);
        history.replaceState({}, '', location.pathname + '?' + params.toString() + location.hash);
      } catch (_) {}
      applyI18n();
      renderChat();
    });
  }

  // =========================================================================
  // Chat manager (rule-based AI)
  // =========================================================================
  const chatPanel = document.getElementById('chat-panel');
  const chatLog = document.getElementById('chat-log');
  const chatChips = document.getElementById('chat-chips');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatFab = document.querySelector('[data-chat-open]');
  const chatCloseBtn = document.querySelector('[data-chat-close]');

  const CHIP_KEYS = [
    ['chat.chip.prices', 'prices'],
    ['chat.chip.samedy', 'samedy'],
    ['chat.chip.payment', 'payment'],
    ['chat.chip.scope', 'scope'],
    ['chat.chip.timing', 'timing'],
    ['chat.chip.limit', 'limit'],
    ['chat.chip.refund', 'refund'],
    ['chat.chip.contact', 'contact'],
  ];

  // Pattern → response intent
  const INTENTS = [
    { intent: 'greet',   re: /^\s*(прив|здрав|добры|hello|hi|hey|hola|good\s*(morning|day|evening))/i },
    { intent: 'link',    re: /(https?:\/\/|www\.|booking\.com|airbnb\.|expedia|skyscanner|kayak|agoda\.com|ostrovok\.|aviasales\.|trip\.com)/i },
    { intent: 'samedy',  re: /(день\s*в\s*день|сегодня\s*заех|заехать\s*сегодня|сейчас\s*заех|same.?day|tonight|today\s*night|asap)/i },
    { intent: 'limit',   re: /(лимит|максим|до\s*скольк|свыше|больш(ой|е)\s*бюджет|max(imum)?|limit|cap\b|over\s*\$)/i },
    { intent: 'prices',  re: /(цен|стоим|тариф|комисси|сколько|почём|price|cost|fee|how\s*much|rate)/i },
    { intent: 'payment', re: /(оплат|платё?ж|usdt|tether|btc|bitcoin|крипт|кошел|payment|pay\b|crypto|wallet)/i },
    { intent: 'scope',   re: /(стран|географ|где|куда|город|country|where|cover|destinatio|europe|египет|мальдив|индия|вьетнам|дубай|egypt|maldive|india|vietnam|dubai|снг|cis|россия|russia)/i },
    { intent: 'timing',  re: /(срок|когда|за\s*сколько|how\s*fast|how\s*soon|timing|deadline|days?\s*before)/i },
    { intent: 'refund',  re: /(возврат|верну|refund|money\s*back|cancel)/i },
    { intent: 'contact', re: /(телеграм|telegram|менеджер|связ|contact|whatsapp|почт|email|manager|reach|talk)/i },
  ];

  const detectIntent = (text) => {
    for (const { intent, re } of INTENTS) {
      if (re.test(text)) return intent;
    }
    return 'fallback';
  };

  const escapeHtml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const appendMsg = (html, who) => {
    if (!chatLog) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ' + who;
    div.innerHTML = html;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const showTyping = () => {
    if (!chatLog) return null;
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    return el;
  };

  const renderChips = () => {
    if (!chatChips) return;
    chatChips.innerHTML = '';
    CHIP_KEYS.forEach(([labelKey, intent]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-chip';
      btn.textContent = t(labelKey);
      btn.setAttribute('data-intent', intent);
      btn.addEventListener('click', () => handleUserMessage(t(labelKey), intent));
      chatChips.appendChild(btn);
    });
  };

  const renderChat = () => {
    if (!chatLog) return;
    chatLog.innerHTML = '';
    appendMsg(t('chat.greeting'), 'bot');
    renderChips();
  };

  // --- AI chat via /api/chat (Vercel serverless) ----------------------------
  // Max 5 AI calls per 60s — prevents runaway API spend on a static site
  const _rl = { n: 0, t: 0 };
  const checkAIRateLimit = () => {
    const now = Date.now();
    if (now > _rl.t) { _rl.n = 0; _rl.t = now + 60_000; }
    if (_rl.n >= 5) return false;
    _rl.n++;
    return true;
  };

  const callAI = async (text) => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang: currentLang }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.warn('[chat] API error', res.status, body.code ?? body.error);
        return null;
      }
      const { reply } = await res.json();
      return typeof reply === 'string' && reply ? reply : null;
    } catch {
      clearTimeout(tid);
      return null;
    }
  };

  const handleUserMessage = async (text, forcedIntent) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    appendMsg(escapeHtml(trimmed), 'user');
    const typing = showTyping();

    // Chip click → instant rule-based reply (zero API latency)
    if (forcedIntent) {
      const reply = t('chat.r.' + forcedIntent) || t('chat.r.fallback');
      setTimeout(() => {
        typing && typing.remove();
        appendMsg(reply, 'bot');
      }, 400 + Math.random() * 300);
      return;
    }

    // Free-form text → try Claude AI, fall back to rule-based
    if (checkAIRateLimit()) {
      const aiReply = await callAI(trimmed);
      typing && typing.remove();
      if (aiReply) {
        // AI reply is plain text — escape then render newlines as <br>
        const safe = escapeHtml(aiReply).replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
        appendMsg(safe, 'bot');
        return;
      }
    }

    // Fallback: rule-based (rate limited or API unavailable)
    const intent = detectIntent(trimmed);
    const reply = t('chat.r.' + intent) || t('chat.r.fallback');
    typing && typing.remove();
    appendMsg(reply, 'bot');
  };

  const setChatOpen = (open) => {
    if (!chatPanel || !chatFab) return;
    chatFab.setAttribute('aria-expanded', String(open));
    if (open) {
      chatPanel.hidden = false;
      if (chatLog && chatLog.children.length === 0) renderChat();
      setTimeout(() => chatInput && chatInput.focus(), 50);
    } else {
      chatPanel.hidden = true;
      // Return focus to FAB for accessible dismiss
      try { chatFab.focus({ preventScroll: true }); } catch { chatFab.focus(); }
    }
  };

  if (chatFab) chatFab.addEventListener('click', () => setChatOpen(true));
  if (chatCloseBtn) chatCloseBtn.addEventListener('click', () => setChatOpen(false));

  if (chatForm) {
    const chatSend = chatForm.querySelector('.chat-send');
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!chatInput) return;
      const v = chatInput.value.trim();
      if (!v) return;
      chatInput.value = '';
      // Disable while waiting for AI response
      chatInput.disabled = true;
      if (chatSend) chatSend.disabled = true;
      await handleUserMessage(v);
      chatInput.disabled = false;
      if (chatSend) chatSend.disabled = false;
      chatInput.focus();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatFab && chatFab.getAttribute('aria-expanded') === 'true') {
      setChatOpen(false);
      chatFab.focus();
    }
  });

  // --- Copy to clipboard ---------------------------------------------------
  let toastEl = null;
  const showToast = (msgKey) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = t(msgKey);
    toastEl.classList.add('is-visible');
    if (toastEl._timer) clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove('is-visible'), 2500);
  };

  const flashCopied = (el) => {
    el.classList.remove('is-copied');
    void el.offsetWidth;
    el.classList.add('is-copied');
    setTimeout(() => el.classList.remove('is-copied'), 800);
  };

  // =========================================================================
  // Booking form → Supabase
  // =========================================================================
  const SUPABASE_URL = 'https://jvdshxutzgxhxopcgifj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_glUpV-cOu4n9K1pfjt7HpA_NziuJ7kn';
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    const statusEl = bookingForm.querySelector('.bf-status');
    const submitBtn = bookingForm.querySelector('.bf-submit');

    const setStatus = (key, kind) => {
      if (!statusEl) return;
      statusEl.classList.remove('is-ok', 'is-err');
      if (kind) statusEl.classList.add(kind === 'ok' ? 'is-ok' : 'is-err');
      statusEl.textContent = key ? t(key) : '';
    };

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus(null);

      const fd = new FormData(bookingForm);

      // Honeypot — bots often fill every field they see, including hidden-label ones.
      if ((fd.get('website_url') || '').toString().trim() !== '') {
        // Pretend success silently so the bot moves on.
        setStatus('booking.status.ok', 'ok');
        bookingForm.reset();
        return;
      }

      // Basic native validation
      if (!bookingForm.checkValidity()) {
        bookingForm.reportValidity();
        setStatus('booking.status.invalid', 'err');
        return;
      }

      const guestsRaw = (fd.get('guests') || '').toString().trim();
      const payload = {
        service_type: (fd.get('service_type') || '').toString(),
        country: (fd.get('country') || '').toString().trim(),
        city: (fd.get('city') || '').toString().trim(),
        property_name: (fd.get('property_name') || '').toString().trim(),
        property_link: (fd.get('property_link') || '').toString().trim() || null,
        check_in: (fd.get('check_in') || '').toString() || null,
        check_out: (fd.get('check_out') || '').toString() || null,
        guests: guestsRaw ? Math.max(1, Math.min(50, parseInt(guestsRaw, 10) || 0)) || null : null,
        contact_email: (fd.get('contact_email') || '').toString().trim(),
        contact_telegram: (fd.get('contact_telegram') || '').toString().trim() || null,
        notes: (fd.get('notes') || '').toString().trim() || null,
        preferred_currency: currentLang === 'en' ? 'USD' : 'RUB',
        language: currentLang,
        source_page: 'landing',
        user_agent: (navigator.userAgent || '').slice(0, 400),
      };

      submitBtn && (submitBtn.disabled = true);
      setStatus('booking.status.sending');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(SUPABASE_URL + '/rest/v1/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.warn('Booking submit failed:', res.status, errText);
          setStatus('booking.status.err', 'err');
          return;
        }
        setStatus('booking.status.ok', 'ok');
        bookingForm.reset();
      } catch (err) {
        console.warn('Booking submit error:', err && err.name === 'AbortError' ? 'timeout' : err);
        setStatus('booking.status.err', 'err');
      } finally {
        clearTimeout(timeoutId);
        submitBtn && (submitBtn.disabled = false);
      }
    });
  }

  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', () => {
      const text = el.getAttribute('data-copy');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => { showToast('toast.copied'); flashCopied(el); });
      } else {
        // fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.prepend(textArea);
        textArea.select();
        try { document.execCommand('copy'); showToast('toast.copied'); flashCopied(el); } catch (error) {}
        textArea.remove();
      }
    });
  });
})();
