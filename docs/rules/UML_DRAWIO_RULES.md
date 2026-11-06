# QUY CHUẨN VẼ SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM) TRÊN DRAW.IO (KLTN MIS)

> **Mục đích:** Quy chuẩn này là căn cứ duy nhất để AI tự động phân tích và sinh mã XML Draw.io (`<mxGraphModel>`) cho mọi biểu đồ tuần tự trong đồ án tốt nghiệp MIS của nhóm sinh viên.

---

## 1. Nguyên tắc kiến trúc BCE (Boundary - Control - Entity)
Mọi sơ đồ tuần tự cho một Use Case trong hệ thống LMS phải tuân thủ nghiêm ngặt mô hình 4 tầng sau:

1. **Tác nhân (Actor):**
   * Luôn dùng ký hiệu hình người que (`participant=umlActor`).
   * Tên hiển thị dạng: `:Người dùng (Vai trò)` ví dụ: `:Người dùng (GV/Admin)` hoặc `:Học sinh`.

2. **Lớp Giao diện (Boundary / UI):**
   * Chỉ có **1 cột duy nhất** đại diện cho màn hình / modal mà người dùng thao tác.
   * Định dạng tên: `<b>:TênComponent</b><br>(Giao diện)` (Ví dụ: `<b>:ManualAssignmentModal</b><br>(Giao diện)`).

3. **Lớp Điều khiển (Controller / Server Action):**
   * Chỉ có **1 cột duy nhất** đại diện cho Server Action trong Next.js App Router.
   * Nhiệm vụ: Tiếp nhận request từ client, kiểm tra đăng nhập (`checkAuth`), validate dữ liệu rỗng (`Zod`).
   * Định dạng tên: `<b>:tênActionAction</b><br>(Bộ điều khiển Action)`.

4. **Lớp Dịch vụ nghiệp vụ (Business Service):**
   * Chỉ có **1 cột duy nhất** đại diện cho Service xử lý logic nghiệp vụ.
   * Nhiệm vụ: Tính toán điểm số, chuẩn hóa hạn nộp, điều phối lưu CSDL.
   * Định dạng tên: `<b>:tênServiceService</b><br>(Dịch vụ nghiệp vụ)`.

5. **Lớp Dữ liệu / Bảng CSDL (Entity Tables):**
   * **BẮT BUỘC TUYỆT ĐỐI:** Không bao giờ vẽ 1 cột `:Database` chung chung (tránh bị hội đồng trừ điểm lỗi Hộp đen Database).
   * Nghiệp vụ lưu vào bao nhiêu Bảng thực tế trong `schema.prisma` thì **phải tách thành bấy nhiêu cột Lifeline riêng biệt**.
   * Định dạng tên: `<b>:TênBảngPrisma</b><br>(Bảng CSDL [Tên tiếng Việt])` (Ví dụ: `<b>:User</b><br>(Bảng CSDL Tài khoản)`, `<b>:Role</b><br>(Bảng CSDL Vai trò)`, `<b>:Assignment</b><br>(Bảng CSDL Bài tập)`, `<b>:AssignmentQuestion</b><br>(Bảng CSDL Câu hỏi)`, `<b>:AssignmentClass</b><br>(Bảng CSDL Lớp nhận bài)`). Dùng cụm "Bảng CSDL" để người đọc và hội đồng chấm hiểu ngay là bảng trong Database, tránh nhầm lẫn với Actor con người.

---

## 2. Quy tắc thông điệp (Messages & Labels)
1. **Đồng nhất ngôn ngữ:** Tên kỹ thuật giữ theo Code tiếng Anh, phần vai trò/mô tả trong ngoặc ghi Tiếng Việt.
2. **Không dùng JSON thô trên thông điệp phản hồi:**
   * ❌ Không ghi: `Trả về { success: true, assignmentId }`
   * ✅ Phải ghi: `Trả về kết quả thành công (kèm mã bài tập)` hoặc `Xác nhận tạo thành công`.
3. **Xử lý `lib` và tiện ích:**
   * Không vẽ `lib` thành cột Lifeline riêng (để tránh loãng sơ đồ).
   * Thể hiện `lib` bằng **hình khối Ghi chú (Note)** gắn vào Lifeline của Action hoặc Service (ví dụ Note kiểm tra quyền `checkAuth`, Note tính tổng điểm).
4. **Khung ngoại lệ `alt` (Alternative Frame):**
   * Phải bao quát được luồng Thất bại (Lỗi nghiệp vụ / Validation) và luồng Thành công (`else`).
   * Điều kiện ngoại lệ phải tổng quát cho use case, tránh đưa các ca đặc thù riêng lẻ (ví dụ: dùng `[Dữ liệu không hợp lệ (Quên chọn lớp / Bỏ trống tiêu đề)]` thay vì chỉ ghi thiếu file audio).

---

## 3. Quy chuẩn tọa độ hình học Draw.io (`<mxGraphModel>`)
Khi sinh mã XML Draw.io, AI phải tuân thủ công thức tính tọa độ để các đường vẽ thẳng hàng tuyệt đối:

* **Chiều cao Lifeline (`height`):** Mặc định 820px (bắt đầu từ `y=40` đến `y=860`).
* **Khoảng cách tâm các Lifeline (`xCenter`):**
  * `Actor`: `x = 60`, `w = 40` ➔ Tâm: `80`
  * `UI`: `x = 160`, `w = 170` ➔ Tâm: `245`
  * `Action`: `x = 380`, `w = 180` ➔ Tâm: `470`
  * `Service`: `x = 610`, `w = 180` ➔ Tâm: `700`
  * `Bảng DB 1`: `x = 840`, `w = 160` ➔ Tâm: `920`
  * `Bảng DB 2`: `x = 1040`, `w = 170` ➔ Tâm: `1125`
  * `Bảng DB 3`: `x = 1250`, `w = 170` ➔ Tâm: `1335`
* **Mũi tên gọi hàm (Sync Call):** `style="html=1;verticalAlign=bottom;endArrow=block;rounded=0;strokeWidth=1.5;strokeColor=#000000;"`
* **Mũi tên phản hồi (Return Message):** `style="html=1;verticalAlign=bottom;endArrow=open;dashed=1;endSize=8;rounded=0;strokeWidth=1.5;strokeColor=#000000;"`
* **Khung alt:** `x = 40`, `w = 1380`, `style="shape=umlFrame;strokeWidth=1.5;..."`
