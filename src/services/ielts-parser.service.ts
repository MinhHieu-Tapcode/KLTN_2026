import {
  cleanAndReflowPages,
  extractAndCleanDocument,
} from "@/lib/exam-parser/extract-text";
import { parseExamTextWithGroq } from "@/lib/exam-parser/groq-parser";
import { CoverageGap, ParsedExamResult, ParsedQuestion } from "@/lib/exam-parser/types";
import { checkExamInvariants } from "./ielts-invariants.service";
import { formatCoverageGap } from "@/lib/exam-parser/exam-skeleton";
import { validateQuestion } from "@/lib/exam-parser/question-validator";
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
  let lowTextPageWarning = "";

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
      if (extracted.data.lowTextPages && extracted.data.lowTextPages.length > 0) {
        lowTextPageWarning = `Trang ${extracted.data.lowTextPages.join(", ")} của PDF gần như không có chữ (có thể là ảnh/bản scan) nên nội dung các trang này chưa được bóc tách.`;
      }
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

  if (lowTextPageWarning) {
    parsedExam.warnings = [...(parsedExam.warnings || []), lowTextPageWarning];
  }

  // 2.1. ĐỌC NỘI DUNG NẰM TRONG ẢNH (bảng, sơ đồ, flowchart) BẰNG GEMINI VISION
  // Kích hoạt khi: (a) Skeleton báo nhóm câu hỏi còn thiếu nội dung, (b) có từ khoá sơ đồ, (c) prompt đáng ngờ,
  // hoặc (d) số câu bị nhảy cóc. Trước đây chỉ (b)-(d) nên bảng nằm trong ảnh không bao giờ được đọc.
  const isPdfFile =
    Boolean(file && (file as any).size > 0) &&
    (!file?.name || file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type.includes("pdf")) || !file.name.endsWith(".docx"));

  const gaps: CoverageGap[] = parsedExam.coverageGaps || [];

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
    const invariantMissing = (tempInvariants.missingNumbers || []) as number[];
    const gapNumbers = gaps.flatMap((g) => g.missingNumbers);
    const missingNums = Array.from(new Set([...gapNumbers, ...invariantMissing])).sort((a, b) => a - b);

    if (gaps.length > 0 && !(process.env.GEMINI_API_KEY || "").trim()) {
      parsedExam.warnings = [
        ...(parsedExam.warnings || []),
        "Chưa cấu hình GEMINI_API_KEY nên chưa đọc được nội dung câu hỏi nằm trong ảnh/bảng của PDF. Hãy đặt biến môi trường GEMINI_API_KEY hoặc nhập tay các câu còn thiếu.",
      ];
    } else if (gaps.length > 0 || hasFlowchartKeyword || hasSuspectPrompt || missingNums.length > 0) {
      try {
        console.log("[parseIeltsExamContent] Kích hoạt Gemini Vision để đọc nội dung trong ảnh...");
        const arrayBuf = await file.arrayBuffer();
        const groupHints = gaps
          .map((g) => `Questions ${g.startNum}-${g.endNum} (${g.kind}, thiếu câu ${g.missingNumbers.join(", ")})`)
          .join("; ");
        const vision = await extractDiagramQuestionsWithGemini(arrayBuf, {
          missingNumbers: missingNums,
          groupHints: groupHints || undefined,
          hintContext: cleanedText.slice(0, 1000),
          partTitle: title,
        });
        mergeVisionResult(parsedExam, vision, gaps);
      } catch (err: any) {
        console.warn("[parseIeltsExamContent] Gemini Vision Fallback gặp sự cố:", err.message);
        parsedExam.warnings = [
          ...(parsedExam.warnings || []),
          `Gemini Vision gặp sự cố khi đọc ảnh: ${String(err.message).slice(0, 140)}`,
        ];
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
  // Đưa cảnh báo của bộ bóc tách lên giao diện: modal chỉ hiển thị invariantsReport nên trước đây
  // việc mất câu/loại câu lỗi hoàn toàn không đến được mắt giáo viên.
  if (parsedExam.coverageIssues && parsedExam.coverageIssues.length > 0) {
    invariantsReport.errors.push(...parsedExam.coverageIssues);
    invariantsReport.isValid = false;
  }
  if (parsedExam.warnings && parsedExam.warnings.length > 0) {
    invariantsReport.warnings.push(...parsedExam.warnings);
  }
  parsedExam.invariantsReport = invariantsReport;

  return parsedExam;
}

/** Thay các bảng/sơ đồ trùng số câu, thêm bảng mới (không ghi đè toàn bộ như trước) */
function upsertGroups<T extends { questionNumbers?: number[] }>(existing: T[] | undefined, incoming: T[]): T[] {
  const kept = (existing || []).filter(
    (e) => !incoming.some((n) => (n.questionNumbers || []).some((q) => (e.questionNumbers || []).includes(q)))
  );
  return [...kept, ...incoming];
}

/**
 * Gộp kết quả Gemini Vision vào đề đã bóc.
 * - Đề 1 section / không section: giữ cách cũ (thay câu cùng số, bổ sung câu thiếu).
 * - Đề nhiều section: chỉ điền đúng các câu còn thiếu theo từng nhóm (gap) của từng section,
 *   vì số câu trùng nhau giữa các kỹ năng nên không thể thay theo số câu toàn cục.
 * Sau khi gộp, tính lại những câu còn thiếu để cảnh báo đúng.
 */
export function mergeVisionResult(parsedExam: ParsedExamResult, vision: any, gaps: CoverageGap[]): void {
  const visionQuestions: ParsedQuestion[] = (vision?.questions || []).filter((vq: ParsedQuestion) => {
    const v = validateQuestion(vq);
    return !v.reasons.some((r) => r.includes("prompt_la_cau_chi_dan") || r.includes("prompt_placeholder"));
  });
  const visionTables = vision?.tables && vision.tables.length > 0 ? vision.tables : vision?.table ? [vision.table] : [];

  if (vision?.flowchart) {
    parsedExam.flowcharts = upsertGroups(parsedExam.flowcharts, [vision.flowchart]);
  }
  if (visionTables.length > 0) {
    parsedExam.tables = upsertGroups(parsedExam.tables, visionTables);
  }

  const sections = parsedExam.sections || [];
  const visionMap = new Map<number, ParsedQuestion>();
  visionQuestions.forEach((vq) => visionMap.set(vq.questionNumber, vq));

  if (sections.length > 1) {
    // Một số câu chỉ được điền khi nó thuộc đúng MỘT nhóm thiếu, tránh nhầm giữa Reading 5 và Listening 5
    const owners = new Map<number, number>();
    gaps.forEach((g) => g.missingNumbers.forEach((n) => owners.set(n, (owners.get(n) || 0) + 1)));

    for (const g of gaps) {
      const sec = sections.find((x) => x.id === g.sectionKey);
      if (!sec) continue;
      for (const n of g.missingNumbers) {
        const vq = visionMap.get(n);
        if (!vq || (owners.get(n) || 0) > 1) continue;
        if (sec.questions.some((q) => q.questionNumber === n)) continue;
        sec.questions.push({ ...vq, sectionKey: sec.id, passageText: sec.passageText || vq.passageText });
      }
      sec.questions.sort((a, b) => a.questionNumber - b.questionNumber);
    }
    parsedExam.questions = sections
      .flatMap((sec) => sec.questions)
      .sort((a, b) => a.questionNumber - b.questionNumber);
  } else if (visionQuestions.length > 0) {
    const merged: ParsedQuestion[] = [];
    const existingNums = new Set((parsedExam.questions || []).map((q) => q.questionNumber));
    for (const q of parsedExam.questions || []) {
      const vq = visionMap.get(q.questionNumber);
      if (vq) {
        merged.push({ ...q, ...vq, passageText: q.passageText, sectionKey: q.sectionKey, flowchartGroupTitle: vision?.flowchart?.title || q.flowchartGroupTitle });
        visionMap.delete(q.questionNumber);
      } else {
        merged.push(q);
      }
    }
    for (const [num, vq] of Array.from(visionMap.entries())) {
      if (!existingNums.has(num)) merged.push({ ...vq, flowchartGroupTitle: vision?.flowchart?.title });
    }
    merged.sort((a, b) => a.questionNumber - b.questionNumber);
    parsedExam.questions = merged;
    if (sections.length === 1) sections[0].questions = merged;
  }

  // Tính lại những câu còn thiếu sau khi đọc ảnh
  if (gaps.length > 0) {
    const stillGaps: CoverageGap[] = [];
    for (const g of gaps) {
      const sec = sections.length > 1 ? sections.find((x) => x.id === g.sectionKey) : undefined;
      const present = new Set((sec ? sec.questions : parsedExam.questions || []).map((q) => q.questionNumber));
      const remaining = g.missingNumbers.filter((n) => !present.has(n));
      if (remaining.length > 0) stillGaps.push({ ...g, missingNumbers: remaining });
    }
    parsedExam.coverageGaps = stillGaps.length > 0 ? stillGaps : undefined;
    parsedExam.coverageIssues = stillGaps.length > 0 ? stillGaps.map(formatCoverageGap) : undefined;
    const filled = gaps.reduce((a, g) => a + g.missingNumbers.length, 0) - stillGaps.reduce((a, g) => a + g.missingNumbers.length, 0);
    if (filled > 0) {
      parsedExam.warnings = [
        ...(parsedExam.warnings || []),
        `Đã đọc thêm ${filled} câu từ hình ảnh bằng Gemini Vision. Vui lòng đối chiếu lại với đề gốc trước khi giao bài.`,
      ];
    }
  }
}

/**
 * Tự động đồng bộ đề bài câu hỏi từ các ô trong Bảng biểu Table Completion
 * Loại bỏ hoàn toàn các câu tự sinh cộc lốc kiểu "Complete the first blank in the table (row 1, column 1)"
 */
export function syncTableQuestions(parsedExam: ParsedExamResult): void {
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
        `\\(${qNumStr}\\)|\\[${qNumStr}\\]|(?:\\(${qNumStr}\\)|\\[${qNumStr}\\]|\\b${qNumStr}\\b[\\.\\)]?)\\s*(?:_{2,}|\\.{3,})|(?:_{2,}|\\.{3,})\\s*(?:\\(${qNumStr}\\)|\\[${qNumStr}\\]|\\b${qNumStr}\\b[\\.\\)]?)`,
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
              .replace(new RegExp(`\\[\\s*${qNumStr}\\s*\\]\\s*_{2,}`, "gi"), "_______")
              .replace(new RegExp(`_{2,}\\s*\\[\\s*${qNumStr}\\s*\\]`, "gi"), "_______")
              .replace(new RegExp(`\\(\\s*${qNumStr}\\s*\\)`, "gi"), "_______")
              .replace(new RegExp(`\\[\\s*${qNumStr}\\s*\\]`, "gi"), "_______")
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
