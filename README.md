# 🎓 SIMPACE LMS - HỆ THỐNG QUẢN LÝ ĐÀO TẠO TIẾNG ANH LIÊN KẾT

> **Đồ án Khóa luận tốt nghiệp ngành Hệ thống thông tin quản lý (MIS) - 2026**  
> **Đơn vị hợp tác nghiên cứu & áp dụng:** Công ty Cổ phần SIMPACE Việt Nam

---

## 📌 1. Giới thiệu Dự án
Hệ thống LMS chuyên biệt phục vụ công tác tổ chức, đào tạo và quản lý chất lượng các chương trình Tiếng Anh liên kết (IELTS, SAT, Cambridge) giữa **SIMPACE Việt Nam** và các trường THPT/THCS đối tác (tiêu biểu như THPT Trương Định, THPT Phúc Lợi,...).

---

## 🚀 2. Công nghệ sử dụng (Tech Stack)
* **Framework:** [Next.js 14+](https://nextjs.org/) (App Router, Server Actions)
* **Ngôn ngữ:** 100% [TypeScript](https://www.typescriptlang.org/)
* **Cơ sở dữ liệu:** PostgreSQL ([Supabase](https://supabase.com/))
* **ORM:** [Prisma ORM 5.x](https://www.prisma.io/)
* **Styling & UI Components:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
* **Gửi Email tự động:** [Nodemailer](https://nodemailer.com/) (Gmail SMTP với Mã ứng dụng 2 lớp)
* **Xử lý dữ liệu bảng tính:** [SheetJS (xlsx)](https://sheetjs.com/)

---

## ✨ 3. Tính năng cốt lõi (Sprint 1 - Core LMS)
1. **Xác thực & Bảo mật đa tầng (Authentication):**
   * Đăng nhập với cơ chế Session JWT an toàn.
   * Kích hoạt tài khoản lần đầu qua email và mã OTP 6 chữ số gửi trực tiếp về hộp thư Gmail.
   * Khôi phục mật khẩu thông qua xác thực OTP qua email.
2. **Phân quyền người dùng động (Dynamic RBAC Matrix):**
   * Hỗ trợ 5 vai trò hệ thống: Quản trị viên (`ADMIN`), Quản nhiệm (`SCHOOL_MANAGER`), Giáo viên (`TEACHER`), Trợ giảng (`TEACHING_ASSISTANT`), Học sinh (`STUDENT`).
   * Bảng ma trận phân quyền trực quan cho phép Admin bật/tắt quyền hoặc thêm module mới trực tiếp trên giao diện mà không cần sửa mã nguồn.
3. **Quản lý Trường học đối tác:**
   * Quản lý danh sách trường, phân công Quản nhiệm phụ trách từng trường.
   * Cơ chế xóa mềm (`isActive: false`) bảo vệ an toàn lịch sử dữ liệu.
4. **Quản lý Lớp học & Thời khóa biểu:**
   * Tạo lớp, cấu hình lịch học (Thứ/Giờ), thời gian khóa học (Ngày bắt đầu - kết thúc).
   * Phân công Giáo viên và Trợ giảng cho từng lớp học.
   * Lọc và hiển thị thời khóa biểu chính xác theo quyền của từng người dùng.
5. **Import / Export dữ liệu Excel:**
   * Nhập hàng loạt danh sách học sinh và phân lớp tự động qua file Excel.
   * Kiểm tra lỗi định dạng, xuất báo cáo danh sách dòng bị từ chối kèm lý do.

---

## 🛠️ 4. Hướng dẫn cài đặt & Khởi chạy cục bộ (Local Development)

### Yêu cầu tiên quyết
* Node.js version 18.x hoặc 20.x trở lên.
* Trình quản lý gói `npm`.

### Các bước cài đặt
```bash
# 1. Clone repository
git clone https://github.com/MinhHieu-Tapcode/KLTN_2026.git
cd KLTN_2026

# 2. Cài đặt các gói thư viện
npm install

# 3. Cấu hình biến môi trường
# Tạo file .env dựa trên mẫu .env.example và điền thông tin Supabase & Gmail SMTP:
cp .env.example .env

# 4. Sinh Prisma Client và đồng bộ CSDL
npx prisma generate
npx prisma db push

# 5. Khởi chạy máy chủ phát triển
npm run dev
```

Truy cập hệ thống tại: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 5. Thành viên phát triển
* **Sinh viên thực hiện:** Nhóm sinh viên ngành Hệ thống Thông tin Quản lý (MIS)
* **Người phụ trách Repo:** [@MinhHieu-Tapcode](https://github.com/MinhHieu-Tapcode)
