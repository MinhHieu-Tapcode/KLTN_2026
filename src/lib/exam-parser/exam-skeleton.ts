import { CoverageGap, ExamSkeleton, GroupSkeleton, IeltsQuestionKind } from "./types";

/**
 * Regex phát hiện tiêu đề nhóm câu hỏi trong đề thi IELTS:
 * Ví dụ: "Questions 1-5", "Questions 1–13", "Questions 1 to 4", "Questions 27 - 30", "Question 7"
 */
const GROUP_HEADER_REGEX =
  /(?:^|\n)\s*(?:Questions?|SECTION\s+QUESTIONS?)\s+(\d{1,2})\s*(?:[–\-\—\−to\s]+)?\s*(\d{1,2})?/gi;

/**
 * Phân tích ngữ cảnh văn bản ngay sau Header nhóm để suy luận dạng bài (kind)
 */
export function detectGroupKind(headerWithInstruction: string): IeltsQuestionKind {
  const text = headerWithInstruction.toLowerCase();

  // 1. Flow-chart Completion
  if (/flow[\s\-]*chart/i.test(text)) {
    return "FLOWCHART";
  }

  // 2. Table Completion
  if (/table|classification/i.test(text) && /complete|below|choose/i.test(text)) {
    return "TABLE";
  }

  // 3. Summary Completion
  if (/summary/i.test(text) && /complete|below|words?/i.test(text)) {
    return "SUMMARY";
  }

  // 4. Matching Headings
  if (/list\s+of\s+headings|matching\s+headings|choose\s+the\s+correct\s+heading/i.test(text)) {
    return "MATCHING_HEADINGS";
  }

  // 5. True / False / Not Given & Yes / No / Not Given
  if (
    /true\s*\/?\s*false\s*\/?\s*not\s+given/i.test(text) ||
    /yes\s*\/?\s*no\s*\/?\s*not\s+given/i.test(text) ||
    /statements?\s+agree\s+with/i.test(text)
  ) {
    return "TFNG";
  }

  // 6. Multiple Choice (Nhiều đáp án đúng - Choose TWO / THREE)
  if (
    /choose\s+(?:two|three|four|2|3|4)\s+letters?/i.test(text) ||
    /which\s+(?:two|three)\s+of\s+the\s+following/i.test(text)
  ) {
    return "MULTIPLE_CHOICE_MULTI";
  }

  // 7. Matching Information (Which paragraph contains...)
  if (/which\s+paragraph\s+contains/i.test(text)) {
    return "MATCHING_INFO";
  }

  // 8. Matching Features (Match people/years/categories)
  if (
    /match\s+each\s+(?:statement|item|person|finding)/i.test(text) ||
    /look\s+at\s+the\s+following\s+(?:researchers|people|statements|theories)/i.test(text)
  ) {
    return "MATCHING_FEATURES";
  }

  // 9. Matching Sentence Endings
  if (/complete\s+each\s+sentence\s+with\s+the\s+correct\s+ending/i.test(text)) {
    return "SENTENCE_ENDINGS";
  }

  // 10. Diagram / Map / Plan Labelling
  if (/label\s+the\s+(?:map|diagram|plan)/i.test(text)) {
    return "MAP";
  }

  // 11. Multiple Choice (1 đáp án đơn)
  if (/choose\s+the\s+correct\s+letter/i.test(text) || /options?\s+[a-d]/i.test(text)) {
    return "MCQ";
  }

  // 12. Short Answer Questions
  if (/answer\s+the\s+questions?\s+below/i.test(text) && /no\s+more\s+than/i.test(text)) {
    return "SHORT_ANSWER";
  }

  // 13. Mặc định: Điền từ (Fill in the blank / Notes / Sentences)
  return "FILL_IN_BLANK";
}

/**
 * Trích xuất toàn bộ Skeleton (bộ khung các nhóm câu hỏi) từ một đoạn văn bản hoặc toàn bộ đề thi
 */
export function extractGroupSkeletonsFromText(
  text: string,
  partIndex: number = 0
): GroupSkeleton[] {
  const groups: GroupSkeleton[] = [];
  const matches = Array.from(text.matchAll(GROUP_HEADER_REGEX));

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rawHeader = match[0].trim();
    const startStr = match[1];
    const endStr = match[2];

    const startNum = parseInt(startStr, 10);
    const endNum = endStr ? parseInt(endStr, 10) : startNum;

    // Lọc bỏ số câu bất hợp lý (IELTS thông thường nằm trong dải 1 - 40, hiếm khi vượt quá 60)
    if (isNaN(startNum) || startNum < 1 || startNum > 60) continue;
    if (isNaN(endNum) || endNum < startNum || endNum > 60) continue;

    // Lấy đoạn văn bản chỉ dẫn (từ vị trí header đến trước header tiếp theo hoặc tối đa 400 ký tự)
    const startIndex = match.index ?? 0;
    const nextMatchIndex = matches[i + 1]?.index ?? text.length;
    const instructionBlock = text.slice(startIndex, Math.min(nextMatchIndex, startIndex + 500)).trim();

    // Dòng đầu tiên là tiêu đề nhóm (vd: "Questions 1-4"), các dòng sau là câu chỉ dẫn
    const lines = instructionBlock.split("\n").map((l) => l.trim()).filter(Boolean);
    const title = lines[0] || `Questions ${startNum}-${endNum}`;
    // Câu chỉ dẫn dừng trước dòng câu hỏi đầu tiên (dòng đánh số, có chỗ trống hoặc dòng bảng). Trước đây lấy cứng
    // 3 dòng sau tiêu đề nên khi chỉ dẫn ngắn, nó chứa luôn câu hỏi thật và bộ kiểm tra "trùng chỉ dẫn" loại nhầm.
    const instructionLines: string[] = [];
    for (const l of lines.slice(1, 6)) {
      if (/^\(?\d{1,2}[.)]?\s+\S/.test(l) || /_{2,}|\.{4,}|…/.test(l) || l.startsWith("|")) break;
      instructionLines.push(l);
      if (instructionLines.length >= 3) break;
    }
    const instruction = instructionLines.join(" ");

    const kind = detectGroupKind(instructionBlock);

    const expectedNumbers: number[] = [];
    for (let n = startNum; n <= endNum; n++) {
      expectedNumbers.push(n);
    }

    groups.push({
      id: `group_p${partIndex + 1}_g${i + 1}_q${startNum}_${endNum}`,
      groupIndex: i,
      partIndex,
      title,
      instruction,
      kind,
      startNum,
      endNum,
      expectedNumbers,
      rawHeader,
    });
  }

  return groups;
}

/**
 * Xây dựng toàn bộ ExamSkeleton cho bài thi
 */
export function buildExamSkeleton(
  cleanedText: string,
  parts?: Array<{ title: string; content: string }>
): ExamSkeleton {
  const skeletonParts: ExamSkeleton["parts"] = [];
  const allGroups: GroupSkeleton[] = [];
  const allExpectedNumbersSet = new Set<number>();

  if (parts && parts.length > 0) {
    parts.forEach((part, pIdx) => {
      const partGroups = extractGroupSkeletonsFromText(part.content, pIdx);
      skeletonParts.push({
        partIndex: pIdx,
        title: part.title,
        groups: partGroups,
      });
      partGroups.forEach((g) => {
        allGroups.push(g);
        g.expectedNumbers.forEach((n) => allExpectedNumbersSet.add(n));
      });
    });
  } else {
    const rawGroups = extractGroupSkeletonsFromText(cleanedText, 0);
    skeletonParts.push({
      partIndex: 0,
      title: "IELTS Exam",
      groups: rawGroups,
    });
    rawGroups.forEach((g) => {
      allGroups.push(g);
      g.expectedNumbers.forEach((n) => allExpectedNumbersSet.add(n));
    });
  }

  const allExpectedNumbers = Array.from(allExpectedNumbersSet).sort((a, b) => a - b);

  // Đếm theo từng Part (không gộp bằng Set): Reading và Listening cùng đánh số 1-40 nên Set chung
  // làm tổng kỳ vọng bị hụt một nửa.
  const totalExpectedQuestions = allGroups.reduce((sum, g) => sum + g.expectedNumbers.length, 0);

  return {
    parts: skeletonParts,
    allGroups,
    totalExpectedQuestions,
    allExpectedNumbers,
  };
}

/**
 * Tìm Group chứa một số câu hỏi cụ thể
 */
export function findGroupByQuestionNumber(
  skeleton: ExamSkeleton,
  qNum: number
): GroupSkeleton | undefined {
  return skeleton.allGroups.find((g) => g.expectedNumbers.includes(qNum));
}


export interface GroupCoverageIssue {
  group: GroupSkeleton;
  gap: CoverageGap;
  missingNumbers: number[];
  message: string;
}

/**
 * Đối chiếu các câu đã bóc được với bộ khung (Skeleton) của một Part.
 * Trả về từng nhóm còn thiếu câu, kèm thông điệp rõ ràng để hiển thị cho giáo viên.
 * Hàm thuần, không đụng DB hay AI.
 */
export function checkGroupCoverage(
  groups: GroupSkeleton[],
  presentNumbers: number[],
  partLabel = ""
): GroupCoverageIssue[] {
  const have = new Set(presentNumbers);
  const issues: GroupCoverageIssue[] = [];
  for (const g of groups) {
    const missing = g.expectedNumbers.filter((n) => !have.has(n));
    if (missing.length === 0) continue;
    const gap: CoverageGap = {
      partLabel,
      kind: g.kind,
      startNum: g.startNum,
      endNum: g.endNum,
      missingNumbers: missing,
    };
    issues.push({ group: g, gap, missingNumbers: missing, message: formatCoverageGap(gap) });
  }
  return issues;
}

/** Các dạng câu thường nằm trong ảnh/bảng của PDF nên văn bản không có nội dung */
export const VISUAL_GROUP_KINDS = ["TABLE", "FLOWCHART", "MAP"];

/** Thông điệp hiển thị cho giáo viên về một nhóm còn thiếu câu */
export function formatCoverageGap(gap: CoverageGap): string {
  const visualHint = VISUAL_GROUP_KINDS.includes(gap.kind)
    ? " Dạng này thường nằm trong ẢNH/bảng của PDF nên văn bản không có."
    : "";
  const range = gap.startNum === gap.endNum ? `Question ${gap.startNum}` : `Questions ${gap.startNum}-${gap.endNum}`;
  return (
    `${gap.partLabel ? gap.partLabel + ": " : ""}${range} (${gap.kind}) chưa đọc được nội dung câu ${gap.missingNumbers.join(", ")}.` +
    `${visualHint} Vui lòng kiểm tra lại hoặc nhập tay.`
  );
}
