# Hướng dẫn chạy dự án (Tiếng Việt)

Tài liệu này mô tả cách cài đặt, chạy và luồng hoạt động chính của dự án NestJS trong workspace.

## Yêu cầu môi trường

- Node.js >= 18
- npm (hoặc yarn)
- MySQL nếu project cấu hình kết nối database (kiểm tra `ormconfig`/`.env`)

## Cài đặt

1. Cài các package:

```powershell
npm install
```

2. Tạo file cấu hình môi trường (nếu cần):

Ví dụ `env` tối giản (`.env` hoặc `.env.development`):

```
có thể copy phần .env.development qua .env để setup nhanhnhanh
```

## Chạy ứng dụng

- Chạy ở chế độ phát triển (watch):

```powershell
npm run start:dev
```

## Lint / Format

```powershell
npm run lint
npm run format
```

## Luồng hoạt động chính (Luồng request và authentication)

Ví dụ sequence (tóm tắt):

Client --> Controller --> JwtAuthGuard --> RoleBasedThrottlerGuard --> Controller --> Service --> DB

### Ghi chú về `RoleBasedThrottlerGuard`

- File guard: `src/auth/passport/throttler.guard.ts`
- Nó mở rộng `ThrottlerGuard` và override `getTracker` + `getLimit` để áp giới hạn theo role.
- Nếu muốn thay đổi TTL, mức giới hạn hoặc hành vi logging, chỉnh trong file `src/common/enum.ts` .

## Luồng hoạt động chi tiết của Access Token và Refresh Token

Dưới đây mô tả chi tiết lifecycle (vòng đời) và những điểm cần lưu ý cho access token và refresh token trong dự án.

1) Mục đích của mỗi token
	- Access token: token ngắn hạn (ví dụ 5 phút) dùng để xác thực các request đến API (được gửi trong header Authorization: Bearer ...).
	- Refresh token: token dài hạn (ví dụ 7 days) dùng để lấy access token mới khi access token hết hạn. Refresh token cần được bảo vệ hơn: nên lưu trên server (hash) và gửi cho client bằng cookie HttpOnly (để tránh XSS).

2) Phát hành token
	- Khi login thành công, server tạo:
	  - accessToken: payload đầy đủ (sub, username, role, iat, exp).
	  - refreshToken: chứa sub (user id) và expiry.
	- Server lưu refreshToken (hash) vào DB để có thể so sánh khi client gửi token để refresh.

3) Sử dụng access token
	- Client gửi header Authorization: Bearer <accessToken> trong các request.
	- `JwtStrategy` verify signature và expiry (secret là `JWT_ACCESS_SECRET`).
	- Nếu hợp lệ, `validate()` trả `req.user` để các controller/service sử dụng.

4) Refresh (xoay token / rotation)
	- Khi access token hết hạn, client gọi endpoint refresh (`POST /api/auth/refresh`) gửi refresh token (thông thường cookie HttpOnly sẽ tự gửi).
	- Server verify refresh token bằng `JWT_REFRESH_SECRET` và kiểm tra payload.sub.
	- Server so sánh refresh token (hoặc hash) với giá trị đã lưu trong DB cho user đó.
	- Nếu hợp lệ: server tạo access token mới và **một refresh token mới** (rotation). Cập nhật refresh token đã hash trong DB.
	- Lý do rotation: nếu refresh token bị đánh cắp và dùng lần đầu, sau lần dùng server đã thay đổi refresh token lưu trong DB, kẻ tấn công sẽ không thể dùng lại token cũ.

5) Xử lý lỗi và trường hợp bất thường
	- Refresh token hết hạn hoặc không hợp lệ: trả 401 — yêu cầu user đăng nhập lại.

6) Lưu trữ ở client
	- Access token: lưu ở memory (ví dụ state) hoặc secure storage; tránh localStorage nếu có nguy cơ XSS.
	- Refresh token: tốt nhất dùng cookie `httpOnly` và `secure` (không thể đọc từ JS).

7) Best practices áp dụng trong dự án này
	- Access token ngắn hạn + refresh token dài hạn và rotation.
	- Lưu refresh token dạng hash trong DB (code mẫu trong `AuthService`/`AccountService`).
	- Cookie refresh token httpOnly + secure + sameSite.
	- Khi logout: xóa refresh token trên DB và clear cookie.

