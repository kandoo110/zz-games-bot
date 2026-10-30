const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', platform: 'ZZ Games Bot' }));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));

      try {
        const update = JSON.parse(body);
        const BOT_TOKEN = process.env.BOT_TOKEN;
        if (!BOT_TOKEN) return;

        if (update.pre_checkout_query) {
          answerPreCheckoutQuery(BOT_TOKEN, update.pre_checkout_query.id);
          return;
        }

        if (update.message?.successful_payment) {
          const chatId = update.message.chat.id;
          const payload = update.message.successful_payment.invoice_payload;

          let gameUrl = "https://zzgames-f35.onrender.com";
          let gameName = "F-35 Fighter Jet";

          if (payload === 'b2_game_access') {
            gameUrl = "https://zzgames-b-2.onrender.com";
            gameName = "B-2 Bomber Game";
          } else if (payload === 'space_game_access') {
            gameUrl = "https://zzgames-space-war.onrender.com";
            gameName = "Space War Game";
          }

          sendTelegramMessage(BOT_TOKEN, chatId, `🎉 Congratulations! Payment verified successfully.\n\nTap the button below to launch your ${gameName}:`, {
            inline_keyboard: [
              [{ text: `🚀 Launch ${gameName} (Fullscreen)`, web_app: { url: gameUrl } }],
              [{ text: "🔙 Back to Main Menu", callback_data: "main_menu" }]
            ]
          });
          return;
        }

        const callbackQuery = update.callback_query;
        const message = update.message;

        const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
        const text = message?.text || '';
        const callbackData = callbackQuery?.data;
        const callbackQueryId = callbackQuery?.id;

        if (!chatId) return;

        if (callbackQueryId) {
          const answerData = JSON.stringify({
            callback_query_id: callbackQueryId,
            text: "Loading..."
          });

          const answerReq = https.request({
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/answerCallbackQuery`,
            method: 'POST',
            family: 4, 
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(answerData) }
          });
          answerReq.on('error', (e) => console.error("Answer Error:", e.message));
          answerReq.write(answerData);
          answerReq.end();

          if (callbackData === 'preview_f35') {
            sendGamePreview(BOT_TOKEN, chatId, 'f35');
          } else if (callbackData === 'preview_b2') {
            sendGamePreview(BOT_TOKEN, chatId, 'b2');
          } else if (callbackData === 'preview_space') {
            sendGamePreview(BOT_TOKEN, chatId, 'space');
          } else if (callbackData === 'buy_f35') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'F-35 Fighter Jet', 'f35_game_access', 50);
          } else if (callbackData === 'buy_b2') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'B-2 Bomber', 'b2_game_access', 50);
          } else if (callbackData === 'buy_space') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'Space War', 'space_game_access', 50);
          } else if (callbackData === 'main_menu') {
            sendMainMenu(BOT_TOKEN, chatId);
          }
          return;
        }

        if (text.startsWith('/start') || text.startsWith('/games')) {
          sendMainMenu(BOT_TOKEN, chatId);
        }

      } catch (err) {
        console.error("Error parsing update:", err);
      }
    });
  }
});

function sendMainMenu(token, chatId) {
  const responseText = "Welcome to **ZZ Games Platform**! 🎮🔥\n\nChoose an elite action game below to view details and unlock permanent access:";
  const replyMarkup = {
    inline_keyboard: [
      [{ text: "🚀 F-35 Fighter Jet (50 Stars)", callback_data: "preview_f35" }],
      [{ text: "🛸 B-2 Bomber (50 Stars)", callback_data: "preview_b2" }],
      [{ text: "🌌 Space War (50 Stars)", callback_data: "preview_space" }]
    ]
  };
  sendTelegramMessage(token, chatId, responseText, replyMarkup);
}

function sendGamePreview(token, chatId, gameType) {
  let photoUrl = "";
  let caption = "";
  let buyCallback = "";

  if (gameType === 'f35') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-f35/main/f35.jpg";
    caption = "🎮 **F-35 Lightning II Air Combat**\n\n✨ High-performance atmospheric dogfight experience\n🎯 Advanced scoring & fluid arcade controls\n\n💎 **Permanent Access:** 50 Telegram Stars";
    buyCallback = "buy_f35";
  } else if (gameType === 'b2') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-B-2/main/B-2.jpg";
    caption = "🛸 **B-2 Bomber Stealth Mission**\n\n✨ Strategic precision bombing & tactical flight\n🎯 High-stakes defensive operations\n\n💎 **Permanent Access:** 50 Telegram Stars";
    buyCallback = "buy_b2";
  } else if (gameType === 'space') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-space-war/main/space-war.jpg";
    caption = "🌌 **Space War Galaxy**\n\n✨ Epic galactic arcade shooter & cosmic combat\n🎯 Endless waves of interstellar enemies\n\n💎 **Permanent Access:** 50 Telegram Stars";
    buyCallback = "buy_space";
  }

  const postData = JSON.stringify({
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💳 Pay 50 Stars & Unlock", callback_data: buyCallback }],
        [{ text: "🔙 Back to Main Menu", callback_data: "main_menu" }]
      ]
    }
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendPhoto`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options);
  req.on('error', (e) => console.error("Preview Error:", e.message));
  req.write(postData);
  req.end();
}

function answerPreCheckoutQuery(token, preCheckoutQueryId) {
  const data = JSON.stringify({
    pre_checkout_query_id: preCheckoutQueryId,
    ok: true
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/answerPreCheckoutQuery`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options);
  req.end(data);
}

function sendTelegramMessage(token, chatId, text, replyMarkup) {
  const postData = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: replyMarkup
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options);
  req.write(postData);
  req.end();
}

function sendTelegramInvoice(token, chatId, title, payload, amount) {
  // اضافه کردن دکمه لغو و بازگشت به منو در فاکتور پرداخت ستاره
  const invoiceData = JSON.stringify({
    chat_id: chatId,
    title: `Unlock ${title}`,
    description: `Pay ${amount} Telegram Stars to permanently unlock the ${title} game experience!`,
    payload: payload,
    currency: "XTR",
    prices: [
      { label: `${title} Access`, amount: amount }
    ],
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Cancel & Back to Menu", callback_data: "main_menu" }]
      ]
    }
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendInvoice`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data = invoiceData)
    }
  };

  const req = https.request(options);
  req.write(invoiceData);
  req.end();
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`ZZ Games Bot server running on port ${PORT}`);
});
