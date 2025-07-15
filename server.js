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

// Danh mục phân cấp
const categories = {
  'Nước': {
    'Bia lon': ['SG', 'HN'],
    'Bia chai': ['SG', 'HN'],
    'Nước ngọt': ['C2', 'Tắc mật ong', 'Trà bí đao Wonderfarm', 'Trà xanh Không độ', 'CG Foods'],
    'Nước tăng lực': ['Bò húc', 'Number 1', 'Wakeup 247', 'Sting đỏ', 'Sting vàng'],
    'Sữa': ['Kun vị cam', 'Kun vị dâu', 'Kun nhiệt đới', 'CG Foods ngô', 'Hàn Dưa', 'Hàn Dâu', 'Hàn Cafe']
  },
  'Gạo': {
    'Thái': ['Gạo Cò 10kg', 'Gạo Địa 10kg'],
    'Nhật': ['Gạo Japonica 10kg', 'Gạo Japonica 20kg'],
    'Việt': ['ST25 10kg', 'ST25 5kg', 'ST25 1kg', 'ST25 0.6kg', 'ST25 2kg']
  },
  'Cà Phê': {
    'G7': ['Hộp 21', 'Hộp 18', 'Đen', 'Đen đá', 'Rumi Vàng', 'Motherland Vàng', 'Gói 50', 'Gói 100', 'X2'],
    'Legend': ['Capu Mocha', 'Capu Hazelnut'],
    'Chế Phin': ['3', '4', '5'],
    'King Coffee': ['Gói 48', 'Gói 45', 'Hộp 20', 'Hộp 18', 'Gói 88'],
    'Me Trang': ['Arabica 500g', 'Chồn 500g', 'ArabicaRobusta 500g', 'OceanBlue 500g', 'Culi 500g', 'Robusta', 'Mero 500g'],
    'MacCoffee': ['Phố'],
    'C&Sea': ['Muối hoà tan'],
    'Durica': ['Hoà tan sầu riêng'],
    'WakeUp': ['Chồn 306']
  },
  'Đông lạnh': {
    'Chanh leo': ['Túi', 'Viên'],
    'Xoài': ['Má 1kg', 'Má 2kg', 'Viên 1kg'],
    'Khác': ['Bơ', 'Dứa Mật', 'Thanh Long', 'Sầu Riêng']
  },
  'Mì ăn liền': {
    'Mì': ['Hảo Hảo', 'Omachi bò', 'Omachi tôm', 'Omachi sườn', 'Miliket', 'Chua Cay', 'Lẩu Thái', 'Gà cay', 'Hồng', 'Siêu cay', 'Indomie'],
    'Miến': ['Phú Hương sườn', 'Phú Hương thịt bằm', 'Phú Hương măng'],
    'Phở': ['Vifon gà(bát)', 'Vifon bò(bát)', 'Vifon bò(gói)', 'Thìn', 'Đệ Nhất bò', 'Đệ Nhất gà', 'Đệ Nhất tôm'],
    'Bánh đa': ['Vifon']
  },
  'Bánh kẹo': {
    'Bánh Gạo': ['An vị vừng', 'An vị tảo biển', 'One One vị mắn', 'One One vị sữa ngô', 'One One vị phô mai', 'One One vị tảo biển'],
    'Bánh ngọt': ['Eurocake vị truyền thống', 'Eurocake vị chuối', 'Eurocake vị dâu'],
    'Kẹo bóc vỏ': ['Xoài', 'Đào', 'Coca', 'Cam', 'Xoài xanh'],
    'Kẹo cứng': ['Ổi', 'Cà phê'],
    'Kẹo dẻo': [],
    'Kẹo Lọt vỏ': ['Nho', 'Mix'],
    'Kẹo Milkolf': [],
    'Kẹo Misoca': [],
    'Thạch': ['Headway', 'New choice', 'ZaiZai trà sữa', 'ZaiZai hoa quả', 'ZaiZai phômai']
  }
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userStates[chatId] = 'awaiting_customer';
  userData[chatId] = {};
  bot.sendMessage(chatId, '👤 Nhập tên khách hàng:', {
    reply_markup: {
      keyboard: [['/start']],
      resize_keyboard: true
    }
  });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];

  if (!state || text.startsWith('/')) return;

  if (state === 'awaiting_customer') {
    userData[chatId].customer = text;
    userStates[chatId] = 'awaiting_category';
    bot.sendMessage(chatId, '🛒 Chọn danh mục:', {
      reply_markup: { keyboard: [['/start'], ...Object.keys(categories).map(c => [c])], resize_keyboard: true }
    });

  } else if (state === 'awaiting_category') {
    if (!categories[text]) return;
    userData[chatId].category = text;
    userStates[chatId] = 'awaiting_subcategory';
    bot.sendMessage(chatId, `🔍 Chọn nhóm hàng thuộc "${text}":`, {
      reply_markup: { keyboard: [['/start'], ...Object.keys(categories[text]).map(i => [i])], resize_keyboard: true }
    });

  } else if (state === 'awaiting_subcategory') {
    const category = userData[chatId].category;
    if (!categories[category][text]) return;
    userData[chatId].subcategory = text;
    userStates[chatId] = 'awaiting_product';
    const items = categories[category][text];
    if (items.length > 0) {
      bot.sendMessage(chatId, `📦 Chọn sản phẩm thuộc nhóm "${text}":`, {
        reply_markup: { keyboard: [['/start'], ...items.map(i => [i])], resize_keyboard: true }
      });
    } else {
      userData[chatId].product = text;
      userStates[chatId] = 'awaiting_quantity';
      bot.sendMessage(chatId, '✏️ Nhập số lượng:', {
        reply_markup: { keyboard: [['/start']], resize_keyboard: true }
      });
    }

  } else if (state === 'awaiting_product') {
    userData[chatId].product = text;
    userStates[chatId] = 'awaiting_quantity';
    bot.sendMessage(chatId, '✏️ Nhập số lượng:', {
      reply_markup: { keyboard: [['/start']], resize_keyboard: true }
    });

  } else if (state === 'awaiting_quantity') {
    userData[chatId].quantity = text;
    userStates[chatId] = 'awaiting_price';
    bot.sendMessage(chatId, '💵 Nhập giá:', {
      reply_markup: { keyboard: [['/start']], resize_keyboard: true }
    });

  } else if (state === 'awaiting_price') {
    userData[chatId].price = text;

    try {
      await appendToGoogleSheet(userData[chatId]);
      bot.sendMessage(chatId, `✅ Đã lưu:\n👤 ${userData[chatId].customer}\n📂 ${userData[chatId].category} > ${userData[chatId].subcategory}\n📦 ${userData[chatId].product}\n🔢 SL: ${userData[chatId].quantity}\n💵 Giá: ${userData[chatId].price}`, {
        reply_markup: { keyboard: [['/start']], resize_keyboard: true }
      });
    } catch (error) {
      console.error("Lỗi ghi vào Google Sheets:", error);
      bot.sendMessage(chatId, "❌ Lỗi ghi vào Google Sheets.", {
        reply_markup: { keyboard: [['/start']], resize_keyboard: true }
      });
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
    `${entry.category} - ${entry.subcategory} - ${entry.product}`,
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
