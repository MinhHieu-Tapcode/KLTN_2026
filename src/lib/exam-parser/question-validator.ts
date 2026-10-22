import { GroupSkeleton, ParsedQuestion } from "./types";

/**
 * Regex phát hiện các mẫu câu chỉ dẫn đề bài IELTS (Instruction headers)
 * Tránh nhận nhầm câu chỉ dẫn thành nội dung câu hỏi
 */
export const INSTRUCTION_REGEX =
  /^(?:complete|choose|write|do the following|label|look at|answer the questions|in boxes|read the|classify the following|match the)\b|NO MORE THAN|from the (?:passage|box|list)|statements agree with|true if the statement|choose TWO|choose THREE/i;

/**
 * Regex nhận diện chỗ trống điền từ:
 * Hỗ trợ dấu gạch dưới (____), dấu chấm lửng (.....), ký tự ellipsis (…), hoặc số trong ngoặc đơn (1)
 */
export const BLANK_REGEX = /_{2,}|\.{3,}|…|\(\s*\d{1,2}\s*\)/;

/**
 * Tính toán độ tương đồng từ vựng (Jaccard similarity) giữa 2 chuỗi
 */
function calculateWordSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const words1 = new Set(str1.toLowerCase().match(/[a-z0-9]+/g) || []);
  const words2 = new Set(str2.toLowerCase().match(/[a-z0-9]+/g) || []);
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) intersection++;
  });

  const unionSet = new Set<string>();
  words1.forEach((w) => unionSet.add(w));
  words2.forEach((w) => unionSet.add(w));

  return unionSet.size === 0 ? 0 : intersection / unionSet.size;
}

/**
 * Cổng kiểm tra nội dung câu hỏi (Content Gate Validator)
 * Trả về danh sách lý do không hợp lệ nếu câu hỏi bị lỗi
 */
export function validateQuestion(
  q: ParsedQuestion,
  group?: GroupSkeleton
): { isValid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const prompt = (q.prompt || "").trim();

  // 1. Kiểm tra dải số câu hỏi theo Skeleton của Nhóm
  if (group && !group.expectedNumbers.includes(q.questionNumber)) {
    reasons.push(
      `so_ngoai_khoang: Câu ${q.questionNumber} nằm ngoài dải dự kiến [${group.startNum}-${group.endNum}] của ${group.title}`
    );
  }

  // 2. Kiểm tra nếu prompt bị chép nhầm câu chỉ dẫn đề bài
  if (INSTRUCTION_REGEX.test(prompt)) {
    reasons.push(
      `prompt_la_cau_chi_dan: Nội dung câu ${q.questionNumber} là câu chỉ dẫn ("${prompt.slice(0, 45)}...")`
    );
  } else if (group && group.instruction && calculateWordSimilarity(prompt, group.instruction) > 0.65) {
    reasons.push(
      `prompt_trung_instruction: Nội dung quá giống câu chỉ dẫn nhóm (${group.title})`
    );
  }

  // 3. Kiểm tra độ dài tối thiểu của câu hỏi
  if (prompt.length < 8 && (!q.options || q.options.length === 0)) {
    reasons.push(`qua_ngan: Nội dung câu hỏi quá ngắn (${prompt.length} ký tự)`);
  }

  // 4. Kiểm tra các dạng bắt buộc có chỗ trống điền từ (Flowchart, Table, Summary, Fill-in-the-blank)
  const isCompletionKind =
    group && ["FLOWCHART", "TABLE", "SUMMARY", "FILL_IN_BLANK"].includes(group.kind);
  const isCompletionType = q.type === "FILL_IN_BLANK";

  if (isCompletionKind || isCompletionType) {
    // Nếu là dạng điền từ mà không có chỗ trống và cũng không phải dạng short-answer
    if (group?.kind !== "SHORT_ANSWER" && !BLANK_REGEX.test(prompt)) {
      // Bắt ca tiêu đề bảng: "Classification based on | Associated fact | ..."
      if (prompt.includes("|") && !BLANK_REGEX.test(prompt)) {
        reasons.push("la_tieu_de_bang_khong_phai_cau_hoi: Dòng tiêu đề cột không chứa ô khuyết");
      } else {
        reasons.push("khong_co_cho_trong: Dạng điền từ nhưng prompt không chứa ký tự chỗ trống (____)");
      }
    }
  }

  // 5. Kiểm tra dạng True / False / Not Given
  if ((group && group.kind === "TFNG") || q.type === "TRUE_FALSE_NG") {
    if (!/[a-z]{3,}/i.test(prompt)) {
      reasons.push("khong_co_nhan_dinh: Câu hỏi True/False/NG không có mệnh đề nhận định hợp lệ");
    }
  }

  // 6. Kiểm tra dạng Trắc nghiệm Multiple Choice
  if (
    (group && ["MCQ", "MULTIPLE_CHOICE_MULTI"].includes(group.kind)) ||
    q.type === "MULTIPLE_CHOICE" ||
    q.type === "MULTIPLE_CHOICE_MULTI"
  ) {
    if (!q.options || q.options.length < 2) {
      reasons.push(`thieu_phuong_an: Câu trắc nghiệm chỉ có ${q.options?.length || 0} phương án lựa chọn`);
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons,
  };
}

/**
 * Lọc và làm sạch danh sách câu hỏi: loại bỏ các câu rác / câu chỉ dẫn lọt vào
 */
export function filterValidQuestions(
  questions: ParsedQuestion[],
  group?: GroupSkeleton
): { valid: ParsedQuestion[]; rejected: Array<{ question: ParsedQuestion; reasons: string[] }> } {
  const valid: ParsedQuestion[] = [];
  const rejected: Array<{ question: ParsedQuestion; reasons: string[] }> = [];

  for (const q of questions) {
    const res = validateQuestion(q, group);
    if (res.isValid) {
      valid.push(q);
    } else {
      rejected.push({ question: q, reasons: res.reasons });
    }
  }

  return { valid, rejected };
}
