import { extractText, getDocumentProxy } from "unpdf";
import { cleanAndReflowPages, extractAndCleanDocument } from "@/lib/exam-parser/extract-text";
import { ParsedExamResult } from "@/lib/exam-parser/types";
import { readExamWithClaude, hasClaudeApiKey, ExamReaderResult } from "@/lib/exam-parser/claude/claude-exam-reader";
import { checkExamRead, imageRatio, ExamCheck } from "@/lib/exam-parser/claude/validate";
import { assembleExam } from "@/lib/exam-parser/claude/assemble";
import { ExamRead } from "@/lib/exam-parser/claude/schema";
import { checkExamInvariants, ExamInvariantsReport } from "./ielts-invariants.service";
import type { ParseIeltsExamInput } from "./ielts-parser.service";

/**
 * Pipeline bóc tách đề bằng Claude (docs/flows/exam-parser-claude-pipeline.md).
 * Trả `ok: false` khi Claude không dùng được (thiếu khoá, từ chối, lỗi mạng...) để service gọi quay về pipeline cũ;
 * ném Error (tiếng Việt) khi lỗi thuộc về tệp của người dùng (quá lớn, sai định dạng, sai kỹ năng).
 */

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ESCALATE_IMAGE_RATIO = 0.25;

export type ClaudePipelineResult = { ok: true; data: ParsedExamResult } | { ok: false; reason: string };

export function resolveExamParserEngine(): "claude" | "legacy" {
  const engine = (process.env.EXAM_PARSER_ENGINE || "").trim().toLowerCase();
  if (engine === "legacy") return "legacy";
  return hasClaudeApiKey() ? "claude" : "legacy";
}

interface PreparedDocument {
  pdfBase64?: string;
  documentText?: string;
  isScannedPdf: boolean;
  cleanedText: string;
  cleanPages: (startPage: number, endPage: number) => string;
}

async function prepareDocument(file: File): Promise<PreparedDocument> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Dung lượng tệp vượt quá giới hạn 25MB. Vui lòng chọn tệp nhỏ hơn!");
  }
  const name = (file.name || "").toLowerCase();
  const isDocx = name.endsWith(".docx");
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  if (!isPdf && !isDocx) {
    throw new Error("Định dạng tệp chưa hỗ trợ. Vui lòng tải lên tệp PDF (.pdf) hoặc Word (.docx)!");
  }

  if (isDocx) {
    const extracted = await extractAndCleanDocument(file);
    if (!extracted.ok) throw new Error(extracted.error);
    const text = extracted.data.cleanedText;
    return { documentText: text, isScannedPdf: false, cleanedText: text, cleanPages: () => text };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let pageTexts: string[] = [];
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const maxPages = Number(process.env.EXAM_PARSER_MAX_PAGES) || 20;
    if ((pdf.numPages || 0) > maxPages) {
      throw new Error(
        `Tệp PDF có ${pdf.numPages} trang, vượt giới hạn ${maxPages} trang cho một lần bóc tách. Vui lòng tách theo từng phần thi.`
      );
    }
    const extracted = await extractText(pdf, { mergePages: false });
    pageTexts = Array.isArray(extracted.text) ? extracted.text : [String(extracted.text || "")];
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Tệp PDF có")) throw err;
    throw new Error("Không thể đọc nội dung tệp PDF. Tệp có thể bị hỏng hoặc đặt mật khẩu bảo vệ!");
  }

  const isScannedPdf = pageTexts.join("").replace(/\s+/g, "").length < 40;
  return {
    pdfBase64: buffer.toString("base64"),
    isScannedPdf,
    cleanedText: cleanAndReflowPages(pageTexts),
    cleanPages: (start, end) => {
      const s = Math.max(1, Math.min(start, end));
      const e = Math.min(pageTexts.length, Math.max(start, end));
      return cleanAndReflowPages(pageTexts.slice(s - 1, e));
    },
  };
}

interface Attempt {
  result: ExamReaderResult;
  check?: ExamCheck;
}

async function attemptRead(doc: PreparedDocument, model: string, teacherSkill: string): Promise<Attempt> {
  const result = await readExamWithClaude({
    model,
    teacherSkill,
    pdfBase64: doc.pdfBase64,
    documentText: doc.documentText,
    isScannedPdf: doc.isScannedPdf,
  });
  return { result, check: result.ok ? checkExamRead(result.data) : undefined };
}

/** Kiểm tra bất biến theo TỪNG phần thi (Reading và Listening đều đánh số từ 1 nên không gộp chung) */
function buildInvariantsReport(parsed: ParsedExamResult): ExamInvariantsReport {
  const sections = parsed.sections && parsed.sections.length > 0 ? parsed.sections : null;
  if (!sections || sections.length === 1) {
    return checkExamInvariants({ questions: parsed.questions, skill: parsed.skill, audioUrl: parsed.audioUrl, sections: sections || undefined });
  }
  const reports = sections.map((sec) => ({
    sec,
    report: checkExamInvariants({ questions: sec.questions, skill: sec.skill, audioUrl: sec.audioUrl, sections: [sec] }),
  }));
  return {
    isValid: reports.every((r) => r.report.isValid),
    totalQuestions: parsed.questions.length,
    expectedTotal: reports.reduce((s, r) => s + r.report.expectedTotal, 0),
    isSequential: reports.every((r) => r.report.isSequential),
    missingNumbers: [],
    duplicateNumbers: [],
    sectionsBreakdown: reports.flatMap((r) => r.report.sectionsBreakdown),
    errors: reports.flatMap((r) => r.report.errors.map((e) => `${r.sec.title}: ${e}`)),
    warnings: reports.flatMap((r) => r.report.warnings.map((w) => `${r.sec.title}: ${w}`)),
  };
}

export async function parseExamWithClaude(input: ParseIeltsExamInput): Promise<ClaudePipelineResult> {
  const { file, title, skill, durationMinutes, audioUrl } = input;
  if (!file || file.size === 0) return { ok: false, reason: "Không có tệp đề để gửi cho Claude." };

  const doc = await prepareDocument(file);
  const primaryModel = (process.env.EXAM_PARSER_MODEL || "claude-haiku-5-5").trim();
  const escalationModel = (process.env.EXAM_PARSER_ESCALATION_MODEL || "claude-sonnet-5-5").trim();

  let chosen = await attemptRead(doc, primaryModel, skill);
  let escalated = false;
  let totalIn = chosen.result.usage?.inputTokens || 0;
  let totalOut = chosen.result.usage?.outputTokens || 0;
  let totalMs = chosen.result.usage?.durationMs || 0;

  const needsEscalation =
    (!chosen.result.ok && ["refusal", "invalid_json", "max_tokens"].includes(chosen.result.failure)) ||
    (chosen.check !== undefined && imageRatio(chosen.check) > ESCALATE_IMAGE_RATIO);

  if (needsEscalation && escalationModel && escalationModel !== primaryModel) {
    const second = await attemptRead(doc, escalationModel, skill);
    totalIn += second.result.usage?.inputTokens || 0;
    totalOut += second.result.usage?.outputTokens || 0;
    totalMs += second.result.usage?.durationMs || 0;
    const better = second.check && (!chosen.check || imageRatio(second.check) < imageRatio(chosen.check));
    if (second.result.ok && better) {
      chosen = second;
      escalated = true;
    }
  }

  if (!chosen.result.ok || !chosen.check) {
    return { ok: false, reason: chosen.result.ok ? "Kết quả AI không hợp lệ." : chosen.result.message };
  }

  const read: ExamRead = chosen.result.data;
  const parsed = assembleExam(read, chosen.check, {
    title,
    teacherSkill: skill,
    durationMinutes,
    audioUrl,
    cleanedText: doc.cleanedText,
    cleanPages: doc.cleanPages,
  });

  if (escalated) {
    parsed.warnings = [...(parsed.warnings || []), `Đề khó đọc nên hệ thống đã dùng model mạnh hơn (${escalationModel}).`];
  }
  parsed.warnings = [
    ...(parsed.warnings || []),
    "Kết quả do AI đọc từ tệp đề: vui lòng đối chiếu với đề gốc và nhập đáp án trước khi phát hành.",
  ];
  parsed.engineInfo = {
    engine: "claude",
    model: chosen.result.usage.model,
    escalated,
    inputTokens: totalIn,
    outputTokens: totalOut,
    durationMs: totalMs,
  };

  const report = buildInvariantsReport(parsed);
  // Màn duyệt/phát hành khoá câu theo số câu: một tệp chứa nhiều đề trùng số (vd 2 đề Reading 1-40) sẽ bị lẫn câu
  const counts = new Map<number, number>();
  parsed.questions.forEach((q) => counts.set(q.questionNumber, (counts.get(q.questionNumber) || 0) + 1));
  const dupNums = Array.from(counts.entries()).filter(([, c]) => c > 1).map(([n]) => n);
  if (dupNums.length > 0) {
    report.isValid = false;
    report.errors.push(
      `Tệp chứa nhiều phần thi có số câu trùng nhau (câu ${dupNums.slice(0, 10).join(", ")}${dupNums.length > 10 ? "..." : ""}). ` +
        "Vui lòng tách mỗi đề thành một tệp riêng rồi bóc tách lại, nếu không các câu trùng số sẽ bị lẫn khi chọn và phát hành."
    );
  }
  report.warnings.push(...(parsed.warnings || []));
  parsed.invariantsReport = report;
  return { ok: true, data: parsed };
}
