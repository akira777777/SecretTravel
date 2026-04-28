const TELEGRAM_BOT_TOKEN = '8613732718:AAEBMS9HaSPGJYJfAWpwB43q0r2XpchgRvY';

// Helper function to send messages
async function sendMessage(chatId, text, replyMarkup = null, parseMode = 'HTML') {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// Helper to answer callback queries (removes loading icon on inline buttons)
async function answerCallbackQuery(callbackQueryId) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
}

module.exports = async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(200).send('Telegram Bot Webhook is running.');
  }

  try {
    const body = req.body;

    // 1. Handle regular text messages
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      // If user sends /start
      if (text === '/start') {
        const welcomeText = `Добро пожаловать в диспетчерскую Secret Travel ✦\n\nВаш личный консьерж для организации путешествий. Мы находим и бронируем отели, авиабилеты, self check-in апартаменты и авто по всему миру.\n\nВыберите нужное действие ниже:`;
        
        const replyMarkup = {
          inline_keyboard: [
            [{ text: '🌐 Забронировать на сайте', url: 'https://secrettravel.vercel.app/' }],
            [{ text: '📋 Наши условия', callback_data: 'conditions' }],
            [{ text: '💬 Связаться с менеджером', url: 'https://t.me/younghustle45' }] // Manager username
          ]
        };

        await sendMessage(chatId, welcomeText, replyMarkup);
      }
    } 
    // 2. Handle button clicks (Inline Keyboard)
    else if (body.callback_query) {
      const chatId = body.callback_query.message.chat.id;
      const data = body.callback_query.data;
      const callbackQueryId = body.callback_query.id;

      if (data === 'conditions') {
        const conditionsText = `✦ <b>Условия Secret Travel</b> ✦

<b>ОТЕЛИ И АПАРТАМЕНТЫ — 60%</b>
• <b>65%</b> — популярные направления: Чехия, Сербия, Польша, Грузия, Турция и др.
• <b>70%</b> — при бронировании день в день по этим же направлениям.
• Минимальная сумма — <b>$270</b> в нашу сторону (рублёвый эквивалент по курсу на день оплаты).

<b>АВИАБИЛЕТЫ — 50%</b>
• Оформляем за <b>1-7 дней</b> до вылета.
• Минимальная сумма — <b>$270</b> в нашу сторону.

<b>ЭКСКУРСИИ И АВТО</b>
• Экскурсии — <b>50%</b> от стоимости.
• Аренда автомобиля — <b>60%</b> от стоимости.

<i>Оплата принимается в крипте (USDT/BTC). В случае отмены брони гарантируем полный возврат средств.</i>`;
        
        await sendMessage(chatId, conditionsText, null, 'HTML');
      }

      // Always acknowledge the callback query
      await answerCallbackQuery(callbackQueryId);
    }

    // Acknowledge receipt to Telegram so it doesn't retry
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to Telegram so they don't block the webhook, 
    // but log the error on our Vercel dashboard.
    return res.status(200).send('Error but handled');
  }
};
