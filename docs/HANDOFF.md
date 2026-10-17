# BÀN GIAO CÔNG VIỆC CHO AI TIẾP NHẬN

> Đọc file này trước, sau đó đọc `AGENTS.md` (luật bắt buộc) và `PROJECT_STRUCTURE.md` (bản đồ code). Giao tiếp bằng tiếng Việt.
> Cập nhật lần cuối: 2026-10-17. Nhánh làm việc: `refactor/split-simpace-app` (3 commit trên `main`).

## 1. Mục tiêu tổng
Làm cho code sạch hơn để AI không sửa sai luồng khi nghiệp vụ phức tạp: chia nhỏ file lớn, gom phân quyền, thêm test, chuẩn hóa tài liệu luồng.

## 2. Đã xong (không làm lại)
- **Tài liệu:** viết lại `AGENTS.md`; xóa `.antigravity/rules/lms-rules.md` (trùng); viết lại `PROJECT_STRUCTURE.md`; ghi rõ `lovable-design/` chỉ là prototype; tạo `docs/flows/pdf-to-quiz-ocr.md`.
- **Gom phân quyền:** `src/lib/permissions.ts` có `checkAuth`, `checkRole`, `checkNotStudent`, `hasFeatureAccess`, type guard `isAdmin/isSchoolManager/isTeacherOrTA/isStudent`. Các action trong `src/actions/` đã dùng chung.
- **Tách `simpace-app.tsx`:** từ 10.608 xuống ~870 dòng, tách thành các thư mục `auth/ dashboard/ schools/ classes/ users/ schedule/ import/ settings/ shared/` trong `src/components/`. Đã dọn import thừa. `tsc` 0 lỗi.
- **Chấm điểm:** quy tắc chấm đáp án tách ra `src/lib/grading.ts` (`isAnswerCorrect`, `isObjectiveType`, `isObjectiveOnly`), `assignments.ts` dùng lại, hành vi giữ nguyên.
- **Test:** `scripts/test-core-flows.ts`, 18 test cho xung đột lịch (`lib/schedule.ts`), phân lớp IELTS (`actions/bulk-allocation.ts`), RBAC và chấm điểm (`lib/grading.ts`). Chạy: `npx tsx scripts/test-core-flows.ts`.
- **Commit:** `73fc098` (docs), `93769cb` (phân quyền + grading), `9bcf0a3` (tách component + test).

## 3. Việc còn lại (theo thứ tự đề xuất)
1. **Cắt tiếp các file vẫn vượt ~300 dòng** (luật trong `AGENTS.md`). Chỉ làm khi người dùng đồng ý, từng file một, không đổi hành vi, mỗi file một commit, chạy `tsc` + test sau mỗi bước, và nhờ người dùng kiểm tra tay giao diện:
   - `users/user-dialog.tsx` (~2.000 dòng, chứa luồng Excel phân lớp IELTS, **rủi ro cao**, cắt cẩn thận)
   - `schools/school-classes-modal.tsx` (~940), `classes/class-detail-view.tsx` (~910), `classes/classes-page-view.tsx` (~730), `schools/schools-page-view.tsx` (~700), `users/users-page-view.tsx` (~550)
   - File có sẵn từ trước, chưa đụng: `assignments/class-assignments-tab.tsx` (~2.680), `materials/global-materials-view.tsx` (~2.070), `materials/class-materials-tab.tsx` (~1.590)
2. **Tách `service` khỏi `src/actions/assignments.ts`** (~1.650 dòng) theo quy ước tầng trong `AGENTS.md`.
3. **Cấu hình ESLint:** `npm run lint` đang hỏi cấu hình tương tác nên không chạy được ở terminal không tương tác. Cần người dùng đồng ý tạo `.eslintrc.json` trước.
4. **Luồng bóc tách đề IELTS** (`docs/flows/pdf-to-quiz-ocr.md`): chỉ code sau khi nhóm chốt các điểm ở mục 8 của file đó và có đề mẫu thật trong `docs/samples/` (PDF + Excel đáp án).

## 4. Lưu ý quan trọng
- **Trước mỗi lần sửa:** nhắc lại hiểu biết (ai, làm gì, kết quả, ca biên, file sẽ chạm) và **chờ người dùng xác nhận** (`AGENTS.md` mục 2.2).
- **Không tự thêm quy tắc nghiệp vụ.** Ví dụ: `submitAssignmentAction` hiện **không** kiểm tra hạn nộp, `allowLate` hay giới hạn số lần làm bài. Nếu cần, đó là tính năng mới, hỏi người dùng 3 ý (ai, làm gì, ca biên) trước.
- Không thêm nhánh dữ liệu demo mới; không sửa/xóa bảng hay cột trong `schema.prisma` khi chưa được đồng ý.
- Không đọc/sửa `scratch/`, `.next/`, `node_modules/`; `lovable-design/` chỉ để tham khảo.
- `src/lib/permissions.ts` được import bởi component `"use client"` (qua `DEFAULT_PERMISSIONS`), nên **không được** import `next/headers` hay `@/lib/prisma` ở runtime trong file này.
- Dùng type guard dạng giao (`session is SessionPayload & { role: "X" }`) để tránh TypeScript thu hẹp `session` thành `never` trong chuỗi `if / else if`.
- **Windows/PowerShell:** tránh escape dấu `"` trong `node -e` nhiều dòng; ghi script ra file rồi chạy. Sandbox không ghi được vào `.git`, lệnh `git commit` cần chạy ngoài sandbox (người dùng duyệt).
- **Bí mật:** không ghi API key vào bất kỳ file nào ngoài `.env` (đã được `.gitignore`). Người dùng từng dán 2 key Groq vào chat và đã được dặn thu hồi, tự gán key mới vào `.env` sau. Không hỏi lại giá trị key.
- Sau khi sửa: chạy `npx tsc --noEmit` và `npx tsx scripts/test-core-flows.ts`, báo file đã đổi và cách người dùng tự kiểm tra bằng tay.

## 5. Chia việc theo mức tốn hạn mức
- **Nhẹ, lặp lại:** cắt file component theo mẫu đã làm, dọn import.
- **Nặng, cần suy luận (nên bàn lại với người dùng):** cắt `user-dialog.tsx`, tách `service` khỏi `assignments.ts`, thiết kế parser/prompt bóc tách đề IELTS.
