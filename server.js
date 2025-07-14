const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');

// Đọc biến môi trường Railway (đã setup sẵn)
const token = process.env.BOT_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Khởi tạo bot
const bot = new TelegramBot(token, { polling: true });

// Khởi tạo Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const userStates = {};
const userData = {};
const products = ['Cam', 'Táo', 'Nho'];

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👤 Nhập tên khách hàng:');
  userStates[chatId] = 'awaiting_customer';
  userData[chatId] = {};
});

// xử lý tin nhắn
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (!state || text.startsWith('/')) return;

  if (state === 'awaiting_customer') {
    userData[chatId].customer = text;
    userStates[chatId] = 'awaiting_product';
    bot.sendMessage(chatId, '🛒 Chọn hàng hóa:', {
      reply_markup: {
        keyboard: [products],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  } else if (state === 'awaiting_product' && products.includes(text)) {
    userData[chatId].product = text;
    userStates[chatId] = 'awaiting_quantity';
    bot.sendMessage(chatId, '✏️ Nhập số lượng:');
  } else if (state === 'awaiting_quantity') {
    userData[chatId].quantity = text;
    userStates[chatId] = 'awaiting_price';
    bot.sendMessage(chatId, '💵 Nhập giá:');
  } else if (state === 'awaiting_price') {
    userData[chatId].price = text;

    try {
      await appendToGoogleSheet(userData[chatId]);
      bot.sendMessage(
        chatId,
        `✅ Đã lưu:\n👤 ${userData[chatId].customer}\n📦 ${userData[chatId].product}\n🔢 SL: ${userData[chatId].quantity}\n💵 Giá: ${userData[chatId].price}`
      );
    } catch (error) {
      console.error("Lỗi ghi vào Google Sheets:", error);
      bot.sendMessage(chatId, "❌ Lỗi ghi vào Google Sheets.");
    }

    delete userStates[chatId];
    delete userData[chatId];
  }
});

async function appendToGoogleSheet(entry) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const row = [
    entry.customer,
    entry.product,
    entry.quantity,
    entry.price,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
}
