import { z } from "zod";

/**
 * Hợp đồng dữ liệu Claude trả về khi đọc đề (docs/flows/exam-parser-claude-pipeline.md mục 5).
 * Quy ước chỗ trống: "{{N}}" với N là số câu.
 * Schema cố tình "dễ tính" (default/nullable) để một trường thiếu không làm hỏng cả đề;
 * tính đúng sai của nội dung do validate.ts quyết định.
 */

const num = z.coerce.number();
const nullableDefault = <T extends z.ZodTypeAny>(schema: T) => schema.nullable().optional().default(null);

export const IELTS_READ_TYPES = [
  "TFNG",
  "YNNG",
  "MCQ_SINGLE",
  "MCQ_MULTI",
  "SHORT_ANSWER",
  "SENTENCE_COMPLETION",
  "SUMMARY_COMPLETION",
  "NOTE_COMPLETION",
  "TABLE_COMPLETION",
  "FLOWCHART_COMPLETION",
  "DIAGRAM_LABELLING",
  "MAP_LABELLING",
  "MATCHING_HEADINGS",
  "MATCHING_INFORMATION",
  "MATCHING_FEATURES",
  "SENTENCE_ENDINGS",
  "FORM_COMPLETION",
  "OTHER",
] as const;
export type IeltsReadType = (typeof IELTS_READ_TYPES)[number];

export const FigureSchema = z.object({
  page: num,
  // [ymin, xmin, ymax, xmax] thang 0-1000; có thể lệch nhẹ ra ngoài, validate.ts sẽ kẹp lại
  box: z.array(num),
});

const OptionSchema = z.object({
  label: z.string().default(""),
  text: z.string().default(""),
});

export const GroupSchema = z.object({
  range: z.array(num).min(1),
  page: num.optional().default(1),
  // Model đôi khi trả dạng lạ: không chặn ở đây, quy về OTHER
  ieltsType: z
    .string()
    .transform((v): IeltsReadType => {
      const up = v.trim().toUpperCase();
      return (IELTS_READ_TYPES as readonly string[]).includes(up) ? (up as IeltsReadType) : "OTHER";
    }),
  instruction: z.string().default(""),
  renderMode: z.enum(["STRUCTURED", "IMAGE"]).catch("STRUCTURED"),
  isPictureInPdf: z.boolean().catch(false),
  figure: nullableDefault(FigureSchema),
  table: nullableDefault(
    z.object({
      headers: z.array(z.string()).default([]),
      rows: z.array(z.array(z.coerce.string())).default([]),
    })
  ),
  flowchart: nullableDefault(
    z.object({
      title: z.string().nullable().optional(),
      boxes: z
        .array(
          z.object({
            id: z.coerce.string(),
            text: z.string().default(""),
            next: z.array(z.coerce.string()).default([]),
          })
        )
        .default([]),
    })
  ),
  // Đoạn tóm tắt / ghi chú / biểu mẫu chứa nhiều chỗ trống {{N}}
  notesText: nullableDefault(z.string()),
  // Danh sách lựa chọn dùng chung của dạng nối (headings i-x, features A-E, endings A-G)
  sharedOptions: nullableDefault(z.array(OptionSchema)),
  // Speaking: phần thi 1, 2 hoặc 3 (null với kỹ năng khác)
  speakingPart: nullableDefault(num),
  questions: z
    .array(
      z.object({
        number: num,
        prompt: z.string().default(""),
        options: z.array(OptionSchema).default([]),
        // Speaking: tiêu đề chủ đề in trên đề mà câu hỏi thuộc về (vd "Topic 1: Study")
        heading: z.string().nullable().optional(),
      })
    )
    .default([]),
});

export const SectionSchema = z.object({
  skill: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]).catch("READING")),
  title: z.string().default(""),
  passage: nullableDefault(
    z.object({
      startPage: num.optional().default(1),
      endPage: num.optional().default(1),
      firstWords: z.string().default(""),
      lastWords: z.string().default(""),
      // Chỉ có khi PDF là bản scan (không có lớp chữ để cắt nguyên văn)
      fullText: z.string().nullable().optional(),
    })
  ),
  writing: nullableDefault(
    z.object({
      task: num.optional().default(2),
      promptText: z.string().default(""),
      figure: nullableDefault(FigureSchema),
    })
  ),
  groups: z.array(GroupSchema).default([]),
});

export const ExamReadSchema = z.object({
  sections: z.array(SectionSchema).default([]),
  unassigned: z
    .array(
      z.object({
        page: num.optional().default(1),
        kind: z.string().default(""),
        text: z.string().default(""),
      })
    )
    .default([]),
});

export type ExamRead = z.infer<typeof ExamReadSchema>;
export type ExamReadSection = z.infer<typeof SectionSchema>;
export type ExamReadGroup = z.infer<typeof GroupSchema>;
export type ExamReadFigure = z.infer<typeof FigureSchema>;

/** Lấy danh sách số câu {{N}} theo thứ tự xuất hiện trong một chuỗi */
export function extractBlankNumbers(text: string | null | undefined): number[] {
  if (!text) return [];
  return Array.from(text.matchAll(/\{\{\s*(\d{1,3})\s*\}\}/g)).map((m) => Number(m[1]));
}

/** Dải số câu của một nhóm, chịu được range 1 phần tử hoặc đảo ngược */
export function groupNumbers(g: ExamReadGroup): number[] {
  const a = Math.round(g.range[0]);
  const b = Math.round(g.range[g.range.length - 1]);
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  if (!Number.isFinite(start) || end - start > 60) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
