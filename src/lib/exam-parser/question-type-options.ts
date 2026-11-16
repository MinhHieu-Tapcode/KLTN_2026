/**
 * Loại câu cho ô chọn trong thẻ câu hỏi (màn bóc tách), lọc theo kỹ năng của phần thi.
 * Giá trị là `type` của ParsedQuestion; khi lưu CSDL đi qua mapQuestionTypeToDbEnum (assignment-mutation.service).
 */

export interface TypeOption {
  value: string;
  label: string;
}

const OBJECTIVE_OPTIONS: TypeOption[] = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm (1 đáp án)" },
  { value: "MULTIPLE_CHOICE_MULTI", label: "Trắc nghiệm nhiều đáp án" },
  { value: "TRUE_FALSE_NG", label: "True / False / NG" },
  { value: "FILL_IN_BLANK", label: "Điền từ" },
  { value: "SHORT_ANSWER", label: "Trả lời ngắn" },
  { value: "MATCHING_HEADINGS", label: "Nối tiêu đề" },
  { value: "MATCHING_INFO", label: "Nối thông tin" },
  { value: "MATCHING_FEATURES", label: "Nối đặc điểm" },
  { value: "SENTENCE_ENDINGS", label: "Nối nửa câu" },
  { value: "MAP", label: "Bản đồ / Sơ đồ" },
];

const LEGACY_LABELS: Record<string, string> = {
  MATCHING: "Nối thông tin (cũ)",
  ESSAY: "Tự luận Viết",
  SPEAKING_RECORD: "Ghi âm Nói",
};

export function getQuestionTypeOptions(skill: string | undefined, currentType?: string): TypeOption[] {
  const s = (skill || "READING").toUpperCase();
  const base =
    s === "WRITING"
      ? [{ value: "ESSAY", label: "Tự luận Viết" }]
      : s === "SPEAKING"
      ? [{ value: "SPEAKING_RECORD", label: "Ghi âm Nói" }]
      : OBJECTIVE_OPTIONS;
  // Loại hiện tại không nằm trong danh sách (dữ liệu cũ) vẫn hiện đúng tên, không bị hiển thị nhầm thành mục đầu
  if (currentType && !base.some((o) => o.value === currentType)) {
    return [...base, { value: currentType, label: LEGACY_LABELS[currentType] || currentType }];
  }
  return base;
}

/** Kiểu ô nhập đáp án: chọn phương án, nút TRUE/FALSE/NG, gõ chữ, hoặc không cần (chấm tay) */
export function getAnswerInputMode(type: string | undefined, optionCount: number): "CHOICE" | "JUDGEMENT" | "TEXT" | "NONE" {
  if (type === "TRUE_FALSE_NG") return "JUDGEMENT";
  if (type === "ESSAY" || type === "SPEAKING_RECORD") return "NONE";
  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_CHOICE_MULTI") return "CHOICE";
  const isMatching = type === "MATCHING" || type?.startsWith("MATCHING_") || type === "SENTENCE_ENDINGS";
  return isMatching && optionCount >= 2 ? "CHOICE" : "TEXT";
}
