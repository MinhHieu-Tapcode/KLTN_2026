/**
 * Hàm thuần: kiểm tra cấu hình giao bài (dùng chung cho giao từng lớp, giao hàng loạt, giao từ đề bóc tách)
 * và quyết định học sinh có được xem đáp án hay không.
 */

export const MIN_ATTEMPTS = 1;
export const MAX_ATTEMPTS = 10;
export const DEFAULT_ATTEMPTS = 1;

export type AnswerVisibilityMode = "AFTER_SUBMIT" | "AFTER_GRADED" | "NEVER" | "FROM_DATE";

export const ANSWER_VISIBILITY_MODES: AnswerVisibilityMode[] = [
  "AFTER_SUBMIT",
  "AFTER_GRADED",
  "NEVER",
  "FROM_DATE",
];

export const ANSWER_VISIBILITY_LABELS: Record<AnswerVisibilityMode, string> = {
  AFTER_SUBMIT: "Hiển thị sau khi học sinh nộp bài",
  AFTER_GRADED: "Chỉ hiển thị sau khi bài được chấm",
  NEVER: "Không hiển thị đáp án cho học sinh",
  FROM_DATE: "Hiển thị từ ngày/giờ cấu hình",
};

export interface AssignmentConfigInput {
  durationMinutes?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  maxAttempts?: number | null;
  answerVisibility?: string | null;
  answerVisibleAt?: string | null;
}

export interface AssignmentConfigResult {
  error?: string;
  maxAttempts: number;
  answerVisibility: AnswerVisibilityMode;
  answerVisibleAt: Date | null;
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function validateAssignmentConfig(input: AssignmentConfigInput): AssignmentConfigResult {
  const fail = (error: string): AssignmentConfigResult => ({
    error,
    maxAttempts: DEFAULT_ATTEMPTS,
    answerVisibility: "AFTER_SUBMIT",
    answerVisibleAt: null,
  });

  // Số lần làm: nếu không gửi lên thì dùng mặc định; nếu gửi thì phải hợp lệ (không tự sửa giá trị sai)
  let maxAttempts = DEFAULT_ATTEMPTS;
  if (input.maxAttempts !== undefined && input.maxAttempts !== null) {
    const n = Number(input.maxAttempts);
    if (!Number.isInteger(n) || n < MIN_ATTEMPTS || n > MAX_ATTEMPTS) {
      return fail(`Số lần được làm phải là số nguyên từ ${MIN_ATTEMPTS} đến ${MAX_ATTEMPTS}!`);
    }
    maxAttempts = n;
  }

  if (input.durationMinutes !== undefined && input.durationMinutes !== null) {
    const d = Number(input.durationMinutes);
    if (!Number.isFinite(d) || d <= 0) return fail("Thời gian làm bài phải lớn hơn 0 phút!");
  }

  if (input.startDate && !parseDate(input.startDate)) return fail("Thời điểm bắt đầu làm không hợp lệ!");
  if (input.dueDate && !parseDate(input.dueDate)) return fail("Hạn làm bài không hợp lệ!");
  const start = parseDate(input.startDate);
  const due = parseDate(input.dueDate);
  if (start && due && start.getTime() >= due.getTime()) {
    return fail("Hạn làm bài phải sau thời điểm bắt đầu làm!");
  }

  const mode = (input.answerVisibility || "AFTER_SUBMIT") as AnswerVisibilityMode;
  if (!ANSWER_VISIBILITY_MODES.includes(mode)) return fail("Chế độ hiển thị đáp án không hợp lệ!");

  let answerVisibleAt: Date | null = null;
  if (mode === "FROM_DATE") {
    answerVisibleAt = parseDate(input.answerVisibleAt);
    if (!answerVisibleAt) return fail("Vui lòng nhập thời điểm hiển thị đáp án!");
  }

  return { maxAttempts, answerVisibility: mode, answerVisibleAt };
}

/** Học sinh có được xem đáp án của một bài nộp không? */
export function canStudentViewAnswers(params: {
  mode?: string | null;
  visibleAt?: Date | string | null;
  submissionStatus?: string | null; // IN_PROGRESS | SUBMITTED | GRADED...
  now?: Date;
}): boolean {
  const mode = (params.mode || "AFTER_SUBMIT") as AnswerVisibilityMode;
  const status = params.submissionStatus || "IN_PROGRESS";
  const now = params.now ?? new Date();
  switch (mode) {
    case "NEVER":
      return false;
    case "AFTER_GRADED":
      return status === "GRADED";
    case "FROM_DATE": {
      if (!params.visibleAt) return false;
      return now.getTime() >= new Date(params.visibleAt).getTime();
    }
    case "AFTER_SUBMIT":
    default:
      return status === "SUBMITTED" || status === "GRADED";
  }
}
