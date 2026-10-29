/**
 * Cấu hình chuẩn IELTS Academic, danh mục 16 dạng câu hỏi, 4 tiêu chí chấm Writing/Speaking,
 * bảng quy đổi Band 40 câu và các ngưỡng cảnh báo cho Module Báo cáo (Phân hệ 2.6).
 */

export interface IeltsQuestionSubtypeOption {
  code: string;
  label: string;
  viLabel: string;
  skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING";
  defaultDbQuestionType:
    | "MULTIPLE_CHOICE"
    | "MULTIPLE_SELECT"
    | "TRUE_FALSE_NG"
    | "FILL_IN_BLANK"
    | "ESSAY"
    | "SPEAKING_RECORD";
}

// 10 Dạng bài Reading chuẩn IELTS Academic (Mục 6.6)
export const READING_IELTS_TYPES: IeltsQuestionSubtypeOption[] = [
  {
    code: "READING_MCQ",
    label: "Multiple Choice",
    viLabel: "Multiple Choice (Trắc nghiệm)",
    skill: "READING",
    defaultDbQuestionType: "MULTIPLE_CHOICE",
  },
  {
    code: "READING_TFNG",
    label: "True/False/Not Given",
    viLabel: "True/False/Not Given",
    skill: "READING",
    defaultDbQuestionType: "TRUE_FALSE_NG",
  },
  {
    code: "READING_YNNG",
    label: "Yes/No/Not Given",
    viLabel: "Yes/No/Not Given",
    skill: "READING",
    defaultDbQuestionType: "TRUE_FALSE_NG",
  },
  {
    code: "READING_MATCHING_HEADINGS",
    label: "Matching Headings",
    viLabel: "Matching Headings (Nối tiêu đề đoạn)",
    skill: "READING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "READING_MATCHING_INFO",
    label: "Matching Information",
    viLabel: "Matching Information (Nối thông tin)",
    skill: "READING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "READING_SENTENCE_COMPLETION",
    label: "Sentence Completion",
    viLabel: "Sentence Completion (Hoàn thành câu)",
    skill: "READING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "READING_SUMMARY_COMPLETION",
    label: "Summary Completion",
    viLabel: "Summary Completion (Hoàn thành tóm tắt)",
    skill: "READING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "READING_NOTE_TABLE_FORM",
    label: "Note/Table/Form Completion",
    viLabel: "Note/Table/Form Completion (Điền bảng/biểu mẫu)",
    skill: "READING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "READING_SHORT_ANSWER",
    label: "Short Answer Questions",
    viLabel: "Short Answer Questions (Trả lời ngắn)",
    skill: "READING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "READING_DIAGRAM_LABELLING",
    label: "Diagram Labelling",
    viLabel: "Diagram Labelling (Dán nhãn sơ đồ)",
    skill: "READING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
];

// 6 Dạng bài Listening chuẩn IELTS (Mục 6.6)
export const LISTENING_IELTS_TYPES: IeltsQuestionSubtypeOption[] = [
  {
    code: "LISTENING_MCQ",
    label: "Multiple Choice",
    viLabel: "Multiple Choice (Trắc nghiệm)",
    skill: "LISTENING",
    defaultDbQuestionType: "MULTIPLE_CHOICE",
  },
  {
    code: "LISTENING_MATCHING",
    label: "Matching",
    viLabel: "Matching (Nối thông tin)",
    skill: "LISTENING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "LISTENING_MAP_PLAN",
    label: "Map/Plan Labelling",
    viLabel: "Map/Plan Labelling (Dán nhãn bản đồ)",
    skill: "LISTENING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "LISTENING_FORM_NOTE_TABLE",
    label: "Form/Note/Table Completion",
    viLabel: "Form/Note/Table Completion (Điền biểu mẫu/bảng)",
    skill: "LISTENING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "LISTENING_SENTENCE_COMPLETION",
    label: "Sentence Completion",
    viLabel: "Sentence Completion (Hoàn thành câu)",
    skill: "LISTENING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
  {
    code: "LISTENING_SHORT_ANSWER",
    label: "Short Answer Questions",
    viLabel: "Short Answer Questions (Trả lời ngắn)",
    skill: "LISTENING",
    defaultDbQuestionType: "FILL_IN_BLANK",
  },
];

// Phân loại Task/Part cho Writing và Speaking (Mục 6.6 & BR-16)
export const WRITING_IELTS_TYPES: IeltsQuestionSubtypeOption[] = [
  {
    code: "WRITING_TASK_1",
    label: "Writing Task 1",
    viLabel: "Writing Task 1 (Báo cáo biểu đồ - Trọng số x1)",
    skill: "WRITING",
    defaultDbQuestionType: "ESSAY",
  },
  {
    code: "WRITING_TASK_2",
    label: "Writing Task 2",
    viLabel: "Writing Task 2 (Bài luận xã hội - Trọng số x2)",
    skill: "WRITING",
    defaultDbQuestionType: "ESSAY",
  },
];

export const SPEAKING_IELTS_TYPES: IeltsQuestionSubtypeOption[] = [
  {
    code: "SPEAKING_PART_1",
    label: "Speaking Part 1",
    viLabel: "Speaking Part 1 (Introduction & Interview)",
    skill: "SPEAKING",
    defaultDbQuestionType: "SPEAKING_RECORD",
  },
  {
    code: "SPEAKING_PART_2",
    label: "Speaking Part 2",
    viLabel: "Speaking Part 2 (Cue Card - Individual Long Turn)",
    skill: "SPEAKING",
    defaultDbQuestionType: "SPEAKING_RECORD",
  },
  {
    code: "SPEAKING_PART_3",
    label: "Speaking Part 3",
    viLabel: "Speaking Part 3 (Two-way Discussion)",
    skill: "SPEAKING",
    defaultDbQuestionType: "SPEAKING_RECORD",
  },
];

export const ALL_IELTS_QUESTION_SUBTYPES: IeltsQuestionSubtypeOption[] = [
  ...READING_IELTS_TYPES,
  ...LISTENING_IELTS_TYPES,
  ...WRITING_IELTS_TYPES,
  ...SPEAKING_IELTS_TYPES,
];

export function getIeltsSubtypesBySkill(skill?: string): IeltsQuestionSubtypeOption[] {
  switch ((skill || "READING").toUpperCase()) {
    case "LISTENING":
      return LISTENING_IELTS_TYPES;
    case "WRITING":
      return WRITING_IELTS_TYPES;
    case "SPEAKING":
      return SPEAKING_IELTS_TYPES;
    case "READING":
      return READING_IELTS_TYPES;
    default:
      return ALL_IELTS_QUESTION_SUBTYPES;
  }
}

export function getIeltsSubtypeLabel(code?: string | null): string {
  if (!code) return "Chưa gắn dạng IELTS";
  const found = ALL_IELTS_QUESTION_SUBTYPES.find((item) => item.code === code);
  return found ? found.label : code;
}

// 4 Tiêu chí chấm điểm Writing & Speaking (Mục 8.5 & BR-07)
export interface IeltsCriterionConfig {
  code: string;
  label: string;
  shortLabel: string;
  viDescription: string;
}

export const WRITING_CRITERIA: IeltsCriterionConfig[] = [
  {
    code: "TA_TR",
    label: "Task Achievement / Task Response",
    shortLabel: "TA/TR",
    viDescription: "Mức độ hoàn thành yêu cầu đề bài & phát triển luận điểm",
  },
  {
    code: "CC",
    label: "Coherence & Cohesion",
    shortLabel: "CC",
    viDescription: "Tính mạch lạc, bố cục đoạn văn & từ nối liên kết",
  },
  {
    code: "LR",
    label: "Lexical Resource",
    shortLabel: "LR",
    viDescription: "Vốn từ vựng học thuật, collocations & chính tả",
  },
  {
    code: "GRA",
    label: "Grammatical Range & Accuracy",
    shortLabel: "GRA",
    viDescription: "Độ đa dạng và chính xác của cấu trúc ngữ pháp",
  },
];

export const SPEAKING_CRITERIA: IeltsCriterionConfig[] = [
  {
    code: "FC",
    label: "Fluency & Coherence",
    shortLabel: "FC",
    viDescription: "Độ trôi chảy, tốc độ nói và sự mạch lạc",
  },
  {
    code: "LR",
    label: "Lexical Resource",
    shortLabel: "LR",
    viDescription: "Vốn từ vựng, cụm từ cố định & khả năng diễn đạt lại (paraphrase)",
  },
  {
    code: "GRA",
    label: "Grammatical Range & Accuracy",
    shortLabel: "GRA",
    viDescription: "Độ đa dạng cấu trúc câu và độ chính xác ngữ pháp",
  },
  {
    code: "P",
    label: "Pronunciation",
    shortLabel: "P",
    viDescription: "Phát âm nguyên âm/phụ âm, trọng âm từ và ngữ điệu",
  },
];

export const IELTS_BAND_STEPS = [
  0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0,
];

/**
 * Làm tròn điểm về mốc 0.5 gần nhất (BR-07, BR-16)
 */
export function roundIeltsBand(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  const clamped = Math.min(9.0, Math.max(0, raw));
  return Math.round(clamped * 2) / 2;
}

/**
 * Tính Band câu Writing/Speaking từ 4 tiêu chí. Trả về null nếu chưa nhập đủ 4 tiêu chí (BR-07).
 */
export function calculateCriteriaBand(scores: Array<number | null | undefined>): number | null {
  if (!scores || scores.length < 4) return null;
  const validScores = scores.filter(
    (s): s is number => typeof s === "number" && Number.isFinite(s) && s >= 0 && s <= 9
  );
  if (validScores.length < 4) return null;
  const sum = validScores.slice(0, 4).reduce((acc, v) => acc + v, 0);
  return roundIeltsBand(sum / 4);
}

/**
 * Tính Band kỹ năng Writing theo công thức IELTS chính thức: (Task 1 + 2 * Task 2) / 3, làm tròn 0.5.
 * Chỉ tính khi học sinh có đủ cả Task 1 và Task 2 (BR-16).
 */
export function calculateWritingOverallBand(
  task1Band?: number | null,
  task2Band?: number | null
): number | null {
  if (
    typeof task1Band !== "number" ||
    typeof task2Band !== "number" ||
    !Number.isFinite(task1Band) ||
    !Number.isFinite(task2Band)
  ) {
    return null;
  }
  return roundIeltsBand((task1Band + 2 * task2Band) / 3);
}

/**
 * Bảng quy đổi Band Academic cho đề đủ 40 câu của Listening và Academic Reading (Mục 8.4, BR-01, BR-02).
 * Trả về null nếu tổng số câu của đề khác 40 (BR-03).
 */
export function estimateAcademicBand(
  skill: string,
  correctCount: number,
  totalQuestions: number
): number | null {
  if (totalQuestions !== 40) return null;
  const c = Math.max(0, Math.min(40, Math.round(correctCount)));
  const normSkill = (skill || "").toUpperCase();

  if (normSkill === "LISTENING") {
    if (c >= 39) return 9.0;
    if (c >= 37) return 8.5;
    if (c >= 35) return 8.0;
    if (c >= 32) return 7.5;
    if (c >= 30) return 7.0;
    if (c >= 26) return 6.5;
    if (c >= 23) return 6.0;
    if (c >= 18) return 5.5;
    if (c >= 16) return 5.0;
    if (c >= 13) return 4.5;
    if (c >= 10) return 4.0;
    return 3.5;
  }

  if (normSkill === "READING") {
    if (c >= 39) return 9.0;
    if (c >= 37) return 8.5;
    if (c >= 35) return 8.0;
    if (c >= 33) return 7.5;
    if (c >= 30) return 7.0;
    if (c >= 27) return 6.5;
    if (c >= 23) return 6.0;
    if (c >= 19) return 5.5;
    if (c >= 15) return 5.0;
    if (c >= 13) return 4.5;
    if (c >= 10) return 4.0;
    return 3.5;
  }

  return null;
}

// Các ngưỡng cấu hình mặc định cho Module Báo cáo (BR-04, BR-10, BR-11)
export const REPORT_THRESHOLDS = {
  lowDataMinQuestions: 10, // BR-04: Dưới 10 câu hiển thị cảnh báo "Ít dữ liệu"
  scoreDistribution: {
    excellent: 80, // >= 80%
    good: 65,      // 65% - 79%
    average: 50,   // 50% - 64%
  },
  studentSupport: {
    minAveragePercent: 50,       // BR-11: ĐTB < 50%
    minOverdueAssignments: 2,    // BR-11: Từ 2 bài quá hạn chưa nộp
    consecutiveDeclineCount: 3,  // BR-11: Điểm giảm liên tiếp qua 3 bài gần nhất
  },
};

export type ReportPeriodKey = "7_DAYS" | "30_DAYS" | "90_DAYS" | "ALL";

export const REPORT_PERIOD_OPTIONS: Array<{
  key: ReportPeriodKey;
  label: string;
  days: number | null;
}> = [
  { key: "7_DAYS", label: "7 ngày gần nhất", days: 7 },
  { key: "30_DAYS", label: "30 ngày gần nhất (Mặc định)", days: 30 },
  { key: "90_DAYS", label: "3 tháng gần nhất (90 ngày)", days: 90 },
  { key: "ALL", label: "Toàn bộ thời gian khóa học", days: null },
];

export function resolvePeriodRange(periodKey: ReportPeriodKey = "30_DAYS"): {
  periodKey: ReportPeriodKey;
  label: string;
  fromDate: Date | null;
  toDate: Date;
} {
  const toDate = new Date();
  const found =
    REPORT_PERIOD_OPTIONS.find((o) => o.key === periodKey) || REPORT_PERIOD_OPTIONS[1];
  if (!found.days) {
    return { periodKey: found.key, label: found.label, fromDate: null, toDate };
  }
  const fromDate = new Date(toDate.getTime() - found.days * 86400000);
  return { periodKey: found.key, label: found.label, fromDate, toDate };
}

// ==========================================
// CẤU HÌNH CHẤM BÀI TRỰC QUAN (INLINE GRADING & TRANSCRIPT)
// ==========================================

export type InlineAnnotationType = "comment" | "delete" | "replace" | "insert";

export interface InlineGradingAnnotation {
  id: string;
  startOffset: number;
  endOffset: number;
  quote: string;
  type: InlineAnnotationType;
  criterion: string; // "TA_TR" | "CC" | "LR" | "GRA" | "FC" | "P"
  text: string;      // Nhận xét hoặc từ thay thế / từ thêm mới
  timestampSec?: number | null; // Mốc giây trong audio đối với bài Speaking
}

export interface SpeakingWordToken {
  word: string;
  startSec: number;
  endSec: number;
  isFiller?: boolean;
  pauseAfterSec?: number;
}

export interface SpeakingTranscriptPayload {
  rawText: string;
  words: SpeakingWordToken[];
  durationSec: number;
  isVisibleToStudent: boolean;
  generatedAt?: string;
}

export interface GradingAnnotationsPayload {
  annotations: InlineGradingAnnotation[];
  speakingTranscript?: SpeakingTranscriptPayload | null;
}

export const CRITERION_COLOR_MAP: Record<
  string,
  {
    hex: string;
    shortCode: string;
    borderTopClass: string;
    borderLeftClass: string;
    badgeBgClass: string;
    softBgClass: string;
    textClass: string;
  }
> = {
  TA_TR: {
    hex: "#6366f1",
    shortCode: "TA",
    borderTopClass: "border-t-indigo-500",
    borderLeftClass: "border-l-indigo-500",
    badgeBgClass: "bg-indigo-600 text-white",
    softBgClass: "bg-indigo-500/15 border-b-2 border-indigo-500",
    textClass: "text-indigo-600",
  },
  TA: {
    hex: "#6366f1",
    shortCode: "TA",
    borderTopClass: "border-t-indigo-500",
    borderLeftClass: "border-l-indigo-500",
    badgeBgClass: "bg-indigo-600 text-white",
    softBgClass: "bg-indigo-500/15 border-b-2 border-indigo-500",
    textClass: "text-indigo-600",
  },
  CC: {
    hex: "#0ea5e9",
    shortCode: "CC",
    borderTopClass: "border-t-sky-500",
    borderLeftClass: "border-l-sky-500",
    badgeBgClass: "bg-sky-600 text-white",
    softBgClass: "bg-sky-500/15 border-b-2 border-sky-500",
    textClass: "text-sky-600",
  },
  LR: {
    hex: "#10b981",
    shortCode: "LR",
    borderTopClass: "border-t-emerald-500",
    borderLeftClass: "border-l-emerald-500",
    badgeBgClass: "bg-emerald-600 text-white",
    softBgClass: "bg-emerald-500/15 border-b-2 border-emerald-500",
    textClass: "text-emerald-600",
  },
  GRA: {
    hex: "#f59e0b",
    shortCode: "GRA",
    borderTopClass: "border-t-amber-500",
    borderLeftClass: "border-l-amber-500",
    badgeBgClass: "bg-amber-500 text-white",
    softBgClass: "bg-amber-500/15 border-b-2 border-amber-500",
    textClass: "text-amber-600",
  },
  FC: {
    hex: "#0ea5e9",
    shortCode: "FC",
    borderTopClass: "border-t-sky-500",
    borderLeftClass: "border-l-sky-500",
    badgeBgClass: "bg-sky-600 text-white",
    softBgClass: "bg-sky-500/15 border-b-2 border-sky-500",
    textClass: "text-sky-600",
  },
  P: {
    hex: "#ec4899",
    shortCode: "P",
    borderTopClass: "border-t-pink-500",
    borderLeftClass: "border-l-pink-500",
    badgeBgClass: "bg-pink-600 text-white",
    softBgClass: "bg-pink-500/15 border-b-2 border-pink-500",
    textClass: "text-pink-600",
  },
};

export const ANNOTATION_TYPE_LABELS: Record<InlineAnnotationType, string> = {
  comment: "Nhận xét",
  delete: "Đề xuất xóa",
  replace: "Đề xuất thay",
  insert: "Đề xuất thêm",
};

const FILLER_WORDS_SET = new Set(["um", "uh", "er", "ah", "hmm", "erm", "uhm"]);

/**
 * Chuyển đổi chuỗi văn bản thuần thành mảng từ có mốc thời gian ước lượng
 * (hàm thuần dùng chung cho cả Client và Server, không phụ thuộc fs/path)
 */
export function buildWordTokensFromRawText(
  rawText: string,
  totalDurationSec: number = 30
): SpeakingWordToken[] {
  const tokens = rawText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [];

  const result: SpeakingWordToken[] = [];
  let currentSec = 0.2;
  const stepSec = Math.max(
    0.25,
    Math.min(0.6, totalDurationSec / Math.max(tokens.length, 1))
  );

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const cleaned = raw.replace(/[.,!?;:"'()]/g, "").toLowerCase();
    const isFiller = FILLER_WORDS_SET.has(cleaned);
    const startSec = Number(currentSec.toFixed(1));
    const endSec = Number((currentSec + stepSec).toFixed(1));

    result.push({
      word: raw,
      startSec,
      endSec,
      isFiller,
    });
    currentSec = endSec;
  }

  return result;
}
