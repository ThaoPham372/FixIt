const path = require('node:path');
const multer = require('multer');
const mongoose = require('mongoose');

const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

// Bộ nhớ đệm RAM: Hỗ trợ cả môi trường Serverless (Vercel) và máy chủ cục bộ
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_VIDEO_MB || 50) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    const error = new Error('Chỉ nhận tệp video hoặc ảnh.');
    error.status = 400;
    cb(error);
  },
});

// Helper tương tác với MongoDB Atlas GridFS
function getBucket() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('Chưa kết nối cơ sở dữ liệu MongoDB Atlas.');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'evidences' });
}

function saveToGridFS(buffer, filename, metadata = {}) {
  return new Promise((resolve, reject) => {
    try {
      const bucket = getBucket();
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: metadata.contentType || 'video/mp4',
        metadata,
      });
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id));
      uploadStream.end(buffer);
    } catch (err) {
      reject(err);
    }
  });
}

function getGridFSStream(id, options = {}) {
  const bucket = getBucket();
  const objId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
  return bucket.openDownloadStream(objId, options);
}

async function getGridFSFileInfo(id) {
  const bucket = getBucket();
  const objId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
  const files = await bucket.find({ _id: objId }).toArray();
  return files[0] || null;
}

function readGridFSBuffer(id) {
  return new Promise((resolve, reject) => {
    try {
      const stream = getGridFSStream(id);
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    } catch (err) {
      reject(err);
    }
  });
}

async function deleteFromGridFS(id) {
  try {
    const bucket = getBucket();
    const objId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
    await bucket.delete(objId);
  } catch {}
}

module.exports = {
  uploadDir,
  upload,
  saveToGridFS,
  getGridFSStream,
  getGridFSFileInfo,
  readGridFSBuffer,
  deleteFromGridFS,
};
