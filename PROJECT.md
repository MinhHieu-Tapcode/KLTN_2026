# Project: Hệ thống Bóc tách Đề thi IELTS Cải tiến (SIMPACE LMS)

## Architecture
- **Kiến trúc 4 tầng chuẩn mực (UI -> Action -> Service -> Core Engine)** theo quy định tại `AGENTS.md`:
  - **Tầng Giao diện (UI Components)**: `src/components/assignments/exam-parser/` (`smart-parser-modal.tsx`, `ebook-two-column-viewer.tsx`, `invariants-banner.tsx`). Hiển thị 100% Tiếng Việt, hỗ trợ xem Ebook 2 cột (Cột 1: bài đọc/audio; Cột 2: câu hỏi tương tác).
  - **Tầng Server Action**: `src/actions/assignments.ts` (`parseIeltsExamAction`, `createAssignmentAction`, `createMultipleAssignmentsAction`). Xác thực session & quyền (`checkRole`), nhận `FormData`, gọi service, trả kết quả chuẩn hóa `ParsedExamResult`. Tuyệt đối không chứa logic bóc tách hay truy vấn DB trực tiếp.
  - **Tầng Service (Nghiệp vụ)**: `src/services/ielts-parser.service.ts`, `src/services/ielts-invariants.service.ts`, `src/services/assignment-mutation.service.ts`. Điều phối luồng trích xuất, gọi Groq AI qua Key Pool, phân tích Vision giải cứu sơ đồ/bảng, kiểm tra 6 bất biến sư phạm, mã hóa cấu trúc giao diện nâng cao vào `Assignment.description` dạng JSON.
  - **Tầng Thư viện lõi (Core Engine)**: `src/lib/exam-parser/` (`types.ts`, `extract-text.ts`, `exam-skeleton.ts`, `question-validator.ts`, `groq-parser.ts`, `gemini-vision-parser.ts`, `clean-prompt.ts`, `question-media-detector.ts`, `client-ocr.ts`, `groq-key-pool.ts`). Các module thuần túy (pure functions) thực hiện bóc tách, chuẩn hóa, và kiểm định nội dung.
- **Cơ chế Dual-Gate & Visual Recovery**:
  - **Gate 1 (Exam Skeleton)**: Khóa dải số câu, nhận diện 13 dạng bài IELTS, tính độ bao phủ kỳ vọng (`checkGroupCoverage`).
  - **Gate 2 (Content Validator)**: Kiểm định nội dung câu hỏi, loại bỏ câu chỉ dẫn nhóm (`INSTRUCTION_REGEX` neo đầu dòng `^(?:...)\b` + `calculateWordContainment` >= 85%), loại bỏ nhãn placeholder tự sinh (`prompt_placeholder`), hỗ trợ chỗ trống ngoặc vuông `[1]` (`BLANK_REGEX`).
  - **Visual Recovery**: Kích hoạt Gemini Vision trích xuất sơ đồ khối và đa bảng biểu khi phát hiện nhóm câu bị thiếu (`coverageGaps.length > 0`), gộp kết quả theo `sectionKey` không làm mất bảng cũ.
  - **Rate Limit Resilience**: Giới hạn tối đa 3 Part song song (`MAX_PARALLEL_PARTS = 3`) kèm cơ chế backoff retry khi gặp lỗi HTTP 429 từ Groq.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Cải tiến phân tách Part không nuốt phần thi | Giảm `MIN_PART_GAP_CHARS` xuống 10 ký tự, giữ tiêu đề Cambridge có `Questions x-y`, cứu đoạn mở đầu (preamble >= 400 ký tự), nhận diện Task 1/2 Writing | M1 | explorer_parser_zip / Survey |
| 2 | Bổ sung `sectionKey` và theo dõi `CoverageGap` | Mở rộng `types.ts` với `sectionKey`, `CoverageGap`, `coverageIssues`, phân biệt câu hỏi cùng số giữa các kỹ năng | M1 | explorer_parser_zip / Survey |
| 3 | Trích xuất câu chỉ dẫn an toàn (Safe Instruction Extraction) | Quét dòng chỉ dẫn dừng ngay khi gặp dòng câu hỏi đầu tiên (chỗ trống, số thứ tự, bảng) trong `exam-skeleton.ts` | M1 | explorer_parser_zip / Survey |
| 4 | Thuật toán kiểm định độ bao hàm từ vựng (Word Containment) | Bổ sung `calculateWordContainment` (>= 85%) và lọc nhãn `prompt_placeholder` trong `question-validator.ts` | M1 | explorer_parser_zip / Survey |
| 5 | Kiểm soát song song & Tự động Retry Rate Limit | Thêm `mapWithLimit` (tối đa 3 Part) và `callGroqForPartWithRetry` xử lý HTTP 429 trong `groq-parser.ts` | M1 | explorer_parser_zip / Survey |
| 6 | Bù khuyết điểm cục bộ (Hybrid Rule-Based Fallback) | Khắc phục AI thiếu câu bằng cách chỉ bù đúng các số câu thiếu từ bộ quy tắc, không hủy bỏ kết quả AI | M1 | explorer_parser_zip / Survey |
| 7 | Nâng cấp Gemini Vision an toàn & Đa bảng biểu | Chuyển API Key vào Header `x-goog-api-key`, nâng `maxOutputTokens` lên 8192, hỗ trợ mảng `tables`, truyền `groupHints` | M1 | explorer_parser_zip / Survey |
| 8 | Hợp nhất dữ liệu Vision thông minh (Smart Merge) | Gộp sơ đồ/bảng theo `sectionKey`, bảo toàn bảng cũ (`upsertGroups`), đẩy `coverageIssues` lên giao diện | M1 | explorer_parser_zip / Survey |
| 9 | Tích hợp bộ kiểm thử hồi quy 17 trường hợp | Thêm `scripts/test_exam_parser_regression.ts` kiểm thử tự động toàn diện không phụ thuộc mạng | M1 | explorer_parser_zip / Survey |
| 10 | Kiểm định thực nghiệm với đề thi mẫu IELTS | Chạy bóc tách thực tế trên các file mẫu (Reading, Listening) trong `public/` và `test-hoc-lieu-mau/` | M2 | Survey / Plan |
| 11 | Thẩm định chất lượng độc lập & Kiểm toán pháp y | 2 Reviewers, 2 Challengers và 1 Forensic Auditor kiểm tra tính đúng đắn, không hardcode, tuân thủ AGENTS.md | M2 | Survey / Plan |
| 12 | Nghiệm thu toàn diện & Xuất bản DoD Matrix | Kiểm tra `npx tsc --noEmit` đạt 0 lỗi, lập Definition of Done Matrix đầy đủ trước khi bàn giao | M2 | Survey / Plan |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Lắp ráp & Tinh chỉnh Logic Bóc tách IELTS | Áp dụng bản vá, tích hợp 8 tệp (`src/lib/exam-parser/*`, `src/services/ielts-parser.service.ts`, `scripts/test_exam_parser_regression.ts`), chạy kiểm thử hồi quy nội bộ và typecheck | none | DONE |
| M2 | Thẩm định Độc lập, Stress Test & Kiểm toán Pháp y | 2 Reviewers (APPROVE), 2 Challengers (CONFIRMED CORRECT & RESOLVED 43/43 và 22/22 tests), 2 Forensic Auditors (CLEAN), Gate Check hoàn tất 100% | M1 | DONE |

## Interface Contracts
### `src/actions/assignments.ts` ↔ `src/services/ielts-parser.service.ts`
- **Hàm điều phối**: `parseIeltsExamContent(input: ParseIeltsExamInput): Promise<ParsedExamResult>`
- **Đầu vào `ParseIeltsExamInput`**:
  - `file?: File`: Tệp PDF hoặc DOCX
  - `pdfTextRaw?: string`: Văn bản thô hoặc kết quả OCR client
  - `skill?: string`: `READING`, `LISTENING`, `WRITING`, `SPEAKING`, `ALL_SKILLS`
  - `title?: string`, `durationMinutes?: number`, `audioUrl?: string`, `excelAnswersRaw?: string`
- **Đầu ra `ParsedExamResult`**:
  - `title: string`, `skill: string`, `passageText: string`
  - `questions: ParsedQuestion[]` (chuẩn hóa schema Zod, có tùy chọn `sectionKey`)
  - `sections?: ParsedSection[]`
  - `flowcharts?: FlowchartGroup[]`, `tables?: TableCompletionGroup[]`, `matchingHeadings?: MatchingHeadingGroup[]`, `summaries?: SummaryCompletionGroup[]`
  - `coverageGaps?: CoverageGap[]`, `coverageIssues?: string[]`
  - `invariantsReport: ExamInvariantsReport` (hợp nhất `coverageIssues` vào `errors` để hiển thị trên `InvariantsBanner`)

### `src/services/ielts-parser.service.ts` ↔ `prisma/schema.prisma`
- Không có bất kỳ thay đổi nào đối với cấu trúc bảng và cột của `schema.prisma`.
- Cấu trúc Ebook và metadata giao diện (`flowcharts`, `tables`, `matchingHeadings`, `summaries`, `questionMediaMap`) tiếp tục được tuần tự hóa dạng chuỗi JSON lưu tại cột `Assignment.description`.

## Code Layout
- `src/lib/exam-parser/`:
  - `types.ts`: Định nghĩa kiểu dữ liệu Zod và TypeScript interfaces
  - `extract-text.ts`: Trích xuất văn bản từ docx/pdf, dọn rác, tách part, reflow số thứ tự câu hỏi
  - `exam-skeleton.ts`: Quản lý bộ khung đề thi, nhận diện 13 dạng bài
  - `question-validator.ts`: Cổng kiểm định chất lượng câu hỏi (`INSTRUCTION_REGEX` neo đầu dòng, `BLANK_REGEX` ngoặc tròn & vuông)
  - `groq-parser.ts`: Gọi Groq AI, chuẩn hóa câu hỏi, rate-limit retry, rule-based fallback hỗ trợ bảng đa dạng
  - `gemini-vision-parser.ts`: Trích xuất sơ đồ/bảng qua Google Gemini Vision
  - `clean-prompt.ts`: Dọn dẹp số thứ tự thừa sát chỗ trống
  - `question-media-detector.ts`: Nhận diện yêu cầu ảnh minh họa bắt buộc
  - `client-ocr.ts`: Quét OCR trên trình duyệt với tệp PDF scan
  - `groq-key-pool.ts`: Quản lý danh sách API Key Groq xoay vòng
- `src/services/`:
  - `ielts-parser.service.ts`: Dịch vụ điều phối bóc tách đề thi IELTS, `syncTableQuestions` đồng bộ ô bảng
  - `ielts-invariants.service.ts`: Kiểm tra 6 bất biến sư phạm
  - `assignment-mutation.service.ts`: Lưu trữ bài tập vào CSDL Prisma / Demo store
- `src/actions/`:
  - `assignments.ts`: Server Actions cho bài tập và đề thi
- `scripts/`:
  - `test_exam_parser_regression.ts`: Bộ kiểm thử hồi quy 17 ca tự động
  - `test_adversarial_robustness.ts`: Bộ kiểm thử áp lực độc hại 22 ca tự động (100% PASS)
  - `test_challenger_empirical_harness.ts`: Bộ kiểm thử thực nghiệm học liệu đề thi IELTS 43 ca (100% PASS)
