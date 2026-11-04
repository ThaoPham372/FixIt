const mongoose = require('mongoose');

module.exports = async function connectDatabase(uri) {
  // Tái sử dụng kết nối trong môi trường Serverless (Vercel)
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', false);
  const options = {
    serverSelectionTimeoutMS: 10000,
  };
  await mongoose.connect(uri, options);
  console.log('MongoDB Atlas: Kết nối thành công tới cluster đám mây.');
  return mongoose.connection;
};
