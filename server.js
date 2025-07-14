console.log("BOT_TOKEN:", process.env.BOT_TOKEN); // Kiểm tra xem Railway có inject biến không
console.log("ID:", process.env.SPREADSHEET_ID);
console.log("NAME:", process.env.SHEET_NAME);
const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const fs = require('fs');

// Lấy token và thông tin sheet từ biến môi trường Railway
const token = process.env.BOT_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

// Tạo bot Telegram
const bot = new TelegramBot(token, { polling: true });

// Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});


const userStates = {};
const userData = {};
const products = ['Cam', 'Táo', 'Nho'];

// Bắt đầu khi người dùng gọi /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👤 Nhập tên khách hàng:');
  userStates[chatId] = 'awaiting_customer';
  userData[chatId] = {};
});

// Xử lý các bước nhập liệu
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (!state) return;

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

    await appendToGoogleSheet(userData[chatId]);
    bot.sendMessage(
      chatId,
      `✅ Đã lưu:\n👤 ${userData[chatId].customer}\n📦 ${userData[chatId].product}\n🔢 SL: ${userData[chatId].quantity}\n💵 Giá: ${userData[chatId].price}`
    );

    delete userStates[chatId];
    delete userData[chatId];
  }
});

// Ghi dữ liệu vào Google Sheets
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
