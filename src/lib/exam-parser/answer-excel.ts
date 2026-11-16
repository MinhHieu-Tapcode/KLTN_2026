import * as XLSX from "xlsx";
import { applyNormalizedAnswer } from "./answer-normalizer";

/**
 * File Excel đáp án của màn bóc tách đề: 3 cột Số câu | Đáp án chuẩn | Giải thích.
 * Cột "Giải thích" được nạp vào ô "Giải thích chi tiết" của từng câu (hiển thị cho học viên sau khi nộp bài).
 */

export const ANSWER_COLUMNS = ["Số câu", "Đáp án chuẩn", "Giải thích"] as const;

interface TemplateQuestion {
  questionNumber: number;
  type?: string;
  correctAnswer?: string;
  explanation?: string;
}

const GUIDE_ROWS = [
  { "Loại câu": "True / False / Not Given", "Cách điền cột Đáp án chuẩn": "TRUE, FALSE hoặc NOT GIVEN (gõ tắt T, F, NG cũng được)" },
  { "Loại câu": "Yes / No / Not Given", "Cách điền cột Đáp án chuẩn": "YES, NO hoặc NOT GIVEN (gõ tắt Y, N, NG cũng được)" },
  { "Loại câu": "Trắc nghiệm 1 đáp án", "Cách điền cột Đáp án chuẩn": "Một chữ cái: A, B, C hoặc D" },
  { "Loại câu": "Trắc nghiệm nhiều đáp án", "Cách điền cột Đáp án chuẩn": "Các chữ cái cách nhau dấu phẩy, ví dụ: A, C" },
  { "Loại câu": "Nối tiêu đề / thông tin / đặc điểm", "Cách điền cột Đáp án chuẩn": "Nhãn lựa chọn đúng, ví dụ: iv hoặc B" },
  { "Loại câu": "Điền từ / Trả lời ngắn", "Cách điền cột Đáp án chuẩn": "Đúng từ hoặc cụm từ cần điền, ví dụ: grape skins" },
  { "Loại câu": "Cột Giải thích", "Cách điền cột Đáp án chuẩn": "Không bắt buộc. Nội dung sẽ hiện cho học viên sau khi nộp bài." },
];

/** Tạo và tải file mẫu, điền sẵn đáp án / giải thích đã có */
export function downloadAnswerTemplate(questions: TemplateQuestion[], fileName: string): void {
  const rows = [...questions]
    .filter((q) => q.type !== "ESSAY" && q.type !== "SPEAKING_RECORD")
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .map((q) => ({
      [ANSWER_COLUMNS[0]]: q.questionNumber,
      [ANSWER_COLUMNS[1]]: q.correctAnswer || "",
      [ANSWER_COLUMNS[2]]: q.explanation || "",
    }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...ANSWER_COLUMNS] });
  ws["!cols"] = [{ wch: 8 }, { wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, "DapAn");
  const guide = XLSX.utils.json_to_sheet(GUIDE_ROWS);
  guide["!cols"] = [{ wch: 34 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, guide, "HuongDan");
  XLSX.writeFile(wb, fileName);
}

/** Áp đáp án + giải thích từ Excel vào danh sách câu (ô giải thích trống thì giữ giải thích cũ) */
export function applyImportedAnswers<T extends TemplateQuestion>(
  list: T[],
  imported: Map<number, { answer: string; explanation: string }>
): T[] {
  return list.map((q) => {
    const row = imported.get(q.questionNumber);
    if (!row) return q;
    const withAnswer = row.answer ? applyNormalizedAnswer(q as any, row.answer) : q;
    return row.explanation ? { ...withAnswer, explanation: row.explanation } : withAnswer;
  }) as T[];
}
