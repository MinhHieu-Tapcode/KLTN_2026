import { ParsedExamResult, ParsedQuestion } from "./types";

/**
 * Hàm thuần thao tác trên kết quả bóc tách theo NHÓM câu (Questions X-Y) trong từng phần thi.
 * Mọi hàm trả về bản sao mới (không sửa trực tiếp), cập nhật cả `questions` lẫn `sections[].questions`.
 */

export interface ParsedGroupInfo {
  key: string;
  sectionKey?: string;
  title: string;
  numbers: number[];
  ieltsQuestionType?: string;
  renderMode: "STRUCTURED" | "IMAGE";
  figurePage?: number;
  figureBox?: [number, number, number, number];
  imageUrl?: string;
  isWriting: boolean;
  // Nhóm bắt buộc có ảnh để học viên làm bài được
  needsImage: boolean;
  // Nhóm đang hiển thị bằng bảng / sơ đồ / tóm tắt / nối tiêu đề tương tác
  hasStructure: boolean;
}

const VISUAL_TYPES = ["READING_DIAGRAM_LABELLING", "LISTENING_MAP_PLAN", "LISTENING_MAP_PLAN_DIAGRAM", "WRITING_TASK_1"];

export function questionNeedsImage(q: Partial<ParsedQuestion>): boolean {
  return q.renderMode === "IMAGE" || q.type === "MAP" || VISUAL_TYPES.includes(q.ieltsQuestionType || "");
}

function structureNumbers(data: ParsedExamResult, sectionKey?: string): Set<number> {
  const nums = new Set<number>();
  const same = (sk?: string) => !sk || !sectionKey || sk === sectionKey;
  (data.tables || []).filter((t) => same(t.sectionKey)).forEach((t) => t.questionNumbers.forEach((n) => nums.add(n)));
  (data.flowcharts || []).filter((f) => same(f.sectionKey)).forEach((f) => f.questionNumbers.forEach((n) => nums.add(n)));
  (data.summaries || []).filter((s) => same(s.sectionKey)).forEach((s) => s.questionNumbers.forEach((n) => nums.add(n)));
  (data.matchingHeadings || []).filter((m) => same(m.sectionKey)).forEach((m) => m.items.forEach((i) => nums.add(i.questionNumber)));
  return nums;
}

export function sectionQuestions(data: ParsedExamResult, sectionId?: string): ParsedQuestion[] {
  const sec = data.sections?.find((s) => s.id === sectionId) || data.sections?.[0];
  return sec ? sec.questions : data.questions || [];
}

/** Gom câu của một phần thi thành các nhóm theo groupTitle (Writing/Speaking mỗi câu là một nhóm) */
export function listParsedGroups(data: ParsedExamResult, sectionId?: string): ParsedGroupInfo[] {
  const questions = sectionQuestions(data, sectionId);
  const groups = new Map<string, ParsedQuestion[]>();
  for (const q of questions) {
    const title = q.groupTitle || (q.type === "ESSAY" ? "Writing" : q.type === "SPEAKING_RECORD" ? "Speaking" : "");
    if (!title) continue;
    groups.set(title, [...(groups.get(title) || []), q]);
  }
  return Array.from(groups.entries()).map(([title, qs]) => {
    const first = qs[0];
    const sk = first.sectionKey;
    const structured = structureNumbers(data, sk);
    const box = first.figureBox && first.figureBox.length === 4 ? (first.figureBox as [number, number, number, number]) : undefined;
    return {
      key: `${sk || "main"}|${title}`,
      sectionKey: sk,
      title,
      numbers: qs.map((q) => q.questionNumber),
      ieltsQuestionType: first.ieltsQuestionType,
      renderMode: qs.some((q) => q.renderMode === "IMAGE") ? "IMAGE" : "STRUCTURED",
      figurePage: first.figurePage,
      figureBox: box,
      imageUrl: qs.find((q) => q.imageUrl)?.imageUrl,
      isWriting: first.type === "ESSAY",
      needsImage: qs.some((q) => questionNeedsImage(q)),
      hasStructure: qs.some((q) => structured.has(q.questionNumber)),
    };
  });
}

type QuestionMapper = (q: ParsedQuestion) => ParsedQuestion;

function mapGroupQuestions(data: ParsedExamResult, sectionKey: string | undefined, numbers: number[], fn: QuestionMapper): ParsedExamResult {
  const hit = (q: ParsedQuestion) => q.sectionKey === sectionKey && numbers.includes(q.questionNumber);
  const apply = (q: ParsedQuestion) => (hit(q) ? fn(q) : q);
  return {
    ...data,
    questions: (data.questions || []).map(apply),
    sections: data.sections?.map((s) => ({ ...s, questions: s.questions.map(apply) })),
  };
}

export function applyImageToGroup(
  data: ParsedExamResult,
  sectionKey: string | undefined,
  numbers: number[],
  imageUrl: string,
  figure?: { page: number; box: [number, number, number, number] }
): ParsedExamResult {
  return mapGroupQuestions(data, sectionKey, numbers, (q) => ({
    ...q,
    imageUrl,
    ...(figure ? { figurePage: figure.page, figureBox: figure.box } : {}),
  }));
}

/**
 * Chuyển một nhóm sang "ảnh đề gốc + ô đáp án": bỏ bảng/sơ đồ tương tác của nhóm đó trong đúng phần thi,
 * câu hỏi thành điền từ (giữ nguyên dạng nhận định True/False vì phương án cố định).
 */
export function convertGroupToImageMode(data: ParsedExamResult, sectionKey: string | undefined, numbers: number[]): ParsedExamResult {
  const overlaps = (g: { sectionKey?: string; questionNumbers: number[] }) =>
    (!g.sectionKey || g.sectionKey === sectionKey) && g.questionNumbers.some((n) => numbers.includes(n));
  const next = mapGroupQuestions(data, sectionKey, numbers, (q) => ({
    ...q,
    renderMode: "IMAGE",
    type: q.type === "TRUE_FALSE_NG" ? q.type : "FILL_IN_BLANK",
    options: q.type === "TRUE_FALSE_NG" ? q.options : [],
  }));
  return {
    ...next,
    tables: next.tables?.filter((t) => !overlaps(t)),
    flowcharts: next.flowcharts?.filter((f) => !overlaps(f)),
    summaries: next.summaries?.filter((s) => !overlaps(s)),
    matchingHeadings: next.matchingHeadings?.filter((m) => !overlaps(m)),
  };
}
