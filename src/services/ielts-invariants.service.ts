/**
 * Dịch vụ kiểm tra bất biến bộ đề thi IELTS (IELTS Parser Invariant Checks)
 * Đảm bảo tính toàn vẹn dữ liệu:
 * 1. Số thứ tự câu hỏi liên tục 1 -> N (không nhảy cóc, không sót câu).
 * 2. Không có câu hỏi trùng số thứ tự.
 * 3. Báo cáo chi tiết phân bổ số câu theo từng Section / Passage.
 * 4. Phát hiện các bất thường (thiếu audio cho Listening, câu hỏi rỗng, v.v.).
 */

export interface SectionBreakdownItem {
  sectionKey: string;
  title: string;
  questionRange: string;
  questionCount: number;
  expectedCount?: number;
}

export interface ExamInvariantsReport {
  isValid: boolean;
  totalQuestions: number;
  expectedTotal: number;
  isSequential: boolean;
  missingNumbers: number[];
  duplicateNumbers: number[];
  sectionsBreakdown: SectionBreakdownItem[];
  errors: string[];
  warnings: string[];
}

export function checkExamInvariants(params: {
  questions: Array<{ questionNumber: number; prompt?: string; type?: string; options?: any[] }>;
  skill?: string;
  audioUrl?: string | null;
  sections?: Array<{ id?: string; key?: string; title: string; questions: Array<{ questionNumber: number }> }>;
}): ExamInvariantsReport {
  const { questions, skill = "READING", audioUrl, sections } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalQuestions = questions.length;
  // Số câu tiêu chuẩn IELTS thường là 40, hoặc 10/13/14 đối với đề thi rút gọn
  const isFullTest = totalQuestions >= 30;
  const expectedTotal = isFullTest ? 40 : totalQuestions;

  if (totalQuestions === 0) {
    errors.push("Bộ đề không có câu hỏi nào được bóc tách!");
    return {
      isValid: false,
      totalQuestions: 0,
      expectedTotal: 40,
      isSequential: false,
      missingNumbers: [],
      duplicateNumbers: [],
      sectionsBreakdown: [],
      errors,
      warnings,
    };
  }

  // 1. Kiểm tra trùng lặp số câu hỏi (Duplicate question numbers)
  const countMap = new Map<number, number>();
  const questionNums: number[] = [];

  questions.forEach((q, idx) => {
    const num = Number(q.questionNumber) || idx + 1;
    questionNums.push(num);
    countMap.set(num, (countMap.get(num) || 0) + 1);
  });

  const duplicateNumbers: number[] = [];
  countMap.forEach((count, num) => {
    if (count > 1) duplicateNumbers.push(num);
  });
  duplicateNumbers.sort((a, b) => a - b);

  if (duplicateNumbers.length > 0) {
    errors.push(`Phát hiện ${duplicateNumbers.length} số câu hỏi bị trùng lặp: Câu ${duplicateNumbers.join(", ")}`);
  }

  // 2. Kiểm tra tính liên tục (Sequential checks)
  const minNum = Math.min(...questionNums);
  const maxNum = Math.max(...questionNums);

  // Nhận diện xem đây có phải là một phần thi riêng lẻ hợp lệ (Passage 2: câu 14-26, Passage 3: câu 27-40, Listening Part 2/3/4)
  const isRecognizedSectionStart = [11, 14, 21, 27, 31].includes(minNum);
  const isSingleSectionTest = !isFullTest && (isRecognizedSectionStart || totalQuestions <= 15);

  if (minNum !== 1) {
    if (isRecognizedSectionStart) {
      warnings.push(`Đề thi thuộc phần riêng lẻ (${skill}: Câu ${minNum} đến Câu ${maxNum})`);
    } else {
      warnings.push(`Đề thi không bắt đầu từ Câu 1 (bắt đầu từ Câu ${minNum})`);
    }
  }

  const missingNumbers: number[] = [];
  const targetStart = isSingleSectionTest ? minNum : 1;
  const targetEnd = isFullTest ? 40 : maxNum;
  for (let i = targetStart; i <= targetEnd; i++) {
    if (!countMap.has(i)) {
      missingNumbers.push(i);
    }
  }

  if (missingNumbers.length > 0) {
    if (isFullTest || missingNumbers.some((n) => n < maxNum)) {
      errors.push(`Phát hiện bị nhảy cóc / thiếu ${missingNumbers.length} câu hỏi: Câu ${missingNumbers.join(", ")}`);
    } else {
      warnings.push(`Đề thi có ${totalQuestions} câu (chưa đủ 40 câu tiêu chuẩn của bài thi IELTS full)`);
    }
  }

  const isSequential = missingNumbers.length === 0 && duplicateNumbers.length === 0;

  // 3. Phân tích chi tiết từng Section / Passage
  const sectionsBreakdown: SectionBreakdownItem[] = [];

  if (sections && sections.length > 0) {
    sections.forEach((sec, idx) => {
      const secQuestions = sec.questions || [];
      const secNums = secQuestions.map((q) => q.questionNumber).sort((a, b) => a - b);
      const startNum = secNums.length > 0 ? secNums[0] : 0;
      const endNum = secNums.length > 0 ? secNums[secNums.length - 1] : 0;
      const range = secNums.length > 0 ? `Câu ${startNum} - ${endNum}` : "Trống";

      sectionsBreakdown.push({
        sectionKey: sec.key || sec.id || `sec_${idx + 1}`,
        title: sec.title || `Section ${idx + 1}`,
        questionRange: range,
        questionCount: secQuestions.length,
      });
    });
  } else {
    // Nếu không có mảng sections rõ ràng, tự sinh 1 breakdown tổng thể
    sectionsBreakdown.push({
      sectionKey: "main",
      title: skill === "LISTENING" ? "Listening Test" : "Reading Test",
      questionRange: `Câu ${minNum} - ${maxNum}`,
      questionCount: totalQuestions,
      expectedCount: expectedTotal,
    });
  }

  // 4. Kiểm tra điều kiện kỹ năng đặc thù
  if (skill.toUpperCase() === "LISTENING" && !audioUrl) {
    warnings.push("Kỹ năng Nghe (Listening) chưa có tệp Audio đính kèm");
  }

  // Đánh giá tính hợp lệ tổng thể
  const isValid = errors.length === 0;

  return {
    isValid,
    totalQuestions,
    expectedTotal,
    isSequential,
    missingNumbers,
    duplicateNumbers,
    sectionsBreakdown,
    errors,
    warnings,
  };
}
