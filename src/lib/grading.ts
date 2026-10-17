/**
 * Quy tắc chấm điểm tự động bài tập (hàm thuần, không đụng DB/session).
 * Tách từ `submitAssignmentAction` để dùng chung và kiểm thử, GIỮ NGUYÊN hành vi cũ.
 */

/** Các dạng câu hỏi được hệ thống tự chấm (còn lại như ESSAY/SPEAKING chờ giáo viên chấm tay). */
export const OBJECTIVE_QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE_NG",
  "FILL_IN_BLANK",
] as const;

export function isObjectiveType(type?: string | null): boolean {
  return (OBJECTIVE_QUESTION_TYPES as readonly string[]).includes(type || "");
}

/**
 * So khớp đáp án: bỏ khoảng trắng đầu/cuối, không phân biệt hoa/thường.
 * Đáp án gốc rỗng thì luôn coi là sai.
 */
export function isAnswerCorrect(
  correctAnswer?: string | null,
  studentAnswer?: string | null
): boolean {
  const cleanCorrect = (correctAnswer || "").trim().toLowerCase();
  const cleanStudent = (studentAnswer || "").trim().toLowerCase();
  return cleanCorrect === cleanStudent && cleanCorrect.length > 0;
}

/** Bài chỉ gồm câu tự chấm được thì có điểm ngay (GRADED), ngược lại chờ giáo viên (SUBMITTED). */
export function isObjectiveOnly(questions: { type?: string | null }[]): boolean {
  return questions.every((q) => isObjectiveType(q.type));
}
