# BÀN GIAO CÔNG VIỆC CHO AI TIẾP NHẬN

> Đọc file này trước, sau đó đọc `AGENTS.md` (luật bắt buộc) và `PROJECT_STRUCTURE.md` (bản đồ code). Giao tiếp bằng tiếng Việt.
> Cập nhật lần cuối: 2026-10-18. Nhánh làm việc: `refactor/split-simpace-app`.

## 1. Mục tiêu tổng
Làm cho code sạch hơn để AI không sửa sai luồng khi nghiệp vụ phức tạp: chia nhỏ file lớn, gom phân quyền, tách tầng `service`, thêm test, chuẩn hóa tài liệu luồng.

## 2. Đã hoàn thành toàn bộ các đợt tái cấu trúc
1. **Tài liệu & Cấu hình:**
   - Viết lại `AGENTS.md`; xóa `.antigravity/rules/lms-rules.md` (trùng); cập nhật `PROJECT_STRUCTURE.md`; tạo `docs/flows/pdf-to-quiz-ocr.md`.
   - Tạo `.eslintrc.json` chuẩn `next/core-web-vitals`. *(Lưu ý: `package.json` hiện chưa cài gói `eslint` trong `devDependencies`, chỉ cài khi người dùng yêu cầu).*
2. **Gom phân quyền & Chấm điểm thuần:**
   - `src/lib/permissions.ts`: `checkAuth`, `checkRole`, `checkNotStudent`, `hasFeatureAccess`, type guards `isAdmin`, `isSchoolManager`, `isTeacherOrTA`, `isStudent`.
   - `src/lib/grading.ts`: `isAnswerCorrect`, `isObjectiveType`, `isObjectiveOnly`.
3. **Tách nhỏ `simpace-app.tsx` và các Component lớn:**
   - `src/components/simpace-app.tsx`: giảm từ **10.608 xuống ~870 dòng**.
   - `src/components/users/user-dialog.tsx`: giảm từ **1.862 xuống 161 dòng**, tách thành `single-user-tab.tsx`, `bulk-ielts-wizard.tsx`, `bulk-allocation-preview.tsx`.
   - `src/components/schools/school-classes-modal.tsx`: tách `school-class-submodals.tsx`.
   - `src/components/schools/schools-page-view.tsx`: tách `school-upsert-modals.tsx`.
   - `src/components/classes/class-detail-view.tsx`: tách `class-detail-modals.tsx`.
   - `src/components/classes/classes-page-view.tsx`: tách `classes-page-modals.tsx` (`ClassesTimetableGrid`).
   - `src/components/users/users-page-view.tsx`: tách `user-edit-modal.tsx` (`UserTableRow`, `formatUserAssignmentText`).
4. **Tách tầng `service` khỏi `src/actions/assignments.ts`:**
   - `src/actions/assignments.ts`: giảm từ **1.635 xuống 254 dòng** (chỉ giữ kiểm tra session/quyền, validate đầu vào, gọi service và `safeRevalidate`).
   - `src/services/assignment.service.ts`: chứa toàn bộ truy vấn Prisma và nghiệp vụ bài tập, nộp bài, chấm điểm.
   - `src/services/ielts-parser.service.ts`: chứa logic bóc tách câu hỏi/đáp án và bộ đề mẫu IELTS 4 kỹ năng.
5. **Kiểm thử tự động:**
   - `scripts/test-core-flows.ts`: 18/18 bài test PASS (`npx tsx scripts/test-core-flows.ts`).
   - `npx tsc --noEmit`: 0 lỗi.

## 3. Việc tiếp theo khi người dùng yêu cầu
1. **Kiểm tra giao diện & Merge nhánh:** Chạy `npm run dev` kiểm tra các màn hình chính, sau đó merge nhánh `refactor/split-simpace-app` vào `main`.
2. **Luồng bóc tách đề IELTS thật (`docs/flows/pdf-to-quiz-ocr.md`):** Chỉ triển khai sau khi nhóm chốt các câu hỏi mở ở mục 8 của file đó và cung cấp đề mẫu thật trong `docs/samples/` (PDF + Excel đáp án).
3. **Các file có sẵn từ trước (chưa đụng):** Nếu sau này cần sửa sâu giao diện Bài tập/Học liệu, có thể tách nhỏ thêm `assignments/class-assignments-tab.tsx`, `materials/global-materials-view.tsx`, `materials/class-materials-tab.tsx`.

## 4. Lưu ý quan trọng cho AI
- Luôn tuân thủ mục 2.2 `AGENTS.md`: **Nhắc lại hiểu biết** (Ai / Làm gì / Kết quả mong đợi, Các ca biên, Danh sách file sẽ chạm) và **chờ người dùng xác nhận** trước khi sửa.
- Không tự thêm quy tắc nghiệp vụ ngoài yêu cầu.
- `src/lib/permissions.ts` được import bởi client component nên tuyệt đối không import `next/headers` hay `@/lib/prisma` ở runtime.
- Trên Windows, lệnh `git commit` cần chạy với `BypassSandbox: true`.
