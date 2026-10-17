# BÀN GIAO CÔNG VIỆC CHO AI TIẾP NHẬN

> Đọc file này trước, sau đó đọc `AGENTS.md` (luật bắt buộc) và `PROJECT_STRUCTURE.md` (bản đồ code). Giao tiếp bằng tiếng Việt.

## 1. Mục tiêu tổng
Làm cho code sạch hơn để AI không sửa sai luồng khi nghiệp vụ phức tạp: chia nhỏ file lớn, gom phân quyền, thêm test, chuẩn hóa tài liệu luồng.

## 2. Đã hoàn thành 100% giai đoạn tái cấu trúc
1. **Chuẩn hóa tài liệu & quy ước cho AI:**
   - Viết lại `AGENTS.md` (luật + quy ước 3 tầng + checklist + bước "nhắc lại hiểu biết").
   - Xóa `.antigravity/rules/lms-rules.md` (trùng).
   - Viết lại `PROJECT_STRUCTURE.md` (phần A: hiện tại, phần B: mục tiêu).
   - Sửa `lovable-design/AGENTS.md` ghi rõ chỉ là prototype.
   - Tạo `docs/flows/pdf-to-quiz-ocr.md` (đặc tả luồng bóc tách đề IELTS Hybrid Rule + Groq LLaMA 3 + Excel Answer Key + Ebook 2 cột).
2. **Việc 1 — Gom phân quyền về `src/lib/permissions.ts`:**
   - Bổ sung `ROLE_GROUPS`, `AuthCheckResult`, `hasRole`, `isAdmin`, `isSchoolManager`, `isTeacherOrTA`, `isStudent`, `checkAuth`, `checkRole`, `checkNotStudent`, `hasFeatureAccess`.
   - Áp dụng đồng bộ cho các file trong `src/actions/` (`permissions.ts`, `materials.ts`, `assignments.ts`, `schools.ts`, `classes.ts`, `users.ts`).
3. **Việc 2 — Tách `src/components/simpace-app.tsx` thành các module nhỏ:**
   - Giảm `src/components/simpace-app.tsx` từ **10.608 dòng xuống còn 868 dòng** (giảm 91,8%), không đổi hành vi và bảo toàn 100% thay đổi chưa commit của người dùng.
   - Đã tách thành 20 file theo đúng phân hệ:
     - `src/components/shared/common-widgets.tsx` (`ConfirmDialog`, `Field`, `InfoCard`, `Badge`, `Status`, `subtitle`)
     - `src/components/settings/permission-widgets.tsx`, `rbac-matrix-section.tsx`, `ielts-config-section.tsx`, `settings-page-view.tsx`
     - `src/components/auth/login-view.tsx`, `activate-view.tsx`
     - `src/components/dashboard/dashboard-view.tsx`
     - `src/components/schools/school-modals.tsx`, `school-detail-drawer.tsx`, `schools-page-view.tsx`, `school-classes-modal.tsx`
     - `src/components/classes/schedule-picker-section.tsx`, `create-class-dialog.tsx`, `edit-class-modal.tsx`, `classes-page-view.tsx`, `class-detail-view.tsx`
     - `src/components/users/user-view-modals.tsx`, `edit-user-modal.tsx`, `users-page-view.tsx`, `user-dialog.tsx`
     - `src/components/schedule/schedule-page-view.tsx`
     - `src/components/import/import-page-view.tsx`, `ielts-modals.tsx`
4. **Việc 3 — Thêm bộ kiểm thử tự động cho 3 luồng khó (`scripts/test-core-flows.ts`):**
   - Kiểm thử tự động luồng bóc tách & xung đột lịch học (`src/lib/schedule.ts`), phân lớp IELTS hàng loạt & tái cân bằng sĩ số (`src/actions/bulk-allocation.ts`), và chấm điểm nộp bài + RBAC (`src/lib/permissions.ts`).
   - Chạy bằng lệnh: `npx tsx scripts/test-core-flows.ts`.

## 3. Việc tiếp theo khi nhóm sẵn sàng
- **Luồng bóc tách đề IELTS** (`docs/flows/pdf-to-quiz-ocr.md`): thực hiện khi nhóm chốt các điểm ở mục 8 của file đó và có đề mẫu thật trong `docs/samples/` (PDF + Excel đáp án).
- Tách dần logic nghiệp vụ trong `src/actions/assignments.ts` sang tầng `src/services/` khi chạm tới module bài tập.

## 4. Lưu ý quan trọng
- **Trước mỗi lần sửa:** nhắc lại hiểu biết (ai, làm gì, kết quả, ca biên, file sẽ chạm) và **chờ người dùng xác nhận**.
- Không thêm nhánh dữ liệu demo mới; không sửa/xóa bảng hay cột trong `schema.prisma` khi chưa được đồng ý.
- Không đọc/sửa `scratch/`, `.next/`, `node_modules/`; `lovable-design/` chỉ để tham khảo.
- **Bí mật:** không ghi API key vào bất kỳ file nào ngoài `.env` (đã được `.gitignore`).
- Sau khi sửa: chạy `npx tsc --noEmit`, `npx tsx scripts/test-core-flows.ts` và báo file đã đổi cùng cách kiểm tra bằng tay.
