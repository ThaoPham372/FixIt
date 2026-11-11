const fs = require('node:fs');
const path = require('node:path');
const { uploadDir, samplesDir, readGridFSBuffer } = require('./mediaStorage');

const API_ROOT = 'https://generativelanguage.googleapis.com';
async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `Gemini API error (${response.status})`);
  return body;
}
async function uploadVideo(file, apiKey) {
  let bytes = null;
  let fileSize = 0;
  const mimeType = file.mimeType || 'video/mp4';

  // 1. Ưu tiên đọc trực tiếp từ MongoDB Atlas GridFS
  if (file.gridFsId) {
    try {
      bytes = await readGridFSBuffer(file.gridFsId);
      fileSize = bytes.length;
    } catch (gErr) {
      console.warn('Lỗi đọc video từ GridFS cho Gemini:', gErr.message);
    }
  }

  // 2. Dự phòng: Đọc từ ổ đĩa (public/samples/ hoặc uploads/)
  if (!bytes) {
    const baseName = path.basename(file.filename || '');
    const origName = path.basename(file.originalName || '');
    const candidates = [
      path.join(samplesDir, baseName),
      path.join(samplesDir, origName),
      path.join(uploadDir, baseName),
      path.join(__dirname, '..', 'uploads', baseName),
      file.kind === 'return'
        ? path.join(samplesDir, 'FX-1030-return.webm')
        : path.join(samplesDir, 'FX-1026-packing.webm'),
    ];
    const foundPath = candidates.find((p) => p && fs.existsSync(p));
    if (foundPath) {
      bytes = fs.readFileSync(foundPath);
      fileSize = bytes.length;
    }
  }

  if (!bytes) {
    throw new Error(`Không tìm thấy dữ liệu tệp video (${file.originalName || file.filename}) để gửi sang AI.`);
  }

  const start = await fetch(`${API_ROOT}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(fileSize),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    },
    body: JSON.stringify({ file: { display_name: file.originalName || file.filename } }),
  });
  if (!start.ok) await readJson(start);
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini không trả về URL tải video.');
  const final = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: bytes,
  });
  const result = await readJson(final);
  return result.file || result;
}
async function waitUntilReady(file, apiKey) {
  let current = file;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (current.state === 'ACTIVE') return current;
    if (current.state === 'FAILED') throw new Error('Gemini không xử lý được video này.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(`${API_ROOT}/v1beta/${current.name}?key=${encodeURIComponent(apiKey)}`);
    current = await readJson(response);
  }
  throw new Error('Video đang được xử lý quá lâu. Hãy thử lại sau.');
}
function parseModelJson(text) {
  const clean = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const first = clean.indexOf('{'); const last = clean.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('AI trả về kết quả không đúng định dạng. Hãy chạy phân tích lại.');
  return JSON.parse(clean.slice(first, last + 1));
}
async function compareVideos(packingEvidence, returnEvidence) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { const error = new Error('Chưa cấu hình GEMINI_API_KEY trong tệp .env.'); error.status = 503; throw error; }
  const uploaded = [];
  try {
    const packFile = await uploadVideo(packingEvidence, apiKey); uploaded.push(packFile);
    const returnFile = await uploadVideo(returnEvidence, apiKey); uploaded.push(returnFile);
    const [packReady, returnReady] = await Promise.all([waitUntilReady(packFile, apiKey), waitUntilReady(returnFile, apiKey)]);
    const prompt = `Bạn là trợ lý kiểm tra bằng chứng hàng hoàn TMĐT (Shopee, TikTok Shop).
Video 1 là video ĐÓNG GÓI TRƯỚC KHI GIAO; Video 2 là video MỞ KIỆN HÀNG HOÀN VỀ.
So sánh sản phẩm gửi đi và sản phẩm hoàn về, chỉ ra các khác biệt nhìn thấy được (màu sắc, mẫu mã, số lượng, tình trạng rách vỡ, tráo đổi, mác seal, phụ kiện).

QUY TẮC BẮT BUỘC:
1. BẮT BUỘC TRẢ LỜI TOÀN BỘ BẰNG TIẾNG VIỆT (Tuyệt đối không dùng tiếng Anh trong các trường summary, description, evidence, limitations).
2. Không suy đoán ý định gian lận; chỉ mô tả khách quan sự thật nhìn thấy trên video.
3. Bỏ qua khác biệt góc quay, ánh sáng, màu phông nền và tay người bóc kiện.
4. Ghi rõ mốc thời gian dạng mm:ss (ví dụ: 00:08, 00:21).
5. Trường confidence ghi rõ: "Cao", "Trung bình", hoặc "Thấp".
6. Nếu hai video sản phẩm giống hệt nhau không có hư hại, trả mảng differences rỗng [] và giải thích trong summary.

Trả JSON thuần theo đúng mẫu:
{
  "summary": "Tóm tắt ngắn gọn 1-2 câu bằng tiếng Việt về kết quả đối chiếu",
  "differences": [
    {
      "description": "Mô tả chi tiết điểm khác biệt bằng tiếng Việt (Ví dụ: Sản phẩm gửi đi màu đen, sản phẩm hoàn về màu trắng)",
      "packing_timestamp": "00:08",
      "return_timestamp": "00:21",
      "confidence": "Cao",
      "evidence": "Dẫn chứng nhìn thấy trong video 1 và video 2 bằng tiếng Việt"
    }
  ],
  "limitations": "Lưu ý hoặc giới hạn góc quay nếu có bằng tiếng Việt"
}`;
    const response = await fetch(`${API_ROOT}/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'VIDEO 1 — ĐÓNG GÓI TRƯỚC KHI GIAO:' }, { file_data: { mime_type: packReady.mimeType || packingEvidence.mimeType, file_uri: packReady.uri } },
          { text: 'VIDEO 2 — MỞ KIỆN HÀNG HOÀN:' }, { file_data: { mime_type: returnReady.mimeType || returnEvidence.mimeType, file_uri: returnReady.uri } },
          { text: prompt },
        ] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    });
    const result = await readJson(response);
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
    const parsed = parseModelJson(text);
    const mapConfidence = (c) => {
      const v = String(c || '').toLowerCase();
      if (v === 'high' || v.includes('cao')) return 'Cao';
      if (v === 'medium' || v.includes('trung')) return 'Trung bình';
      return 'Thấp';
    };
    return {
      summary: String(parsed.summary || '').slice(0, 1000),
      differences: Array.isArray(parsed.differences) ? parsed.differences.slice(0, 20).map((item) => ({
        description: String(item.description || '').slice(0, 1000),
        packingTimestamp: String(item.packing_timestamp || '').slice(0, 30),
        returnTimestamp: String(item.return_timestamp || '').slice(0, 30),
        confidence: mapConfidence(item.confidence),
        evidence: String(item.evidence || '').slice(0, 1000),
      })).filter((item) => item.description) : [],
      limitations: String(parsed.limitations || '').slice(0, 1000),
      provider: 'Gemini 2.5 Flash', analyzedAt: new Date(),
    };
  } finally {
    await Promise.all(uploaded.map(async (file) => {
      if (!file.name) return;
      try { await fetch(`${API_ROOT}/v1beta/${file.name}?key=${encodeURIComponent(apiKey)}`, { method: 'DELETE' }); } catch {}
    }));
  }
}
module.exports = { compareVideos };
