const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const fs = require('fs');

const token = '7546583805:AAHDtClNb_3kDqo8wYSUNdb0RwZQN13tBNU';
const bot = new TelegramBot(token, { polling: true });

// Load credentials
const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = '1d21Q5psJBfDwUkkz_lfvcLWxlekcwruRY6qNrXtyHtk'; // ID từ URL
const SHEET_NAME = 'Nuoc'; // Tên của sheet (tab), không phải tên file Google Sheets

const userStates = {};
const userData = {};
const products = ['Cam', 'Táo', 'Nho'];

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👤 Nhập tên khách hàng:');
  userStates[chatId] = 'awaiting_customer';
  userData[chatId] = {};
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (!state || msg.text.startsWith('/')) return;

  if (state === 'awaiting_customer') {
    userData[chatId].customer = text;
    userStates[chatId] = 'awaiting_product';

    bot.sendMessage(chatId, '🛒 Chọn hàng hóa:', {
      reply_markup: {
        keyboard: [products],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });

  } else if (state === 'awaiting_product' && products.includes(text)) {
    userData[chatId].product = text;
    userStates[chatId] = 'awaiting_quantity';
    bot.sendMessage(chatId, '✏️ Nhập số lượng:');

  } else if (state === 'awaiting_quantity') {
    userData[chatId].quantity = text;
    userStates[chatId] = 'awaiting_price';
    bot.sendMessage(chatId, '💰 Nhập giá:');

  } else if (state === 'awaiting_price') {
    userData[chatId].price = text;

    try {
      await appendToGoogleSheet(userData[chatId]);
      bot.sendMessage(chatId,
        `✅ Đã lưu:\n👤 ${userData[chatId].customer}\n📦 ${userData[chatId].product}\n🔢 SL: ${userData[chatId].quantity}\n💰 Giá: ${userData[chatId].price}`
      );
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, '❌ Có lỗi xảy ra khi lưu vào Google Sheet.');
    }

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
    entry.price
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [row]
    }
  });
}
