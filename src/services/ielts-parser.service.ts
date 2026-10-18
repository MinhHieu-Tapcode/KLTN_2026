import {
  cleanAndReflowPages,
  extractAndCleanDocument,
} from "@/lib/exam-parser/extract-text";
import { parseExamTextWithGroq } from "@/lib/exam-parser/groq-parser";
import { ParsedExamResult } from "@/lib/exam-parser/types";

export interface ParseIeltsExamInput {
  title: string;
  skill: string;
  durationMinutes: number;
  audioUrl: string | null;
  excelAnswersRaw: string;
  pdfTextRaw: string;
  file?: File | null;
}

/**
 * Bóc tách Đề thi IELTS từ tệp PDF / Word (.docx) hoặc văn bản thô sang cấu trúc Ebook 2 Cột tương tác
 */
export async function parseIeltsExamContent(
  input: ParseIeltsExamInput
): Promise<ParsedExamResult> {
  const {
    title,
    skill,
    durationMinutes,
    audioUrl,
    excelAnswersRaw,
    pdfTextRaw,
    file,
  } = input;

  let cleanedText = "";

  // 1. Nếu có tệp .pdf hoặc .docx tải lên: trích xuất và dọn rác văn bản thật
  if (file && file.size > 0) {
    const extracted = await extractAndCleanDocument(file);
    if (!extracted.ok) {
      if (extracted.isScannedPdf) {
        const scanErr: any = new Error(extracted.error);
        scanErr.isScannedPdf = true;
        throw scanErr;
      }
      throw new Error(extracted.error);
    }
    cleanedText = extracted.data.cleanedText;
  } else if (pdfTextRaw && pdfTextRaw.trim().length > 0) {
    cleanedText = cleanAndReflowPages([pdfTextRaw.trim()]);
  } else {
    throw new Error(
      "Vui lòng chọn tệp đề thi PDF (.pdf) hoặc Word (.docx) có nội dung văn bản để bóc tách!"
    );
  }

  // 2. Gọi Groq AI (kèm Zod validation & Rule-based fallback) để bóc tách thành Ebook 2 cột
  const parsedExam = await parseExamTextWithGroq({
    title,
    skill,
    durationMinutes,
    audioUrl,
    cleanedText,
  });

  // 3. Nếu có đính kèm chuỗi đáp án Excel từ đầu thì khớp luôn vào câu hỏi
  if (excelAnswersRaw && excelAnswersRaw.trim()) {
    try {
      const rows = JSON.parse(excelAnswersRaw);
      if (Array.isArray(rows) && rows.length > 0) {
        const answerMap = new Map<number, string>();
        rows.forEach((r: any, idx: number) => {
          const qNum = Number(r.questionNumber) || idx + 1;
          const ans = String(r.correctAnswer || "").trim();
          if (ans) answerMap.set(qNum, ans);
        });

        parsedExam.questions = parsedExam.questions.map((q) => {
          const matchedAns = answerMap.get(q.questionNumber);
          if (!matchedAns) return q;
          return {
            ...q,
            correctAnswer: matchedAns,
            options: q.options.map((opt) => ({
              ...opt,
              isCorrect:
                opt.optionLabel.toUpperCase() === matchedAns.toUpperCase() ||
                opt.content.toUpperCase() === matchedAns.toUpperCase(),
            })),
          };
        });

        if (parsedExam.sections) {
          parsedExam.sections = parsedExam.sections.map((sec) => ({
            ...sec,
            questions: sec.questions.map((q) => {
              const matchedAns = answerMap.get(q.questionNumber);
              if (!matchedAns) return q;
              return {
                ...q,
                correctAnswer: matchedAns,
                options: q.options.map((opt) => ({
                  ...opt,
                  isCorrect:
                    opt.optionLabel.toUpperCase() === matchedAns.toUpperCase() ||
                    opt.content.toUpperCase() === matchedAns.toUpperCase(),
                })),
              };
            }),
          }));
        }
      }
    } catch {
      // Bỏ qua nếu excelAnswersRaw không phải JSON hợp lệ
    }
  }

  return parsedExam;
}
