import {
  cleanAndReflowPages,
  extractAndCleanDocument,
} from "@/lib/exam-parser/extract-text";
import { parseExamTextWithGroq } from "@/lib/exam-parser/groq-parser";
import { ParsedExamResult, ParsedQuestion } from "@/lib/exam-parser/types";
import { checkExamInvariants } from "./ielts-invariants.service";
import { extractDiagramQuestionsWithGemini } from "@/lib/exam-parser/gemini-vision-parser";
import { cleanPromptRedundantNumbers } from "@/lib/exam-parser/clean-prompt";

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
        // Nếu đã có văn bản OCR do client gửi kèm, dùng luôn văn bản đó
        if (pdfTextRaw && pdfTextRaw.trim().length > 30) {
          cleanedText = cleanAndReflowPages([pdfTextRaw.trim()]);
        } else {
          const scanErr: any = new Error(extracted.error);
          scanErr.isScannedPdf = true;
          throw scanErr;
        }
      } else {
        throw new Error(extracted.error);
      }
    } else {
      cleanedText = extracted.data.cleanedText;
    }
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

  // 2.1. GIẢI CỨU SƠ ĐỒ / FLOWCHART / DIAGRAM BẰNG GEMINI VISION
  // Nếu phát hiện câu hỏi có dạng sơ đồ mà nội dung bị khuyết hoặc thiếu số câu,
  // hệ thống sẽ tự động gửi tệp PDF cho Gemini Vision "nhìn bằng mắt" để lấy trọn vẹn chữ và các khối hộp
  const isPdfFile =
    Boolean(file && (file as any).size > 0) &&
    (!file?.name || file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type.includes("pdf")) || !file.name.endsWith(".docx"));

  if (isPdfFile && file) {
    const hasFlowchartKeyword = /flow\s*chart|diagram|process|map\s+labelling|envisioning|complete\s+the\s+flow/i.test(cleanedText);
    const hasSuspectPrompt = (parsedExam.questions || []).some(
      (q) =>
        /complete the flow chart|complete the diagram|step\s+\d+/i.test(q.prompt) ||
        (q.prompt.length < 15 && !/^[A-Z]/.test(q.prompt))
    );

    // Tính tạm bất biến để xem có câu bị thiếu/nhảy cóc không
    const tempInvariants = checkExamInvariants({
      questions: parsedExam.questions || [],
      skill: parsedExam.skill || skill,
      audioUrl: parsedExam.audioUrl || audioUrl,
      sections: parsedExam.sections,
    });
    const missingNums = (tempInvariants.missingNumbers || []) as number[];

    if (hasFlowchartKeyword || hasSuspectPrompt || missingNums.length > 0) {
      try {
        console.log("[parseIeltsExamContent] Kích hoạt nhánh Gemini Vision để giải cứu sơ đồ hình ảnh...");
        const arrayBuf = await file.arrayBuffer();
        const { questions: visionQuestions, flowchart: visionFlowchart, table: visionTable } =
          await extractDiagramQuestionsWithGemini(arrayBuf, {
            missingNumbers: missingNums,
            hintContext: cleanedText.slice(0, 1000),
            partTitle: title,
          });

        if (visionFlowchart) {
          parsedExam.flowcharts = [visionFlowchart];
        }

        if (visionTable) {
          parsedExam.tables = [visionTable];
        }

        if (visionQuestions.length > 0) {
          const visionMap = new Map<number, ParsedQuestion>();
          visionQuestions.forEach((vq) => visionMap.set(vq.questionNumber, vq));

          // Hợp nhất vào parsedExam.questions
          const mergedQuestions: ParsedQuestion[] = [];
          const existingNums = new Set((parsedExam.questions || []).map((q) => q.questionNumber));

          for (const q of parsedExam.questions || []) {
            if (visionMap.has(q.questionNumber)) {
              // Thay thế câu bị bịa bằng câu chính xác đọc từ mắt của Gemini
              const vq = visionMap.get(q.questionNumber)!;
              mergedQuestions.push({
                ...q,
                ...vq,
                passageText: q.passageText,
                flowchartGroupTitle: visionFlowchart?.title || q.flowchartGroupTitle,
              });
              visionMap.delete(q.questionNumber);
            } else {
              mergedQuestions.push(q);
            }
          }

          // Bổ sung các câu từ vision còn thiếu vào đúng vị trí
          for (const [vNum, vq] of Array.from(visionMap.entries())) {
            if (!existingNums.has(vNum)) {
              mergedQuestions.push({
                ...vq,
                flowchartGroupTitle: visionFlowchart?.title,
              });
            }
          }

          // Sắp xếp lại theo thứ tự questionNumber
          mergedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
          parsedExam.questions = mergedQuestions;

          // Cập nhật lại trong sections nếu có
          if (parsedExam.sections && parsedExam.sections.length > 0) {
            parsedExam.sections[0].questions = mergedQuestions;
          }
        }
      } catch (err: any) {
        console.warn("[parseIeltsExamContent] Gemini Vision Fallback gặp sự cố:", err.message);
      }
    }
  }

  // 3. Nếu người dùng dán dữ liệu đáp án từ Excel: tự động điền correctAnswer & explanation
  if (excelAnswersRaw && excelAnswersRaw.trim().length > 0) {
    const lines = excelAnswersRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const answersMap = new Map<number, string>();

    for (const line of lines) {
      const match = line.match(/^(\d+)[\s,:\t\-\.]+([^\t\r\n]+)/);
      if (match) {
        const qNum = parseInt(match[1], 10);
        const ans = match[2].trim();
        answersMap.set(qNum, ans);
      }
    }

    if (answersMap.size > 0) {
      for (const q of parsedExam.questions) {
        if (answersMap.has(q.questionNumber)) {
          const val = answersMap.get(q.questionNumber)!;
          if (q.type === "MULTIPLE_CHOICE" && /^[A-D]$/i.test(val)) {
            q.correctAnswer = val.toUpperCase();
            if (q.options) {
              q.options.forEach((opt) => {
                opt.isCorrect = opt.optionLabel.toUpperCase() === q.correctAnswer;
              });
            }
          } else {
            q.correctAnswer = val;
          }
        }
      }
    }
  }

  // 3b. Tự động đồng bộ câu hỏi trong bảng: Thay thế các câu prompt cộc lốc bằng chữ thật trong ô bảng
  syncTableQuestions(parsedExam);

  // 3c. Khử số thứ tự câu hỏi thừa bị dính sát chỗ trống điền từ trong prompt
  if (parsedExam.questions && parsedExam.questions.length > 0) {
    for (const q of parsedExam.questions) {
      if (q.prompt) {
        q.prompt = cleanPromptRedundantNumbers(q.prompt, q.questionNumber);
      }
    }
  }

  if (parsedExam.sections && parsedExam.sections.length > 0) {
    for (const sec of parsedExam.sections) {
      for (const q of sec.questions || []) {
        if (q.prompt) {
          q.prompt = cleanPromptRedundantNumbers(q.prompt, q.questionNumber);
        }
      }
    }
  }

  if (parsedExam.matchingHeadings && parsedExam.matchingHeadings.length > 0) {
    for (const mh of parsedExam.matchingHeadings) {
      if (mh.headings) {
        mh.headings.forEach((h) => {
          h.text = h.text.trim();
        });
      }
    }
  }

  if (parsedExam.summaries && parsedExam.summaries.length > 0) {
    for (const sm of parsedExam.summaries) {
      if (sm.summaryText) {
        sm.summaryText = cleanPromptRedundantNumbers(sm.summaryText);
      }
    }
  }

  // Khử số thứ tự thừa trong Flowchart boxes nếu có
  if (parsedExam.flowcharts && parsedExam.flowcharts.length > 0) {
    for (const fc of parsedExam.flowcharts) {
      for (const box of fc.boxes || []) {
        if (!box.isStatic && box.textTemplate) {
          const lines = box.textTemplate.split("\n");
          const cleanedLines = lines.map((line, lIdx) => {
            const qNum = box.questionNumbers?.[lIdx] || box.questionNumbers?.[0];
            return cleanPromptRedundantNumbers(line, qNum);
          });
          box.textTemplate = cleanedLines.join("\n");
        }
      }
    }
  }

  // 4. Kiểm tra 6 bất biến sư phạm (Invariants validation)
  const invariantsReport = checkExamInvariants({
    questions: parsedExam.questions,
    skill: parsedExam.skill,
    audioUrl: parsedExam.audioUrl,
    sections: parsedExam.sections,
  });
  parsedExam.invariantsReport = invariantsReport;

  return parsedExam;
}

/**
 * Tự động đồng bộ đề bài câu hỏi từ các ô trong Bảng biểu Table Completion
 * Loại bỏ hoàn toàn các câu tự sinh cộc lốc kiểu "Complete the first blank in the table (row 1, column 1)"
 */
function syncTableQuestions(parsedExam: ParsedExamResult): void {
  const tables = parsedExam.tables || [];
  if (tables.length === 0) return;

  const replaceGenericPrompt = (q: ParsedQuestion) => {
    const isGeneric =
      /complete the (?:first|second|third|fourth|fifth|sixth|\d+th|blank|table)|blank in the table|row \d+, column \d+/i.test(
        q.prompt
      ) || q.prompt.length < 8;

    if (!isGeneric) return;

    for (const tbl of tables) {
      if (!tbl || !Array.isArray(tbl.rows)) continue;
      const qNumStr = String(q.questionNumber);
      const regex = new RegExp(
        `(?:\\(${qNumStr}\\)|\\b${qNumStr}\\b[\\.\\)]?)\\s*(?:_{2,}|\\.{3,})|(?:_{2,}|\\.{3,})\\s*(?:\\(${qNumStr}\\)|\\b${qNumStr}\\b[\\.\\)]?)`,
        "i"
      );

      for (let rIdx = 0; rIdx < tbl.rows.length; rIdx++) {
        const row = tbl.rows[rIdx];
        if (!Array.isArray(row)) continue;
        for (let cIdx = 0; cIdx < row.length; cIdx++) {
          const cellText = String(row[cIdx] || "").trim();
          if (regex.test(cellText)) {
            const cleanCell = cellText
              .replace(new RegExp(`\\(\\s*${qNumStr}\\s*\\)\\s*_{2,}`, "gi"), "_______")
              .replace(new RegExp(`_{2,}\\s*\\(\\s*${qNumStr}\\s*\\)`, "gi"), "_______")
              .replace(new RegExp(`\\b${qNumStr}\\b\\s*_{2,}`, "gi"), "_______")
              .replace(new RegExp(`_{2,}\\s*\\b${qNumStr}\\b`, "gi"), "_______")
              .replace(/\.{3,}/g, "_______")
              .trim();

            const rowLabel = row[0] && row[0] !== cellText ? String(row[0]).trim() : "";
            const headerLabel =
              tbl.headers && tbl.headers[cIdx] ? String(tbl.headers[cIdx]).trim() : "";

            let prefix = "";
            if (rowLabel && headerLabel) {
              prefix = `${rowLabel} (${headerLabel}): `;
            } else if (rowLabel) {
              prefix = `${rowLabel}: `;
            } else if (headerLabel) {
              prefix = `${headerLabel}: `;
            }

            if (cleanCell.length <= 10 && prefix) {
              q.prompt = `${prefix}_______`;
            } else if (prefix && !cleanCell.toLowerCase().includes(rowLabel.toLowerCase())) {
              q.prompt = `${prefix}${cleanCell}`;
            } else {
              q.prompt = cleanCell || `${prefix}_______`;
            }
            return;
          }
        }
      }
    }
  };

  (parsedExam.questions || []).forEach(replaceGenericPrompt);
  (parsedExam.sections || []).forEach((sec) => {
    (sec.questions || []).forEach(replaceGenericPrompt);
  });
}
