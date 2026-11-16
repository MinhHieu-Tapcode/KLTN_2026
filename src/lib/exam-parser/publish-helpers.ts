/**
 * Chọn đúng bảng / sơ đồ / tóm tắt / nối tiêu đề thuộc các câu sẽ phát hành.
 * Trước đây mọi bài tập được gắn cấu trúc của CẢ đề, nên bài Passage 1 mang theo bảng của Passage 3.
 */

interface StructureLike {
  sectionKey?: string;
  questionNumbers?: number[];
  items?: Array<{ questionNumber: number }>;
}

interface PublishQuestion {
  questionNumber: number;
  sectionKey?: string;
}

interface ParsedStructures {
  tables?: StructureLike[];
  flowcharts?: StructureLike[];
  summaries?: StructureLike[];
  matchingHeadings?: StructureLike[];
}

function numbersOf(s: StructureLike): number[] {
  if (s.questionNumbers && s.questionNumbers.length > 0) return s.questionNumbers;
  return (s.items || []).map((i) => i.questionNumber);
}

export function pickStructuresForQuestions<T extends ParsedStructures>(
  data: T,
  questions: PublishQuestion[]
): { tables: any[]; flowcharts: any[]; summaries: any[]; matchingHeadings: any[] } {
  const keys = new Set(questions.map((q) => `${q.sectionKey || ""}|${q.questionNumber}`));
  const numbers = new Set(questions.map((q) => q.questionNumber));
  // Cấu trúc có sectionKey (pipeline Claude) thì so cả phần thi; dữ liệu cũ không có thì so theo số câu
  const belongs = (s: StructureLike) =>
    numbersOf(s).some((n) => (s.sectionKey ? keys.has(`${s.sectionKey}|${n}`) : numbers.has(n)));
  return {
    tables: (data.tables || []).filter(belongs),
    flowcharts: (data.flowcharts || []).filter(belongs),
    summaries: (data.summaries || []).filter(belongs),
    matchingHeadings: (data.matchingHeadings || []).filter(belongs),
  };
}
