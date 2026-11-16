import { ExamRead, ExamReadGroup, ExamReadSection, extractBlankNumbers, groupNumbers } from "./schema";

/**
 * Cổng kiểm tra kết quả Claude (hàm thuần, không gọi AI, không đọc CSDL).
 * Mỗi nhóm câu tự quyết STRUCTURED (dựng được giao diện) hay IMAGE (ảnh đề gốc + ô đáp án).
 * Đặc tả: docs/flows/exam-parser-claude-pipeline.md mục 7.
 */

export interface GroupCheck {
  mode: "STRUCTURED" | "IMAGE";
  numbers: number[];
  // Lý do hạ xuống IMAGE (rỗng nếu STRUCTURED)
  reasons: string[];
  // Còn dựng được nhưng GV nên xem kỹ (có chữ UNREADABLE, phương án lạ...)
  reviewNotes: string[];
}

export interface ExamCheck {
  groups: Map<ExamReadGroup, GroupCheck>;
  warnings: string[];
  totalQuestions: number;
  imageQuestions: number;
  // Số phần Reading/Listening (có nhóm câu để chấm tự động) trong kết quả
  objectiveSections: number;
}

/** Kẹp vùng hình về thang 0-1000 và đúng thứ tự; trả null nếu vùng vô nghĩa */
export function clampFigureBox(box: number[] | null | undefined): [number, number, number, number] | null {
  if (!box || box.length !== 4 || box.some((v) => !Number.isFinite(v))) return null;
  const c = box.map((v) => Math.min(1000, Math.max(0, Math.round(v))));
  const [ymin, xmin, ymax, xmax] = [Math.min(c[0], c[2]), Math.min(c[1], c[3]), Math.max(c[0], c[2]), Math.max(c[1], c[3])];
  if (ymax - ymin < 10 || xmax - xmin < 10) return null;
  return [ymin, xmin, ymax, xmax];
}

const UNREADABLE = /UNREADABLE/i;

/** Các số câu mà cấu trúc của nhóm (bảng / flowchart / đoạn ghi chú) có chỗ trống */
export function structureBlankNumbers(g: ExamReadGroup): number[] {
  const parts: string[] = [];
  if (g.table) parts.push(...g.table.headers, ...g.table.rows.flat());
  if (g.flowchart) parts.push(...g.flowchart.boxes.map((b) => b.text));
  if (g.notesText) parts.push(g.notesText);
  return parts.flatMap(extractBlankNumbers);
}

function sameSet(a: number[], b: number[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && Array.from(sa).every((n) => sb.has(n));
}

export function checkGroup(g: ExamReadGroup): GroupCheck {
  const numbers = groupNumbers(g);
  const reasons: string[] = [];
  const reviewNotes: string[] = [];
  const label = numbers.length > 0 ? `Questions ${numbers[0]}-${numbers[numbers.length - 1]}` : "Nhóm câu";

  if (numbers.length === 0) {
    return { mode: "IMAGE", numbers, reasons: [`${label}: dải số câu không hợp lệ`], reviewNotes };
  }
  if (g.renderMode === "IMAGE") reasons.push(`${label}: AI báo không biểu diễn được bố cục`);

  const questionNums = g.questions.map((q) => Math.round(q.number));
  const outOfRange = questionNums.filter((n) => !numbers.includes(n));
  if (outOfRange.length > 0) reasons.push(`${label}: có câu nằm ngoài dải (${outOfRange.join(", ")})`);

  const hasStructure = Boolean(g.table || g.flowchart || g.notesText);
  if (hasStructure) {
    const blanks = structureBlankNumbers(g);
    if (!sameSet(blanks, numbers)) {
      reasons.push(`${label}: chỗ trống trong bảng/sơ đồ (${blanks.join(", ") || "không có"}) không khớp dải số câu`);
    }
  } else {
    const missing = numbers.filter((n) => !questionNums.includes(n));
    if (missing.length > 0) reasons.push(`${label}: thiếu nội dung câu ${missing.join(", ")}`);
    const empty = g.questions.filter((q) => q.prompt.trim().length === 0 && q.options.length === 0);
    if (empty.length > 0) reasons.push(`${label}: câu ${empty.map((q) => q.number).join(", ")} không có nội dung`);
  }

  const isChoice = g.ieltsType === "MCQ_SINGLE" || g.ieltsType === "MCQ_MULTI";
  if (isChoice) {
    const fewOptions = g.questions.filter((q) => q.options.length < 2);
    if (fewOptions.length > 0) reasons.push(`${label}: câu ${fewOptions.map((q) => q.number).join(", ")} thiếu phương án`);
  }
  const isMatching = ["MATCHING_HEADINGS", "MATCHING_INFORMATION", "MATCHING_FEATURES", "SENTENCE_ENDINGS"].includes(g.ieltsType);
  if (isMatching && (!g.sharedOptions || g.sharedOptions.length < 2)) {
    // Dạng "Which paragraph contains..." có thể không in danh sách: vẫn dùng được, chỉ cần GV xem
    reviewNotes.push(`${label}: không đọc được danh sách lựa chọn dùng chung`);
  }

  const allText = JSON.stringify([g.table, g.flowchart, g.notesText, g.questions, g.sharedOptions]);
  if (UNREADABLE.test(allText)) reviewNotes.push(`${label}: có chỗ AI không đọc rõ (UNREADABLE), cần đối chiếu đề gốc`);

  return { mode: reasons.length > 0 ? "IMAGE" : "STRUCTURED", numbers, reasons, reviewNotes };
}

function checkSectionNumbers(section: ExamReadSection, idx: number, warnings: string[]): void {
  const seen = new Map<number, number>();
  section.groups.forEach((g) => groupNumbers(g).forEach((n) => seen.set(n, (seen.get(n) || 0) + 1)));
  const dups = Array.from(seen.entries()).filter(([, c]) => c > 1).map(([n]) => n);
  if (dups.length > 0) {
    warnings.push(`Phần ${idx + 1} (${section.title || section.skill}): số câu ${dups.join(", ")} thuộc nhiều nhóm cùng lúc.`);
  }
}

export function checkExamRead(read: ExamRead): ExamCheck {
  const groups = new Map<ExamReadGroup, GroupCheck>();
  const warnings: string[] = [];
  let totalQuestions = 0;
  let imageQuestions = 0;
  let objectiveSections = 0;

  read.sections.forEach((section, idx) => {
    // Writing/Speaking không có dải số câu kiểu Reading/Listening: dựng riêng trong assemble, không tính vào tỉ lệ lỗi
    if (section.skill === "WRITING" || section.skill === "SPEAKING") return;
    objectiveSections++;
    checkSectionNumbers(section, idx, warnings);
    for (const g of section.groups) {
      const res = checkGroup(g);
      groups.set(g, res);
      totalQuestions += res.numbers.length;
      if (res.mode === "IMAGE") imageQuestions += res.numbers.length;
    }
  });

  return { groups, warnings, totalQuestions, imageQuestions, objectiveSections };
}

/**
 * Tỉ lệ câu phải hạ xuống IMAGE, dùng để quyết định leo thang sang model mạnh hơn.
 * Đề chỉ có Writing/Speaking thì không có câu để tính: trả 0 (trước đây trả 1 nên đề Speaking bị gọi thêm Sonnet).
 */
export function imageRatio(check: ExamCheck): number {
  if (check.totalQuestions === 0) return check.objectiveSections > 0 ? 1 : 0;
  return check.imageQuestions / check.totalQuestions;
}
