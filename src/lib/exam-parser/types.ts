import { z } from "zod";

export const ParsedOptionSchema = z.object({
  optionLabel: z.string().trim().min(1),
  content: z.string().trim().min(1),
  isCorrect: z.boolean().default(false),
});

export const QuestionTypeEnum = z.enum([
  "MULTIPLE_CHOICE",
  "MULTIPLE_CHOICE_MULTI",
  "TRUE_FALSE_NG",
  "FILL_IN_BLANK",
  "ESSAY",
  "SPEAKING_RECORD",
]);

export const ParsedQuestionSchema = z.object({
  questionNumber: z.number().int().positive(),
  passageText: z.string().nullable().optional(),
  prompt: z.string().trim().min(1),
  type: QuestionTypeEnum.default("FILL_IN_BLANK"),
  points: z.number().positive().default(1.0),
  correctAnswer: z.string().default(""),
  explanation: z.string().default(""),
  options: z.array(ParsedOptionSchema).default([]),
  flowchartGroupTitle: z.string().optional(),
  flowchartBoxText: z.string().optional(),
});

export const ParsedSectionSchema = z.object({
  id: z.string(),
  key: z.string(),
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]),
  title: z.string(),
  durationMinutes: z.number().default(30),
  audioUrl: z.string().nullable().optional(),
  passageText: z.string(),
  questions: z.array(ParsedQuestionSchema),
});

export const GroqPartOutputSchema = z.object({
  partTitle: z.string().optional().default(""),
  skill: z
    .enum(["READING", "LISTENING", "WRITING", "SPEAKING"])
    .optional()
    .default("READING"),
  passageText: z.string().optional().default(""),
  questions: z
    .array(
      z.object({
        questionNumber: z.coerce.number().int().optional(),
        prompt: z.string().optional().default(""),
        type: z.string().optional().default("FILL_IN_BLANK"),
        options: z
          .array(
            z.object({
              optionLabel: z.string().optional().default("A"),
              content: z.string().optional().default(""),
            })
          )
          .optional()
          .default([]),
        explanation: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
});

export type ParsedOption = z.infer<typeof ParsedOptionSchema>;
export type ParsedQuestion = z.infer<typeof ParsedQuestionSchema>;
export type ParsedSection = z.infer<typeof ParsedSectionSchema>;

export interface FlowchartBox {
  id: string;
  title?: string;
  textTemplate: string;
  questionNumbers?: number[];
  isStatic?: boolean;
  nextBoxIds?: string[];
}

export interface FlowchartGroup {
  id: string;
  title: string;
  instruction: string;
  boxes: FlowchartBox[];
  questionNumbers: number[];
}

export interface TableCompletionCell {
  text: string;
  questionNumber?: number;
}

export interface TableCompletionGroup {
  id: string;
  title?: string;
  instruction?: string;
  headers: string[];
  rows: Array<Array<string | TableCompletionCell>>;
  questionNumbers: number[];
}

export interface HeadingItem {
  id: string;
  romanNumeral: string;
  text: string;
}

export interface MatchingHeadingsGroup {
  id: string;
  title?: string;
  instruction?: string;
  headings: HeadingItem[];
  items: Array<{
    questionNumber: number;
    paragraphLabel: string;
  }>;
  questionNumbers: number[];
}

export interface SummaryCompletionGroup {
  id: string;
  title?: string;
  instruction?: string;
  summaryText: string;
  questionNumbers: number[];
}

export interface ParsedExamResult {
  title: string;
  skill: string;
  durationMinutes: number;
  audioUrl: string | null;
  passageText: string;
  questions: ParsedQuestion[];
  sections?: ParsedSection[];
  flowcharts?: FlowchartGroup[];
  tables?: TableCompletionGroup[];
  matchingHeadings?: MatchingHeadingsGroup[];
  summaries?: SummaryCompletionGroup[];
  warnings?: string[];
  invariantsReport?: any;
}
