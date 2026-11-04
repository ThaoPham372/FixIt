# FixIt MVP

MVP quản lý vận hành bán hàng và xử lý hàng hoàn. Backend Node.js + Express + Mongoose; MongoDB lưu đơn hàng, trạng thái, metadata video/ảnh và bản nháp khiếu nại. Video/ảnh được lưu trong thư mục `uploads/` trên máy chạy server.

## Chạy cục bộ

1. Cài Node.js và MongoDB Community Server, khởi động MongoDB.
2. Sao chép `.env.example` thành `.env`; cấu hình `MONGODB_URI` nếu MongoDB không chạy ở địa chỉ mặc định.
3. Chạy `npm install`, rồi `npm start`.
4. Mở http://localhost:3000. Khi collection còn trống, app tạo ba đơn hàng minh họa.

Dùng `npm run dev` để tự khởi động lại server khi sửa mã.

## Luồng đã có

- Sidebar: tổng quan, đơn hàng, sản phẩm, kho, gian hàng, hàng hoàn, video đóng gói, khiếu nại, báo cáo và cài đặt.
- Tạo/tra cứu đơn và cập nhật trạng thái.
- Xác nhận đơn → quét/nhập mã → xin quyền camera → ghi video đóng gói → tải video lên và gắn với đơn.
- Tìm video đóng gói theo mã đơn.
- Nhập hàng hoàn theo mã → ghi video mở kiện → ghép video trước/sau → người bán nhập điểm khác biệt và tải ảnh → tạo bản nháp khiếu nại.
- API xem danh sách đơn, video và bản nháp khiếu nại.

## Giới hạn MVP

- TikTok Shop/Shopee chưa kết nối API; đơn được nhập thủ công hoặc từ dữ liệu mẫu.
- Có thể bật phân tích video bằng Gemini 2.5 Flash nếu cấu hình `GEMINI_API_KEY` trong `.env`. Kết quả gồm các khác biệt quan sát được, timestamp gần đúng và mức tin cậy; người bán phải kiểm tra/chọn trước khi tạo nháp khiếu nại. Không có khóa thì người bán vẫn nhập điểm khác biệt và ảnh thủ công.
- Chưa gửi khiếu nại lên sàn; chỉ lưu bản nháp để người bán hoàn thiện trên Seller Center.
- Xác thực người dùng, phân quyền, lưu trữ đám mây, sao lưu, hạn mức dung lượng và bảo vệ dữ liệu cá nhân cần bổ sung trước khi dùng với khách thật.
- Camera yêu cầu HTTPS hoặc `localhost`, và trình duyệt cần được cấp quyền. Loại video phụ thuộc khả năng MediaRecorder của trình duyệt.
- Tệp video không nằm trong MongoDB; MongoDB lưu metadata và liên kết. Bản MVP lưu tệp local. Với triển khai nhiều máy, chuyển tệp sang object storage và lưu URL/metadata trong MongoDB.

## Cấu trúc

- `server.js`, `app.js` — khởi động và lắp ứng dụng Express.
- `models/`, `controllers/`, `routes/` — MVC cho dữ liệu và API.
- `public/index.html`, `public/js/app.js` — giao diện và điều phối luồng.
- `public/js/components/` — modal, camera và bảng đơn dùng lại.
- `.env.example` — cấu hình môi trường mẫu.


## Cấu trúc MVC và UI components

- `models/` — Mongoose models `Order`, `Claim`.
- `controllers/` — xử lý request/response và nghiệp vụ đơn, bằng chứng, khiếu nại.
- `routes/` — khai báo REST endpoints.
- `services/` — lưu trữ media và upload config.
- `config/` — kết nối MongoDB.
- `app.js`, `server.js` — lắp routes, middleware và khởi động ứng dụng.
- `public/js/components/` — component dùng lại `FixItModal`, `MediaCapture`, `fixit-order-table`.

Khi bấm Phân tích bằng AI, video đóng gói và video mở kiện được gửi đến Gemini; khóa API chỉ nằm ở backend. Files API của Gemini lưu tệp tạm tối đa 48 giờ; ứng dụng yêu cầu xóa ngay sau phân tích. Ở free tier, nội dung có thể được dùng để cải thiện sản phẩm; giao diện hiển thị thông báo này trước khi gửi. Kiểm tra chính sách dữ liệu và giới hạn hiện tại trước khi dùng với dữ liệu người mua thật.

Nút Hủy trong camera dừng MediaRecorder, giải phóng các camera tracks và bỏ kết quả đang quay. Đóng modal bằng Escape hoặc nhấp nền cũng chạy cleanup; nếu yêu cầu quyền camera còn đang chờ, phiên đó bị vô hiệu để camera không tự bật sau khi modal đã đóng.
