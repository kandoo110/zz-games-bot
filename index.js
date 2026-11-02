const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 10000;
const DB_FILE = path.join(__dirname, 'storage.json');

// آیدی عددی ادمین
const ADMIN_CHAT_ID = "7644249207"; 

// آدرس کیف پول Tonkeeper شما برای دریافت پرداخت‌های TON
const OWNER_TON_WALLET = "UQByK9oOXxjYegpN28D_Z9fRC9uKx0s0Nc2VXA316gVILS4e";

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error("Error reading DB:", e);
  }
  return { users: {}, referrals: {}, unlocked: {} };
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error writing DB:", e);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', platform: 'ZZ Games Platform' }));
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

        // بررسی پرداخت موفق ستاره‌ها و ارسال گزارش آنی به ادمین
        if (update.message?.successful_payment) {
          const chatId = update.message.chat.id;
          const user = update.message.from;
          const payload = update.message.successful_payment.invoice_payload;
          const totalAmount = update.message.successful_payment.total_amount;

          let gameUrl = "https://zzgames-f35.onrender.com";
          let gameName = "F-35 Fighter Jet";

          if (payload === 'b2_game_access') {
            gameUrl = "https://zzgames-b-2.onrender.com";
            gameName = "B-2 Bomber Game";
          } else if (payload === 'space_game_access') {
            gameUrl = "https://zzgames-space-war.onrender.com";
            gameName = "Space War Game";
          } else if (payload === 'puzzle_game_access') {
            gameUrl = "https://zz-games-puzzle.onrender.com";
            gameName = "Castle Puzzle Game";
          } else if (payload === '20dzh_game_access') {
            gameUrl = "https://two0castles.onrender.com";
            gameName = "20 Dzh: Elements Battle";
          } else if (payload === 'alphabet_game_access') {
            gameUrl = "https://english-learning-pdc6.onrender.com";
            gameName = "Magic Alphabet Cube";
          }

          // ارسال پیام موفقیت به کاربر
          sendTelegramMessage(BOT_TOKEN, chatId, `🎉 Congratulations! Payment verified successfully.\n\nTap below to launch your ${gameName}:`, {
            inline_keyboard: [
              [{ text: `🚀 Launch ${gameName} (Fullscreen)`, web_app: { url: gameUrl } }],
              [{ text: "🏠 Back to Games Menu", callback_data: "back_to_menu" }]
            ]
          });

          // ارسال گزارش خرید موفق به ادمین
          const usernameStr = user.username ? `@${user.username}` : (user.first_name || 'Unknown');
          const adminAlertText = `💰 **گزارش خرید جدید (Stars)!**\n\n👤 کاربر: ${usernameStr} (ID: \`${chatId}\`)\n🎮 بازی خریداری شده: **${gameName}**\n💎 مبلغ پرداختی: **${totalAmount} استارز**`;
          sendTelegramMessage(BOT_TOKEN, ADMIN_CHAT_ID, adminAlertText);

          return;
        }

        if (update.callback_query) {
          const callbackQuery = update.callback_query;
          const callbackQueryId = callbackQuery.id;
          const chatId = callbackQuery.message?.chat?.id;
          const callbackData = callbackQuery.data;

          if (!chatId) return;

          // پاسخ سریع به کلیک کاربر تا دکمه از حالت لودینگ چرخان خارج شود
          const answerData = JSON.stringify({ callback_query_id: callbackQueryId, text: "" });
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
          } else if (callbackData === 'preview_puzzle') {
            sendGamePreview(BOT_TOKEN, chatId, 'puzzle');
          } else if (callbackData === 'preview_20dzh') {
            sendGamePreview(BOT_TOKEN, chatId, '20dzh');
          } else if (callbackData === 'preview_alphabet') {
            sendGamePreview(BOT_TOKEN, chatId, 'alphabet');
          } else if (callbackData === 'invite_menu') {
            sendInviteStatus(BOT_TOKEN, chatId);
          } else if (callbackData === 'wlf_token_info') {
            sendWlfTokenInfo(BOT_TOKEN, chatId);
          } else if (callbackData === 'back_to_menu') {
            sendGamesMenu(BOT_TOKEN, chatId);
          } else if (callbackData === 'buy_f35') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'F-35 Fighter Jet', 'f35_game_access', 30);
          } else if (callbackData === 'buy_b2') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'B-2 Bomber', 'b2_game_access', 30);
          } else if (callbackData === 'buy_space') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'Space War', 'space_game_access', 30);
          } else if (callbackData === 'buy_puzzle') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'Castle Puzzle Game', 'puzzle_game_access', 15);
          } else if (callbackData === 'buy_20dzh') {
            sendTelegramInvoice(BOT_TOKEN, chatId, '20 Dzh: Elements Battle', '20dzh_game_access', 15);
          } else if (callbackData === 'buy_alphabet') {
            sendTelegramInvoice(BOT_TOKEN, chatId, 'Magic Alphabet Cube', 'alphabet_game_access', 10);
          }
          return;
        }

        if (update.message) {
          const message = update.message;
          const chatId = message.chat.id;
          const text = message.text || '';
          const db = loadDB();

          if (text.startsWith('/start')) {
            const parts = text.split(' ');
            if (parts.length > 1 && parts[1].startsWith('ref_')) {
              const referrerId = parts[1].replace('ref_', '');
              if (referrerId !== chatId.toString()) {
                if (!db.referrals[referrerId]) db.referrals[referrerId] = [];
                
                if (!db.referrals[referrerId].includes(chatId.toString())) {
                  db.referrals[referrerId].push(chatId.toString());
                  
                  if (db.referrals[referrerId].length >= 4 && !db.unlocked[referrerId]) {
                    const games = [
                      { name: "F-35 Fighter Jet", url: "https://zzgames-f35.onrender.com" },
                      { name: "B-2 Bomber", url: "https://zzgames-b-2.onrender.com" },
                      { name: "Space War", url: "https://zzgames-space-war.onrender.com" },
                      { name: "Castle Puzzle Game", url: "https://zz-games-puzzle.onrender.com" }
                    ];
                    const randomGame = games[Math.floor(Math.random() * games.length)];
                    db.unlocked[referrerId] = randomGame;

                    sendTelegramMessage(BOT_TOKEN, referrerId, `🎁 **Congratulations!** You have invited 4 friends!\n\nAs a reward, **${randomGame.name}** is now UNLOCKED for you completely FREE! 🚀`, {
                      inline_keyboard: [
                        [{ text: `🚀 Launch ${randomGame.name} (Free)`, web_app: { url: randomGame.url } }],
                        [{ text: "🏠 Back to Menu", callback_data: "back_to_menu" }]
                      ]
                    });

                    const adminUnlockAlert = `🔓 **باز شدن بازی رایگان (از طریق دعوت دوستان)!**\n\n👤 کاربر معرف (ID: \`${referrerId}\`) موفق شد ۴ نفر دعوت کند و بازی **${randomGame.name}** برایش رایگان باز شد.`;
                    sendTelegramMessage(BOT_TOKEN, ADMIN_CHAT_ID, adminUnlockAlert);
                  }
                  saveDB(db);
                }
              }
            }
            sendGamesMenu(BOT_TOKEN, chatId);
          } else if (text.startsWith('/games')) {
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
  const responseText = "Welcome to **ZZ Games Platform**! 🎮🔥\n\nChoose an elite game to play, predict matches, unlock rewards, or launch options:";
  const replyMarkup = {
    inline_keyboard: [
      [{ text: "🔮 WLF Prediction Arena (Crypto & Football)", web_app: { url: "https://prediction-ldxa.onrender.com/prediction.html" } }],
      [{ text: "🧊 Stack 3D (Free Game)", web_app: { url: "https://zzgames-stack3d.onrender.com" } }],
      [{ text: "🔤 Magic Alphabet Cube (10 Stars / ~0.04 TON)", callback_data: "preview_alphabet" }],
      [{ text: "🏰 Castle Puzzle: Save Princess (Stages 1-30 Free)", callback_data: "preview_puzzle" }],
      [{ text: "🛡️ 20 Dzh: Elements Strategy (Stages 1-12 Free)", callback_data: "preview_20dzh" }],
      [{ text: "🚀 F-35 Fighter Jet (30 Stars / ~0.12 TON)", callback_data: "preview_f35" }],
      [{ text: "🛩️ B-2 Bomber (30 Stars / ~0.12 TON)", callback_data: "preview_b2" }],
      [{ text: "🌌 Space War (30 Stars / ~0.12 TON)", callback_data: "preview_space" }],
      [{ text: "🎁 Invite 4 Friends & Get a Free Game!", callback_data: "invite_menu" }],
      [{ text: "🪙 Token Info & Trading", callback_data: "wlf_token_info" }]
    ]
  };
  sendTelegramMessage(token, chatId, responseText, replyMarkup);
}

function sendWlfTokenInfo(token, chatId) {
  let infoText = `🪙 **Token & Ecosystem Info**\n\n`;
  infoText += `Welcome to our gaming platform hub! Enjoy predicting matches and playing elite arcade games.\n\n`;
  infoText += `📌 **Network:** TON Blockchain\n\n`;
  infoText += `👇 Choose an option below:`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: "🏠 Back to Games Menu", callback_data: "back_to_menu" }]
    ]
  };

  sendTelegramMessage(token, chatId, infoText, replyMarkup);
}

function sendInviteStatus(token, chatId) {
  const db = loadDB();
  const invitedList = db.referrals[chatId] || [];
  const count = invitedList.length;
  const reward = db.unlocked[chatId];
  const botUsername = "zzgames_bot";

  let statusText = `🎁 **Invite Friends & Win Free Games!**\n\n`;
  statusText += `Invite 4 friends using your link. Once 4 friends join, one paid game will be unlocked for you completely **FREE**!\n\n`;
  statusText += `📊 **Your Progress:** ${count} / 4 friends invited.\n\n`;

  if (reward) {
    statusText += `🎉 **Reward Unlocked:** ${reward.name} is yours for FREE! Tap below:`;
    sendTelegramMessage(token, chatId, statusText, {
      inline_keyboard: [
        [{ text: `🚀 Launch ${reward.name}`, web_app: { url: reward.url } }],
        [{ text: "🏠 Back to Menu", callback_data: "back_to_menu" }]
      ]
    });
  } else {
    statusText += `🔗 **Your Exclusive Invite Link:**\n\`https://t.me/${botUsername}?start=ref_${chatId}\`\n\n*(Link to copy & share)*`;
    sendTelegramMessage(token, chatId, statusText, {
      inline_keyboard: [
        [{ text: "🏠 Back to Games Menu", callback_data: "back_to_menu" }]
      ]
    });
  }
}

function sendGamePreview(token, chatId, gameType) {
  let photoUrl = "";
  let caption = "";
  let replyMarkupButtons = [];

  // مقادیر معادل‌سازی شده استارز به TON بر اساس استاندارد (هر 10 استارز معادل ~0.04 TON)
  // آدرس کیف پول شما: OWNER_TON_WALLET = "UQByK9oOXxjYegpN28D_Z9fRC9uKx0s0Nc2VXA316gVILS4e"

  if (gameType === 'f35') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-f35/main/f35.jpg";
    caption = "🎮 **F-35 Lightning II Air Combat**\n\n✨ High-performance atmospheric dogfight experience\n🎯 Advanced scoring & fluid arcade controls\n\n💎 **Permanent Access Options:**\n⭐️ 30 Telegram Stars\n💎 OR 0.12 TON (Direct to Wallet)";
    replyMarkupButtons = [
      [{ text: "💳 Pay 30 Stars & Unlock", callback_data: "buy_f35" }],
      [{ text: "💎 Pay 0.12 TON (Direct)", url: `https://tonkeeper.com/transfer/${OWNER_TON_WALLET}?amount=120000000&text=Unlock_F35_${chatId}` }],
      [{ text: "🔙 Back to Games Menu", callback_data: "back_to_menu" }]
    ];
  } else if (gameType === 'b2') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-B-2/main/B-2.jpg";
    caption = "🛩️ **B-2 Bomber Stealth Mission**\n\n✨ Strategic precision bombing & tactical flight\n🎯 High-stakes defensive operations\n\n💎 **Permanent Access Options:**\n⭐️ 30 Telegram Stars\n💎 OR 0.12 TON (Direct to Wallet)";
    replyMarkupButtons = [
      [{ text: "💳 Pay 30 Stars & Unlock", callback_data: "buy_b2" }],
      [{ text: "💎 Pay 0.12 TON (Direct)", url: `https://tonkeeper.com/transfer/${OWNER_TON_WALLET}?amount=120000000&text=Unlock_B2_${chatId}` }],
      [{ text: "🔙 Back to Games Menu", callback_data: "back_to_menu" }]
    ];
  } else if (gameType === 'space') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zzgames-space-war/main/space-war.jpg";
    caption = "🌌 **Space War Galaxy**\n\n✨ Epic galactic arcade shooter & cosmic combat\n🎯 Endless waves of interstellar enemies\n\n💎 **Permanent Access Options:**\n⭐️ 30 Telegram Stars\n💎 OR 0.12 TON (Direct to Wallet)";
    replyMarkupButtons = [
      [{ text: "💳 Pay 30 Stars & Unlock", callback_data: "buy_space" }],
      [{ text: "💎 Pay 0.12 TON (Direct)", url: `https://tonkeeper.com/transfer/${OWNER_TON_WALLET}?amount=120000000&text=Unlock_Space_${chatId}` }],
      [{ text: "🔙 Back to Games Menu", callback_data: "back_to_menu" }]
    ];
  } else if (gameType === 'puzzle') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/zz-games-puzzle/main/puzzle.jpg";
    caption = "🏰 **Castle Puzzle: Save Princess**\n\n✨ Strategic puzzle campaign across 40 castles\n📌 **Stages 1 to 30 are completely FREE!**\n\n💎 **VIP Access Options (Stages 31-40):**\n⭐️ 15 Telegram Stars\n💎 OR 0.06 TON (Direct to Wallet)";
    replyMarkupButtons = [
      [{ text: "🚀 Launch Game (Free / Fullscreen)", web_app: { url: "https://zz-games-puzzle.onrender.com" } }],
      [{ text: "💳 Unlock VIP (15 Stars)", callback_data: "buy_puzzle" }],
      [{ text: "💎 Unlock VIP (0.06 TON)", url: `https://tonkeeper.com/transfer/${OWNER_TON_WALLET}?amount=60000000&text=Unlock_Puzzle_${chatId}` }],
      [{ text: "🔙 Back to Games Menu", callback_data: "back_to_menu" }]
    ];
  } else if (gameType === '20dzh') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/20castles/main/20castles.jpg";
    caption = "🏰 **20 Dzh: Elements Battle (Strategy)**\n\n✨ Strategic four elements puzzle campaign & castle defense\n📌 **Stages 1 to 12 are completely FREE!**\n\n💎 **VIP Access Options:**\n⭐️ 15 Telegram Stars\n💎 OR 0.06 TON (Direct to Wallet)";
    replyMarkupButtons = [
      [{ text: "🚀 Launch Game (Free / Fullscreen)", web_app: { url: "https://two0castles.onrender.com" } }],
      [{ text: "💳 Pay 15 Stars & Unlock", callback_data: "buy_20dzh" }],
      [{ text: "💎 Pay 0.06 TON (Direct)", url: `https://tonkeeper.com/transfer/${OWNER_TON_WALLET}?amount=60000000&text=Unlock_20Dzh_${chatId}` }],
      [{ text: "🔙 Back to Games Menu", callback_data: "back_to_menu" }]
    ];
  } else if (gameType === 'alphabet') {
    photoUrl = "https://raw.githubusercontent.com/kandoo110/English-learning/main/English.jpg";
    caption = "🔤 **Magic Alphabet Cube (English Learning)**\n\n✨ Interactive 3D alphabet cubes with 260 words, audio pronunciation & good deeds mini-tasks!\n\n💎 **Permanent Access Options:**\n⭐️ 10 Telegram Stars\n💎 OR 0.04 TON (Direct to Wallet)";
    replyMarkupButtons = [
      [{ text: "💳 Pay 10 Stars & Unlock", callback_data: "buy_alphabet" }],
      [{ text: "💎 Pay 0.04 TON (Direct)", url: `https://tonkeeper.com/transfer/${OWNER_TON_WALLET}?amount=40000000&text=Unlock_Alphabet_${chatId}` }],
      [{ text: "🔙 Back to Games Menu", callback_data: "back_to_menu" }]
    ];
  }

  const postData = JSON.stringify({
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: replyMarkupButtons }
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
  const data = JSON.stringify({ pre_checkout_query_id: preCheckoutQueryId, ok: true });
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
    description: `Pay ${amount} Telegram Stars to permanently unlock ${title}!`,
    payload: payload,
    currency: "XTR",
    prices: [{ label: `${title} Access`, amount: amount }]
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
  req.on('error', (e) => console.error("Invoice Error:", e.message));
  req.write(invoiceData);
  req.end();
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ZZ Games Bot server running on port ${PORT}`);
});
