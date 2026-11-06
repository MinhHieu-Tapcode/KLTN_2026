# AUTHZ_FIX_STATUS — Kết quả xử lý phân quyền (nhánh `fix/authz-hardening`)

Tham chiếu: `AUTHZ_AUDIT_AND_FIX_PLAN.md`. Mã AUTHZ-36 → 38 là lỗi bổ sung phát hiện khi rà soát (xem cuối file).

## Hạ tầng mới
- `src/services/access-scope.service.ts`: `assertSchoolAccess`, `assertClassAccess`, `assertAssignmentAccess`, `assertStudentAccess`,
  `assertUserInManagerScope`, `assertUserMutationAllowed`, `assertFolderAccess`, `assertFolderScopeAccess`, `assertMaterialAccess`,
  `assertUserHasRole`, `isStudentEnrolledInClass`. Fail-closed; DB chết chỉ cho qua khi `DEMO_MODE=1`.
  *Ngoại lệ so với AGENTS.md ("phân quyền đi qua permissions.ts")*: `permissions.ts` được import bởi component client nên không thể re-export
  service dùng Prisma. Action import trực tiếp từ `access-scope.service`.
- `src/lib/otp-guard.ts`: OTP bằng CSPRNG, giới hạn thử sai / tần suất yêu cầu.

## Trạng thái từng mã
| Mã | Trạng thái | Ghi chú |
|---|---|---|
| 01, 02, 03, 04 | Đã sửa | `users.ts`; QN bị giới hạn vai trò / `schoolIds` / trường mình |
| 05, 15, 11 | Đã sửa | `classes.ts`, kiểm tra cả lớp nguồn và đích khi chuyển lớp |
| 06 | Đã sửa | `bulk-allocation.ts`, `admission-batch.ts` |
| 07, 31, 32 | Đã sửa | upload cần đăng nhập + whitelist đuôi file; pdf-proxy chặn IP nội bộ; docx-preview chặn path traversal |
| 08, 09 | Đã sửa | secret production bắt buộc ≥32 ký tự (kiểm tra khi dùng, không khi import); mockSession chỉ khi `NODE_ENV=test` hoặc `ALLOW_MOCK_SESSION=1` |
| 10, 12, 14, 16 | Đã sửa | |
| 13 | Đã sửa | |
| 17, 18, 19 | Đã sửa | |
| 20, 21, 22, 26, 27, 28, 29 | Đã sửa | nộp bài lấy lớp từ ghi danh + `AssignmentClass`, kiểm tra `startDate`/`dueDate` |
| 23 | Đã sửa | `teacher-1` chỉ còn khi `DEMO_MODE=1` |
| 25 | Đã sửa | Trợ giảng chỉ xem; kho trình độ chỉ Admin sửa |
| 33 | Đã sửa | `getSession()` đọc lại `isActive` + vai trò từ DB (thêm 1 truy vấn / request) |
| 34 | Đã sửa một phần | helper, `verify*Permission`, `getSession` đã fail-closed. Các nhánh demo bên trong từng service (`user.service`, `class.service`...) chưa đổi (AGENTS.md cấm refactor ngoài phạm vi) |
| 35 | Đã sửa theo hướng (b) | `requireFeature` (`feature-access.service.ts`) áp ma trận `SystemPermission` cho VIEW_USERS, VIEW_SCHOOLS, VIEW_CLASSES (thao tác quản lý), VIEW_REPORTS, IMPORT_EXCEL. Ma trận chỉ **thu hẹp** quyền, không mở rộng vượt nhóm vai trò cố định của action |

## Lỗi bổ sung
- **AUTHZ-36 OTP**: đã sửa (CSPRNG, khóa sau 5 lần sai, cooldown 60s, thông báo thống nhất). *Giới hạn:* bộ đếm trong bộ nhớ tiến trình, trên serverless chỉ là giảm thiểu.
- **AUTHZ-37 Kích hoạt OTP**: chỉ tài khoản còn `mustChangePassword` mới nhận / dùng OTP kích hoạt.
- **AUTHZ-38 Admin mặc định**: production bắt buộc `DEFAULT_ADMIN_PASSWORD` (≥12 ký tự) và buộc đổi mật khẩu; không còn in mật khẩu ra log.

## Đã xử lý thêm
- Mật khẩu mặc định `Simpace@2026` đã bỏ: mỗi lần tạo người dùng / mỗi đợt phân lớp sinh mật khẩu tạm ngẫu nhiên 12 ký tự (`src/lib/temp-password.ts`).
  Đợt phân lớp hàng loạt dùng chung **một** mật khẩu cho cả đợt (hash từng người trong transaction dễ quá thời gian). Học viên vẫn bị buộc đổi mật khẩu khi đăng nhập lần đầu.
- 3 file ghi âm Speaking của học viên bị gỡ khỏi chỉ mục git và thêm vào `.gitignore`.

## Dữ liệu trả về / hiển thị quá quyền (phát hiện thêm)
- **AUTHZ-39 — lộ `passwordHash`:** mọi truy vấn `include: { profile: true }` trên User trả luôn băm mật khẩu; server action gửi nguyên xuống trình duyệt
  (học viên xem được băm mật khẩu của giáo viên và bạn cùng lớp trong tab Network). Đã thêm `src/lib/sanitize.ts` (`stripSensitive`) và áp cho các action
  trả dữ liệu người dùng / lớp / trường / báo cáo / bài nộp.
- **AUTHZ-40 — học viên thấy thông tin cá nhân bạn cùng lớp:** `redactClassmatesForStudent` chỉ giữ tên + ảnh đại diện; email, SĐT, ngày sinh, địa chỉ của bạn bị ẩn.
- **AUTHZ-41 — "Hoạt động gần đây" lộ dữ liệu toàn hệ thống cho mọi vai trò:** nay Admin thấy toàn bộ; Quản nhiệm / GV / TA chỉ thấy lớp + học liệu trong phạm vi mình; học viên không thấy.
- **AUTHZ-42 — nút hiển thị nhưng server từ chối:** Quản nhiệm không còn thấy nút thêm / xóa trong Kho học liệu chung và lựa chọn "lưu vào kho chung" (chỉ Admin); menu "Báo cáo" ẩn với vai trò không có `VIEW_REPORTS` (Trợ giảng).

- **AUTHZ-43 — học viên thấy lớp (thời khóa biểu) không thuộc mình:** (1) khi đăng xuất rồi đăng nhập tài khoản khác trên cùng tab, `simpace-app.tsx` giữ lại danh sách lớp của người trước và
  *gộp* với danh sách mới; (2) trang thời khóa biểu mặc định hiển thị mọi lớp chưa có danh sách ghi danh. Đã xóa dữ liệu khi đăng xuất / đăng nhập, danh sách lớp lấy hoàn toàn từ server,
  và bộ lọc thời khóa biểu của học viên / trợ giảng chỉ giữ lớp có ghi danh / phân công của chính họ.

## Việc còn lại cần người quyết định
1. Các file ghi âm vẫn còn trong **lịch sử** git; muốn xóa hẳn cần viết lại lịch sử (`git filter-repo`), việc này ảnh hưởng mọi thành viên nhóm nên chưa làm.
2. AUTHZ-34: các nhánh demo bên trong từng service (`user.service`, `class.service`...) chưa đổi vì `AGENTS.md` cấm refactor ngoài phạm vi. Chúng chỉ chạy khi DB chết, không khai thác được khi DB sống.
3. Giới hạn thử sai OTP nằm trong bộ nhớ tiến trình; muốn chặn tuyệt đối trên serverless cần lưu bộ đếm vào DB (cần thêm bảng/cột).
4. Quản nhiệm chưa sửa được người dùng chưa gắn lớp nào (không đổi schema nên không có cột người tạo).
5. `npm run lint` không chạy được vì `eslint` không có trong `package.json` (có sẵn từ trước).
6. Ca kiểm thử cần DB thật (được phép / chặn chéo trường) chưa tự động hóa; `scripts/test_phase1_rbac.ts` có 4 ca lỗi cũng xảy ra trước khi sửa (cần DB).
