const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');

const token = process.env.BOT_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const bot = new TelegramBot(token, { polling: true });

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const userStates = {};
const userData = {};

// Danh sách nhóm hàng hóa và phân loại con
const productCategories = {
  'Nước': ['Bia lon', 'Bia chai', 'Nước ngọt', 'Nước tăng lực', 'Sữa'],
};

const productSubcategories = {
  'Bia lon': ['SG', 'HN'],
  'Bia chai': ['SG', 'HN'],
  'Nước ngọt': ['C2', 'Tắc mật ong', 'Trà bí đao Wonderfarm', 'Trà xanh Không độ', 'CG Foods'],
  'Nước tăng lực': ['Bò húc', 'Number 1', 'Wakeup 247', 'Sting đỏ', 'Sting vàng'],
  'Sữa': ['Kun vị cam', 'Kun vị dâu', 'Kun nhiệt đới', 'CG Foods ngô', 'Hàn Dưa', 'Hàn Dâu', 'Hàn Cafe'],
};

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👤 Nhập tên khách hàng:');
  userStates[chatId] = 'awaiting_customer';
  userData[chatId] = {};
});

// Xử lý tin nhắn
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (!state || text.startsWith('/')) return;

  if (state === 'awaiting_customer') {
    userData[chatId].customer = text;
    userStates[chatId] = 'awaiting_main_category';

    const mainCategories = Object.keys(productCategories);
    bot.sendMessage(chatId, '🛒 Chọn nhóm hàng hóa:', {
      reply_markup: {
        keyboard: [mainCategories],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  else if (state === 'awaiting_main_category' && productCategories[text]) {
    userData[chatId].mainCategory = text;
    userStates[chatId] = 'awaiting_sub_category';

    const subCats = productCategories[text];
    bot.sendMessage(chatId, `📦 ${text} gồm các loại:`, {
      reply_markup: {
        keyboard: [subCats],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  else if (state === 'awaiting_sub_category' && productSubcategories[text]) {
    userData[chatId].subCategory = text;
    userStates[chatId] = 'awaiting_detail';

    const details = productSubcategories[text];
    bot.sendMessage(chatId, `📌 Chọn loại ${text}:`, {
      reply_markup: {
        keyboard: [details],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  else if (state === 'awaiting_detail') {
    userData[chatId].product = `${userData[chatId].subCategory} - ${text}`;
    userStates[chatId] = 'awaiting_quantity';
    bot.sendMessage(chatId, '✏️ Nhập số lượng:');
  }

  else if (state === 'awaiting_quantity') {
    userData[chatId].quantity = text;
    userStates[chatId] = 'awaiting_price';
    bot.sendMessage(chatId, '💵 Nhập giá:');
  }

  else if (state === 'awaiting_price') {
    userData[chatId].price = text;

    try {
      await appendToGoogleSheet(userData[chatId]);
      bot.sendMessage(chatId,
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

// Hàm ghi Google Sheet
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
