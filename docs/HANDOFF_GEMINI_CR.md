# HANDOFF cho Gemini: Các yêu cầu thay đổi SIMPACE (CR-01 … CR-08)

> Đọc `AGENTS.md` trước. Luôn trả lời **tiếng Việt**. Mỗi bước nhỏ: sửa → `npx tsc --noEmit` → báo kết quả. Không refactor ngoài phạm vi.
> Nguồn yêu cầu gốc: `SIMPACE_Functional_Change_Request_Ver1.docx` (mã CR-01…CR-08, AC-01…AC-10).

---

## 0. QUY TẮC KỸ THUẬT BẮT BUỘC (đã gặp lỗi thật, đọc kỹ)

1. **Hai nhánh dữ liệu**: gần như mọi service có nhánh `if (!(await isDbAlive()))` dùng `globalAssignmentsStore.demoAssignments` / `globalStore.demoUsers` và nhánh Prisma. Mỗi thay đổi logic phải **đặt ở cả hai nhánh** nếu hàm đó có cả hai. Không thêm dữ liệu demo mới.
2. **Xuống dòng CRLF**: nhiều file (`assignment.service.ts`, `actions/assignments.ts`, `actions/schools.ts`, `school-modals.tsx`) dùng `\r\n`. Công cụ sửa file nhiều dòng hay báo "target not found". Cách an toàn: viết script Python đọc file với `newline=''`, thay `\n` → `\r\n` khi file có CRLF, `assert s.count(a)==1` trước khi thay.
3. **PowerShell**: không dùng `python -c "..."` có dấu nháy kép lồng nhau. Ghi script ra file `.py` rồi chạy `python -X utf8 file.py`.
4. **Prisma**: sau khi sửa `schema.prisma` chạy `npx prisma generate`. Nếu lỗi `EPERM ... query_engine-windows.dll.node` thì tắt `npm run dev` rồi chạy lại (file DLL đang bị khóa). Kiểu TypeScript vẫn được sinh dù lỗi này. Cập nhật DB thật: `npx prisma db push` (hỏi người dùng trước).
5. **Không có ESLint** trong máy (`npm run lint` báo thiếu eslint). Chỉ báo "chưa chạy được lint".
6. **Không đọc/sửa** `scratch/`, `.next/`, `node_modules/`, `lovable-design/`.
7. File component < ~300 dòng. Tách file mới thay vì làm to `simpace-app.tsx` (~870 dòng), `assignment.service.ts` (~1950 dòng).
8. Phân quyền chỉ qua `src/lib/permissions.ts` (`checkAuth`, `checkRole`, `isStudent`, `isTeacherOrTA`, `isAdmin`, `isSchoolManager`, `ROLE_GROUPS`).
9. Mọi chữ hiển thị bằng tiếng Việt có dấu.

---

## 1. ĐÃ LÀM XONG (không làm lại, chỉ tái sử dụng)

| Mục | File | Nội dung |
|---|---|---|
| Schema | `prisma/schema.prisma` | enum `AnswerVisibility` (`AFTER_SUBMIT`/`AFTER_GRADED`/`NEVER`/`FROM_DATE`); `AssignmentClass.answerVisibility` (mặc định `AFTER_SUBMIT`) và `answerVisibleAt DateTime?` |
| Hàm thuần | `src/lib/assignment-config.ts` (MỚI) | `validateAssignmentConfig()` (số lần 1–10, thời lượng > 0, `startDate` < `dueDate`, `FROM_DATE` bắt buộc `answerVisibleAt`); `canStudentViewAnswers()`; `ANSWER_VISIBILITY_LABELS` (nhãn tiếng Việt cho dropdown); hằng `MIN_ATTEMPTS`, `MAX_ATTEMPTS` |
| Tạo bài | `src/services/assignment-mutation.service.ts` → `createAssignmentService` | gọi `validateAssignmentConfig`, bỏ logic ép `maxAttempts = 2`, lưu `answerVisibility`/`answerVisibleAt` vào `AssignmentClass` (cả nhánh demo và Prisma) |
| Sửa bài | cùng file → `updateAssignmentService` | nhận `answerVisibility`/`answerVisibleAt`, validate, áp vào `AssignmentClass` |
| Action | `src/actions/assignments.ts` | thêm field vào kiểu của `createAssignmentAction`, `updateAssignmentAction`, `createMultipleAssignmentsAction` (+ trả lỗi đầu tiên nếu không tạo được bài nào) |
| Giới hạn lượt | `src/services/assignment.service.ts` → `submitAssignmentService` | chặn nộp khi số bài nộp ≥ `assignment.maxAttempts` (cả 2 nhánh) |
| Ẩn đáp án | `assignment.service.ts` → `getAssignmentDetailService(assignmentId, studentId, opts?)` | `opts.hideAnswersUnlessAllowed` (action truyền `isStudent(session)`) → che `correctAnswer`, `explanation`, `isCorrect` khi chưa đủ điều kiện (chỉ nhánh Prisma) |
| CR-04 | `src/actions/schools.ts` (`createSchoolAction`), `src/components/schools/school-modals.tsx` (form TẠO) | bỏ bắt buộc Quản nhiệm, ô chọn đổi nhãn "(không bắt buộc)". Form SỬA trường giữ nguyên |
| CR-04 (tạo Quản nhiệm) | `single-user-tab.tsx:81`, `user.service.ts:456` | **đã có sẵn** kiểm tra bắt buộc chọn trường ở cả frontend và backend → không cần làm |
| CR-03 | `src/components/classes/schedule-picker-section.tsx` (viết lại), `src/lib/schedule.ts`, `src/services/class.service.ts` | chọn số buổi/tuần (1–7), mỗi buổi: thứ + giờ bắt đầu + giờ kết thúc; ghi ra chuỗi `"Thứ 2 • 18:00 - 20:00; Thứ 4 • 19:00 - 21:00"`; thêm `parseScheduleSlots`, `validateScheduleString`; `areSchedulesConflicting` so từng buổi; `createClassService`/`updateClassService` gọi `validateScheduleString` |

Lưu ý: `Class.description` đang được dùng để lưu **chuỗi lịch học** (không phải mô tả).

---

## 2. VIỆC CÒN LẠI (làm theo thứ tự)

### Giai đoạn A – CR-01 + CR-02 giao diện: form giao bài thống nhất (làm trước)

**Mục tiêu (AC-01, AC-02, AC-03, AC-04):** giao 1 lớp, giao nhiều lớp, giao từ đề bóc tách đều dùng **cùng một bộ trường cấu hình**: Tên bài, Thời gian làm (phút), Thời điểm bắt đầu, Hạn làm bài, Số lần được làm (1–10), Chế độ hiển thị đáp án (+ ngày giờ nếu `FROM_DATE`).

**File liên quan (đã khảo sát):**
- `src/components/assignments/class-assignments-tab.tsx` – giao từng lớp (có state `manualMaxTabSwitches`, tạo bài thủ công ~dòng 330-345 gọi `createAssignmentAction`).
- `src/components/assignments/manual-assignment-builder-modal.tsx` – form soạn bài thủ công.
- `src/components/assignments/multi-class-assignment-modal.tsx` – giao nhiều lớp (dòng 57 `maxTabSwitches`, dòng 152 gọi action; tiêu đề dòng 169).
- `src/components/assignments/exam-parser/smart-parser-modal.tsx` – giao từ đề bóc tách (dòng ~375 và ~432 đang gán cứng `maxTabSwitches: 999`).
- `src/components/simpace-app.tsx` dòng ~545 (nút) và ~750-760 (mở modal nhiều lớp).

**Các bước:**
1. Tạo `src/components/assignments/assignment-config-fields.tsx` (< 200 dòng), component **chỉ lo giao diện** nhận `value`/`onChange` cho 6 trường trên. Dùng `ANSWER_VISIBILITY_LABELS`, `MIN_ATTEMPTS`, `MAX_ATTEMPTS` từ `@/lib/assignment-config`. Ô số lần: `type="number" min=1 max=10`, **không tự đặt giá trị thay người dùng** khi nhập sai (hiện lỗi). Ô ngày giờ đáp án chỉ hiện khi chọn `FROM_DATE` và bắt buộc nhập.
2. Thêm hàm `validateConfigClient()` dùng lại `validateAssignmentConfig` (đã là hàm thuần, import được ở client).
3. Gắn component vào 3 nơi: `multi-class-assignment-modal.tsx`, form thủ công (`manual-assignment-builder-modal.tsx` / `class-assignments-tab.tsx`), `smart-parser-modal.tsx`. Truyền đủ `durationMinutes`, `startDate`, `dueDate`, `maxAttempts`, `answerVisibility`, `answerVisibleAt` vào `createAssignmentAction`.
4. Trong `smart-parser-modal.tsx`: đổi `maxTabSwitches: 999` thành giá trị mặc định chung (3) như hai luồng còn lại, trừ khi người dùng yêu cầu khác (hỏi lại).
5. Đổi tên hiển thị modal nhiều lớp: "Giao bài tập cho nhiều lớp học (Cửa 2)" → **"Giao bài tập"**; nút ở `simpace-app.tsx:545` "Giao bài tập cho nhiều lớp" → "Giao bài tập" (CR-08). Mô tả modal giữ rõ phạm vi là chọn nhiều lớp.
6. Ở màn học sinh xem kết quả/bài làm (`student-submission-review-modal.tsx:316-321` hiện `q.correctAnswer`): chỉ hiển thị khi `correctAnswer` khác `null` (backend đã che). Hiện thông báo "Đáp án sẽ hiển thị theo cấu hình của giáo viên" khi bị che.
7. Kiểm tra: tạo bài 1 lớp với `maxAttempts=3`, `AFTER_GRADED` → học sinh nộp bài tự luận → chưa thấy đáp án; giáo viên chấm → thấy. Tạo hàng loạt 2 lớp: cả 2 `AssignmentClass` đều có cùng `answerVisibility`. Nhập số lần 0 hoặc 11 → báo lỗi.

**Cạm bẫy:** `dueDate` hiện được `updateMany` đặt `null` nếu form sửa không gửi `dueDate` (hành vi cũ) – không đổi. Dữ liệu cũ không có chế độ đáp án sẽ nhận mặc định `AFTER_SUBMIT` nhờ default của cột.

### Giai đoạn B – CR-05: sửa lớp từ màn đề xuất lớp khi nhập học sinh hàng loạt

**File:** `src/components/users/bulk-allocation-preview.tsx`, `bulk-class-cards-grid.tsx`, `bulk-ielts-wizard.tsx`; form chuẩn: `src/components/classes/edit-class-modal.tsx` (đã dùng `SchedulePickerSection` mới).

**Bước:**
1. Đọc 3 file bulk để xác định bấm "xem chi tiết/sửa" lớp đang làm gì (chưa khảo sát).
2. Mở **chính** `edit-class-modal.tsx` (không tạo form rút gọn). Xem props nó cần (`classItem`, danh sách trường/GV/…); truyền dữ liệu từ lớp được đề xuất. Nếu lớp đề xuất là lớp **chưa lưu DB** (nhóm tạm), báo lại người dùng thay vì đoán.
3. Sau khi lưu: chỉ cập nhật thông tin lớp, **không reset** state danh sách học sinh đã đề xuất trong wizard (giữ state ở component cha, chỉ refetch/patch lớp được sửa).
4. Kiểm tra: nhập Excel → xem đề xuất → sửa lịch học 1 lớp → quay lại, danh sách học sinh và số lượng mỗi lớp không đổi.

### Giai đoạn C – CR-06 + CR-07: Thông báo và Out Tab (lớn nhất, làm sau cùng)

**Thiết kế đã thống nhất (cần người dùng đồng ý schema trước khi `db push`):**

```prisma
enum NotificationType {
  ASSIGNMENT_ASSIGNED   // HS: có bài tập mới
  SUBMISSION_GRADED     // HS: có điểm; GV: bài đã chấm/có kết quả mới
  MATERIAL_ADDED        // HS: có học liệu mới
  SUBMISSION_RECEIVED   // GV: HS nộp bài
  OUT_TAB_ALERT         // GV: HS Out Tab
}

model Notification {
  id         String           @id @default(uuid())
  userId     String           // người nhận
  type       NotificationType
  title      String
  message    String?
  refType    String?          // "ASSIGNMENT" | "SUBMISSION" | "MATERIAL"
  refId      String?
  classId    String?
  dedupeKey  String           @unique // vd: "ASSIGNMENT_ASSIGNED:<assignmentClassId>:<userId>"
  isRead     Boolean          @default(false)
  createdAt  DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@map("notifications")
}

model OutTabEvent {
  id           String   @id @default(uuid())
  submissionId String?
  assignmentId String
  studentId    String
  occurredAt   DateTime @default(now())

  @@index([assignmentId, studentId])
  @@map("out_tab_events")
}
```
Thêm quan hệ ngược `notifications Notification[]` vào model `User`. **Chỉ thêm mới**, không sửa bảng cũ.

**Các bước:**
1. Tạo `src/services/notification.service.ts`: `createNotifications(items[])` dùng `createMany({ skipDuplicates: true })` (chống trùng nhờ `dedupeKey`), `listMyNotifications(userId, limit=30)`, `markRead(userId, ids|all)`, `countUnread(userId)`. Hàm gom người nhận: học sinh theo `ClassEnrollment` (status `STUDYING`) của lớp; giáo viên theo `ClassAssignment` (`roleInClass` Teacher/TA) của lớp. **Giáo viên chỉ nhận thông báo của lớp mình phụ trách.**
2. Tạo `src/actions/notifications.ts`: `getMyNotificationsAction`, `markNotificationsReadAction` (lấy session, `checkAuth`, gọi service).
3. Móc tạo thông báo (bọc `try/catch`, lỗi thông báo **không được làm hỏng** thao tác chính; chỉ chạy nhánh Prisma, bỏ qua nhánh demo):
   - Giao bài → `createAssignmentService` cuối nhánh Prisma: gửi `ASSIGNMENT_ASSIGNED` cho học sinh các lớp được giao (`dedupeKey = "ASSIGNMENT_ASSIGNED:{assignmentClassId}:{studentId}"`).
   - Nộp bài → `submitAssignmentService`: `SUBMISSION_RECEIVED` cho GV/TA của lớp (`dedupeKey = "SUBMISSION_RECEIVED:{submissionId}:{teacherId}"`). Nếu bài trắc nghiệm tự chấm (`status = GRADED`) thì gửi thêm `SUBMISSION_GRADED` cho học sinh.
   - Chấm bài → `gradeSubmissionService` (file `assignment.service.ts`, ~dòng 1760): `SUBMISSION_GRADED` cho học sinh (`dedupeKey = "SUBMISSION_GRADED:{submissionId}:{studentId}:{gradedAtISO}"` để chấm lại vẫn báo "có kết quả mới" nhưng không báo trùng cùng một lần chấm) và cho GV phụ trách.
   - Học liệu mới → `material.service.ts` (hàm tạo học liệu gán vào lớp): `MATERIAL_ADDED` cho học sinh lớp đó.
   - Out Tab → xem mục CR-07.
4. UI: tạo `src/components/layout/notification-bell.tsx` (< 200 dòng): biểu tượng chuông + số chưa đọc, bấm mở danh sách (loại sự kiện, tiêu đề, thời gian `createdAt`), bấm vào → đánh dấu đã đọc. Gắn vào `src/components/layout/top-navbar.tsx`. Cập nhật bằng cách tải lại khi mở chuông và mỗi 60 giây (polling), **không dùng websocket**.
5. **Chưa làm** thông báo nhắc hạn/chưa nộp (tài liệu nói rõ chưa yêu cầu).

**CR-07 Out Tab:**
1. Hiện tại đếm bằng `visibilitychange` ở `class-assignments-tab.tsx` (~dòng 452-468) và `ielts-exam-player.tsx` (~167-180). Thêm `window.addEventListener("blur", ...)` dùng **cùng một hàm đếm** (chống đếm đôi: bỏ qua nếu 2 sự kiện cách nhau < 1 giây).
2. Cột DB `tabSwitchCount`, `maxTabSwitches`, tên hàm **giữ nguyên** (không đổi tên, tránh vỡ báo cáo `report.service.ts`, `report-metrics.helper.ts`). Chỉ đổi **chữ hiển thị** thành "Out Tab" (CR-07/CR-08).
3. Mỗi lần Out Tab, gọi action mới `recordOutTabAction({ assignmentId, submissionId? })` ghi 1 dòng `OutTabEvent` và tạo thông báo `OUT_TAB_ALERT` cho GV phụ trách (`dedupeKey` theo `studentId:assignmentId:occurredAt` làm tròn giây). Gọi không chặn UI (fire-and-forget, bắt lỗi im lặng).
4. Thông báo cho giáo viên chỉ gửi cho GV/TA của lớp mà học sinh đang học bài đó.
5. Nói thẳng trong báo cáo: trình duyệt không phân biệt được "chuyển tab" với "khóa màn hình/cuộc gọi" trên điện thoại; mọi trường hợp rời màn hình đều tính là Out Tab (đúng tài liệu).

**Kiểm tra:** giao bài → học sinh thấy 1 thông báo (giao lại cùng lớp không sinh trùng); học sinh nộp → giáo viên đúng lớp thấy, giáo viên lớp khác không thấy; chấm bài → học sinh thấy; Out Tab 2 lần → GV thấy 2 thông báo, bảng `out_tab_events` có 2 dòng.

### Giai đoạn D – CR-08: chữ hiển thị

| Việc | Vị trí |
|---|---|
| "Giao bài tập" thống nhất | làm ở Giai đoạn A bước 5 |
| Bỏ dòng "Còn ít nhất 150 từ" ở màn Writing | **chưa tìm thấy** trong grep `ielts-exam-player.tsx`. Tìm: `Get-ChildItem src -Recurse -Include *.tsx \| Select-String "150"` và các chuỗi `từ`, `word`. Có thể nằm trong `ielts-question-renderer.tsx` hoặc phần ESSAY. Chỉ xóa đúng dòng đó, hiển thị đếm từ hiện tại có thể giữ |
| Nhãn "Số lần rời màn hình"/"Rời màn hình" → "Out Tab" | `ielts-exam-player.tsx:~304`, `assignment-action-modals.tsx:~121,140-162`, `student-submission-review-modal.tsx:~139`, `teacher-grading-modal.tsx:~256`, báo cáo (`components/reports/*`). Câu cảnh báo không được ngụ ý "chỉ đếm chuyển tab": ví dụ "Hệ thống ghi nhận khi bạn rời khỏi màn hình làm bài (Out Tab)." |

---

## 3. Việc cần người dùng quyết/chạy tay

1. Chạy `npx prisma db push` (hoặc migrate theo cách nhóm đang dùng) sau khi đồng ý schema. Hiện schema đã thêm `AnswerVisibility` + 2 cột; DB thật **chưa được cập nhật**.
2. Giới hạn số lần làm bài đang đặt **1–10** (đổi ở `MAX_ATTEMPTS` trong `src/lib/assignment-config.ts`).
3. Nội dung "các thông tin khác" cho giáo viên (CR-06) chưa được liệt kê cụ thể → hiện chỉ làm 3 loại nêu rõ (nộp bài, chấm, Out Tab).

## 4. Các điểm đã phát hiện nhưng NGOÀI phạm vi (chỉ báo, không tự sửa)

- `createSchoolAction` không có kiểm tra quyền/session.
- `user.service.ts`, `bulk-allocation.service.ts`, `admission-allocation.service.ts` còn ghi vào `globalStore.demoUsers`.
- `dashboard-view.tsx` dùng `parseSchedule` (gộp mọi thứ, lấy giờ đầu tiên) nên hiển thị lịch hôm nay có thể không chính xác khi các buổi có giờ khác nhau.
- Học sinh cho phép làm nhiều lần + chế độ `AFTER_SUBMIT` nghĩa là sau lần 1 đã thấy đáp án cho các lần sau (đúng theo cấu hình, nên cân nhắc khuyên giáo viên chọn `AFTER_GRADED` hoặc `FROM_DATE`).
- Ẩn đáp án mới chỉ áp dụng ở nhánh Prisma của `getAssignmentDetailService`, nhánh demo vẫn trả đầy đủ.

## 5. Checklist trước khi báo xong mỗi giai đoạn

- `npx tsc --noEmit` (không lỗi).
- `npx tsx scripts/test-core-flows.ts` (18 bài test cũ vẫn đạt).
- Báo cáo: danh sách file đổi, bước kiểm tra tay, và **bảng Definition of Done** theo mã `[C…]` (mẫu ở `AGENTS.md` mục 5.1). Không báo "đã xong" nếu còn mục chưa làm.
