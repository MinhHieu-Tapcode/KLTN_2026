# TÀI LIỆU ĐỀ XUẤT Ý TƯỞNG HỆ THỐNG LMS SIMPACE VIỆT NAM
**(DRAFT CONCEPT & WORKING PROPOSAL - BẢN DỰ THẢO Ý TƯỞNG)**

> ⚠️ **LƯU Ý QUAN TRỌNG:** 
> Đây là **bản đề xuất ý tưởng ban đầu (Working Draft)** được tổng hợp từ định hướng của thành viên trong nhóm, phục vụ làm cơ sở để nhóm thảo luận, phản biện và thống nhất trước khi chốt chính thức. Các quy trình, luồng hoạt động và mô hình CSDL sẽ được hoàn thiện dần theo từng Sprint.

---

## 1. BỐI CẢNH & ĐỊNH HƯỚNG CHUNG
* **Đề tài:** Phân tích, thiết kế và xây dựng hệ thống LMS cho Công ty Cổ phần SIMPACE Việt Nam.
* **Mục tiêu:** Đồ án tốt nghiệp chuyên ngành **Hệ thống Thông tin Quản lý (MIS)**.
* **Thời gian dự kiến:** Khoảng 1 tháng triển khai theo mô hình **Agile** (chia nhỏ theo từng module ưu tiên, làm chắc và chạy được từng phần).
* **Đội ngũ:** Nhóm 3 sinh viên MIS phối hợp cùng AI Coding Assistant.

---

## 2. Ý TƯỞNG PHÂN QUYỀN BAN ĐẦU (ĐANG THẢO LUẬN)
Hệ thống dự kiến phục vụ 4 nhóm đối tượng:
1. **Quản trị viên (ADMIN):** Quản lý tài khoản toàn hệ thống, danh mục khóa học, giám sát vận hành.
2. **Giáo viên (TEACHER):** Quản lý lớp học, chia sẻ tài liệu, giao bài tập, tạo bài kiểm tra trắc nghiệm, chấm điểm.
3. **Trợ giảng (TA):** Hỗ trợ giáo viên điểm danh, chấm bài tập, giải đáp thắc mắc của học viên.
4. **Học viên (STUDENT):** Xem tài liệu, nộp bài tập, làm bài kiểm tra trắc nghiệm, theo dõi điểm số cá nhân.

*(Quy định phân quyền chi tiết cho từng nút bấm / màn hình sẽ được nhóm chốt cụ thể khi bắt tay vào từng module).*

---

## 3. Ý TƯỞNG CÁC MODULE NGHIỆP VỤ DỰ KIẾN (THEO MỨC ĐỘ ƯU TIÊN)

### Nhóm 1: Các Module nền tảng (Cần hoàn thiện trước)
* **Module Xác thực & Quản lý Người dùng:**
  * Đăng nhập một cửa cho mọi vai trò.
  * CRUD người dùng (đề xuất dùng xóa mềm `isActive` để giữ lịch sử).
  * Ý tưởng nhập danh sách học viên hàng loạt qua file Excel (phù hợp quy mô trung tâm đào tạo).
* **Module Khóa học & Lớp học:**
  * Danh mục khóa học (Course) và các lớp học thực tế (Class).
  * Phân công giáo viên/trợ giảng và ghi danh học viên vào lớp.

### Nhóm 2: Các Module nghiệp vụ học tập cốt lõi
* **Module Tài liệu & Bài tập nộp file:**
  * Giáo viên đăng tải giáo trình/bài giảng.
  * Giao bài tập về nhà có hạn nộp -> Học viên nộp file -> Giáo viên/Trợ giảng chấm điểm và nhận xét.
* **Module Kiểm tra trắc nghiệm (Quiz Engine):**
  * Tạo ngân hàng câu hỏi, cấu hình đề thi có bấm giờ.
  * Học viên làm bài với đồng hồ đếm ngược -> Tự động tính điểm sau khi nộp.

### Nhóm 3: Ý tưởng mở rộng tính năng AI (Thực hiện khi phần lõi đã ổn định)
* **AI Giải thích bài giải (AI Tutor):** Hỗ trợ học viên phân tích bẫy sai của các câu trắc nghiệm (Distractor Analysis) thay vì chỉ đọc đáp án đúng.
* **AI Speech-to-Text & Feedback bài nói:** Dùng AI (như Groq Whisper) hỗ trợ transcript bài nói tiếng Anh của học viên và gợi ý bản nháp nhận xét để Giáo viên kiểm duyệt (Human-in-the-Loop).
* **Dashboard Giám sát chất lượng AI:** Theo dõi đánh giá của học viên và các câu hỏi cần chuyển tiếp cho giáo viên giải đáp.

---

## 4. ĐỊNH HƯỚNG CÔNG NGHỆ ĐỀ XUẤT (TECH STACK)
* **Kiến trúc:** Full-stack Next.js (App Router) - Kiến trúc 3 tầng (Presentation - Server Actions - Database).
* **Ngôn ngữ:** TypeScript.
* **Cơ sở dữ liệu:** PostgreSQL (Supabase) + Prisma ORM.
* **Giao diện:** Tailwind CSS + shadcn/ui.
* **Dịch vụ AI dự kiến:** Groq Cloud API (hỗ trợ LLaMA 3 cho Text và Whisper cho Audio) + Dự phòng Google Gemini API.

---

## 5. KẾ HOẠCH BƯỚC TIẾP THEO
Nhóm sẽ cùng AI trao đổi trong các cuộc trò chuyện mới theo trình tự:
1. **Thảo luận luồng hoạt động (User Flow / Workflow)** của từng module ưu tiên (bắt đầu từ Auth & Quản lý người dùng).
2. **Cùng nhau thiết kế CSDL (ERD / Prisma Schema)** từ đầu cho từng bảng một cách cẩn thận và thực tế.
3. Sau khi chốt CSDL mới tiến hành sinh mã nguồn (code) cho module đó.
