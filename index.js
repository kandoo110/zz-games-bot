const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 10000;

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
          } else if (payload === '20dzh_game_access') {
            gameUrl = "https://20castles.onrender.com";
            gameName = "20 Dzh: Elements Battle";
          }

          sendTelegramMessage(BOT_TOKEN, chatId, `🎉 Congratulations! Payment verified successfully.\n\nTap the button below to launch your ${gameName}:`, {
            inline_keyboard: [
              [{ text: `🚀 Launch ${gameName} (Fullscreen)`, web_app: { url: gameUrl } }],
              [{ text: "🏠 Back to Games Menu", callback_data: "back_to_menu" }]
            ]
          });
          return;
        }

        if (update.callback_query) {
          const callbackQuery = update.callback_query;
          const callbackQueryId = callbackQuery.id;
          const chatId = callbackQuery.message?.chat?.id;
          const callbackData = callbackQuery.data;

          if (!chatId) return;

          const answerData = JSON.stringify({
            callback_query_id: callbackQueryId,
            text: ""
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
          } else if (callbackData === 'preview_20dzh') {
            sendGamePreview(BOT_TOKEN, chatId, '20dzh');
          } else if (callbackData === 'back_to_menu') {
            sendGamesMenu(BOT_TOKEN, chatId);
          } else if (callbackData === 'buy_f35') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'F-35 Fighter Jet', 'f35_game_access', 50);
          } else if (callbackData === 'buy_b2') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'B-2 Bomber', 'b2_game_access', 50);
          } else if (callbackData === 'buy_space') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'Space War', 'space_game_access', 50);
          } else if (callbackData === 'buy_20dzh') {
            sendTelegramInvoice(BOT_TOKEN, chatId, '20 Dzh: Elements Battle', '20dzh_game_access', 35);
          }
          return;
        }

        if (update.message) {
          const message = update.message;
          const chatId = message.chat.id;
          const text = message.text || '';

          if (text.startsWith('/start') || text.startsWith('/games')) {
            sendGamesMenu(BOT_TOKEN, chatId);
          }
        }

      } catch (err) {
        console.error("Error parsing update:", err);
      }
    });
  }
});

function sendGamesMenu(token, chatId) {
  const responseText = "Welcome to **ZZ Games Platform**! 🎮🔥\n\nChoose an elite game below to view details and unlock access:";
  const replyMarkup = {
    inline_keyboard: [
      [{ text: "🛡️ 20 Dzh: Elements Strategy (35 Stars ⭐)", callback_data: "preview_20dzh" }],
      [{ text: "🚀 F-35 Fighter Jet (50 Stars)", callback_data: "preview_f35" }],
      [{ text: "🛩️ B-2 Bomber (50 Stars)", callback_data: "preview_b2" }],
      [{ text: "🌌 Space War (50 Stars)", callback_data: "preview_space" }]
    ]
  };
  sendTelegramMessage(token, chatId, responseText, replyMarkup);
}

function sendGamePreview(token, chatId, gameType) {
  let photoUrl = "";
  let caption = "";
  let buyCallback = "";
  let starsAmount = 50;

  if (gameType === 'f35') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-f35/main/f35.jpg";
    caption = "🎮 **F-35 Lightning II Air Combat**\n\n✨ High-performance atmospheric dogfight experience\n🎯 Advanced scoring & fluid arcade controls\n\n💎 **Permanent Access:** 50 Telegram Stars";
    buyCallback = "buy_f35";
    starsAmount = 50;
  } else if (gameType === 'b2') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-B-2/main/B-2.jpg";
    caption = "🛩️ **B-2 Bomber Stealth Mission**\n\n✨ Strategic precision bombing & tactical flight\n🎯 High-stakes defensive operations\n\n💎 **Permanent Access:** 50 Telegram Stars";
    buyCallback = "buy_b2";
    starsAmount = 50;
  } else if (gameType === 'space') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-space-war/main/space-war.jpg";
    caption = "🌌 **Space War Galaxy**\n\n✨ Epic galactic arcade shooter & cosmic combat\n🎯 Endless waves of interstellar enemies\n\n💎 **Permanent Access:** 50 Telegram Stars";
    buyCallback = "buy_space";
    starsAmount = 50;
  } else if (gameType === '20dzh') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/20castles/main/20castles.jpg";
    caption = "🏰 **20 Dzh: Elements Battle (Strategy)**\n\n✨ Strategic four elements puzzle campaign & castle defense\n🎯 20 challenging stages to save love and break spells\n\n💎 **Permanent Access (Stages 13-20):** 35 Telegram Stars ⭐";
    buyCallback = "buy_20dzh";
    starsAmount = 35;
  }

  const postData = JSON.stringify({
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: `💳 Pay ${starsAmount} Stars & Unlock`, callback_data: buyCallback }],
        [{ text: "🔙 Back to Games Menu", callback_data: "back_to_menu" }]
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
  const invoiceData = JSON.stringify({
    chat_id: chatId,
    title: `Unlock ${title}`,
    description: `Pay ${amount} Telegram Stars to permanently unlock the ${title} game experience!`,
    payload: payload,
    currency: "XTR",
    prices: [
      { label: `${title} Access`, amount: amount }
    ]
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendInvoice`,
    method: 'POST',
    family: 4,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(invoiceData)
    }
  };

  const req = https.request(options);
  req.write(invoiceData);
  req.end();
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ZZ Games Bot server running on port ${PORT}`);
});
