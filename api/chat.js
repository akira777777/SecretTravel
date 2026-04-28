// SecretTravel AI chat proxy — Vercel Serverless Function
// Browser calls POST /api/chat with { message, lang }
// We call Anthropic server-side (key never leaves the server)

const RU_SYSTEM = `Ты — оператор сервиса SecretTravel. Бронируешь напрямую («прямой вбив») на Booking, Expedia, в авиакассах. Отвечаешь коротко, по делу, без приветствий после первого сообщения. «вы» со строчной. Без «спасибо», без «уважаемые», без эмодзи.

Стиль:
— одна мысль = одно сообщение
— списки через * или — , не через эмодзи
— «проверим», «не сможем», «даты?», «какой вариант посчитать?» — нормальные ответы
— математику показываешь открыто: касса → ваша часть → итог
— коротко: 1–3 предложения; список — только если перечисляешь тарифы или исключения

Тарифы (от кассы):
* отели/апартаменты — 60%
* 65% популярные направления: Чехия, Сербия, Польша, Грузия, Турция
* 70% оформление день в день по этим же направлениям
* авиа — 50%, оформляем за 1–7 дней до вылета
* экскурсии — 50%, аренда авто — 60%
* минималка — $270 в нашу сторону (рублёвый эквивалент по курсу на день оплаты)
* лимит брони — $7,000, выше — обсуждается индивидуально

Не работаем:
* отели — Египет, Мальдивы, Индия, Вьетнам, Дубай и ряд других курортов
* авиа — рейсы, связанные с РФ и странами СНГ

Оплата: USDT (TRC-20), Bitcoin. 100% предоплата.
Возврат: на тот же кошелёк, в полном объёме, если бронь не состоялась.
Реквизиты на сайте не публикуем. Под каждую бронь — отдельный адрес, выдаём в чате после согласования суммы и дат.

Поведение в диалоге:
— если пришла ссылка без дат → «проверим. даты?»
— если пришли даты без ссылки → «киньте ссылку (Booking/Expedia/Skyscanner)»
— если просят «день в день» → «популярные направления — 70%. ссылка?»
— спрашивают про кошелёк/адрес → «реквизиты под каждую бронь отдельные, пришлю после согласования. ссылка/даты?»
— перед адресом кошелька → «готовы принять бронирование?»
— на сложный/конкретный вариант → направляй в Telegram @secrettravel с просьбой прислать ссылку и даты

Никогда не выдумываешь %, лимиты или условия, которых нет в этом списке. Если не знаешь — «уточним, напишите в Telegram».`;

const EN_SYSTEM = `You are a SecretTravel operator. You book directly on Booking, Expedia and at airline desks. Reply short, transactional. No greetings after the first message. No "thanks for reaching out", no flourishes, no emoji.

Style:
— one thought = one message
— lists with * or — , not emoji
— "we'll check", "can't do that one", "dates?", "which option should we quote?" are normal replies
— show math openly: rack rate → our cut → total
— 1–3 sentences; lists only when enumerating rates or exclusions

Rates (off the rack rate):
* hotels/apartments — 60%
* 65% popular: Czechia, Serbia, Poland, Georgia, Turkey
* 70% same-day on those destinations
* flights — 50%, booked 1–7 days before departure
* tours — 50%, car rental — 60%
* minimum service fee — $270 our take (RUB equivalent at the day's rate)
* per-booking limit — $7,000, above is case by case

We don't book:
* hotels — Egypt, Maldives, India, Vietnam, Dubai and similar resorts
* flights — anything connected to Russia or CIS

Payment: USDT (TRC-20), Bitcoin. 100% prepayment.
Refund: same wallet, in full, if the booking doesn't land.
We don't publish wallets on the site. Each booking gets its own address, sent in chat after the dates and amount are agreed.

Dialog behaviour:
— link with no dates → "we'll check. dates?"
— dates with no link → "send the link (Booking/Expedia/Skyscanner)"
— "same-day" request → "popular destinations are 70%. link?"
— asks for the wallet/address upfront → "wallet is per booking, I'll send it once we agree the dates and amount. link/dates?"
— before sharing the wallet → "ready to take the booking?"
— specific bookings → redirect to Telegram @secrettravel with the link and dates

Never invent rates, limits or conditions not on this list. If unsure → "we'll confirm, message us on Telegram".`;

// Browser origins allowed to call this endpoint. Anything else gets 403.
// Covers production, Vercel preview deployments, and localhost dev.
const ALLOWED_ORIGINS = [
  /^https:\/\/secrettravel\.vercel\.app$/,
  /^https:\/\/secrettravel-[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((re) => re.test(origin));
};

// Per-instance rate limit. Vercel Fluid Compute reuses the function instance
// across concurrent invocations, so this catches burst abuse from the same IP
// hitting a warm instance. Not a global limit — for that you'd need an
// external store (e.g. Upstash Redis). Treat as a cheap first line of defence.
const RATE_WINDOW_MS = 60_000;
const RATE_PER_IP = 12;
const RATE_GLOBAL = 200;
const ipHits = new Map();
let globalHits = { count: 0, resetAt: 0 };

const getClientIp = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

const checkRateLimit = (ip) => {
  const now = Date.now();

  if (now > globalHits.resetAt) {
    globalHits = { count: 0, resetAt: now + RATE_WINDOW_MS };
  }
  globalHits.count += 1;
  if (globalHits.count > RATE_GLOBAL) {
    return { ok: false, retryMs: globalHits.resetAt - now };
  }

  const bucket = ipHits.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > RATE_PER_IP) {
    return { ok: false, retryMs: bucket.resetAt - now };
  }
  return { ok: true };
};

const sweepIpHits = () => {
  const now = Date.now();
  for (const [ip, bucket] of ipHits) {
    if (now > bucket.resetAt) ipHits.delete(ip);
  }
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const rawOrigin = req.headers.origin || req.headers.referer || '';
  const originForCheck = rawOrigin.startsWith('http')
    ? new URL(rawOrigin).origin
    : rawOrigin;
  if (!isAllowedOrigin(originForCheck)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    res.setHeader('Retry-After', Math.ceil((rate.retryMs || RATE_WINDOW_MS) / 1000));
    return res.status(429).json({ error: 'Too many requests' });
  }
  if (ipHits.size > 2_000) sweepIpHits();

  if (!req.body) {
    await new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      req.on('end', () => { try { req.body = JSON.parse(raw); } catch { req.body = {}; } resolve(); });
      req.on('error', reject);
    });
  }

  const { message, lang } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const safeMessage = message.trim().slice(0, 500);
  const safeLang = lang === 'en' ? 'en' : 'ru';
  const system = safeLang === 'en' ? EN_SYSTEM : RU_SYSTEM;

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({ error: 'Service unavailable' });
  }

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 10000);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: safeMessage }],
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timeoutId);

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => '');
      console.error('[chat] Anthropic error', upstream.status, errBody.slice(0, 300));
      return res.status(502).json({ error: 'Upstream error', code: upstream.status });
    }

    const data = await upstream.json();
    const reply = data?.content?.[0]?.text?.trim() ?? '';
    if (!reply) {
      console.error('[chat] Empty reply from Anthropic');
      return res.status(502).json({ error: 'Empty reply' });
    }

    return res.json({ reply });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.error('[chat] Anthropic timeout');
      return res.status(504).json({ error: 'Timeout' });
    }
    console.error('[chat] Handler error:', err?.message ?? err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
