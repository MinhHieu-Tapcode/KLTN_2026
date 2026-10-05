# CẤU TRÚC THƯ MỤC CHUẨN DỰ ÁN (PROJECT STRUCTURE)
**Dự án: LMS SIMPACE Việt Nam (Next.js App Router Full-stack)**

Dưới đây là sơ đồ cây thư mục hoàn chỉnh, được tổ chức theo kiến trúc **Modern 3-Tier / Component-Driven**, giúp AI và nhóm phát triển dễ dàng định vị vị trí code:

```text
lms-simpace/
│
├── .antigravity/                   # Cấu hình tự động cho AI Antigravity
│   └── rules/
│       └── lms-rules.md            # Luật dự án nạp tự động vào bộ não AI
│
├── prisma/                         # TẦNG DỮ LIỆU (DATA TIER)
│   └── schema.prisma               # Toàn bộ thiết kế CSDL (Models, Relations, Enums)
│
├── public/                         # Tài nguyên tĩnh
│   ├── logo-simpace.png            # Logo thương hiệu SIMPACE
│   └── templates/
│       └── mau_nhap_hoc_vien.xlsx  # File mẫu Excel để tải về nhập hàng loạt
│
├── src/
│   ├── app/                        # TẦNG GIAO DIỆN & ĐỊNH TUYẾN (PRESENTATION TIER)
│   │   ├── (auth)/                 # Nhóm trang không cần đăng nhập
│   │   │   ├── login/              # Trang đăng nhập "Một cửa" duy nhất
│   │   │   │   └── page.tsx
│   │   │   └── forgot-password/    # Trang khôi phục mật khẩu
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/            # Nhóm trang quản trị làm việc (Cần đăng nhập)
│   │   │   ├── layout.tsx          # Khung giao diện chung (Sidebar, Header, Avatar người dùng)
│   │   │   │
│   │   │   ├── admin/              # KHU VỰC DÀNH RIÊNG CHO QUẢN TRỊ VIÊN
│   │   │   │   ├── users/          # Quản lý người dùng, Import Excel 4.000 users
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── courses/        # Quản lý danh mục khóa học
│   │   │   │   │   └── page.tsx
│   │   │   │   └── ai-analytics/   # Báo cáo giám sát chất lượng AI, khiếu nại của học viên
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── teacher/            # KHU VỰC DÀNH CHO GIÁO VIÊN & TRỢ GIẢNG
│   │   │   │   ├── classes/        # Quản lý các lớp đang phụ trách
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [classId]/  # Chi tiết 1 lớp học
│   │   │   │   ├── assignments/    # Giao bài tập & Chấm bài (Duyệt bản nháp AI)
│   │   │   │   │   └── page.tsx
│   │   │   │   └── quizzes/        # Tạo đề thi trắc nghiệm & Ngân hàng câu hỏi
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   └── student/            # KHU VỰC DÀNH CHO HỌC VIÊN
│   │   │       ├── my-courses/     # Danh sách môn học / lớp học đang theo
│   │   │       │   └── page.tsx
│   │   │       ├── assignments/    # Nộp bài tập (Upload file / Ghi âm bài nói)
│   │   │       │   └── page.tsx
│   │   │       └── quiz/           # Giao diện làm bài thi trắc nghiệm bấm giờ
│   │   │           └── [quizId]/
│   │   │               └── page.tsx
│   │   │
│   │   ├── api/                    # Cổng API dự phòng phục vụ xuất dữ liệu báo cáo
│   │   │   └── health/
│   │   │       └── route.ts
│   │   │
│   │   ├── globals.css             # Cấu hình Tailwind CSS & Bảng màu SIMPACE
│   │   └── layout.tsx              # Root Layout của toàn bộ ứng dụng
│   │
│   ├── actions/                    # TẦNG NGHIỆP VỤ (BUSINESS LOGIC TIER - SERVER ACTIONS)
│   │   ├── auth.ts                 # Xử lý đăng nhập, cấp HttpOnly Cookie, đăng xuất
│   │   ├── user.ts                 # CRUD người dùng, Xử lý Import Excel theo mẻ
│   │   ├── class.ts                # Quản lý lớp học, phân công giáo viên, thêm học viên
│   │   ├── assignment.ts           # Giao bài, Nộp bài lên Cloud Storage, Chấm điểm
│   │   ├── quiz.ts                 # Lưu bài thi, Đếm ngược thời gian, Tự động tính điểm
│   │   └── ai.ts                   # Tích hợp Groq API (LLaMA 3.3 giải thích bài + Whisper v3 transcript audio)
│   │
│   ├── components/                 # CÁC THÀNH PHẦN GIAO DIỆN TÁI SỬ DỤNG
│   │   ├── ui/                     # Các khối chuẩn shadcn/ui (Button, Dialog, Table, Form, Input...)
│   │   ├── layout/                 # Sidebar, Navbar, UserDropdown
│   │   ├── users/                  # Bảng UserTable, Modal Thêm người dùng, Modal Import Excel
│   │   ├── quiz/                   # QuizTimer (Đồng hồ đếm ngược), QuestionCard, QuizGridNav
│   │   └── ai/                     # Khung giải thích bẫy sai của AI, Hộp thoại Micro-Q&A
│   │
│   ├── lib/                        # THƯ VIỆN & CẤU HÌNH CHUNG
│   │   ├── prisma.ts               # Khởi tạo kết nối Prisma Client duy nhất (Singleton)
│   │   ├── groq.ts                 # Cấu hình Groq SDK
│   │   ├── supabase-storage.ts     # Hàm upload file/audio lên Supabase Storage
│   │   └── utils.ts                # Các hàm tiện ích (format ngày tháng, định dạng điểm)
│   │
│   ├── types/                      # ĐỊNH NGHĨA KIỂU DỮ LIỆU TYPESCRIPT
│   │   └── index.ts                # UserRole enum, Session payload, Quiz types
│   │
│   └── middleware.ts               # TẦNG BẢO VỆ ROUTING (Chặn học viên vào trang Admin/Teacher)
│
├── .env.example                    # File mẫu các biến môi trường (DATABASE_URL, GROQ_API_KEY)
├── AGENTS.md                       # Hướng dẫn chi tiết nguyên tắc làm việc với AI
├── PROJECT_BLUEPRINT.md            # Tài liệu phân tích thiết kế tổng thể hệ thống
├── PROJECT_STRUCTURE.md            # Bản đồ cây thư mục (File này)
└── package.json                    # Khai báo các thư viện phụ thuộc của dự án
```
