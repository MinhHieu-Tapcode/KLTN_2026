# AGENTS.md: Luật làm việc với AI
**Dự án: Hệ thống LMS Công ty Cổ phần SIMPACE Việt Nam (Đồ án tốt nghiệp MIS, nhóm 3 sinh viên, Agile 1 tháng)**

> File này là nguồn luật duy nhất cho AI. Luôn giao tiếp bằng **TIẾNG VIỆT** rõ ràng, sư phạm.

---

## 1. Tech stack
- Next.js 14+ (App Router), 100% TypeScript.
- Backend: Server Actions (`'use server'`).
- CSDL: PostgreSQL (Supabase) + Prisma ORM. Validate dữ liệu bằng `zod`.
- Giao diện: Tailwind CSS + shadcn/ui, 100% tiếng Việt.
- AI dự kiến: Groq Cloud (LLaMA 3 + Whisper v3), dự phòng Google Gemini.

## 2. Quy trình bắt buộc cho mọi yêu cầu

### 2.1. Với module mới
1. **Thảo luận luồng nghiệp vụ** (Admin, GV, TA, HV thao tác thế nào, ca biên).
2. **Thiết kế CSDL** trong `prisma/schema.prisma`, giải thích từng trường.
3. **Hiện thực hóa** (Server Actions rồi UI) chỉ sau khi nhóm đồng ý CSDL.

### 2.2. Với mọi yêu cầu sửa/thêm: "Nhắc lại hiểu biết" TRƯỚC KHI sửa
AI phải trả lời ngắn gọn các mục sau, rồi **chờ người dùng xác nhận**:
- **Ai / Làm gì / Kết quả mong đợi** (3 dòng).
- **Các ca biên** liên quan (không có dữ liệu, sai quyền, trùng lặp...).
- **Danh sách file sẽ chạm vào.**

Khi yêu cầu mơ hồ, AI **hỏi lại**, không tự đoán luồng.

### 2.3. Quy tắc "Đánh số cam kết" khi nhận yêu cầu (Commitment Checklist)
Mỗi khi tiếp nhận một yêu cầu (đặc biệt là yêu cầu có kèm hình ảnh khoanh đỏ/chú thích):
1. AI **bắt buộc** phải trích xuất toàn bộ các điểm cần sửa thành danh sách có đánh số rõ ràng: `[C1]`, `[C2]`, `[C3]`... Trong đó **ưu tiên tuyệt đối các ghi chú đỏ trên ảnh (Visual First)**.
2. Phân loại rõ ràng: Đâu là việc ở **Tầng Giao diện (UI/UX / CSS / Layout)**, đâu là việc ở **Tầng Dữ liệu/Logic (Backend / Service / Database)**.

## 3. Quy ước tầng code
| Tầng | Trách nhiệm | Không được |
|---|---|---|
| `action` | Lấy session, kiểm tra quyền, validate zod, gọi service, trả kết quả, `revalidatePath` | Chứa truy vấn Prisma, chứa logic nghiệp vụ dài |
| `service` | Logic nghiệp vụ + Prisma | Đọc session, import component |
| `component` | Chỉ lo giao diện và gọi action | Chứa nghiệp vụ, mỗi file **dưới khoảng 300 dòng** |

Quy ước thêm:
- Tách file mới thay vì nhét thêm vào file lớn (`simpace-app.tsx`, `assignments.ts` đã quá lớn, không làm to thêm).
- Phân quyền luôn đi qua `src/lib/permissions.ts`, không tự viết kiểm tra rải rác.

## 4. Luật bắt buộc
1. **Chỉ sửa trong phạm vi được yêu cầu.** Không tự refactor, đổi tên, dọn dẹp ngoài yêu cầu. Nếu thấy vấn đề khác, hãy báo lại, đừng tự sửa.
2. **Không thêm nhánh dữ liệu demo mới** vào action. Dữ liệu demo hiện có sẽ xử lý riêng sau.
3. **Xóa mềm** bằng `isActive: false` để bảo vệ lịch sử học tập.
4. **Luôn đối chiếu vai trò** (Admin, Teacher, TA, Student) trước khi thực hiện thao tác.
5. **Không sửa/xóa bảng hoặc cột hiện hữu** trong `schema.prisma` khi chưa được đồng ý. Ưu tiên chỉ thêm mới.
6. Mọi chữ hiển thị cho người dùng (nhãn, thông báo lỗi, nút) bằng tiếng Việt.
7. Không đọc/sửa `scratch/`, `.next/`, `node_modules/`. Thư mục `lovable-design/` chỉ là prototype giao diện tham khảo, **không phải code chính**.
8. **TRUNG THỰC KỸ THUẬT TUYỆT ĐỐI:** AI phải nói mọi sự thật về năng lực hệ thống và giới hạn công nghệ. Tuyệt đối KHÔNG vẽ ra những giải pháp viển vông, không có thật, hoặc hệ thống không thể đạt được với nguồn lực và thời gian hiện tại của nhóm sinh viên (Agile 1 tháng, miễn phí). Cái gì làm được thì nói làm được, cái gì AI/công nghệ chưa làm được hoặc khó khả thi thì phải nói thẳng, chỉ rõ điểm nghẽn thực tế để nhóm đưa ra quyết định thực tế nhất.

## 5. Checklist sau khi sửa xong
- Chạy `npx tsc --noEmit` và `npm run lint`, báo kết quả.
- Báo cáo: các file đã đổi, mỗi file đổi gì, và **các bước để người dùng tự kiểm tra bằng tay**.
- Nếu chưa chạy được kiểm tra nào, nói rõ là chưa chạy.

### 5.1. Bảng nghiệm thu trung thực trước khi kết thúc (Definition of Done Matrix)
Trước khi báo hoàn thành hoặc dừng lượt phản hồi, AI **BẮT BUỘC** phải in ra một **Bảng đối chiếu nghiệm thu (Definition of Done)** cho tất cả các mã cam kết `[C1]`, `[C2]`... đã lập ở mục 2.3:
| Mã | Nội dung cam kết | Trạng thái (ĐÃ XONG / ĐANG LÀM / CHƯA XONG) | Minh chứng (File / Dòng code / Thành phần UI) | Giải trình nếu chưa xong / Khó khăn kỹ thuật |
|---|---|---|---|---|

**Luật cấm:** Tuyệt đối KHÔNG được báo chung chung là "Đã hoàn thành" khi bảng đối chiếu vẫn còn mục CHƯA XONG hoặc làm chưa tới. Nếu chưa xong phải nêu rõ nguyên nhân kỹ thuật và các bước tiếp theo để người dùng nắm và quyết định.

## 6. Bản đồ tài liệu
- `PROJECT_STRUCTURE.md`: bản đồ thư mục.
- `PROJECT_BLUEPRINT.md`: ý tưởng và định hướng tổng thể.
- `docs/flows/<module>.md`: luồng nghiệp vụ, ca biên, ma trận quyền từng module (sẽ bổ sung dần).

- `docs/rules/UML_DRAWIO_RULES.md`: quy chuẩn thiết kế và sinh mã Sơ đồ tuần tự (Sequence Diagram) chuẩn Draw.io XML (<mxGraphModel>) theo mô hình BCE và tách bảng CSDL thực tế.

## 7. Quy chuẩn thiết kế Sơ đồ tuần tự (Sequence Diagram Draw.io)
Mọi yêu cầu vẽ hoặc chỉnh sửa biểu đồ tuần tự UML phải tuân thủ nghiêm ngặt `docs/rules/UML_DRAWIO_RULES.md`:
1. Mô hình BCE 4 tầng: 1 Actor -> 1 UI -> 1 Action -> 1 Service -> N Entity (Tách từng Bảng CSDL trong `schema.prisma`, tuyệt đối không dùng 1 cột :Database chung chung).
2. Tên đối tượng: Giữ tên Code tiếng Anh, chú thích vai trò tiếng Việt (VD: `:ManualAssignmentModal (Giao diện)`, `:User (Bảng CSDL Tài khoản)`, `:Assignment (Bảng CSDL Bài tập)`). Dùng cụm "Bảng CSDL" để rõ nghĩa, tránh nhầm với Actor con người.
3. Thông điệp phản hồi dùng ngôn ngữ tự nhiên dễ hiểu, không dùng chuỗi JSON { success: true }.
4. Xuất mã Draw.io chuẩn XML <mxGraphModel> với tọa độ thẳng hàng tuyệt đối.