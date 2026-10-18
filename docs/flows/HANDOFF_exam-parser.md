# BÀN GIAO: Module bóc tách đề PDF/Word (ưu tiên: đọc file + gắn Groq key)

> Đọc `AGENTS.md` trước. Giao tiếp tiếng Việt. Theo mục 2.2: nhắc lại hiểu biết và chờ nhóm xác nhận TRƯỚC KHI sửa code.

## 1. Hiện trạng đã kiểm tra
- `src/services/ielts-parser.service.ts` (`parseIeltsExamContent`) là **MOCK**: đề Reading (Urban Beekeeping), Listening (Riverside Sports Club), Writing, Speaking được hard-code. Câu hỏi từ Excel bị gán prompt "Câu hỏi số N" và phương án A–D giả. Chưa đọc hết file này.
- `src/actions/assignments.ts` → `parseIeltsExamAction` (~dòng 158) chỉ nhận `pdfText` (chuỗi) từ client, không đọc file thật. Comment "AI OCR" gây hiểu nhầm.
- `package.json` chỉ có `xlsx`. Chưa có `mammoth`, `unpdf`/`pdfjs-dist`, Groq SDK.
- `src/lib/exam-parser/` **chưa tồn tại**. Thiết kế đầy đủ: `docs/flows/pdf-to-quiz-ocr.md`.
- Tiếng Việt trong `assignments.ts` và `ielts-parser.service.ts` bị **lỗi encoding** (ví dụ `BA3c tA�ch`). Báo nhóm trước khi sửa; đây có thể là do terminal hiển thị, cần kiểm tra byte thật của file.
- Chưa rõ "ebook" nghĩa là bóc đề IELTS hay chuyển sách thành ebook. `materials.ts` có `uploadCoursebookPackageAction`, chưa kiểm tra. **Hỏi nhóm.**

## 2. Mã nguồn tham khảo (chưa đọc được)
- File: `D:\Dữ liệu từ ổ C\Downloads\pdf-2-epub-docx-main.zip` (là **file zip**, không phải thư mục).
- Đường dẫn có ký tự tiếng Việt nên PowerShell qua tool bị lỗi mã hóa. Lệnh giải nén bị người dùng từ chối.
- Việc cần làm: giải nén vào thư mục tạm (ngoài `scratch/` của repo nếu AGENTS cấm), đọc cấu trúc phần parse, rút ra ý tưởng áp dụng. Chỉ tham khảo, không copy nguyên.

## 3. Việc ưu tiên
1. **Đọc file:** `src/lib/exam-parser/extract-text.ts` (docx: `mammoth`; PDF có chữ: `unpdf`; PDF scan thì báo lỗi rõ). Cài package cần được nhóm đồng ý.
2. **Gắn Groq key:** đặt `GROQ_API_KEY` trong `.env.local` (đã được gitignore, kiểm tra), đọc qua `process.env.GROQ_API_KEY`. **Không hard-code key trong source.** Đặt thêm `GROQ_API_KEY=` rỗng vào `.env.example` nếu có.
   - Key người dùng cung cấp ở cuộc trò chuyện trước (bắt đầu `gsk_Lh4T...`). **Hỏi lại người dùng để lấy key**, không ghi vào tài liệu.
   - Key đã lộ trong chat, nên khuyên người dùng đổi (rotate) sau khi thử nghiệm.
3. Sau đó: `parse-structure.ts` (Groq, gọi theo từng Part, zod validate), `validate.ts`, xóa dữ liệu mock.

## 4. Kiểm tra sau khi sửa
`npx tsc --noEmit`, `npm run lint`; báo file đã đổi và các bước tự kiểm tra bằng tay.
