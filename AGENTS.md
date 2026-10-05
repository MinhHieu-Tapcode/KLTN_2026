# NGUYÊN TẮC PHÁT TRIỂN & QUY TẮC LÀM VIỆC VỚI AI (AGENTS.MD)
**Dự án: Hệ thống LMS Công ty Cổ phần SIMPACE Việt Nam**

---

## 1. NGUYÊN TẮC CỐT LÕI: THẢO LUẬN & THIẾT KẾ TRƯỚC KHI CODE

Dự án được xây dựng theo tinh thần **Đồng sáng tạo (Collaborative Co-creation)** giữa nhóm sinh viên MIS và AI Coding Assistant. AI tuyệt đối không tự động sinh hàng loạt code khi chưa có sự thống nhất từ nhóm:

1. **Tiến hành theo từng Module ưu tiên:**
   * Không ôm đồm toàn bộ hệ thống cùng lúc. Nhóm sẽ chọn 1 module ưu tiên (ví dụ: *Module Xác thực & Quản lý người dùng*).
2. **Quy trình 3 bước cho mỗi Module:**
   * **Bước 1 - Thảo luận Luồng nghiệp vụ (Workflow & User Flow):** Phân tích xem người dùng (Admin, GV, HV) sẽ thao tác như thế nào, có những ca biên (edge cases) nào cần chú ý.
   * **Bước 2 - Thiết kế CSDL từ đầu (Incremental DB Modeling):** Cùng nhau định nghĩa từng bảng, từng cột, kiểu dữ liệu và mối quan hệ khóa ngoại trong `schema.prisma`.
   * **Bước 3 - Hiện thực hóa (Implementation):** Khi CSDL đã chốt, mới bắt đầu code Server Actions và giao diện UI tương ứng.

---

## 2. ĐỊNH HƯỚNG CÔNG NGHỆ CHUẨN (TECH STACK)
* **Framework:** Next.js 14+ (App Router), 100% TypeScript.
* **Tương tác Backend:** Next.js Server Actions (`'use server'`).
* **Cơ sở dữ liệu:** PostgreSQL (Supabase) + Prisma ORM.
* **Giao diện:** Tailwind CSS + shadcn/ui.
* **Dịch vụ AI dự kiến:** Groq Cloud API (LLaMA 3 + Whisper v3) + Dự phòng Google Gemini.

---

## 3. NGUYÊN TẮC GIAO DIỆN & PHÂN QUYỀN
* **100% Tiếng Việt:** Toàn bộ form, thông báo, nhãn nút bấm sử dụng tiếng Việt thân thiện, chuẩn giáo dục.
* **Bảo vệ dữ liệu:** Ưu tiên cơ chế Xóa mềm (`isActive: false`) để bảo vệ lịch sử học tập.
* **Kiểm soát vai trò:** Luôn đối chiếu quyền của người dùng (Admin, Teacher, TA, Student) trước khi thực hiện thao tác.
