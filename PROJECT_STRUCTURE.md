# CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)
**Dự án: LMS SIMPACE Việt Nam (Next.js App Router, full-stack)**

> File này gồm 2 phần: **(A) cấu trúc HIỆN TẠI** (đúng với code đang có sau khi tái cấu trúc) và **(B) cấu trúc MỤC TIÊU** (định hướng mở rộng tiếp theo).

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
├── scripts/
│   └── test-core-flows.ts      # Bộ 18 bài test tự động cho lịch học, phân lớp IELTS, RBAC, chấm điểm
├── docs/
│   ├── HANDOFF.md              # Tài liệu bàn giao tiến độ giữa các phiên AI
│   └── flows/
│       └── pdf-to-quiz-ocr.md  # Đặc tả luồng bóc tách đề IELTS từ PDF + Excel đáp án
├── src/
│   ├── app/                    # layout.tsx, page.tsx, globals.css
│   │   └── page.tsx            # Điểm vào duy nhất, render <SimpaceApp />
│   ├── actions/                # Server Actions ('use server')
│   │   ├── auth.ts             # Đăng nhập, đăng xuất, quên/đặt lại mật khẩu
│   │   ├── users.ts            # Người dùng
│   │   ├── schools.ts          # Trường học
│   │   ├── classes.ts          # Lớp học, phân công GV/TA, ghi danh
│   │   ├── ielts-levels.ts     # Cấu hình cấp độ IELTS
│   │   ├── bulk-allocation.ts  # Phân lớp IELTS hàng loạt từ Excel
│   │   ├── permissions.ts      # Phân quyền tùy chỉnh (SystemPermission)
│   │   ├── materials.ts        # Học liệu (folder tree)
│   │   └── assignments.ts      # Điều phối bài tập, nộp bài, chấm điểm (gọi tầng services/)
│   ├── services/               # Tầng nghiệp vụ + Prisma (không đọc session, không import UI)
│   │   ├── assignment.service.ts   # Nghiệp vụ & truy vấn Prisma cho bài tập, nộp bài, chấm điểm
│   │   └── ielts-parser.service.ts # Nghiệp vụ bóc tách đề thi IELTS & dữ liệu mẫu 4 kỹ năng
│   ├── components/
│   │   ├── simpace-app.tsx     # Khung điều phối SPA (~870 dòng, đã tách các màn hình con)
│   │   ├── auth/               # login-screen.tsx, force-change-password-screen.tsx
│   │   ├── dashboard/          # overview-page-view.tsx, global-assignments-view.tsx
│   │   ├── schools/            # schools-page-view.tsx, school-dialog.tsx, school-edit-dialog.tsx,
│   │   │                       #   school-detail-drawer.tsx, school-classes-modal.tsx,
│   │   │                       #   school-class-submodals.tsx, school-upsert-modals.tsx
│   │   ├── classes/            # classes-page-view.tsx, classes-page-modals.tsx, class-dialog.tsx,
│   │   │                       #   class-edit-dialog.tsx, class-detail-view.tsx, class-detail-modals.tsx
│   │   ├── users/              # users-page-view.tsx, user-edit-modal.tsx, user-dialog.tsx,
│   │   │                       #   single-user-tab.tsx, bulk-ielts-wizard.tsx, bulk-allocation-preview.tsx,
│   │   │                       #   user-edit-dialog.tsx, user-detail-drawer.tsx, account-created-dialog.tsx
│   │   ├── schedule/           # schedule-page-view.tsx
│   │   ├── import/             # import-page-view.tsx
│   │   ├── settings/           # settings-page-view.tsx
│   │   ├── shared/             # common-widgets.tsx (Field, Badge, Status, InfoCard, ConfirmDialog...)
│   │   ├── assignments/        # class-assignments-tab.tsx
│   │   ├── materials/          # class-materials-tab.tsx, global-materials-view.tsx
│   │   ├── ui/                 # badge, button, dialog, input, label, sheet (shadcn)
│   │   └── logo.tsx
│   └── lib/
│       ├── prisma.ts           # Prisma client + isDbAlive
│       ├── auth.ts             # Session (getSession)
│       ├── permissions.ts      # Kiểm tra quyền dùng chung (checkAuth, checkRole, hasFeatureAccess...)
│       ├── grading.ts          # Hàm thuần chấm điểm tự động (isAnswerCorrect, isObjectiveType...)
│       ├── schedule.ts         # Xử lý lịch học, kiểm tra xung đột lịch
│       ├── mail.ts             # Gửi email
│       └── utils.ts
├── .eslintrc.json              # Cấu hình ESLint chuẩn Next.js
├── AGENTS.md                   # Luật làm việc với AI (nguồn luật duy nhất)
├── PROJECT_STRUCTURE.md        # File này
├── PROJECT_BLUEPRINT.md        # Ý tưởng và định hướng tổng thể
├── lovable-design/             # Prototype giao diện tham khảo, KHÔNG phải code chính
└── scratch/                    # Thư mục nháp, AI không đọc/sửa
```

### Điểm cần biết khi làm việc với code hiện tại
- Ứng dụng điều hướng qua state `View` trong `src/components/simpace-app.tsx` (~870 dòng), các màn hình đã được chia về đúng thư mục theo nghiệp vụ trong `src/components/`.
- Phân quyền tập trung tại `src/lib/permissions.ts` (lưu ý: file này được import ở cả client qua `DEFAULT_PERMISSIONS`, nên không được import `next/headers` hay `@/lib/prisma` ở runtime).
- Module Bài tập đã tách chuẩn 3 tầng: `src/actions/assignments.ts` -> `src/services/assignment.service.ts` + `src/services/ielts-parser.service.ts`.
- Kiểm tra tự động sau mỗi lần sửa: `npx tsc --noEmit` và `npx tsx scripts/test-core-flows.ts`.

---

## B. CẤU TRÚC MỤC TIÊU (định hướng mở rộng tiếp theo)

1. Tiếp tục tách tầng `service` cho các action còn lại (`users.ts`, `classes.ts`, `schools.ts`, `materials.ts`) khi có yêu cầu sửa đổi vào các module đó.
2. Tách nhỏ tiếp 3 file giao diện có sẵn từ trước nếu cần chỉnh sửa sâu:
   - `src/components/assignments/class-assignments-tab.tsx`
   - `src/components/materials/global-materials-view.tsx`
   - `src/components/materials/class-materials-tab.tsx`
