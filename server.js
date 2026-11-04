const fs = require('node:fs');
const path = require('node:path');

function loadEnv() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {}
}

loadEnv();

const connectDatabase = require('./config/database');
const { seedData } = require('./services/seedService');
const app = require('./app');

async function start() {
  const port = Number(process.env.PORT || 3000);
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixit';

  try {
    await connectDatabase(uri);
    // Tự động kiểm tra và seed dữ liệu nếu DB còn trống
    try {
      await seedData(false);
    } catch (seedErr) {
      console.warn('Cảnh báo seed dữ liệu:', seedErr.message);
    }

    app.listen(port, () => {
      console.log(`FixIt đang chạy tại: http://localhost:${port}`);
      console.log(`Cơ sở dữ liệu: MongoDB Atlas (${uri.split('@')[1] ? uri.split('@')[1].split('/')[0] : 'Local'})`);
    });
  } catch (error) {
    console.error('Không kết nối được MongoDB Atlas:', error.message);
    console.error('Lưu ý: Đảm bảo mạng Internet hoạt động và IP Whitelist trên Atlas cho phép kết nối (0.0.0.0/0).');
    process.exit(1);
  }
}

start();
