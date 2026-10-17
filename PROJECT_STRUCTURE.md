# CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)
**Dự án: LMS SIMPACE Việt Nam (Next.js App Router, full-stack)**

> File này gồm 2 phần: **(A) cấu trúc HIỆN TẠI** (đúng với code đang có) và **(B) cấu trúc MỤC TIÊU** (đích đến khi tách dần, chưa hiện thực). AI chỉ coi phần A là sự thật; phần B là định hướng, tách đến đâu cập nhật phần A đến đó.

---

## A. CẤU TRÚC HIỆN TẠI

```text
KLTN_2026/
├── prisma/schema.prisma        # Toàn bộ CSDL (18 model: Role, User, UserProfile, PasswordResetToken,
│                               #   School, Class, ClassAssignment, ClassEnrollment, ImportLog,
│                               #   SystemPermission, IeltsLevel, MaterialFolder, LearningMaterial,
│                               #   Assignment, AssignmentQuestion, QuestionOption,
│                               #   AssignmentSubmission, SubmissionAnswer)
├── public/                     # Tài nguyên tĩnh (logo.png)
├── scripts/                    # Script chạy tay: seed_*.ts, test_*.ts, fix_*.ts (không thuộc app)
├── src/
│   ├── app/                    # Chỉ có layout.tsx, page.tsx, globals.css; thư mục api/ đang trống
│   │   └── page.tsx            # Điểm vào duy nhất, render <SimpaceApp />
│   ├── actions/                # Server Actions ('use server'), hiện trộn action + nghiệp vụ + Prisma
│   │   ├── auth.ts             # Đăng nhập, đăng xuất, quên/đặt lại mật khẩu
│   │   ├── users.ts            # Người dùng
│   │   ├── schools.ts          # Trường học
│   │   ├── classes.ts          # Lớp học, phân công GV/TA, ghi danh
│   │   ├── ielts-levels.ts     # Cấu hình cấp độ IELTS
│   │   ├── bulk-allocation.ts  # Phân lớp hàng loạt
│   │   ├── permissions.ts      # Phân quyền tùy chỉnh (SystemPermission)
│   │   ├── materials.ts        # Học liệu (folder tree)
│   │   └── assignments.ts      # Bài tập, nộp bài, chấm (có dữ liệu demo in-memory)
│   ├── components/
│   │   ├── simpace-app.tsx     # SPA toàn bộ giao diện, chuyển màn bằng state (RẤT LỚN, ~10.500 dòng)
│   │   ├── assignments/        # class-assignments-tab.tsx
│   │   ├── materials/          # class-materials-tab.tsx, global-materials-view.tsx
│   │   ├── ui/                 # badge, button, dialog, input, label, sheet (shadcn)
│   │   └── logo.tsx
│   └── lib/
│       ├── prisma.ts           # Prisma client + isDbAlive
│       ├── auth.ts             # Session (getSession)
│       ├── permissions.ts      # Kiểm tra quyền (dùng chung)
│       ├── schedule.ts         # Xử lý lịch học, trùng lịch
│       ├── mail.ts             # Gửi email
│       └── utils.ts
├── AGENTS.md                   # Luật làm việc với AI (nguồn luật duy nhất)
├── PROJECT_STRUCTURE.md        # File này
├── PROJECT_BLUEPRINT.md        # Ý tưởng và định hướng tổng thể
├── KE_HOACH_TRIEN_KHAI_HOC_LIEU_VA_BAI_TAP.md   # Thiết kế module học liệu và bài tập
├── lovable-design/             # Prototype giao diện tham khảo, KHÔNG phải code chính
└── scratch/                    # Thư mục nháp, AI không đọc/sửa
```

### Điểm cần biết khi làm việc với code hiện tại
- Ứng dụng là **một trang duy nhất** (`page.tsx` → `SimpaceApp`), không có route theo vai trò. Điều hướng bằng state `View` trong `simpace-app.tsx`.
- `simpace-app.tsx` chứa khoảng 40 component (Login, Users, Schools, Classes, ClassDetail, Schedule, Settings, các Dialog/Modal). **Không thêm code mới vào file này**, hãy tạo file mới và import vào.
- `assignments.ts` (~1.650 dòng) và các action khác chưa tách `service`. Khi sửa, giữ nguyên hành vi, không tự refactor.
- Chưa có test tự động. Kiểm tra bằng `npx tsc --noEmit`, `npm run lint` và test tay.

---

## B. CẤU TRÚC MỤC TIÊU (định hướng, chưa hiện thực)

Chia theo **tính năng (feature)**, mỗi tính năng tự chứa các tầng của nó:

```text
src/
├── app/                        # Route mỏng, chỉ ghép UI
├── features/
│   ├── users/       { components/, actions.ts, service.ts, schema.ts (zod), types.ts }
│   ├── schools/
│   ├── classes/                # ClassDetail tách theo tab: info/, materials/, assignments/
│   ├── schedule/
│   ├── materials/
│   └── assignments/
├── components/ui/              # shadcn dùng chung
└── lib/                        # prisma, auth, permissions (một chỗ duy nhất), utils
docs/
└── flows/<module>.md           # Luồng nghiệp vụ, ca biên, ma trận quyền
```

Quy ước tầng (xem chi tiết ở `AGENTS.md`, mục 3):
- `actions.ts`: session, quyền, zod, gọi service, `revalidatePath`. Không chứa Prisma.
- `service.ts`: nghiệp vụ và Prisma. Không đọc session.
- `components/`: giao diện, mỗi file dưới khoảng 300 dòng.

### Thứ tự tách đề xuất (mỗi lần một module, một commit, không đổi hành vi)
1. Các `Dialog/Modal` và component nhỏ dùng chung trong `simpace-app.tsx`.
2. Module Trường học → Người dùng → Lớp học → Lịch → Cài đặt.
3. Tách `service` ra khỏi các action lớn, bắt đầu từ `assignments.ts`.
