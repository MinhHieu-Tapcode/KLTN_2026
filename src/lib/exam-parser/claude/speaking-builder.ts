import { ParsedQuestion } from "../types";
import { ExamReadGroup, ExamReadSection } from "./schema";

/**
 * Dựng đề Speaking theo đúng cấu trúc IELTS: mỗi Part là 1 câu ghi âm riêng.
 * - Part 1 (Introduction and Interview, 4–5 phút) và Part 3 (Discussion, 4–5 phút): câu hỏi nhóm theo Topic.
 * - Part 2 (Individual Long Turn, 3–4 phút): cue card + câu hỏi phụ.
 * Định dạng passageText là chữ thường có quy ước để speaking-part-view.tsx hiển thị:
 *   dòng "## ..." = tiêu đề chủ đề; dòng "1. ..." = câu hỏi; dòng "- ..." = gạch đầu dòng cue card;
 *   dòng "Follow-up questions:" tách phần câu hỏi phụ của Part 2.
 */

export const SPEAKING_PART_LABELS: Record<number, string> = {
  1: "Part 1 – Introduction and Interview",
  2: "Part 2 – Individual Long Turn",
  3: "Part 3 – Discussion",
};

export const FOLLOW_UP_MARKER = "Follow-up questions:";

function partOf(g: ExamReadGroup, idx: number): number {
  const fromField = Math.round(g.speakingPart || 0);
  if (fromField >= 1 && fromField <= 3) return fromField;
  const m = g.instruction.match(/part\s*([123])/i);
  return m ? Number(m[1]) : Math.min(3, idx + 1);
}

function questionsByTopic(g: ExamReadGroup): string {
  const lines: string[] = [];
  let lastHeading = "";
  let n = 0;
  for (const q of g.questions) {
    const heading = (q.heading || "").trim();
    if (heading && heading !== lastHeading) {
      lines.push(`## ${heading}`);
      lastHeading = heading;
      n = 0;
    }
    n++;
    lines.push(`${n}. ${q.prompt.trim()}`);
  }
  return lines.join("\n");
}

function cueCardText(g: ExamReadGroup): string {
  const card = (g.notesText || "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[•*]\s*/, "- "))
    .filter(Boolean)
    // Thời gian chuẩn bị/nói do giao diện hiển thị theo chuẩn, không lặp trong thẻ
    .filter((l) => !/^(preparation time|speaking time|\d+\s*[–-]?\s*\d*\s*minutes?)$/i.test(l))
    .join("\n");
  const followUps = g.questions.map((q, i) => `${i + 1}. ${q.prompt.trim()}`);
  return followUps.length > 0 ? `${card}\n${FOLLOW_UP_MARKER}\n${followUps.join("\n")}` : card;
}

export function buildSpeakingQuestions(section: ExamReadSection, sectionKey: string): ParsedQuestion[] {
  const used = new Set<number>();
  return section.groups
    .map((g, idx) => {
      let part = partOf(g, idx);
      while (used.has(part) && part < 3) part++;
      used.add(part);
      const passageText = part === 2 ? cueCardText(g) : questionsByTopic(g);
      return {
        questionNumber: part,
        passageText,
        prompt: `${SPEAKING_PART_LABELS[part]}: ghi âm câu trả lời của bạn.`,
        type: "SPEAKING_RECORD" as const,
        // 3 phần cộng lại 9 điểm như band tối đa
        points: 3,
        correctAnswer: "",
        explanation: "",
        options: [],
        sectionKey,
        groupTitle: SPEAKING_PART_LABELS[part],
        ieltsQuestionType: `SPEAKING_PART_${part}`,
        renderMode: "STRUCTURED" as const,
      };
    })
    .filter((q) => q.passageText.trim().length > 0)
    .sort((a, b) => a.questionNumber - b.questionNumber);
}
