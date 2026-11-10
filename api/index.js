const app = require('../app');
const connectDatabase = require('../config/database');

const handler = async (req, res) => {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb+srv://tuongthao02101992_db_user:aiOeMicIQ5vsp9Ms@cluster0.fjuzvqh.mongodb.net/fixit?retryWrites=true&w=majority';

  try {
    await connectDatabase(uri);
  } catch (err) {
    console.error('Lỗi kết nối MongoDB Atlas trên Vercel:', err.message);
  }

  return app(req, res);
};

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
