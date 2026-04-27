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

  // Skip pointer-driven effects entirely on coarse pointers / reduced motion.
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const allowMotion = finePointer && !prefersReduced;

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
      'nav.pay': 'Оплата',
      'nav.faq': 'FAQ',
      'nav.contact': 'Связаться',
      'hero.eyebrow': 'Концьерж‑бронирование',
      'hero.title': '<span class="word">Бронируем</span> <span class="word">там,</span> <span class="word">где</span> <span class="word">остальные</span> <span class="word"><em>разводят</em></span> <span class="word"><em>руками.</em></span>',
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
      'prices.c1.li3': 'Минимальная сумма заказа — <strong>12 000 ₽</strong> или эквивалент в долларах по курсу на день оплаты.',
      'prices.c2.tag': 'Авиабилеты',
      'prices.c2.h': 'Комиссия от стоимости билета',
      'prices.c2.li1': 'Минимальная сумма — <strong>12 000 ₽</strong>.',
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
      'pay.eyebrow': '§ 5 · Оплата и возврат',
      'pay.h2': 'Принимаем удобные для вас способы.',
      'pay.usdt.p': 'Сети <strong>TRC-20</strong> и <strong>ERC-20</strong>.',
      'pay.btc.p': 'Оплата напрямую на наш кошелёк.',
      'pay.refund.h': 'Возврат',
      'pay.refund.p': 'Если бронь по объективным причинам не состоится, возврат производится <strong>быстро и в полном объёме</strong> на тот же реквизит, с которого пришла оплата.',
      'faq.eyebrow': 'Частые вопросы',
      'faq.h2': 'Коротко о главном.',
      'faq.q1': 'Почему 100% предоплата?',
      'faq.a1': 'Это стандартная практика, которая позволяет нам сразу начать работу над вашим запросом. Жёстких дедлайнов нет — как только бронь будет подтверждена, мы пришлём вам все данные. Если по какой-то причине оформить не получится, деньги возвращаются в полном объёме на тот же реквизит.',
      'faq.q2': 'В какие страны вы не оформляете?',
      'faq.a2': 'Мы не работаем с отелями в ряде популярных курортных направлений: Египет, Мальдивы, Индия, Вьетнам, Дубай и некоторые другие. Полный список уточняйте у нас — мы всегда подскажем альтернативы.',
      'faq.q3': 'Какие авиабилеты вы оформляете?',
      'faq.a3': 'Только рейсы, не связанные с РФ и странами СНГ. Комиссия 50%, минимальная сумма — 12 000 ₽, оформляем за 1–7 дней до вылета.',
      'faq.q4': 'Можно ли забронировать «день в день»?',
      'faq.a4': 'Да, но это требует оперативности — лучше планировать хотя бы за несколько часов. По популярным направлениям при бронировании день в день действует тариф 70%.',
      'faq.q5': 'Как происходит возврат?',
      'faq.a5': 'Если бронь по объективным причинам не состоится, возврат производится быстро и в полном объёме на тот же реквизит, с которого пришла оплата.',
      'faq.q6': 'Помогаете ли при заселении?',
      'faq.a6': 'Да. При заселении в отель мы остаёмся на связи и помогаем с возможными вопросами — депозит, late check-in и так далее.',
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
      'chat.chip.scope': 'Куда бронируете',
      'chat.chip.timing': 'Сроки',
      'chat.chip.refund': 'Возврат',
      'chat.chip.contact': 'Связь с менеджером',
      'chat.r.prices': 'Отели — 60% от стоимости проживания (популярные направления 65%, день‑в‑день 70%). Авиабилеты — 50%. Экскурсии — 50%, аренда авто — 60%. Минимальная сумма заказа — 12 000 ₽. Прислать ссылку на конкретный объект?',
      'chat.r.payment': 'Принимаем USDT (TRC‑20 / ERC‑20) и BTC. Оплата 100% перед началом работы — это стандартная практика, чтобы сразу начать оформление. Если бронь не состоится — возврат в полном объёме на тот же реквизит.',
      'chat.r.scope': 'Бронируем большинство стран мира, особенно европейские города и self check‑in апартаменты. Не работаем с Египтом, Мальдивами, Индией, Вьетнамом, Дубаем. Авиабилеты — только не связанные с РФ и странами СНГ.',
      'chat.r.timing': 'Авиабилеты оформляем за 1–7 дней до вылета. Отели «день в день» возможны, но нужна оперативность — лучше планировать хотя бы за несколько часов.',
      'chat.r.refund': 'Если бронь по объективным причинам не состоится, возврат быстрый и в полном объёме — на тот же реквизит, с которого пришла оплата.',
      'chat.r.contact': 'Менеджер ответит в Telegram: <a href="https://t.me/secrettravel" target="_blank" rel="noopener">@secrettravel</a>. Пришлите ссылку и даты — посчитаем и подтвердим.',
      'chat.r.greet': 'Привет! Чем могу помочь — тарифы, страны, оплата, сроки или возврат?',
      'chat.r.link': 'Спасибо за ссылку! Передам менеджеру в Telegram — обычно отвечаем за 1–2 минуты. Пока могу рассказать про тарифы или оплату — что интереснее?',
      'chat.r.fallback': 'Я отвечу по тарифам, оплате, странам, срокам и возврату. Можете нажать на быстрые ответы ниже или прислать ссылку — передам менеджеру в Telegram.',
    },
    en: {
      'meta.title': 'SecretTravel — booking hotels, flights and tours',
      'meta.description': 'SecretTravel — concierge booking of hotels, apartments, flights, tours and car rentals. Direct confirmation, USDT/BTC payments, full refund if it falls through.',
      'a11y.skip': 'Skip to content',
      'nav.how': 'How it works',
      'nav.prices': 'Pricing',
      'nav.scope': 'Coverage',
      'nav.order': 'How to order',
      'nav.pay': 'Payment',
      'nav.faq': 'FAQ',
      'nav.contact': 'Contact',
      'hero.eyebrow': 'Concierge booking',
      'hero.title': '<span class="word">We</span> <span class="word">book</span> <span class="word">where</span> <span class="word">others</span> <span class="word"><em>throw</em></span> <span class="word"><em>up&nbsp;hands.</em></span>',
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
      'prices.c1.li3': 'Minimum order — <strong>₽12,000</strong> or USD equivalent at the day\'s rate.',
      'prices.c2.tag': 'Flights',
      'prices.c2.h': 'Commission on the ticket price',
      'prices.c2.li1': 'Minimum — <strong>₽12,000</strong>.',
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
      'pay.eyebrow': '§ 5 · Payment & refund',
      'pay.h2': 'Whatever\'s convenient for you.',
      'pay.usdt.p': 'Networks <strong>TRC-20</strong> and <strong>ERC-20</strong>.',
      'pay.btc.p': 'Direct to our wallet.',
      'pay.refund.h': 'Refund',
      'pay.refund.p': 'If the booking falls through for objective reasons, we refund <strong>quickly and in full</strong> to the same wallet the payment came from.',
      'faq.eyebrow': 'FAQ',
      'faq.h2': 'Short answers to common questions.',
      'faq.q1': 'Why 100% prepayment?',
      'faq.a1': 'It\'s standard practice that lets us start working on your request right away. No hard deadlines — once the booking is confirmed, we send you all the details. If for some reason it doesn\'t work out, the money is refunded in full to the same wallet.',
      'faq.q2': 'Which countries don\'t you cover?',
      'faq.a2': 'We don\'t book hotels in some resort regions: Egypt, Maldives, India, Vietnam, Dubai and a few others. Ask us for the full list — we\'ll always suggest an alternative.',
      'faq.q3': 'Which flights do you book?',
      'faq.a3': 'Only flights not connected to Russia and CIS. 50% commission, minimum ₽12,000, booked 1–7 days before departure.',
      'faq.q4': 'Can you book same-day?',
      'faq.a4': 'Yes, but it needs speed — plan at least a few hours ahead. For popular destinations, same-day bookings carry a 70% rate.',
      'faq.q5': 'How does the refund work?',
      'faq.a5': 'If the booking falls through for objective reasons, the refund is fast and in full, returned to the same wallet.',
      'faq.q6': 'Do you help during check-in?',
      'faq.a6': 'Yes. We stay in touch during check-in and help with deposit, late check-in and similar questions.',
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
      'chat.chip.scope': 'Where you book',
      'chat.chip.timing': 'Timing',
      'chat.chip.refund': 'Refund',
      'chat.chip.contact': 'Talk to manager',
      'chat.r.prices': 'Hotels — 60% of stay cost (popular destinations 65%, same-day 70%). Flights — 50%. Tours — 50%, car rental — 60%. Minimum order — ₽12,000. Want to send a specific link?',
      'chat.r.payment': 'We accept USDT (TRC-20 / ERC-20) and BTC. 100% prepayment before we start — standard practice so we can begin immediately. If the booking falls through, full refund to the same wallet.',
      'chat.r.scope': 'We cover most countries, especially European cities and self check-in apartments. We don\'t handle Egypt, Maldives, India, Vietnam, Dubai. Flights — only those unconnected to Russia and CIS.',
      'chat.r.timing': 'Flights — booked 1–7 days before departure. Same-day hotels are possible but need speed — best to plan a few hours ahead.',
      'chat.r.refund': 'If the booking falls through for objective reasons, the refund is fast and in full to the same wallet that paid.',
      'chat.r.contact': 'A manager will reply on Telegram: <a href="https://t.me/secrettravel" target="_blank" rel="noopener">@secrettravel</a>. Send the link and dates — we\'ll quote and confirm.',
      'chat.r.greet': 'Hi! What can I help with — pricing, coverage, payment, timing or refunds?',
      'chat.r.link': 'Thanks for the link! I\'ll forward it to the manager on Telegram — usually replies within 1–2 minutes. Meanwhile I can cover pricing or payment — which interests you more?',
      'chat.r.fallback': 'I can answer about pricing, payment, coverage, timing and refunds. Tap a quick reply below or send a link — I\'ll forward it to the manager on Telegram.',
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
  };

  applyI18n();

  // Lang toggle button
  const langBtn = document.querySelector('[data-lang-toggle]');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      currentLang = currentLang === 'ru' ? 'en' : 'ru';
      safeStorageSet(STORAGE_KEY, currentLang);
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
    ['chat.chip.payment', 'payment'],
    ['chat.chip.scope', 'scope'],
    ['chat.chip.timing', 'timing'],
    ['chat.chip.refund', 'refund'],
    ['chat.chip.contact', 'contact'],
  ];

  // Pattern → response intent
  const INTENTS = [
    { intent: 'prices',  re: /(цен|стоим|тариф|комисси|сколько|почём|price|cost|fee|how\s*much|rate)/i },
    { intent: 'payment', re: /(оплат|платё?ж|usdt|tether|btc|bitcoin|крипт|кошел|payment|pay\b|crypto|wallet)/i },
    { intent: 'scope',   re: /(стран|географ|где|куда|город|country|where|cover|destinatio|europe|египет|мальдив|индия|вьетнам|дубай|egypt|maldive|india|vietnam|dubai|снг|cis|россия|russia)/i },
    { intent: 'timing',  re: /(срок|когда|за\s*сколько|день\s*в\s*день|same.?day|how\s*fast|how\s*soon|timing|deadline|days?\s*before)/i },
    { intent: 'refund',  re: /(возврат|верну|refund|money\s*back|cancel)/i },
    { intent: 'contact', re: /(телеграм|telegram|менеджер|связ|contact|whatsapp|почт|email|manager|reach|talk)/i },
    { intent: 'greet',   re: /^\s*(прив|здрав|добры|hello|hi|hey|hola|good\s*(morning|day|evening))/i },
    { intent: 'link',    re: /(https?:\/\/|www\.|booking\.com|airbnb\.|expedia|skyscanner|kayak)/i },
  ];

  const detectIntent = (text) => {
    for (const { intent, re } of INTENTS) {
      if (re.test(text)) return intent;
    }
    return 'fallback';
  };

  const respondTo = (text) => t('chat.r.' + detectIntent(text));

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

  const handleUserMessage = (text, forcedIntent) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    appendMsg(escapeHtml(trimmed), 'user');
    const typing = showTyping();
    const intent = forcedIntent || detectIntent(trimmed);
    const reply = t('chat.r.' + intent) || t('chat.r.fallback');
    const delay = 600 + Math.min(1200, trimmed.length * 18);
    setTimeout(() => {
      if (typing) typing.remove();
      appendMsg(reply, 'bot');
    }, delay);
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
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!chatInput) return;
      const v = chatInput.value;
      chatInput.value = '';
      handleUserMessage(v);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatFab && chatFab.getAttribute('aria-expanded') === 'true') {
      setChatOpen(false);
      chatFab.focus();
    }
  });
})();
