# AUTHZ_AUDIT_AND_FIX_PLAN — Kiểm toán phân quyền & Kế hoạch sửa (SIMPACE LMS)

> **Đặt file này tại:** `docs/security/AUTHZ_AUDIT_AND_FIX_PLAN.md` trong repo `KLTN_2026`.
> **Phiên bản code được kiểm tra:** commit `1f176489c891be863ffe1b77ee810a9ae38f4247` (nhánh mặc định, ngày 07/11/2026).
> Số dòng ghi trong tài liệu ứng với commit này. Nếu code đã đổi, hãy tìm theo **tên hàm**, không tìm theo số dòng.

---

## 0. HƯỚNG DẪN DÀNH CHO AI ĐỌC TÀI LIỆU NÀY

Bạn là AI được giao sửa lỗi phân quyền. Làm theo đúng các luật sau:

1. **Đọc `AGENTS.md` trước.** Mọi luật trong đó vẫn áp dụng: giao tiếp tiếng Việt, "Nhắc lại hiểu biết" trước khi sửa, bảng nghiệm thu (Definition of Done) và không refactor ngoài phạm vi.
2. **Làm theo thứ tự PHASE (mục 5).** Không làm Phase 2 khi Phase 0 chưa xong, vì Phase 1–3 dùng các hàm helper tạo ở Phase 0.
3. **Mỗi lỗi có một mã `AUTHZ-xx`.** Mỗi lượt chỉ nhận **một nhóm mã** mà người dùng chỉ định. Mỗi mã có sẵn phần "Cách sửa" và "Tiêu chí nghiệm thu". Đã xong khi **mọi** tiêu chí nghiệm thu đều đạt.
4. **Nguyên tắc vàng:**
   - **Kiểm tra quyền ở server, trong file action** (`src/actions/*.ts`) hoặc API route. Không tin bất kỳ dữ liệu nào client gửi lên như `userId`, `role`, `classId`.
   - Danh tính người dùng **chỉ** lấy từ `getSession()`. Không bao giờ lấy từ tham số.
   - **Fail-closed:** khi lỗi DB, không tìm thấy bản ghi hoặc không xác định được quyền thì **từ chối**, không cho qua.
   - Mọi kiểm tra quyền phải đi qua `src/lib/permissions.ts` (luật của AGENTS.md). Không tự viết `if (role === ...)` rải rác ở chỗ khác.
5. **Không đổi schema** (`prisma/schema.prisma`). Tất cả lỗi ở đây sửa được mà không cần thêm hoặc xóa cột.
6. **Không xóa nhánh demo/in-memory** khi chưa được nhóm đồng ý. Xử lý theo AUTHZ-34.
7. Sau khi sửa phải chạy `npx tsc --noEmit`, `npm run lint` và bộ test RBAC (mục 6), rồi báo kết quả thật.

---

## 1. BỐI CẢNH KỸ THUẬT (đọc để hiểu đúng hệ thống)

### 1.1. Vì sao thiếu kiểm tra ở server action là lỗ hổng thật
Mọi hàm `export async function` trong file có `"use server"` là một **endpoint công khai**. Next.js cho phép gọi nó bằng một request POST có header `Next-Action: <id>`. Id của action nằm trong bundle JavaScript gửi xuống trình duyệt. Vì vậy **ẩn nút trên giao diện không bảo vệ được gì**: người dùng có thể mở DevTools và gọi thẳng action với tham số tùy ý.

### 1.2. Vai trò (`enum RoleCode`)
| Mã | Tên | Mã tài khoản |
|---|---|---|
| `ADMIN` | Quản trị viên | AD… |
| `SCHOOL_MANAGER` | Quản nhiệm trường | QN… |
| `TEACHER` | Giáo viên | GV… |
| `TEACHING_ASSISTANT` | Trợ giảng (TA) | TG… |
| `STUDENT` | Học sinh/Học viên | HV… |

### 1.3. Dữ liệu dùng để xác định PHẠM VI (scope)
| Quan hệ | Bảng / cột | Ý nghĩa |
|---|---|---|
| Quản nhiệm ↔ Trường | `School.managerId` | QN quản lý trường có `managerId = session.userId` |
| Trường ↔ Lớp | `Class.schoolId` | Lớp thuộc trường |
| GV/TA ↔ Lớp | `ClassAssignment { classId, userId, roleInClass }` | GV hoặc TA được phân công dạy lớp. **Chú ý: tên bảng là "Assignment" nhưng đây là phân công nhân sự, không phải bài tập** |
| HS ↔ Lớp | `ClassEnrollment { classId, studentId, status }` | HS học lớp |
| Bài tập ↔ Lớp | `Assignment.classId` (lớp gốc) + `AssignmentClass { assignmentId, classId, startDate, dueDate, answerVisibility, isActive }` | Một bài tập có thể giao cho nhiều lớp |
| Bài tập ↔ Người tạo | `Assignment.createdById` | |
| Bài nộp | `AssignmentSubmission { assignmentId, studentId, classId, assignmentClassId }` | |
| Học liệu | `MaterialFolder { classId?, ieltsLevelId?, parentId?, createdById }`, `LearningMaterial { folderId, uploadedById }` | Thư mục gắn lớp **hoặc** gắn trình độ (kho chung) |
| Nhận xét | `ReportComment { scope, classId, studentId? }` | |

### 1.4. Hạ tầng phân quyền hiện có
- `src/lib/auth.ts`: `getSession()` đọc JWT từ cookie `simpace_session`. JWT chứa `{ userId, username, email, role, fullName }`, hạn 7 ngày.
- `src/lib/permissions.ts`: `checkAuth`, `checkRole`, `checkNotStudent`, `ROLE_GROUPS`, `isAdmin`/`isSchoolManager`/`isTeacherOrTA`/`isStudent`, `hasFeatureAccess`.
- **Chưa có** hàm dùng chung nào kiểm tra **phạm vi** (lớp/trường/bài tập/học sinh). Mỗi service tự viết một kiểu, thiếu và không đồng nhất. Đây là nguyên nhân gốc của đa số lỗi.

---

## 2. MA TRẬN QUYỀN ĐÍCH (TARGET) — mọi bản sửa phải khớp bảng này

Ký hiệu: ✅ được phép · ❌ cấm · **Trường mình** = trường có `managerId = tôi` · **Lớp mình (GV/TA)** = có `ClassAssignment` của tôi · **Lớp mình (HS)** = có `ClassEnrollment` của tôi · ❓ = đề xuất mặc định, **nhóm cần xác nhận**.

| Chức năng | ADMIN | SCHOOL_MANAGER | TEACHER | TEACHING_ASSISTANT | STUDENT |
|---|---|---|---|---|---|
| **Người dùng:** xem danh sách | Tất cả | GV/TA/HS thuộc trường mình | ❌ | ❌ | ❌ |
| Tạo/sửa người dùng | ✅ | Chỉ GV/TA/HS; chỉ gán vào trường/lớp của mình | ❌ | ❌ | ❌ |
| Đổi vai trò (`roleCode`) | ✅ | ❓ chỉ đổi giữa TEACHER/TA/STUDENT, không được tạo ADMIN/QN | ❌ | ❌ | ❌ |
| Gán `schoolIds` (làm QN của trường) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xóa mềm / khôi phục người dùng | ✅ | GV/TA/HS thuộc trường mình | ❌ | ❌ | ❌ |
| Import Excel, phân lớp hàng loạt, tuyển sinh | ✅ | Chỉ cho trường mình | ❌ | ❌ | ❌ |
| Sửa hồ sơ cá nhân | Chính mình | Chính mình | Chính mình | Chính mình | Chính mình |
| Danh sách GV/TA (để chọn khi phân công) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Trường:** xem danh sách / chi tiết | Tất cả | Trường mình | ❌ ❓ | ❌ ❓ | ❌ |
| Tạo, xóa, khôi phục trường, đổi QN | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sửa thông tin trường | ✅ | Trường mình, **không** được sửa `managerId` | ❌ | ❌ | ❌ |
| **Lớp:** xem danh sách / chi tiết | Tất cả | Lớp thuộc trường mình | Lớp mình | Lớp mình | Lớp mình |
| Tạo, sửa, xóa, khôi phục lớp | ✅ | Lớp thuộc trường mình | ❌ | ❌ | ❌ |
| Phân công GV/TA, ghi danh, rút, chuyển HS | ✅ | Lớp thuộc trường mình | ❌ | ❌ | ❌ |
| **Bài tập:** tạo, bóc tách đề | ✅ | ❌ | Chỉ giao cho lớp mình | ❌ | ❌ |
| Sửa, xóa, chấm lại bài tập | ✅ | ❌ | Người tạo **hoặc** GV của lớp được giao | ❌ | ❌ |
| Xem danh sách bài tập của lớp | ✅ | Lớp trường mình | Lớp mình | Lớp mình | Lớp mình |
| Xem chi tiết bài (kèm đáp án) | ✅ | Bài thuộc trường mình | Bài thuộc lớp mình | Bài thuộc lớp mình | Chỉ bài giao cho lớp mình; đáp án theo `answerVisibility` |
| Nộp bài | ❌ | ❌ | ❌ | ❌ | Lớp mình, trong khoảng `startDate`…`dueDate`, không quá `maxAttempts` |
| Xem bài nộp | ✅ | Trường mình | Lớp mình | Lớp mình | Chỉ của mình |
| Chấm bài | ✅ | ❌ | Lớp mình | Lớp mình | ❌ |
| **Học liệu:** xem thư mục/tài liệu của lớp | ✅ | Lớp trường mình | Lớp mình | Lớp mình | Lớp mình |
| Xem kho trình độ (`ieltsLevelId`) | ✅ | ✅ | ✅ | ✅ | ❓ chỉ trình độ của lớp mình |
| Tạo, sửa, xóa học liệu **của lớp** | ✅ | Lớp trường mình ❓ | Lớp mình | ❌ ❓ | ❌ |
| Tạo, sửa, xóa học liệu **kho trình độ** | ✅ | ❌ ❓ | ❌ ❓ | ❌ | ❌ |
| Upload file (`/api/materials/upload`) | ✅ | ✅ | ✅ | ✅ | Chỉ file ghi âm (audio) khi làm bài Speaking |
| **Báo cáo:** cấp trường | ✅ | Trường mình | ❌ | ❌ | ❌ |
| Báo cáo cấp lớp | ✅ | Lớp trường mình | Lớp mình | ❌ | ❌ |
| Báo cáo học sinh | ✅ | HS thuộc trường mình | HS thuộc lớp mình | ❌ (theo `VIEW_REPORTS`) | Chỉ chính mình |
| Viết nhận xét | ✅ | Lớp/HS trường mình | Lớp/HS lớp mình | ❌ | ❌ |
| Đánh dấu đã đọc nhận xét | — | — | — | — | Chỉ nhận xét của mình hoặc của lớp mình |
| **Hệ thống:** cấu hình phân quyền, trình độ IELTS | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem cấu hình phân quyền (để vẽ menu) | ✅ | ✅ | ✅ | ✅ | ✅ (chỉ cần đăng nhập) |

---

## 3. DANH SÁCH LỖI CHI TIẾT

Mức độ: 🔴 **P0** (chiếm quyền hoặc phá dữ liệu, sửa ngay) · 🟠 **P1** (lộ dữ liệu hoặc vượt phạm vi) · 🟡 **P2** (nhẹ, phòng ngừa).

### 3A. Người dùng & tài khoản

#### 🔴 AUTHZ-01 — `createUserAction` không kiểm tra quyền
- **Vị trí:** `src/actions/users.ts:64`, service `createUserService` (`src/services/user.service.ts:987`).
- **Hiện trạng:** gọi thẳng service, không gọi `getSession()`.
- **Khai thác:** người chưa đăng nhập hoặc học sinh gọi `createUserAction({ fullName, email, roleCode: "ADMIN" })` để tạo một tài khoản Admin mới.
- **Cách sửa:**
  1. `checkRole(session, ROLE_GROUPS.ADMIN_AND_MANAGER)`.
  2. Nếu là QN: `roleCode` chỉ được là `TEACHER | TEACHING_ASSISTANT | STUDENT`. Mỗi `schoolIds` phải thuộc trường mình (thực tế QN không được gửi `schoolIds`). Mỗi `classIds` phải thuộc trường mình (`assertClassAccess(..., "MANAGE")`).
- **Nghiệm thu:** chưa đăng nhập, HS, GV, TA → bị từ chối. QN tạo `roleCode: "ADMIN"` → bị từ chối. QN gán `classIds` của trường khác → bị từ chối.

#### 🔴 AUTHZ-02 — `updateUserAction` không kiểm tra quyền (leo thang đặc quyền)
- **Vị trí:** `src/actions/users.ts:84`, service `updateUserService` (`user.service.ts:1330`).
- **Hiện trạng:** không có kiểm tra nào. Service nhận `roleCode` (dòng 1369), `email` (dòng 1348), `schoolIds` (dòng 1409, gán `School.managerId`) và `classIds` (dòng 1422).
  - *Đính chính so với lần review trước:* `newPassword` **đã bị service chặn** (dòng 1376), nên không đổi mật khẩu trực tiếp được.
- **Khai thác:**
  - HS gọi `updateUserAction(<id của mình>, { roleCode: "ADMIN" })` và trở thành Admin sau khi đăng nhập lại.
  - Đổi `email` của Admin sang email của kẻ tấn công, rồi dùng "Quên mật khẩu" (OTP gửi về email mới) để chiếm tài khoản Admin.
  - `{ roleCode: "TEACHER", classIds: [...] }` để tự gán mình làm GV của lớp bất kỳ.
  - `{ schoolIds: [...] }` để tự gán mình làm QN của trường bất kỳ.
- **Cách sửa:**
  1. `checkRole(session, ROLE_GROUPS.ADMIN_AND_MANAGER)`.
  2. Không cho tự sửa vai trò của chính mình (`id === session.userId` và có `roleCode` → từ chối).
  3. QN: người bị sửa phải là GV/TA/HS thuộc trường mình (`assertUserInManagerScope`). `roleCode` chỉ trong `TEACHER | TEACHING_ASSISTANT | STUDENT`. **Cấm** gửi `schoolIds`. `classIds` phải thuộc trường mình.
  4. Chỉ ADMIN được sửa ADMIN hoặc QN, hoặc gán `schoolIds`.
- **Nghiệm thu:** cả 4 kịch bản khai thác ở trên đều bị từ chối. ADMIN vẫn sửa được bình thường.

#### 🔴 AUTHZ-03 — `updateProfileAction` lấy `userId` từ client
- **Vị trí:** `src/actions/users.ts:156`, service `updateProfileService` (`user.service.ts:1658`).
- **Hiện trạng:** action nhận `userId` làm tham số rồi cập nhật email và hồ sơ của `userId` đó, không so với session.
- **Khai thác:** bất kỳ ai (kể cả chưa đăng nhập) gọi `updateProfileAction(<id Admin>, { fullName, email: "attacker@x.com" })`, sau đó dùng "Quên mật khẩu" để chiếm tài khoản.
- **Cách sửa:** bỏ hẳn việc dùng tham số `userId`. Dùng `const auth = checkAuth(await getSession())` rồi `updateProfileService(auth.session.userId, data)`. Có thể giữ tham số trong chữ ký hàm để không phải sửa UI, nhưng **bỏ qua giá trị của nó**.
- **Nghiệm thu:** gọi với `userId` khác session → chỉ hồ sơ của chính người gọi bị đổi (hoặc bị từ chối). Chưa đăng nhập → bị từ chối.

#### 🔴 AUTHZ-04 — Các action người dùng khác không kiểm tra quyền
- **Vị trí:** `src/actions/users.ts`
  - `restoreUserAction` (dòng 127): khôi phục tài khoản đã xóa.
  - `commitImportUsersAction` (dòng 202): tạo hàng loạt học viên.
  - `parseAndValidateExcelAction` (dòng 189): tốn CPU, cho phép DoS.
  - `getTeachersAction`, `getTAsAction` (dòng 55, 59): lộ danh sách nhân sự.
  - `getNextUserCodeAction`, `generateUserCode` (dòng 33, 38): 🟡 lộ thông tin, mức nhẹ.
- **Cách sửa:** `restore`, `commitImport`, `parseExcel`, `getTeachers`, `getTAs` cần `ADMIN_AND_MANAGER`. `restore` thêm phạm vi QN giống AUTHZ-16. `commitImport` cho QN: lớp đích phải thuộc trường mình. `getNextUserCode` cần `ADMIN_AND_MANAGER`.
- **Nghiệm thu:** GV/HS/chưa đăng nhập gọi bất kỳ hàm nào trong danh sách → bị từ chối.

#### 🟠 AUTHZ-10 — `getUsersAction` lộ toàn bộ người dùng cho GV/HS/khách
- **Vị trí:** `src/actions/users.ts:46`, `getUsersService` (`user.service.ts:647`).
- **Hiện trạng:** service chỉ lọc dữ liệu khi người gọi là QN. GV, TA, HS và cả session `null` đều nhận **toàn bộ** người dùng, kèm email, số điện thoại và hồ sơ.
- **Cách sửa:** trong action dùng `checkRole(session, ROLE_GROUPS.ADMIN_AND_MANAGER)`. Phần lọc cho QN trong service giữ nguyên.
- **Nghiệm thu:** GV/HS/chưa đăng nhập → bị từ chối. QN chỉ thấy GV/TA/HS thuộc trường mình.

#### 🟠 AUTHZ-16 — QN xóa mềm người dùng của trường khác
- **Vị trí:** `deleteUserAction` / `deleteMultipleUsersAction` (`users.ts:105`, `:134`), `deleteUserService` (`user.service.ts:1505`).
- **Hiện trạng:** chỉ chặn QN xóa ADMIN hoặc QN. **Không** kiểm tra người bị xóa có thuộc trường của QN không.
- **Cách sửa:** nếu là QN thì gọi `assertUserInManagerScope(session, targetId)` cho từng id.
- **Nghiệm thu:** QN xóa HS của trường khác → bị từ chối. QN xóa HS trường mình → thành công.

### 3B. Trường học

#### 🟠 AUTHZ-12 — Các action đọc dữ liệu trường không kiểm tra quyền
- **Vị trí:** `src/actions/schools.ts`
  - `getSchoolsAction` (dòng 37): với GV, HS hoặc khách thì `managerId = undefined`, nên trả về **tất cả** trường.
  - `getSchoolDetailAction` (dòng 51), `getSchoolManagersAction` (dòng 55), `checkSchoolManagerScheduleConflictAction` (dòng 124), `getNextSchoolCodeAction` (dòng 31).
- **Cách sửa:**
  - `getSchoolsAction`: ADMIN thấy tất cả, QN thấy theo `managerId`, vai trò khác bị từ chối. Ngoại lệ: nếu UI của GV cần tên trường để lọc thì lấy qua lớp của mình.
  - `getSchoolDetailAction`: dùng `assertSchoolAccess(session, schoolId)`.
  - `getSchoolManagersAction`, `checkSchoolManagerScheduleConflictAction`, `getNextSchoolCodeAction`: chỉ `ADMIN_ONLY`.
- **Nghiệm thu:** HS/GV gọi `getSchoolDetailAction(id bất kỳ)` → bị từ chối. QN gọi với id trường khác → bị từ chối.

#### 🟠 AUTHZ-14 — QN sửa được trường bất kỳ, kể cả `managerId`
- **Vị trí:** `updateSchoolAction` (`schools.ts:72`), `updateSchoolService` (`school.service.ts:286`, dùng `data.managerId` ở dòng 291–311).
- **Khai thác:** QN gọi `updateSchoolAction(<trường khác>, { managerId: <id của mình> })` để chiếm quyền quản lý trường khác, hoặc truyền `managerId: ""` để gỡ QN hiện tại.
- **Cách sửa:** nếu là QN thì `assertSchoolAccess(session, id)` và **xóa** các trường `managerId` (và `code` nếu có) khỏi `data` trước khi gọi service. Hoặc trả lỗi nếu client gửi các trường đó.
- **Nghiệm thu:** QN sửa trường khác → bị từ chối. QN gửi `managerId` → bị từ chối hoặc bị bỏ qua. QN sửa tên trường mình → thành công.

### 3C. Lớp học

#### 🔴 AUTHZ-05 — Tạo, xóa, khôi phục lớp không kiểm tra quyền
- **Vị trí:** `src/actions/classes.ts`: `createClassAction` (dòng 77), `deleteClassAction` (dòng 122), `restoreClassAction` (dòng 129), `deleteMultipleClassesAction` (dòng 135).
- **Khai thác:** HS gọi `deleteMultipleClassesAction([...mọi id lớp])` để vô hiệu hóa toàn bộ lớp.
- **Cách sửa:** gọi `requireClassManager()` (đã có trong file). Thêm phạm vi: với create thì `assertSchoolAccess(session, data.schoolId)`; với delete/restore thì `assertClassAccess(session, id, "MANAGE")` cho từng id.
- **Nghiệm thu:** HS/GV/TA/chưa đăng nhập → bị từ chối. QN thao tác lớp trường khác → bị từ chối.

#### 🟠 AUTHZ-15 — Sửa lớp, phân công, ghi danh, chuyển lớp không kiểm tra trường của QN
- **Vị trí:** `classes.ts`: `updateClassAction` (dòng 97), `assignStaffToClassAction` (141), `removeStaffFromClassAction` (153), `enrollStudentToClassAction` (165), `removeStudentFromClassAction` (177), `transferStudentClassAction` (196).
- **Hiện trạng:** `requireClassManager()` chỉ kiểm tra vai trò (`ADMIN_AND_MANAGER`), không kiểm tra lớp thuộc trường của QN.
- **Cách sửa:** sau `requireClassManager()`, gọi `assertClassAccess(session, classId, "MANAGE")`. Với transfer thì kiểm tra **cả** `currentClassId` và `targetClassId`. Với enroll thì nên kiểm tra thêm `studentId` là HS (role STUDENT).
- **Nghiệm thu:** QN thao tác trên lớp của trường khác → bị từ chối ở cả 6 action.

#### 🟠 AUTHZ-11 — Các action đọc dữ liệu lớp không kiểm tra quyền
- **Vị trí:** `classes.ts`: `getClassDetailAction` (72), `getAvailableStudentsForClassAction` (189), `getSchoolClassesWithStudentsAction` (216), `getEligibleSchoolStudentsForClassAction` (223), `getNextClassCodeAction` / `generateClassCode` (45, 53).
- **Cách sửa:**
  - `getClassDetailAction`: dùng `assertClassAccess(session, id, "VIEW")`.
  - `getAvailableStudents…` và `getEligible…`: dùng `"MANAGE"`.
  - `getSchoolClassesWithStudentsAction`: dùng `assertSchoolAccess`.
  - `getNextClassCode` / `generateClassCode`: dùng `requireClassManager()`.
- **Nghiệm thu:** HS xem chi tiết lớp mình → được. HS xem lớp khác → bị từ chối. GV xem lớp không dạy → bị từ chối.

### 3D. Tuyển sinh & phân lớp hàng loạt

#### 🔴 AUTHZ-06 — Lưu phân lớp hàng loạt không kiểm tra quyền
- **Vị trí:**
  - `src/actions/bulk-allocation.ts:200` `commitBulkAllocationAction`: **không có** kiểm tra nào. Các hàm còn lại trong file (dòng 38–176) chỉ tính toán, nhưng `parseAndValidateBulkStudentsAction` đọc Excel nên có thể bị DoS.
  - `src/actions/admission-batch.ts`: `commitAdmissionBatchAction` (dòng 214), `parsePhase1AdmissionExcelAction` (dòng 49) và `parsePhase2FeedbackExcelAction` (dòng 154) chỉ dùng `checkAuth`. `exportPhase1ExcelAction` (111) và `generatePhase2AllocationPlanAction` (195) không kiểm tra gì.
- **Khai thác:** HS gọi commit để tạo hàng loạt lớp và tài khoản.
- **Cách sửa:** tất cả action trong 2 file cần `checkRole(session, ROLE_GROUPS.ADMIN_AND_MANAGER)`. Các action commit thêm `assertSchoolAccess(session, schoolId)`.
- **Nghiệm thu:** GV/HS/chưa đăng nhập → bị từ chối. QN commit cho trường khác → bị từ chối.

### 3E. Bài tập & bài nộp

#### 🟠 AUTHZ-20 — `updateAssignmentAction` không kiểm tra quyền sở hữu
- **Vị trí:** `src/actions/assignments.ts:213`.
- **Hiện trạng:** chỉ kiểm tra `EXAM_CREATORS` (ADMIN, TEACHER). Bất kỳ GV nào cũng sửa được đề, đáp án và hạn nộp của **mọi** bài tập.
- **Cách sửa:** dùng lại `verifyAssignmentDeletionPermission`, đổi tên thành `verifyAssignmentOwnership` (vì nó kiểm tra "người tạo hoặc GV của lớp được giao"). Nếu có `data.classId` thì kiểm tra thêm `assertClassAccess(session, data.classId, "TEACH")`.
- **Nghiệm thu:** GV A sửa bài của lớp do GV B dạy (A không phải người tạo) → bị từ chối.

#### 🟠 AUTHZ-21 — `regradeAssignmentSubmissionsAction` không kiểm tra quyền sở hữu
- **Vị trí:** `assignments.ts:261`.
- **Cách sửa và nghiệm thu:** giống AUTHZ-20.

#### 🟠 AUTHZ-22 — Các hàm `verify*Permission` cho qua khi có lỗi (fail-open)
- **Vị trí:** `src/services/assignment.service.ts`: `verifyAssignmentCreationPermission` (2448), `verifyAssignmentDeletionPermission` (2485), `verifySubmissionGradingPermission` (2543).
- **Hiện trạng:**
  - Khối `catch` chỉ `console.warn` rồi `return { ok: true }`.
  - Khi `isDbAlive()` là false thì bỏ qua toàn bộ kiểm tra, trả `ok: true`.
  - Khi không tìm thấy assignment hoặc submission (`if (assignment) {...}`) thì cũng trả `ok: true`.
- **Cách sửa:** trong `catch` trả `{ ok: false, error: "Không thể xác minh quyền, vui lòng thử lại!" }`. Không tìm thấy bản ghi thì trả `{ ok: false, error: "Không tìm thấy bài tập/bài nộp!" }`. DB không sống thì xử lý theo AUTHZ-34.
- **Nghiệm thu:** giả lập Prisma ném lỗi → hàm trả `ok: false`. Truyền id không tồn tại → `ok: false`.

#### 🟠 AUTHZ-26 — Nộp bài: không kiểm tra vai trò, ghi danh hay thời gian mở bài; `classId` do client gửi
- **Vị trí:** `submitAssignmentAction` (`assignments.ts:409`), `submitAssignmentService` (`assignment.service.ts:1729`).
- **Hiện trạng:**
  - Không kiểm tra người nộp là STUDENT. GV hoặc Admin cũng tạo được bài nộp.
  - Không kiểm tra HS có `ClassEnrollment` trong lớp được giao bài.
  - `targetClassId = data.classId || assignment.classId` (dòng 1767). Nếu HS gửi một `classId` không khớp `AssignmentClass` nào thì `classLink` là `undefined`, hệ thống dùng `assignment.dueDate` (có thể `null`), và **hạn nộp riêng của lớp bị bỏ qua**.
  - Không kiểm tra `startDate` (HS nộp được trước khi bài mở). Không kiểm tra `AssignmentClass.isActive` của lớp HS.
- **Cách sửa (trong service, hoặc tách thành hàm `resolveStudentAssignmentLink`):**
  1. Action: `checkRole(session, ["STUDENT"])`.
  2. Tìm `AssignmentClass` có `assignmentId` khớp, `isActive: true`, và `class.enrollments.some.studentId = session.userId`. Nếu HS gửi `classId` thì nó **phải** trùng `classId` của link tìm được. Không tìm thấy link → từ chối với lỗi "Bạn không thuộc lớp được giao bài tập này!".
  3. Dùng `link.startDate` và `link.dueDate` của link đó: `now < startDate` → từ chối; `now > dueDate` → từ chối.
  4. Ghi `classId` và `assignmentClassId` lấy từ link, **không** lấy từ `data.classId`.
- **Nghiệm thu:**
  - HS không thuộc lớp → bị từ chối.
  - HS gửi `classId` giả → bị từ chối.
  - Nộp trước `startDate` hoặc sau `dueDate` → bị từ chối.
  - GV gọi → bị từ chối.
  - HS hợp lệ → nộp được.

#### 🟠 AUTHZ-27 — `getAssignmentDetailAction` không kiểm tra phạm vi; lộ đáp án
- **Vị trí:** `assignments.ts:60`, `getAssignmentDetailService` (`assignment.service.ts:1387`).
- **Hiện trạng:**
  - Mọi người đã đăng nhập xem được mọi bài tập theo id.
  - Chỉ HS bị ẩn đáp án (`hideAnswers = role === "STUDENT"`). Nghĩa là **GV, TA hoặc QN của lớp khác xem được đáp án** của mọi bài.
  - HS không thuộc lớp vẫn xem được đề. Kết hợp với AUTHZ-26, HS có thể nộp bài rồi xem đáp án.
- **Cách sửa:** viết `assertAssignmentAccess(session, assignmentId, "VIEW")`:
  - ADMIN: luôn được.
  - QN: lớp gốc hoặc một lớp được giao thuộc trường mình.
  - GV/TA: là người tạo hoặc có `ClassAssignment` ở lớp gốc hoặc một lớp được giao.
  - HS: có `ClassEnrollment` ở một lớp có `AssignmentClass.isActive`.
- **Nghiệm thu:** GV lớp khác → bị từ chối. HS lớp khác → bị từ chối. HS đúng lớp → xem được, đáp án ẩn hoặc hiện theo cấu hình.

#### 🟠 AUTHZ-28 — `getClassAssignmentsAction` không kiểm tra phạm vi
- **Vị trí:** `assignments.ts:34`, service `getClassAssignmentsService` (`assignment.service.ts:963`; nhánh DB ở dòng 1046).
- **Hiện trạng:** trả danh sách bài tập và thống kê nộp bài (số đã nộp, số bị gắn cờ gian lận…) của lớp bất kỳ.
- **Cách sửa:** `assertClassAccess(session, classId, "VIEW")`. Ngoài ra, với HS **không** trả thống kê toàn lớp (`pendingGradingCount`, `flaggedCount`…), chỉ trả `mySubmission`.
- **Nghiệm thu:** HS hoặc GV lớp khác → bị từ chối.

#### 🟡 AUTHZ-29 — `transcribeSpeakingAnswerAction` chỉ cần đăng nhập
- **Vị trí:** `assignments.ts:533`.
- **Rủi ro:** người dùng bất kỳ gọi Groq Whisper liên tục với `audioUrl` tùy ý, gây tốn quota API.
- **Cách sửa:** giới hạn cho `STAFF_AND_ADMIN` (GV/TA dùng khi chấm). Chỉ chấp nhận `audioUrl` bắt đầu bằng `/uploads/`. Cân nhắc thêm giới hạn tần suất (rate limit).

### 3F. Báo cáo & nhận xét

#### 🟠 AUTHZ-17 — Báo cáo không kiểm tra phạm vi của QN và TA
- **Vị trí:** `src/services/report.service.ts`
  - `getSchoolReportService` (456): chỉ chặn TEACHER và STUDENT. **QN xem được báo cáo của mọi trường**. TA cũng lọt nếu gọi service trực tiếp, nhưng action đã chặn TA bằng `ADMIN_AND_MANAGER`.
  - `getClassReportService` (843): chỉ kiểm tra phạm vi cho TEACHER (dòng 964). **QN xem được mọi lớp**.
  - `getStudentReportService` (1343): kiểm tra STUDENT (dòng 1350) và TEACHER (dòng 1419). **QN và TA xem được mọi HS** (action `getStudentReportAction` chỉ dùng `checkAuth`).
- **Cách sửa:**
  - Action trường: thêm `assertSchoolAccess(session, schoolId)`.
  - Action lớp: thêm `assertClassAccess(session, classId, "VIEW")`. TA đã bị chặn bởi `REPORT_COMMENT_AUTHORS`, giữ nguyên.
  - Action học sinh: chặn TA bằng `checkRole(session, ["ADMIN","SCHOOL_MANAGER","TEACHER","STUDENT"])` (khớp `VIEW_REPORTS`). Thêm `assertStudentAccess(session, studentId)` (HS: chính mình; GV: HS lớp mình; QN: HS trường mình).
  - Nếu có `classId` thì kiểm tra HS có thuộc lớp đó.
- **Nghiệm thu:** QN gọi báo cáo trường, lớp hoặc HS của trường khác → bị từ chối. TA gọi báo cáo HS → bị từ chối.

#### 🟠 AUTHZ-18 — Viết nhận xét không kiểm tra phạm vi
- **Vị trí:** `saveReportCommentAction` (`reports.ts:184`), `upsertReportCommentService` (`report-comment.service.ts:141`).
- **Hiện trạng:** GV hoặc QN viết hoặc ghi đè nhận xét cho **mọi lớp và mọi HS**. Không kiểm tra `studentId` có thuộc `classId`.
- **Cách sửa:** gọi `assertClassAccess(session, classId, "VIEW")`. Với GV, quyền này nghĩa là lớp mình dạy; TA đã bị chặn bởi role group. Nếu `scope === "STUDENT"` thì kiểm tra `ClassEnrollment(classId, studentId)` tồn tại.
- **Nghiệm thu:** GV ghi nhận xét cho lớp không dạy → bị từ chối. Gửi `studentId` không thuộc lớp → bị từ chối.

#### 🟡 AUTHZ-19 — `markReportCommentReadAction` đánh dấu được nhận xét lớp của người khác
- **Vị trí:** `report-comment.service.ts:311`. Điều kiện `OR: [{ studentId }, { scope: "CLASS" }]` khớp với mọi nhận xét CLASS của mọi lớp.
- **Cách sửa:** chỉ HS được gọi. Điều kiện cập nhật: `{ id, OR: [{ studentId: me }, { scope: "CLASS", class: { enrollments: { some: { studentId: me } } } }] }`.

### 3G. Học liệu

#### 🟠 AUTHZ-25 — Mọi thao tác ghi học liệu chỉ cần đăng nhập (HS cũng xóa được)
- **Vị trí:** `src/actions/materials.ts`
  - Ghi: `createMaterialFolderAction` (50), `deleteMaterialFolderAction` (69), `uploadLearningMaterialAction` (99), `deleteLearningMaterialAction` (123), `uploadMultipleLearningMaterialsAction` (138), `updateLearningMaterialAction` (164).
  - Service xóa (`material.service.ts:403`, `:577`) cập nhật theo id mà không kiểm tra gì.
  - Đọc: `getMaterialFoldersAction` (33) và `getLearningMaterialsAction` (84) không kiểm tra lớp. `getLevelRepositoryFoldersAction` (283), `getMaterialsSummaryAction` (295) và `incrementMaterialDownloadCountAction` (181) không kiểm tra gì.
  - **Đã đúng:** `distributeLearningMaterialsAction` và `uploadCoursebookPackageAction` có `checkNotStudent` và lọc lớp theo QN (service dòng 834, 914). Riêng GV thì cần kiểm tra thêm lớp đích là lớp mình.
- **Cách sửa:** viết `assertFolderAccess(session, folderId, "VIEW" | "EDIT")`:
  - Lấy folder. Nếu là thư mục con thì đi ngược `parentId` tới thư mục gốc có `classId` hoặc `ieltsLevelId`.
  - Folder có `classId`: `VIEW` → `assertClassAccess(..., "VIEW")`; `EDIT` → ADMIN, QN của trường, hoặc GV có `ClassAssignment` trong lớp (`roleInClass = TEACHER`).
  - Folder có `ieltsLevelId` (kho chung): `VIEW` → mọi nhân sự, còn HS chỉ khi có lớp thuộc trình độ đó ❓; `EDIT` → chỉ ADMIN ❓.
  - Với material thì lấy `folderId` của nó rồi gọi `assertFolderAccess`.
  - Create folder: kiểm tra `data.classId`, `data.ieltsLevelId` hoặc `data.parentId` theo chế độ `EDIT`.
- **Nghiệm thu:** HS xóa hoặc sửa tài liệu → bị từ chối. GV xóa tài liệu lớp khác → bị từ chối. HS xem thư mục lớp khác → bị từ chối.

### 3H. API Routes

#### 🔴 AUTHZ-07 — `/api/materials/upload` không yêu cầu đăng nhập; cho upload `.html`
- **Vị trí:** `src/app/api/materials/upload/route.ts:50`.
- **Hiện trạng:** không đọc session. `sanitizeFileName` giữ nguyên đuôi file. File ghi vào `public/uploads/materials/` và được phục vụ **cùng domain**.
- **Khai thác:** khách upload `x.html` chứa JavaScript, rồi gửi link `/uploads/materials/…x.html` cho Admin. Đây là stored XSS (dù cookie phiên là `httpOnly`, script vẫn gọi được server action dưới danh nghĩa Admin). Ngoài ra kẻ tấn công có thể upload liên tục làm đầy ổ đĩa.
- **Cách sửa:**
  1. `const session = await getSession(); if (!session) return 401`.
  2. Chỉ nhận một danh sách đuôi file và MIME type được phép (`.pdf .docx .doc .pptx .xlsx .mp3 .wav .m4a .webm .ogg .mp4 .png .jpg .jpeg .gif .webp`). **Cấm** `.html .htm .svg .js .xml`.
  3. HS chỉ được upload audio (`.webm .wav .mp3 .m4a .ogg`) để nộp bài Speaking.
  4. Giới hạn dung lượng, ví dụ 50MB (audio của HS 10MB).
- **Nghiệm thu:** chưa đăng nhập → 401. Upload `.html` → 400. HS upload `.pdf` → 403.

#### 🟠 AUTHZ-31 — `/api/pdf-proxy` là proxy mở (SSRF)
- **Vị trí:** `src/app/api/pdf-proxy/route.ts`.
- **Hiện trạng:** không kiểm tra đăng nhập, fetch **bất kỳ** URL http/https nào kể cả địa chỉ nội bộ (`http://169.254.169.254/`, `http://localhost:5432`), và trả về với `Access-Control-Allow-Origin: *`.
- **Cách sửa:** yêu cầu session. Chặn host là IP private hoặc loopback hoặc link-local (phân giải DNS rồi mới kiểm tra). Tốt nhất là dùng danh sách domain được phép. Bỏ `Access-Control-Allow-Origin: *`.

#### 🟡 AUTHZ-32 — `/api/materials/docx-preview` không yêu cầu đăng nhập, không chuẩn hóa đường dẫn
- **Vị trí:** `src/app/api/materials/docx-preview/route.ts`.
- **Cách sửa:** yêu cầu session. Sau `path.join`, kiểm tra `path.resolve(fullPath).startsWith(path.resolve(process.cwd(), "public", "uploads", "materials") + path.sep)`.

### 3I. Hạ tầng xác thực

#### 🔴 AUTHZ-08 — Secret ký JWT có giá trị mặc định viết cứng
- **Vị trí:** `src/lib/auth.ts:5-7`: `process.env.AUTH_SECRET || "simpace-lms-kltn-2026-super-secure-key"`.
- **Khai thác:** nếu môi trường deploy quên đặt `AUTH_SECRET`, ai đọc repo public cũng tự ký được JWT `{ role: "ADMIN" }`.
- **Cách sửa:** khi `NODE_ENV === "production"` mà thiếu `AUTH_SECRET` (hoặc ngắn hơn 32 ký tự) thì `throw new Error(...)`. Môi trường dev có thể giữ giá trị mặc định nhưng phải `console.warn`.

#### 🔴 AUTHZ-09 — `getSession()` ưu tiên `globalThis.mockSession`
- **Vị trí:** `src/lib/auth.ts:46-49`.
- **Rủi ro:** nếu biến này được gán trong môi trường thật (do script test chạy chung process, hoặc một lỗi prototype pollution), mọi request đều nhận session đó.
- **Cách sửa:** chỉ đọc khi `process.env.NODE_ENV === "test"` hoặc `process.env.ALLOW_MOCK_SESSION === "1"`. Script `scripts/test_phase1_rbac.ts` cần đặt biến môi trường tương ứng.

#### 🟠 AUTHZ-33 — Vai trò và trạng thái tài khoản lấy từ JWT, không kiểm tra lại DB
- **Hiện trạng:** JWT sống 7 ngày. Bị đổi vai trò hoặc bị xóa mềm (`isActive=false`) vẫn giữ quyền cũ cho đến khi token hết hạn.
- **Cách sửa (chọn 1):**
  - (a) Trong `getSession()`, sau khi verify thì truy vấn `prisma.user.findUnique({ select: { isActive, role: { select: { code } } } })` và dùng `role` từ DB. Kết quả có thể cache theo request bằng `React.cache`.
  - (b) Giảm hạn JWT xuống 1 ngày và kiểm tra `isActive` tại login.
  - **Khuyến nghị: (a).**

#### 🟠 AUTHZ-34 — Chế độ demo/in-memory khi DB chết bỏ qua kiểm tra
- **Hiện trạng:** nhiều service có nhánh `if (!(await isDbAlive()))` trả dữ liệu demo hoặc ghi vào bộ nhớ, và bỏ qua mọi kiểm tra phạm vi.
- **Cách sửa (cần nhóm quyết):** thêm biến `DEMO_MODE`. Khi `DEMO_MODE !== "1"` mà DB chết thì mọi thao tác **ghi** trả lỗi "Hệ thống đang bảo trì CSDL" và các helper `assert*` trả từ chối. Không xóa code demo (luật AGENTS.md #2).

#### 🟡 AUTHZ-23 — Điều kiện viết cứng `a.userId === "teacher-1"` trong báo cáo
- **Vị trí:** `report.service.ts:128`, `:966`, `:1422`.
- **Rủi ro:** tài khoản có id `teacher-1` được coi là GV của mọi lớp.
- **Cách sửa:** chỉ giữ điều kiện này trong nhánh demo (khi `DEMO_MODE`), hoặc xóa đi.

#### 🟡 AUTHZ-13 — `getSystemPermissionsAction` không yêu cầu đăng nhập
- **Vị trí:** `src/actions/permissions.ts:25`.
- **Cách sửa:** dùng `checkAuth`.

#### 🟡 AUTHZ-35 — Ma trận phân quyền động trên màn Cài đặt chỉ là hình thức
- **Hiện trạng:** bảng `SystemPermission` và `hasFeatureAccess` chỉ được server áp dụng cho `SYSTEM_SETTINGS`. Các quyền khác cố định trong `ROLE_GROUPS`. Admin tắt `VIEW_REPORTS` của GV trên giao diện thì server **vẫn cho** GV xem báo cáo.
- **Cách sửa (cần nhóm quyết):**
  - (a) Ghi rõ trên UI rằng ma trận chỉ điều khiển menu hiển thị.
  - (b) Thêm `requireFeature(session, featureKey)` vào đầu các action tương ứng: `VIEW_USERS` cho `users.ts`, `VIEW_SCHOOLS` cho `schools.ts`, `VIEW_CLASSES` cho `classes.ts`, `VIEW_REPORTS` cho `reports.ts`, `IMPORT_EXCEL` cho `admission-batch.ts` và `bulk-allocation.ts`.
  - **Khuyến nghị: làm (b) sau khi xong Phase 1–3.**

---

## 4. HẠ TẦNG CẦN THÊM (PHASE 0) — helper kiểm tra phạm vi dùng chung

Mục tiêu: **mọi** kiểm tra phạm vi đi qua một chỗ, đúng luật "phân quyền đi qua `src/lib/permissions.ts`".
Truy vấn DB đặt ở service mới. `permissions.ts` re-export lại để action chỉ import từ một nơi.

### 4.1. File mới `src/services/access-scope.service.ts`
```ts
import { prisma, isDbAlive } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export type ScopeResult = { ok: true } | { ok: false; error: string };
const OK: ScopeResult = { ok: true };
const deny = (error: string): ScopeResult => ({ ok: false, error });

/** VIEW: xem | TEACH: GV dạy lớp (tạo bài, học liệu) | GRADE: GV hoặc TA chấm | MANAGE: Admin hoặc QN quản lý lớp */
export type ClassNeed = "VIEW" | "TEACH" | "GRADE" | "MANAGE";

async function dbGuard(): Promise<ScopeResult | null> {
  if (await isDbAlive()) return null;
  return process.env.DEMO_MODE === "1" ? OK : deny("Không thể xác minh quyền do CSDL không khả dụng!");
}

export async function assertSchoolAccess(s: SessionPayload, schoolId: string): Promise<ScopeResult> {
  if (s.role === "ADMIN") return OK;
  if (s.role !== "SCHOOL_MANAGER") return deny("Bạn không có quyền truy cập trường học này!");
  const g = await dbGuard(); if (g) return g;
  try {
    const sc = await prisma.school.findUnique({ where: { id: schoolId }, select: { managerId: true } });
    if (!sc) return deny("Trường học không tồn tại!");
    return sc.managerId === s.userId ? OK : deny("Trường học này không thuộc phạm vi quản nhiệm của bạn!");
  } catch { return deny("Không thể xác minh quyền, vui lòng thử lại!"); }
}

export async function assertClassAccess(s: SessionPayload, classId: string, need: ClassNeed): Promise<ScopeResult> {
  if (s.role === "ADMIN") return OK;
  const g = await dbGuard(); if (g) return g;
  try {
    const c = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        school: { select: { managerId: true } },
        assignments: { where: { userId: s.userId }, select: { roleInClass: true } },
        enrollments: { where: { studentId: s.userId }, select: { id: true } },
      },
    });
    if (!c) return deny("Lớp học không tồn tại!");
    const isStaff = c.assignments.length > 0;
    const isTeacher = c.assignments.some((a) => a.roleInClass === "TEACHER");
    switch (s.role) {
      case "SCHOOL_MANAGER":
        return c.school?.managerId === s.userId && (need === "VIEW" || need === "MANAGE")
          ? OK : deny("Lớp học không thuộc trường bạn quản nhiệm!");
      case "TEACHER":
        if (need === "MANAGE") return deny("Giáo viên không có quyền quản lý lớp học!");
        // need === "TEACH" yêu cầu roleInClass = TEACHER
        return (need === "TEACH" ? isTeacher : isStaff) ? OK : deny("Bạn không được phân công giảng dạy lớp này!");
      case "TEACHING_ASSISTANT":
        return (need === "VIEW" || need === "GRADE") && isStaff ? OK : deny("Bạn không được phân công lớp này!");
      case "STUDENT":
        return need === "VIEW" && c.enrollments.length > 0 ? OK : deny("Bạn không thuộc lớp học này!");
      default:
        return deny("Bạn không có quyền truy cập lớp học này!");
    }
  } catch { return deny("Không thể xác minh quyền, vui lòng thử lại!"); }
}

/** Trả danh sách classId mà bài tập đang được giao (lớp gốc + các AssignmentClass còn hoạt động) */
export async function getAssignmentClassIds(assignmentId: string): Promise<{ createdById: string; classIds: string[] } | null> { /* ... */ }

export async function assertAssignmentAccess(s: SessionPayload, assignmentId: string, need: "VIEW" | "EDIT" | "GRADE"): Promise<ScopeResult> {
  // ADMIN: OK
  // EDIT: TEACHER và (createdById === me hoặc assertClassAccess(classId, "TEACH") ok với ít nhất 1 classId)
  // GRADE: TEACHER hoặc TA, và assertClassAccess(classId, "GRADE") ok với ít nhất 1 classId
  // VIEW: assertClassAccess(classId, "VIEW") ok với ít nhất 1 classId (HS: chỉ tính AssignmentClass.isActive)
  // Không tìm thấy hoặc lỗi → deny
}

export async function assertStudentAccess(s: SessionPayload, studentId: string): Promise<ScopeResult> {
  // ADMIN: OK. STUDENT: studentId === me.
  // TEACHER: tồn tại ClassEnrollment(studentId) trong lớp có ClassAssignment(me)
  // SCHOOL_MANAGER: tồn tại ClassEnrollment(studentId) trong lớp thuộc School.managerId = me
  // TA: deny (theo VIEW_REPORTS)
}

export async function assertUserInManagerScope(s: SessionPayload, targetUserId: string): Promise<ScopeResult> {
  // ADMIN: OK. SCHOOL_MANAGER: user là TEACHER/TA/STUDENT và có ClassAssignment hoặc ClassEnrollment
  //   trong lớp thuộc trường mình. Vai trò khác: deny.
}

export async function assertFolderAccess(s: SessionPayload, folderId: string, need: "VIEW" | "EDIT"): Promise<ScopeResult> {
  // Đi ngược parentId (tối đa ~20 cấp) tới folder có classId hoặc ieltsLevelId.
  // classId: VIEW → assertClassAccess(VIEW); EDIT → assertClassAccess(TEACH) hoặc MANAGE
  // ieltsLevelId: VIEW → nhân sự OK (HS ❓); EDIT → chỉ ADMIN (❓)
}

export async function assertMaterialAccess(s: SessionPayload, materialId: string, need: "VIEW" | "EDIT"): Promise<ScopeResult> {
  // Lấy folderId từ materialId rồi gọi assertFolderAccess
}
```

### 4.2. Bổ sung `src/lib/permissions.ts`
```ts
export * from "@/services/access-scope.service"; // action chỉ import từ "@/lib/permissions"

/** Tiện ích: chạy checkRole + scope rồi trả lỗi chuẩn cho action */
export function denied(error: string) { return { success: false as const, error }; }
```
> Nếu nhóm không muốn `lib` import từ `services`, hãy giữ helper ở service và ghi ngoại lệ này vào AGENTS.md.

### 4.3. Mẫu viết action chuẩn (mọi action phải theo)
```ts
export async function updateClassAction(id: string, data: {...}) {
  const auth = checkRole(await getSession(), ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Chỉ Quản trị viên hoặc Quản nhiệm trường mới có quyền thay đổi thông tin lớp học!");
  if (!auth.ok) return { success: false, error: auth.error };          // 1. Vai trò
  const scope = await assertClassAccess(auth.session, id, "MANAGE");
  if (!scope.ok) return { success: false, error: scope.error };        // 2. Phạm vi
  // 3. Validate zod  4. Gọi service với auth.session.userId (không dùng userId từ client)
  const res = await updateClassService(id, data);
  if (res.success) safeRevalidate("/classes");
  return res;
}
```

---

## 5. KẾ HOẠCH THỰC HIỆN THEO PHASE

| Phase | Mã lỗi | File chạm vào | Ghi chú |
|---|---|---|---|
| **0 — Hạ tầng** | (mục 4), AUTHZ-08, AUTHZ-09, AUTHZ-22 | `src/services/access-scope.service.ts` (mới), `src/lib/permissions.ts`, `src/lib/auth.ts`, `src/services/assignment.service.ts` (3 hàm verify) | Viết helper và test helper trước |
| **1 — Chặn chiếm quyền (P0)** | AUTHZ-01, 02, 03, 04, 05, 06, 07 | `src/actions/users.ts`, `classes.ts`, `bulk-allocation.ts`, `admission-batch.ts`, `src/app/api/materials/upload/route.ts` | **Ưu tiên cao nhất.** Sau phase này HS không còn tự lên Admin được |
| **2 — Phạm vi Quản nhiệm** | AUTHZ-10, 11, 12, 14, 15, 16, 17 (phần QN) | `users.ts`, `schools.ts`, `classes.ts`, `reports.ts`, `user.service.ts` (nếu cần) | |
| **3 — Phạm vi Giáo viên/TA** | AUTHZ-17 (TA), 18, 20, 21, 25, 29 | `assignments.ts`, `reports.ts`, `materials.ts`, `report-comment.service.ts` | |
| **4 — Phạm vi Học sinh** | AUTHZ-19, 26, 27, 28 | `assignments.ts`, `assignment.service.ts`, `report-comment.service.ts` | AUTHZ-26 sửa logic nộp bài, cần test kỹ luồng làm bài |
| **5 — Hạ tầng còn lại** | AUTHZ-13, 23, 31, 32, 33, 34, 35 | `auth.ts`, `report.service.ts`, `api/pdf-proxy`, `api/materials/docx-preview`, `permissions.ts` | AUTHZ-34 và 35 cần nhóm quyết trước |

**Kiểm tra sau mỗi phase:** UI vẫn chạy đúng với tài khoản hợp lệ của từng vai trò. Không được chặn nhầm người có quyền.

---

## 6. KẾ HOẠCH KIỂM THỬ

Mở rộng `scripts/test_phase1_rbac.ts` (đã có cơ chế `globalThis.mockSession`; sau AUTHZ-09 phải chạy với `ALLOW_MOCK_SESSION=1`).

**Dữ liệu cần chuẩn bị (seed trong test):** 2 trường S1 và S2. QN1 quản lý S1. Lớp C1 thuộc S1, lớp C2 thuộc S2. GV1 dạy C1, GV2 dạy C2. TA1 ở C1. HS1 học C1, HS2 học C2. Bài A1 do GV1 tạo, giao cho C1. Thư mục F1 thuộc C1.

**Ma trận test tối thiểu** (mỗi dòng gồm 1 ca **được phép** và ≥1 ca **bị chặn**):

| Mã | Ca được phép | Ca phải bị chặn |
|---|---|---|
| 01–02 | ADMIN `updateUserAction(HS1, {roleCode:"TEACHER"})` | HS1 `updateUserAction(HS1,{roleCode:"ADMIN"})`; QN1 `{roleCode:"ADMIN"}`; QN1 sửa HS2; GV1 bất kỳ |
| 03 | HS1 `updateProfileAction(HS1,...)` | HS1 `updateProfileAction(ADMIN,{email})` → email Admin **không đổi** |
| 05, 15 | QN1 sửa C1 | QN1 sửa/xóa/ghi danh C2; HS1 `deleteClassAction(C1)` |
| 06 | QN1 commit cho S1 | QN1 commit cho S2; GV1 commit |
| 07 | GV1 upload `.pdf` | Khách upload; upload `.html`; HS1 upload `.pdf` |
| 10 | QN1 `getUsersAction` chỉ thấy người của S1 | GV1, HS1, khách `getUsersAction` |
| 12, 14 | QN1 sửa tên S1 | QN1 sửa S2; QN1 `updateSchoolAction(S1,{managerId:X})` |
| 17 | QN1 báo cáo S1/C1/HS1; HS1 báo cáo chính mình | QN1 báo cáo S2/C2/HS2; TA1 báo cáo HS1; GV1 báo cáo HS2 |
| 18 | GV1 nhận xét C1/HS1 | GV1 nhận xét C2; GV1 nhận xét C1 với studentId=HS2 |
| 20–21 | GV1 sửa/chấm lại A1 | GV2 sửa/chấm lại A1 |
| 22 | — | Prisma ném lỗi → `verify*` trả `ok:false`; id không tồn tại → `ok:false` |
| 25 | GV1 xóa tài liệu trong F1 | HS1 xóa tài liệu F1; GV2 xóa tài liệu F1 |
| 26 | HS1 nộp A1 với classId=C1 trong hạn | HS2 nộp A1; HS1 nộp với classId=C2; HS1 nộp trước startDate/sau dueDate; GV1 nộp |
| 27 | HS1 xem A1 (không có đáp án trước khi nộp) | HS2 xem A1; GV2 xem A1 |
| 28 | HS1 `getClassAssignmentsAction(C1)` | HS1 `getClassAssignmentsAction(C2)` |

Chạy: `npx tsx scripts/test_phase1_rbac.ts` (hoặc lệnh tương ứng trong `package.json`). Báo số ca pass/fail thật.

---

## 7. MẪU PROMPT GIAO VIỆC CHO AI KHÁC

Copy nguyên khối dưới đây và đổi phần trong `<>`:

```
Đọc AGENTS.md và docs/security/AUTHZ_AUDIT_AND_FIX_PLAN.md.
Nhiệm vụ: thực hiện PHASE <số> — các mã <AUTHZ-xx, AUTHZ-yy>.
Yêu cầu:
1. Trước khi sửa: "Nhắc lại hiểu biết" theo AGENTS.md mục 2.2, liệt kê [C1], [C2]… tương ứng từng mã AUTHZ, danh sách file sẽ chạm. Chờ tôi xác nhận.
2. Sửa đúng theo mục "Cách sửa" của từng mã, khớp Ma trận quyền đích (mục 2). Dùng helper ở mục 4; nếu chưa có thì dừng lại và báo (phải làm Phase 0 trước).
3. Không đổi schema, không xóa nhánh demo, không refactor ngoài phạm vi.
4. Thêm ca test cho từng mã theo mục 6 vào scripts/test_phase1_rbac.ts.
5. Chạy npx tsc --noEmit, npm run lint, script test; báo kết quả thật.
6. Kết thúc bằng bảng Definition of Done, mỗi mã AUTHZ một dòng, kèm "Tiêu chí nghiệm thu" đã đạt hay chưa.
```

---

## 8. PHỤ LỤC — Những chỗ ĐÃ LÀM ĐÚNG (không cần sửa, dùng làm mẫu)
- `createAssignmentAction` + `verifyAssignmentCreationPermission`: GV chỉ giao bài cho lớp được phân công (cần sửa riêng phần fail-open, AUTHZ-22).
- `gradeSubmissionAction` + `verifySubmissionGradingPermission`: kiểm tra người tạo hoặc GV/TA phụ trách lớp.
- `getSubmissionsForAssignmentService`: lọc theo vai trò HS, GV/TA và QN.
- `getStudentReportAction`: HS bị ép về `session.userId`.
- `getClassesService`: lọc danh sách lớp đúng cho cả 4 vai trò.
- `getSchoolReportAction`, `getClassReportAction`: chặn đúng vai trò (chỉ thiếu kiểm tra phạm vi).
- `changePasswordAction`: so `userId` với session (mẫu đúng cho AUTHZ-03).
- `deleteSchoolAction`, `createSchoolAction`, `changeSchoolManagerAction`, các action `ielts-levels`: chỉ ADMIN.
- `distributeLearningMaterialsService`: lọc lớp theo QN.
- `getAssignmentDetailService`: ẩn đáp án theo `answerVisibility` cho HS.
