import { ParsedQuestion } from "../types";
import { IeltsReadType } from "./schema";

/**
 * Ánh xạ dạng bài Claude trả về sang:
 * - `type`: loại câu của ParsedQuestion (đi qua mapQuestionTypeToDbEnum khi lưu CSDL),
 * - `ieltsQuestionType`: mã dạng bài chuẩn trong src/lib/ielts-report-config.ts (dùng cho báo cáo và giao diện).
 */

export interface MappedType {
  type: ParsedQuestion["type"];
  ieltsQuestionType: string;
}

type Skill = "READING" | "LISTENING" | "WRITING" | "SPEAKING";

const READING_MAP: Record<IeltsReadType, MappedType> = {
  TFNG: { type: "TRUE_FALSE_NG", ieltsQuestionType: "READING_TFNG" },
  YNNG: { type: "TRUE_FALSE_NG", ieltsQuestionType: "READING_YNNG" },
  MCQ_SINGLE: { type: "MULTIPLE_CHOICE", ieltsQuestionType: "READING_MCQ" },
  MCQ_MULTI: { type: "MULTIPLE_CHOICE_MULTI", ieltsQuestionType: "READING_MCQ" },
  SHORT_ANSWER: { type: "SHORT_ANSWER", ieltsQuestionType: "READING_SHORT_ANSWER" },
  SENTENCE_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "READING_SENTENCE_COMPLETION" },
  SUMMARY_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "READING_SUMMARY_COMPLETION" },
  NOTE_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "READING_NOTE_TABLE_FORM" },
  TABLE_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "READING_NOTE_TABLE_FORM" },
  FLOWCHART_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "READING_NOTE_TABLE_FORM" },
  FORM_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "READING_NOTE_TABLE_FORM" },
  DIAGRAM_LABELLING: { type: "MAP", ieltsQuestionType: "READING_DIAGRAM_LABELLING" },
  MAP_LABELLING: { type: "MAP", ieltsQuestionType: "READING_DIAGRAM_LABELLING" },
  MATCHING_HEADINGS: { type: "MATCHING_HEADINGS", ieltsQuestionType: "READING_MATCHING_HEADINGS" },
  MATCHING_INFORMATION: { type: "MATCHING_INFO", ieltsQuestionType: "READING_MATCHING_INFO" },
  // Chưa có mã riêng trong ielts-report-config cho 2 dạng này: xếp chung nhóm "nối thông tin"
  MATCHING_FEATURES: { type: "MATCHING_FEATURES", ieltsQuestionType: "READING_MATCHING_INFO" },
  SENTENCE_ENDINGS: { type: "SENTENCE_ENDINGS", ieltsQuestionType: "READING_MATCHING_INFO" },
  OTHER: { type: "FILL_IN_BLANK", ieltsQuestionType: "READING_SENTENCE_COMPLETION" },
};

const LISTENING_MAP: Record<IeltsReadType, MappedType> = {
  TFNG: { type: "TRUE_FALSE_NG", ieltsQuestionType: "LISTENING_MCQ" },
  YNNG: { type: "TRUE_FALSE_NG", ieltsQuestionType: "LISTENING_MCQ" },
  MCQ_SINGLE: { type: "MULTIPLE_CHOICE", ieltsQuestionType: "LISTENING_MCQ" },
  MCQ_MULTI: { type: "MULTIPLE_CHOICE_MULTI", ieltsQuestionType: "LISTENING_MCQ" },
  SHORT_ANSWER: { type: "SHORT_ANSWER", ieltsQuestionType: "LISTENING_SHORT_ANSWER" },
  SENTENCE_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "LISTENING_SENTENCE_COMPLETION" },
  SUMMARY_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "LISTENING_FORM_NOTE_TABLE" },
  NOTE_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "LISTENING_FORM_NOTE_TABLE" },
  TABLE_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "LISTENING_FORM_NOTE_TABLE" },
  FLOWCHART_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "LISTENING_FORM_NOTE_TABLE" },
  FORM_COMPLETION: { type: "FILL_IN_BLANK", ieltsQuestionType: "LISTENING_FORM_NOTE_TABLE" },
  DIAGRAM_LABELLING: { type: "MAP", ieltsQuestionType: "LISTENING_MAP_PLAN" },
  MAP_LABELLING: { type: "MAP", ieltsQuestionType: "LISTENING_MAP_PLAN" },
  MATCHING_HEADINGS: { type: "MATCHING_INFO", ieltsQuestionType: "LISTENING_MATCHING" },
  MATCHING_INFORMATION: { type: "MATCHING_INFO", ieltsQuestionType: "LISTENING_MATCHING" },
  MATCHING_FEATURES: { type: "MATCHING_FEATURES", ieltsQuestionType: "LISTENING_MATCHING" },
  SENTENCE_ENDINGS: { type: "SENTENCE_ENDINGS", ieltsQuestionType: "LISTENING_MATCHING" },
  OTHER: { type: "FILL_IN_BLANK", ieltsQuestionType: "LISTENING_SENTENCE_COMPLETION" },
};

export function mapGroupType(skill: Skill, readType: IeltsReadType): MappedType {
  return skill === "LISTENING" ? LISTENING_MAP[readType] : READING_MAP[readType];
}

export function writingTaskType(task: number): string {
  return task === 1 ? "WRITING_TASK_1" : "WRITING_TASK_2";
}

export function speakingPartType(title: string, index: number): string {
  const m = title.match(/part\s*(\d)/i);
  const part = m ? Number(m[1]) : index + 1;
  return part <= 1 ? "SPEAKING_PART_1" : part === 2 ? "SPEAKING_PART_2" : "SPEAKING_PART_3";
}

/** Phương án cố định của dạng nhận định */
export function judgementOptions(readType: IeltsReadType): ParsedQuestion["options"] {
  const labels = readType === "YNNG" ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
  return labels.map((content, i) => ({ optionLabel: String.fromCharCode(65 + i), content, isCorrect: false }));
}
