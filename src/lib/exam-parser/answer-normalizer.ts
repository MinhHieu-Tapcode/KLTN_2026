/**
 * Chuẩn hoá đáp án trước khi lưu, vì hệ thống chấm bằng so khớp chính xác (lib/grading.ts: bỏ khoảng trắng,
 * không phân biệt hoa thường). Excel ghi "T" mà học viên chọn "TRUE" sẽ bị chấm sai nếu không chuẩn hoá.
 */

interface AnswerOption {
  optionLabel: string;
  content: string;
  isCorrect: boolean;
}

interface AnswerQuestion {
  questionNumber: number;
  type?: string;
  ieltsQuestionType?: string | null;
  correctAnswer?: string;
  options?: AnswerOption[];
}

const NO_ANSWER_TYPES = ["ESSAY", "SPEAKING_RECORD"];

function isYesNoQuestion(q: AnswerQuestion): boolean {
  return q.ieltsQuestionType === "READING_YNNG" || (q.options || []).some((o) => o.content.trim().toUpperCase() === "YES");
}

function normalizeJudgement(raw: string, yesNo: boolean): string {
  const v = raw.trim().toUpperCase().replace(/[.\s_-]+/g, " ").trim();
  if (["NG", "N G", "NOT GIVEN", "NOTGIVEN"].includes(v)) return "NOT GIVEN";
  if (yesNo) {
    if (["Y", "YES"].includes(v)) return "YES";
    if (["N", "NO"].includes(v)) return "NO";
  } else {
    if (["T", "TRUE"].includes(v)) return "TRUE";
    if (["F", "FALSE"].includes(v)) return "FALSE";
  }
  return v;
}

/** "a" -> "A"; chữ trùng nội dung phương án -> nhãn; nhiều đáp án "a & c" / "AC" -> "A,C" */
function normalizeChoice(raw: string, options: AnswerOption[], multi: boolean): string {
  const v = raw.trim();
  const byContent = options.find((o) => o.content.trim().toLowerCase() === v.toLowerCase());
  if (byContent) return byContent.optionLabel.toUpperCase();
  if (multi) {
    const letters = v.toUpperCase().match(/[A-H]/g) || [];
    if (letters.length > 0 && /^[A-H\s,;&/+]+$/i.test(v)) return Array.from(new Set(letters)).sort().join(",");
  }
  return /^[a-h]$/i.test(v) ? v.toUpperCase() : v;
}

/** Trả đáp án đã chuẩn hoá và đánh dấu lại isCorrect của phương án */
export function applyNormalizedAnswer<T extends AnswerQuestion>(q: T, raw: string): T {
  const type = q.type || "";
  const options = q.options || [];
  let answer = raw.trim();

  if (type === "TRUE_FALSE_NG") {
    answer = normalizeJudgement(answer, isYesNoQuestion(q));
    return { ...q, correctAnswer: answer, options: options.map((o) => ({ ...o, isCorrect: o.content.trim().toUpperCase() === answer })) };
  }
  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_CHOICE_MULTI" || options.length >= 2) {
    answer = normalizeChoice(answer, options, type === "MULTIPLE_CHOICE_MULTI");
    const chosen = new Set(answer.split(","));
    return { ...q, correctAnswer: answer, options: options.map((o) => ({ ...o, isCorrect: chosen.has(o.optionLabel.toUpperCase()) })) };
  }
  return { ...q, correctAnswer: answer.replace(/\s+/g, " ") };
}

export function questionNeedsAnswer(q: AnswerQuestion): boolean {
  return !NO_ANSWER_TYPES.includes(q.type || "");
}

/** Các câu (đã chọn để phát hành) còn thiếu đáp án chuẩn */
export function findQuestionsMissingAnswer<T extends AnswerQuestion>(questions: T[]): T[] {
  return questions.filter((q) => questionNeedsAnswer(q) && !(q.correctAnswer || "").trim());
}
