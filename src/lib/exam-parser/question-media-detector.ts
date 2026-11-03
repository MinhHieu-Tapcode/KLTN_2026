/**
 * Bộ nhận diện tự động yêu cầu Hình ảnh / Sơ đồ / Biểu đồ / Cấu trúc mẫu
 * cho từng dạng câu hỏi IELTS (Dùng cho cả Smart Parser OCR và Manual Builder).
 */

export type MediaRequirementLevel = "REQUIRED" | "RECOMMENDED" | "OPTIONAL";

export interface QuestionMediaRequirement {
  level: MediaRequirementLevel;
  categoryLabel: string;
  reason: string;
  placeholderHint: string;
}

const MAP_REGEX =
  /\b(?:label the map|map below|plan below|floor plan|town plan|campus map|park map)\b/i;
const DIAGRAM_REGEX =
  /\b(?:label the diagram|diagram below|parts of the|cross-section|machinery)\b/i;
const CHART_TASK1_REGEX =
  /\b(?:chart below|graph below|charts below|graphs below|pie chart|bar chart|line graph|process below|diagram below shows|map below shows|maps below show|table below shows)\b/i;
const TABLE_FLOWCHART_REGEX =
  /\b(?:flow-?chart below|complete the flow-?chart|complete the table|table below|complete the form|booking form|registration form|application form)\b/i;

export function detectQuestionMediaRequirement(
  q: {
    type?: string;
    ieltsQuestionType?: string | null;
    prompt?: string | null;
    passageText?: string | null;
    groupTitle?: string | null;
  },
  assignmentSkill?: string
): QuestionMediaRequirement {
  const ieltsType = (q.ieltsQuestionType || "").toUpperCase();
  const dbType = (q.type || "").toUpperCase();
  const skill = (assignmentSkill || "").toUpperCase();
  const combinedText = `${q.groupTitle || ""} ${q.prompt || ""} ${q.passageText || ""}`;

  // 1. Dạng Map / Plan Labelling (Bắt buộc có ảnh Bản đồ)
  if (
    ieltsType.includes("MAP") ||
    dbType === "MAP" ||
    MAP_REGEX.test(combinedText)
  ) {
    return {
      level: "REQUIRED",
      categoryLabel: "Bản đồ / Mặt bằng (Map / Plan Labelling)",
      reason:
        "OCR chỉ đọc được chữ, không thể tự vẽ lại bản đồ. Bạn bắt buộc phải tải lên hoặc dán (Ctrl+V) ảnh chụp bản đồ của đề thi.",
      placeholderHint: "Dán (Ctrl+V) hoặc chọn ảnh chụp Bản đồ (Map/Plan)...",
    };
  }

  // 2. Dạng Diagram Labelling (Bắt buộc có ảnh Sơ đồ)
  if (
    ieltsType.includes("DIAGRAM") ||
    DIAGRAM_REGEX.test(combinedText)
  ) {
    return {
      level: "REQUIRED",
      categoryLabel: "Sơ đồ minh họa (Diagram Labelling)",
      reason:
        "Dạng bài dán nhãn sơ đồ bắt buộc phải có hình vẽ sơ đồ để học viên quan sát vị trí các chi tiết.",
      placeholderHint: "Dán (Ctrl+V) hoặc chọn ảnh chụp Sơ đồ (Diagram)...",
    };
  }

  // 3. Dạng Writing Task 1 Academic (Bắt buộc có ảnh Biểu đồ / Quy trình / Bản đồ)
  if (
    ieltsType === "WRITING_TASK_1" ||
    (skill === "WRITING" && CHART_TASK1_REGEX.test(combinedText)) ||
    (dbType === "ESSAY" && CHART_TASK1_REGEX.test(combinedText))
  ) {
    return {
      level: "REQUIRED",
      categoryLabel: "Biểu đồ Writing Task 1 (Chart / Graph / Process / Map)",
      reason:
        "Đề bài Writing Task 1 yêu cầu phân tích số liệu/biểu đồ. Vui lòng tải lên hoặc dán (Ctrl+V) ảnh biểu đồ để hiển thị cột trái cho học viên.",
      placeholderHint: "Dán (Ctrl+V) hoặc chọn ảnh Biểu đồ Writing Task 1...",
    };
  }

  // 4. Dạng Bảng biểu / Flowchart / Form (Khuyến nghị up ảnh nếu OCR vỡ cấu trúc)
  if (
    ieltsType.includes("TABLE") ||
    ieltsType.includes("FLOWCHART") ||
    ieltsType.includes("FORM") ||
    TABLE_FLOWCHART_REGEX.test(combinedText)
  ) {
    return {
      level: "RECOMMENDED",
      categoryLabel: "Bảng biểu / Sơ đồ khối (Table / Flowchart / Form)",
      reason:
        "Nếu kết quả bóc tách chữ chưa giữ đúng khung kẻ bảng/mũi tên của đề gốc, bạn nên dán (Ctrl+V) ảnh chụp bảng/sơ đồ để học viên nhìn đề chuẩn 100%.",
      placeholderHint: "Dán (Ctrl+V) hoặc chọn ảnh chụp Bảng / Sơ đồ khối...",
    };
  }

  // 5. Các dạng còn lại: Tùy chọn
  return {
    level: "OPTIONAL",
    categoryLabel: "Hình minh họa bổ sung (Tùy chọn)",
    reason: "Có thể đính kèm hình minh họa nếu đề bài gốc có ảnh.",
    placeholderHint: "Đính kèm ảnh minh họa (nếu có)...",
  };
}

/**
 * Kiểm tra toàn bộ danh sách câu hỏi trước khi Lưu / Phát hành:
 * Trả về các câu thuộc nhóm REQUIRED nhưng chưa có imageUrl
 */
export function validateAssignmentMediaRequirements(
  questions: any[],
  assignmentSkill?: string,
  hasStructuredTablesOrFlowcharts?: boolean
): {
  isValid: boolean;
  valid: boolean;
  missingQuestionNumbers: number[];
  missingRequired: Array<{ questionNumber: number; categoryLabel: string }>;
  firstMissingCategory?: string;
} {
  const missingQuestionNumbers: number[] = [];
  const missingRequired: Array<{ questionNumber: number; categoryLabel: string }> = [];
  let firstMissingCategory: string | undefined;

  for (let i = 0; i < (questions || []).length; i++) {
    const q = questions[i];
    const qNum = Number(q.questionNumber) || i + 1;
    const req = detectQuestionMediaRequirement(q, assignmentSkill);

    if (req.level === "REQUIRED" && !q.imageUrl?.trim()) {
      // Nếu là Writing Task 1 mà đã có bảng dữ liệu cấu trúc thì cho phép
      if (hasStructuredTablesOrFlowcharts && req.categoryLabel.includes("Task 1")) {
        continue;
      }
      missingQuestionNumbers.push(qNum);
      missingRequired.push({ questionNumber: qNum, categoryLabel: req.categoryLabel });
      if (!firstMissingCategory) {
        firstMissingCategory = req.categoryLabel;
      }
    }
  }

  const isValid = missingQuestionNumbers.length === 0;
  return {
    isValid,
    valid: isValid,
    missingQuestionNumbers,
    missingRequired,
    firstMissingCategory,
  };
}

/**
 * Tạo mẫu nội dung chuẩn (Preset Template) khi Giáo viên chọn dạng bài IELTS
 */
export function getQuestionTemplatePreset(
  ieltsQuestionType: string,
  questionNumber: number
): {
  type?: string;
  prompt: string;
  passageText?: string;
  correctAnswer?: string;
  options?: Array<{ optionLabel: string; content: string; isCorrect: boolean }>;
  groupTitle?: string;
} | null {
  switch (ieltsQuestionType) {
    case "READING_MATCHING_HEADINGS":
      return {
        type: "MATCHING",
        groupTitle: "Matching Headings",
        prompt: `Paragraph ${String.fromCharCode(64 + ((questionNumber - 1) % 6) + 1)}`,
        correctAnswer: "i",
        options: [
          { optionLabel: "i", content: "The impact of technology on modern life", isCorrect: true },
          { optionLabel: "ii", content: "Financial benefits of green energy", isCorrect: false },
          { optionLabel: "iii", content: "Challenges facing urban planners", isCorrect: false },
          { optionLabel: "iv", content: "Future global solutions and policies", isCorrect: false },
        ],
      };
    case "LISTENING_MAP_PLAN":
      return {
        type: "MULTIPLE_CHOICE",
        groupTitle: "Map / Plan Labelling",
        prompt: `${questionNumber}. Library / Main Reception`,
        correctAnswer: "A",
        options: ["A", "B", "C", "D", "E", "F", "G", "H"].map((letter, idx) => ({
          optionLabel: letter,
          content: `Vị trí ${letter} trên bản đồ`,
          isCorrect: idx === 0,
        })),
      };
    case "READING_DIAGRAM_LABELLING":
      return {
        type: "FILL_IN_BLANK",
        groupTitle: "Diagram Labelling",
        prompt: `Chi tiết số (${questionNumber}) trên sơ đồ: ________`,
        correctAnswer: "",
      };
    case "LISTENING_FORM_NOTE_TABLE":
    case "READING_NOTE_TABLE_FORM":
      return {
        type: "FILL_IN_BLANK",
        groupTitle: "BOOKING / APPLICATION FORM",
        prompt: `Customer Name / Field (${questionNumber}): ________`,
        correctAnswer: "",
      };
    case "READING_SUMMARY_COMPLETION":
      return {
        type: "FILL_IN_BLANK",
        groupTitle: "Summary Completion",
        prompt: `Complete the summary: Regular exercise helps reduce stress and improve (${questionNumber}) ________.`,
        correctAnswer: "",
      };
    case "WRITING_TASK_1":
      return {
        type: "ESSAY",
        groupTitle: "Writing Task 1: Academic Report (20 phút - Tối thiểu 150 từ)",
        passageText:
          "The chart below shows the percentage of people using different modes of transport in a city between 2010 and 2020.\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        prompt: "Write at least 150 words analysing the chart/diagram.",
      };
    case "WRITING_TASK_2":
      return {
        type: "ESSAY",
        groupTitle: "Writing Task 2: Academic Essay (40 phút - Tối thiểu 250 từ)",
        passageText:
          "Some people believe that technology has made learning easier and more accessible, while others think it distracts students from deep thinking.\nDiscuss both views and give your own opinion.",
        prompt: "Write at least 250 words giving reasons and relevant examples.",
      };
    case "SPEAKING_PART_2":
      return {
        type: "SPEAKING_RECORD",
        groupTitle: "Speaking Part 2: Cue Card (1 phút chuẩn bị • 2 phút nói)",
        passageText:
          "Describe a place you would like to visit in the future.\nYou should say:\n• Where it is located\n• What you can do there\n• Who you would like to go with\nand explain why you would like to visit this place.",
        prompt: "Read the Cue Card above. You have 1 minute to prepare and up to 2 minutes to speak.",
      };
    default:
      return null;
  }
}
