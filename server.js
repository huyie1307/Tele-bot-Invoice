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

// ... (Giữ nguyên phần xử lý bot)

async function appendToGoogleSheet(entry) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const row = [
    entry.customer,
    `${entry.category} - ${entry.subcategory} - ${entry.product}`,
    entry.quantity,
    entry.price,
    timestamp
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
}
