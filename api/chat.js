// SecretTravel AI chat proxy — Vercel Serverless Function
// Browser calls POST /api/chat with { message, lang }
// We call Anthropic server-side (key never leaves the server)

const RU_SYSTEM = `Ты — виртуальный менеджер сервиса SecretTravel. \
Отвечай кратко (2–4 предложения), по-русски, вежливо и по делу.

Ключевые факты:
• Бронируем: отели, апартаменты, авиабилеты, экскурсии, аренда авто
• Тарифы: Отели 60% (65% популярные — Чехия, Сербия, Польша, Грузия, Турция; 70% день‑в‑день). Авиабилеты 50%. Экскурсии 50%, аренда авто 60%.
• Минимум: 12 000 ₽ (или эквивалент в USD по курсу дня)
• НЕ оформляем: отели в Египте, Мальдивах, Индии, Вьетнаме, Дубае и ряде других курортов
• Авиабилеты: только рейсы, НЕ связанные с РФ и странами СНГ
• Оплата: USDT TRC‑20 / ERC‑20, Bitcoin — 100% предоплата
• Возврат в полном объёме, если бронь не состоялась по объективным причинам
• Авиа оформляем за 1–7 дней до вылета
• Для бронирования → Telegram @secrettravel (пришлите ссылку + даты)

При запросе конкретного варианта — направляй в Telegram с просьбой прислать ссылку и даты.`;

const EN_SYSTEM = `You are the SecretTravel virtual concierge. \
Reply briefly (2–4 sentences), in English, professionally.

Key facts:
• We book: hotels, apartments, flights, tours, car rentals
• Rates: Hotels 60% (65% popular — Czechia, Serbia, Poland, Georgia, Turkey; 70% same-day). Flights 50%. Tours 50%, car rental 60%.
• Minimum: $130 (or ruble equivalent at the day's rate)
• We DON'T book: hotels in Egypt, Maldives, India, Vietnam, Dubai and similar resorts
• Flights: only those NOT connected to Russia/CIS
• Payment: USDT TRC-20 / ERC-20, Bitcoin — 100% prepayment
• Full refund if the booking falls through for objective reasons
• Flights booked 1–7 days before departure
• To book → Telegram @secrettravel (send the link + dates)

When a user asks about a specific booking, redirect them to Telegram with the link and dates.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful degradation — frontend will fall back to rule-based responses
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: safeMessage }],
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timeoutId);

    if (!upstream.ok) {
      const errBody = await upstream.text().catch(() => '');
      console.error('[chat] Anthropic error', upstream.status, errBody.slice(0, 200));
      return res.status(502).json({ error: 'Upstream error' });
    }

    const data = await upstream.json();
    const reply = data?.content?.[0]?.text?.trim() ?? '';

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
