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

## 5. Checklist sau khi sửa xong
- Chạy `npx tsc --noEmit` và `npm run lint`, báo kết quả.
- Báo cáo: các file đã đổi, mỗi file đổi gì, và **các bước để người dùng tự kiểm tra bằng tay**.
- Nếu chưa chạy được kiểm tra nào, nói rõ là chưa chạy.

## 6. Bản đồ tài liệu
- `PROJECT_STRUCTURE.md`: bản đồ thư mục.
- `PROJECT_BLUEPRINT.md`: ý tưởng và định hướng tổng thể.
- `docs/flows/<module>.md`: luồng nghiệp vụ, ca biên, ma trận quyền từng module (sẽ bổ sung dần).
