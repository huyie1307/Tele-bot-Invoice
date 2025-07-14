// Debug biến môi trường
console.log("BOT_TOKEN:", process.env.BOT_TOKEN);
console.log("SPREADSHEET_ID:", process.env.SPREADSHEET_ID);
console.log("SHEET_NAME:", process.env.SHEET_NAME);
console.log("GOOGLE_CREDENTIALS loaded:", !!process.env.GOOGLE_CREDENTIALS); // true nếu có

const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');

// Lấy biến môi trường từ Railway
const token = process.env.BOT_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Khởi tạo bot Telegram
const bot = new TelegramBot(token, { polling: true });

// Google Auth
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// State quản lý người dùng
const userStates = {};
const userData = {};
const products = ['Cam', 'Táo', 'Nho'];

// Lệnh /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👤 Nhập tên khách hàng:');
  userStates[chatId] = 'awaiting_customer';
  userData[chatId] = {};
});

// Xử lý luồng nhập dữ liệu
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (!state || text.startsWith('/')) return; // Bỏ qua lệnh khác

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

    // Ghi dữ liệu vào Google Sheets
    await appendToGoogleSheet(userData[chatId], chatId);

    // Gửi thông báo thành công
    bot.sendMessage(
      chatId,
      `✅ Đã lưu:\n👤 ${userData[chatId].customer}\n📦 ${userData[chatId].product}\n🔢 SL: ${userData[chatId].quantity}\n💵 Giá: ${userData[chatId].price}`
    );

    // Xóa state
    delete userStates[chatId];
    delete userData[chatId];
  }
});

// Ghi dữ liệu vào Google Sheets
async function appendToGoogleSheet(entry, chatId) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const row = [entry.customer, entry.product, entry.quantity, entry.price];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] },
    });

    console.log('✅ Đã ghi vào Google Sheets:', row);
  } catch (error) {
    console.error('❌ Lỗi ghi vào Google Sheets:', error);
    bot.sendMessage(chatId, '⚠️ Lỗi khi lưu vào Google Sheets. Vui lòng thử lại.');
  }
}
