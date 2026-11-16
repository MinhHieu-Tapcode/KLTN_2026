import {
  FlowchartGroup,
  MatchingHeadingsGroup,
  SummaryCompletionGroup,
  TableCompletionCell,
  TableCompletionGroup,
} from "../types";
import { ExamReadGroup, extractBlankNumbers } from "./schema";

/**
 * Dựng dữ liệu cho các viewer có sẵn (table-completion-view, flowchart-view, summary-completion-view,
 * matching-headings-view) từ kết quả Claude, đồng thời sinh prompt từng câu TỪ CHÍNH CHỮ IN TRÊN ĐỀ
 * (không dùng prompt model tự ghép).
 */

const BLANK_TOKEN = /\{\{\s*(\d{1,3})\s*\}\}/g;
export const BLANK = "_______";

/** Bỏ ngoặc và dấu chấm lửng in quanh chỗ trống: "({{32}})......" -> "{{32}}" */
function tidyBlanks(text: string): string {
  return text
    .replace(/[([]\s*(\{\{\s*\d{1,3}\s*\}\})\s*[)\]]/g, "$1")
    .replace(/(\{\{\s*\d{1,3}\s*\}\})\s*(?:\.{2,}|…|_{2,})+/g, "$1")
    .replace(/(?:\.{2,}|…|_{2,})+\s*(\{\{\s*\d{1,3}\s*\}\})/g, "$1");
}

/** "{{5}}" -> "_______" */
export function blanksToUnderscore(text: string): string {
  return tidyBlanks(text).replace(BLANK_TOKEN, BLANK).replace(/[ \t]+/g, " ").trim();
}

/** Câu đang xét thành "_______", các chỗ trống khác thành "(N)" để học viên không nhầm */
function focusBlank(text: string, target: number): string {
  return tidyBlanks(text)
    .replace(BLANK_TOKEN, (_, n) => (Number(n) === target ? BLANK : `(${n})`))
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Prompt cho một ô bảng có chỗ trống:
 * - ô không ở cột đầu: "<nhãn dòng> (<tiêu đề cột>): <ô>"   vd "Colour (Related example): _______"
 * - ô ở cột đầu:       "<tiêu đề cột>: <ô> (<ô kế bên>)"    vd "Problems...: Infrequent _______ (once every 15 years)"
 */
function tableCellPrompt(row: string[], cIdx: number, header: string, cellText: string): string {
  const hasBlank = (c: string) => extractBlankNumbers(c).length > 0;
  const firstCell = (row[0] || "").trim();
  if (cIdx > 0 && firstCell && !hasBlank(firstCell)) {
    return `${firstCell}${header ? ` (${header})` : ""}: ${cellText}`;
  }
  const neighbour = row.find((c, i) => i !== cIdx && !hasBlank(c) && c.trim().length > 0)?.trim();
  return `${header ? `${header}: ` : ""}${cellText}${neighbour ? ` (${neighbour})` : ""}`;
}

export interface StructureResult<T> {
  group: T;
  prompts: Map<number, string>;
}

export function buildTable(
  g: ExamReadGroup,
  id: string,
  sectionKey: string,
  numbers: number[]
): StructureResult<TableCompletionGroup> {
  const table = g.table!;
  const prompts = new Map<number, string>();
  const rows = table.rows.map((row) =>
    row.map((cell, cIdx): string | TableCompletionCell => {
      const blanks = extractBlankNumbers(cell);
      if (blanks.length === 0) return cell;
      const header = (table.headers[cIdx] || "").trim();
      for (const n of blanks) {
        prompts.set(n, tableCellPrompt(row, cIdx, header, focusBlank(cell, n)));
      }
      // Viewer bảng chỉ gắn được 1 số câu cho 1 ô; ô có nhiều chỗ trống vẫn hiện chữ, các câu còn lại đi qua danh sách câu
      return { text: blanksToUnderscore(cell), questionNumber: blanks[0] };
    })
  );
  return {
    group: {
      id,
      title: undefined,
      instruction: g.instruction,
      headers: table.headers.map((h) => blanksToUnderscore(h)),
      rows,
      questionNumbers: numbers,
      sectionKey,
    },
    prompts,
  };
}

export function buildFlowchart(
  g: ExamReadGroup,
  id: string,
  sectionKey: string,
  numbers: number[]
): StructureResult<FlowchartGroup> {
  const fc = g.flowchart!;
  const prompts = new Map<number, string>();
  const boxes = fc.boxes.map((b) => {
    const blanks = extractBlankNumbers(b.text);
    // Tách theo dòng và theo gạch đầu dòng nằm giữa câu ("- obeyed only at {{21}} - can cause lack of {{22}}")
    for (const line of b.text.split(/\n|\s+[-•]\s+(?=\S)/)) {
      for (const n of extractBlankNumbers(line)) {
        prompts.set(n, focusBlank(line.replace(/^\s*[-•]\s*/, ""), n));
      }
    }
    return {
      id: b.id,
      textTemplate: b.text
        .split("\n")
        .map((line) => blanksToUnderscore(line))
        .join("\n"),
      questionNumbers: blanks,
      isStatic: blanks.length === 0,
      nextBoxIds: b.next,
    };
  });
  return {
    group: {
      id,
      title: (fc.title || "").trim() || "Flow Chart",
      instruction: g.instruction,
      boxes,
      questionNumbers: numbers,
      sectionKey,
    },
    prompts,
  };
}

export function buildSummary(
  g: ExamReadGroup,
  id: string,
  sectionKey: string,
  numbers: number[]
): StructureResult<SummaryCompletionGroup> {
  const text = g.notesText || "";
  const prompts = new Map<number, string>();
  for (const n of extractBlankNumbers(text)) {
    const line = text.split("\n").find((l) => extractBlankNumbers(l).includes(n)) || text;
    // Dòng quá dài (cả đoạn tóm tắt) thì chỉ lấy câu chứa chỗ trống
    const sentence =
      line.length > 220
        ? line.split(/(?<=[.!?])\s+/).find((s) => extractBlankNumbers(s).includes(n)) || line
        : line;
    prompts.set(n, focusBlank(sentence.replace(/^\s*[-•]\s*/, ""), n));
  }
  return {
    group: {
      id,
      title: undefined,
      instruction: g.instruction,
      // summary-completion-view nhận dạng chỗ trống "(N) _______"
      summaryText: text.replace(BLANK_TOKEN, (_, n) => `(${n}) ${BLANK}`),
      questionNumbers: numbers,
      sectionKey,
    },
    prompts,
  };
}

export function buildMatchingHeadings(
  g: ExamReadGroup,
  id: string,
  sectionKey: string,
  numbers: number[]
): MatchingHeadingsGroup {
  return {
    id,
    title: "List of Headings",
    instruction: g.instruction,
    headings: (g.sharedOptions || []).map((o, i) => ({
      id: String(i + 1),
      romanNumeral: o.label.trim(),
      text: o.text.trim(),
    })),
    items: g.questions
      .filter((q) => numbers.includes(Math.round(q.number)))
      .map((q) => ({ questionNumber: Math.round(q.number), paragraphLabel: blanksToUnderscore(q.prompt) })),
    questionNumbers: numbers,
    sectionKey,
  };
}
