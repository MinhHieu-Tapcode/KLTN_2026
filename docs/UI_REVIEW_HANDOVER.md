# HANDOVER: Rà soát giao diện, text thừa và logo
**Dự án: LMS SIMPACE Việt Nam. Người nhận: AI thực hiện (Gemini).**

> Đọc `AGENTS.md` trước. Tài liệu này là kết quả rà soát **chỉ bằng đọc code**, chưa chạy giao diện thật. Hãy tự xác minh từng mục trước khi sửa.

## 0. Quy tắc làm việc (bắt buộc)
- Giao tiếp **tiếng Việt**. Mọi chữ hiển thị cho người dùng bằng tiếng Việt.
- Trước khi sửa mỗi nhóm: **nhắc lại hiểu biết** (Ai / Làm gì / Kết quả, ca biên, danh sách file sẽ chạm) rồi **chờ nhóm xác nhận**.
- **Chỉ sửa đúng mục được liệt kê.** Không refactor, đổi tên, dọn dẹp ngoài phạm vi. Thấy vấn đề khác thì báo lại.
- Không đọc/sửa `scratch/`, `.next/`, `node_modules/`, `lovable-design/`.
- Không sửa `schema.prisma`. File mới nên dưới ~300 dòng. Không làm to thêm `simpace-app.tsx`, `assignments.ts`.
- Làm **từng nhóm một**, xong nhóm nào chạy kiểm tra nhóm đó.
- Sau khi sửa: `npx tsc --noEmit`, `npm run lint`, báo kết quả. Báo file đã đổi và các bước kiểm tra tay. Nếu chưa chạy được thì nói rõ.

## 1. Quyết định của nhóm (không được làm trái)
| Nội dung | Quyết định |
|---|---|
| Gộp "Lịch học" vào "Quản lý lớp học" | **Giữ nguyên**, vì cùng một module. Không tách lại, không thêm menu lịch riêng. |
| Ô đăng nhập điền sẵn `admin@simpace.vn` / `simpace2026` và dòng "Tài khoản mẫu" ở `login-view.tsx` | **GIỮ NGUYÊN** vì đang test sản phẩm. Không xóa. |
| Dòng "Demo code" của OTP khi quên mật khẩu | **XÓA**. Hệ thống đã gửi OTP thật qua email. |

## 2. NHÓM A: Text thừa / nội bộ (ưu tiên cao, ít rủi ro)

| # | File (dòng gần đúng) | Hiện tại | Việc cần làm |
|---|---|---|---|
| A1 | `src/components/auth/login-view.tsx` ~203 | `Mã OTP đã được tạo (Demo code: ${res.demoOtp})...` | Đổi thành: `Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư và nhập mã để đổi mật khẩu.` Không hiển thị `demoOtp` trên UI. |
| A2 | `src/actions/auth.ts` (`requestPasswordResetOtpAction`) | Có trả `demoOtp` về client | **Kiểm tra**: nếu còn trả mã OTP trong response thì báo nhóm và đề xuất bỏ. Chỉ bỏ sau khi xác nhận email thật hoạt động. Không tự đổi nếu chưa rõ. |
| A3 | `src/components/simpace-app.tsx` ~444 | Nhãn `Sprint 1` trong hộp chuông | Xóa nhãn này. |
| A4 | `src/components/simpace-app.tsx` ~446-448 | `Chưa có thông báo mới. (Thông báo báo cáo & bài tập sẽ kích hoạt ở Sprint 2).` | Đổi thành `Chưa có thông báo mới.` |
| A5 | `src/components/settings/settings-page-view.tsx` ~424 | `Phiên bản: Sprint 1.0 (Full-stack Next.js 14)` | Đổi thành `Phiên bản: 1.0`. Bỏ chi tiết kỹ thuật. |
| A6 | `src/components/settings/permission-widgets.tsx` ~226 | Câu nói về "lộ trình của các Sprint tiếp theo" | Viết lại trung tính, ví dụ: `Tính năng này đang được hoàn thiện.` Không nhắc Sprint. |
| A7 | `src/components/simpace-app.tsx` ~472 | Breadcrumb luôn là `Quản trị hệ thống / ...` cho mọi vai trò | Hiển thị theo vai trò: Admin "Quản trị hệ thống", Quản lý trường "Quản lý trường", Giáo viên "Giảng dạy", Trợ giảng "Trợ giảng", Học viên "Học tập". Viết hàm nhỏ trong file shared, đừng nhét thêm logic vào `simpace-app.tsx`. |
| A8 | `src/components/simpace-app.tsx` ~479 | `Chúc bạn một ngày làm việc hiệu quả và thành công!` | Đổi thành câu mô tả có ích hơn, ví dụ: `Theo dõi nhanh hoạt động học tập của hệ thống.` (hoặc hỏi nhóm câu họ muốn). |
| A9 | `src/components/assignments/class-assignments-tab.tsx` ~165 | State `parserTitle` mặc định `Đề thi IELTS Cambridge 18 - Full Test 01` | Đổi giá trị mặc định thành chuỗi rỗng `""`, dùng `placeholder` để gợi ý. Kiểm tra nút gửi vẫn bắt buộc có tiêu đề. File này rất lớn, chỉ sửa đúng dòng. |
| A10 | `src/components/auth/login-view.tsx` ~258 | Nút `Đăng nhập ngay` ở bước 3 chỉ đóng hộp thoại | Đổi nhãn thành `Quay lại đăng nhập`. |
| A11 | `src/components/auth/login-view.tsx` ~168 | `hơn 17 trường THPT đối tác` (số cố định) | **Không tự sửa.** Hỏi nhóm con số có đúng thực tế không. |

### Cần hỏi nhóm trước khi động vào (đừng tự quyết)
- `src/components/materials/class-materials-tab.tsx` ~281-293: upload đang **giả lập** (dung lượng "Demo 2MB" và link `https://www.w3.org/.../dummy.pdf`). Hỏi nhóm đây là chức năng tạm hay cần làm upload thật. Nếu muốn giữ giả lập thì chỉ báo cáo, không sửa.

## 3. NHÓM B: Việt hóa vai trò hiển thị
Sidebar (`simpace-app.tsx` ~395) và header (~462) đang in mã vai trò tiếng Anh (`ADMIN`, `STUDENT`...).

- Tạo **một hàm/bảng ánh xạ duy nhất** (ví dụ `roleLabel`) trong `src/components/shared/` rồi dùng ở cả hai nơi. Không viết ánh xạ rải rác.
- Nhãn gợi ý: `ADMIN` = "Quản trị viên", `SCHOOL_MANAGER` = "Quản lý trường", `TEACHER` = "Giáo viên", `TA` = "Trợ giảng", `STUDENT` = "Học viên".
- **Đối chiếu với enum `RoleCode` thực tế** trong `schema.prisma`. Nếu có role không nằm trong bảng thì trả về mã gốc, không để crash.
- Kiểm tra sẵn có: trong `common-widgets.tsx` có thể đã có hàm tương tự. Tái sử dụng nếu có, đừng tạo trùng.

## 4. NHÓM C: Màu sắc nhất quán (làm cẩn thận, rủi ro trung bình)
Vấn đề: dùng lẫn `#EA580C` (hardcode ở nhiều nơi) và `--primary: #f95a14` (trong `globals.css`).

- Mục tiêu: một màu thương hiệu duy nhất là `var(--primary)`.
- **Bước 1 (phạm vi nhỏ):** thay `#EA580C` ở avatar sidebar/header, nút chính ở `simpace-app.tsx` và `login-view.tsx` bằng class theo biến (`bg-primary`, `text-primary`, `hover:bg-primary/90`). Trước đó kiểm tra `tailwind.config` đã map `primary` sang `var(--primary)` chưa. Chưa map thì báo nhóm, đừng tự thêm tùy tiện.
- **Không** đổi hàng loạt toàn dự án trong một lần. Chỉ đổi các file đã nêu rồi báo danh sách file còn dùng hex để nhóm quyết định.
- Biểu đồ `donut`/`dot-*` trong `globals.css` đang dùng xanh dương/xanh lá. Chỉ **ghi nhận**, đừng đổi khi chưa hỏi nhóm.
- Không được làm đổi diện mạo đáng kể. Thay màu phải gần như không thấy khác biệt bằng mắt.

## 5. NHÓM D: Logo (`public/logo.png`)

### Thực trạng
- Ảnh PNG nhỏ (~3 KB, ~250x140), có lề trắng thừa quanh logo nên khi hiển thị trông nhỏ hơn khung cho phép.
- Dễ bị mờ trên màn hình độ phân giải cao.
- Có tagline "EMPOWERING LIFELONG LEARNING" rất nhỏ, không đọc được ở sidebar (`h-11` ~ 44px).
- Logo dùng ở 3 nơi theo 3 cách: sidebar và login dùng `<img>` trực tiếp, `src/components/logo.tsx` (`SimpaceLogo`) giới hạn `maxHeight: 36px`.

### Việc cần làm (theo thứ tự)
1. **Hỏi nhóm file logo gốc** (SVG hoặc PNG kích thước lớn, nền trong suốt). **AI không tự vẽ lại hoặc tạo logo mới** từ file 3 KB. Chưa có file gốc thì bỏ qua bước 2 và chỉ làm bước 3-4.
2. Khi có file gốc: thêm file mới vào `public/` (ví dụ `logo.svg`, và nếu nhóm có thì `logo-mark.*` bản không tagline cho sidebar). **Không xóa `logo.png`** khi chưa xác nhận.
3. Thống nhất **một component** `SimpaceLogo` (chưa dùng ở sidebar/login thì chuyển sang dùng), cho phép truyền `className` để chỉnh chiều cao, bỏ ràng buộc `maxHeight` cứng gây khác kích thước giữa các nơi.
4. Thêm logo nhỏ (cạnh nút menu) ở header trên **mobile**, vì sidebar bị ẩn nên mất nhận diện thương hiệu.
5. Có `alt="SIMPACE"` và giữ `cursor-pointer` về Tổng quan ở sidebar như hiện tại.

## 6. NHÓM E: Bố cục trang đăng nhập (chỉ làm sau khi nhóm đồng ý)
- Logo đang cách xa tiêu đề (`mb-10`). Đề xuất thu gần lại để gắn với form.
- Khối bên phải có biểu tượng `BookOpen` cạnh logo sách nên lặp ý. Đề xuất bỏ icon hoặc thay bằng hình minh họa liên quan đến học tập. Nếu cần ảnh thì hỏi nhóm, không tự lấy ảnh ngoài.
- Hình `.login-visual` trong `globals.css` (đa giác cam) mang tính trang trí, chưa gắn với IELTS. Chỉ đề xuất, không tự đổi.
- **Giữ nguyên** giá trị điền sẵn tài khoản test (xem mục 1).

## 7. Ngoài phạm vi (chỉ ghi nhận, KHÔNG tự sửa)
- Điều hướng bằng state (không có URL, reload về Tổng quan, không dùng được nút Back).
- Nút đăng xuất đặt sát avatar nên dễ bấm nhầm.
- Sidebar chưa chia nhóm menu, các mục phân quyền động dùng chung icon `ShieldCheck`.
- `globals.css`: `font-family ... !important` trên `*`, `@import` Google Fonts nên đổi sang `next/font`.
- Tiêu đề trang dài (ví dụ "Trung tâm Quản lý Bài tập & Chấm điểm").
- Chuông thông báo chưa có chức năng thật.

Những mục này cần thảo luận và nhóm đồng ý riêng, mỗi mục là một yêu cầu mới.

## 8. Thứ tự thực hiện đề xuất
1. Nhóm A (text), trừ A2 và A11 chờ xác nhận.
2. Nhóm B (vai trò).
3. Nhóm D bước 3-4 (component logo + logo mobile), bước 2 khi có file gốc.
4. Nhóm C (màu), theo phạm vi nhỏ.
5. Nhóm E nếu nhóm đồng ý.

## 9. Cách kiểm tra bằng tay sau khi làm
- Đăng nhập bằng Admin, Giáo viên, Học viên: sidebar và header hiện vai trò tiếng Việt, breadcrumb đúng vai trò.
- Mở hộp chuông: không còn chữ "Sprint".
- Vào Cài đặt: dòng phiên bản hiện `Phiên bản: 1.0`.
- Quên mật khẩu: nhận OTP qua email thật, thông báo không hiển thị mã.
- Mở trang đăng nhập và ô đăng nhập: vẫn điền sẵn tài khoản test (đúng quyết định).
- Thu nhỏ trình duyệt (mobile): header có logo, menu mở/đóng bình thường.
- Tab Bài tập, Tạo đề: ô tiêu đề trống, hiện gợi ý.
