# Kora Electronics — Website Bán Hàng Đồ Điện Tử Full-Stack

Ứng dụng thương mại điện tử bán thiết bị điện tử chính hãng, xây dựng bằng **React + TypeScript + Tailwind CSS + Express.js + Drizzle ORM**.

## Các chức năng chính
- **Trang chủ & Danh mục sản phẩm**: Tìm kiếm theo tên/thương hiệu/SKU, lọc theo danh mục (`Laptop & Màn hình`, `Âm thanh`, `Điện thoại & Tablet`, `Phụ kiện & Đồng hồ`), sắp xếp theo giá.
- **Chi tiết sản phẩm (PDP)**: Xem thông số kỹ thuật chi tiết, tồn kho thực tế, đánh giá từ khách hàng đã đăng nhập.
- **Giỏ hàng & Thanh toán**: Giỏ hàng trượt ngang (Slide-over Drawer) đồng bộ với tài khoản khi đăng nhập, hỗ trợ thanh toán COD / Chuyển khoản / Ví điện tử, tự động trừ tồn kho theo transaction SQL và xuất hóa đơn xác nhận mã đơn (`KR-...`).
- **Tra cứu & Quản lý đơn hàng**: Khách hàng có thể xem lịch sử đơn hàng, hủy đơn chờ xác nhận (tự hoàn kho), hoặc tra cứu nhanh theo **Mã đơn + Số điện thoại**.
- **Xác thực Google (Firebase Auth)**: Đăng nhập an toàn qua Firebase ID Token.
- **Trang Quản trị (Admin)**: Thêm/sửa/xóa sản phẩm, quản lý trạng thái đơn hàng (`Chờ xác nhận` → `Đã xác nhận` → `Đang giao` → `Đã giao`), xem thống kê doanh thu & tồn kho.

## Cơ sở dữ liệu
- **Trên Cloud / AI Studio**: Chạy trực tiếp trên **Cloud SQL (PostgreSQL)** thông qua Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`).
- **Tải về chạy Local với MySQL**: Thư mục `database/` đã cung cấp sẵn file `database/mysql_schema.sql` và `database/mysql_seed.sql` chuẩn **MySQL 8.0** (InnoDB, utf8mb4) để bạn import trực tiếp vào MySQL Workbench / XAMPP / phpMyAdmin.

### Cách import MySQL khi tải về chạy local
```bash
mysql -u root -p < database/mysql_schema.sql
mysql -u root -p < database/mysql_seed.sql
```
