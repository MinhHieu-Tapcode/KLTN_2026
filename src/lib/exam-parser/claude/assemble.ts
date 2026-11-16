import {
  FlowchartGroup,
  MatchingHeadingsGroup,
  ParsedExamResult,
  ParsedQuestion,
  ParsedSection,
  SummaryCompletionGroup,
  TableCompletionGroup,
} from "../types";
import { ExamRead, ExamReadGroup, ExamReadSection } from "./schema";
import { ExamCheck, clampFigureBox } from "./validate";
import { judgementOptions, mapGroupType, speakingPartType, writingTaskType } from "./type-map";
import { cutPassageByMarkers } from "./passage-cutter";
import { buildSpeakingQuestions } from "./speaking-builder";
import {
  blanksToUnderscore,
  buildFlowchart,
  buildMatchingHeadings,
  buildSummary,
  buildTable,
} from "./structure-builders";

/**
 * Lắp ráp kết quả Claude (đã qua validate) thành ParsedExamResult mà giao diện Ebook 2 cột đang dùng.
 */

export interface AssembleContext {
  title: string;
  teacherSkill: string;
  durationMinutes: number;
  audioUrl: string | null;
  // Văn bản đề đã dọn (cleanAndReflowPages) và theo từng trang, để cắt nguyên văn bài đọc
  cleanedText: string;
  cleanPages: (startPage: number, endPage: number) => string;
}

interface Collected {
  tables: TableCompletionGroup[];
  flowcharts: FlowchartGroup[];
  summaries: SummaryCompletionGroup[];
  matchingHeadings: MatchingHeadingsGroup[];
  warnings: string[];
}

/**
 * Bỏ nhãn đầu như "Reading Passage 1:", "Part 2 -", "Section 3" nếu AI vẫn trả kèm.
 * Giữ nguyên khi cả tiêu đề chỉ là nhãn (vd "Writing Task 2").
 */
export function cleanSectionTitle(raw: string): string {
  const title = (raw || "").trim();
  const stripped = title
    .replace(/^(?:(?:reading|listening|writing|speaking)\s+)?(?:passage|section|part|task|recording)\s*(?:\d+|one|two|three|four|[ivx]+)\s*[:\-–—.]\s*/i, "")
    .trim();
  return stripped.length >= 3 ? stripped : title;
}

const groupTitleOf = (numbers: number[]) =>
  numbers.length > 1 ? `Questions ${numbers[0]}-${numbers[numbers.length - 1]}` : `Question ${numbers[0]}`;

/**
 * Luôn lưu trang của nhóm (để công cụ chỉnh vùng mở đúng trang); vùng cắt chỉ khi Claude trả vùng hợp lệ.
 * Nhóm dạng ảnh mà thiếu vùng thì lấy cả trang để học viên vẫn có ảnh làm bài.
 */
function figureFields(g: ExamReadGroup, forceWholePage: boolean): { figurePage?: number; figureBox?: number[] } {
  const box = clampFigureBox(g.figure?.box);
  if (box) return { figurePage: Math.round(g.figure!.page), figureBox: box as number[] };
  const page = Math.round(g.page);
  if (!Number.isFinite(page) || page < 1) return {};
  return forceWholePage ? { figurePage: page, figureBox: [0, 0, 1000, 1000] } : { figurePage: page };
}

function buildGroupQuestions(
  section: ExamReadSection,
  sectionKey: string,
  g: ExamReadGroup,
  gIdx: number,
  check: ExamCheck,
  passageText: string,
  out: Collected
): ParsedQuestion[] {
  const res = check.groups.get(g)!;
  const numbers = res.numbers;
  const groupTitle = groupTitleOf(numbers);
  const mapped = mapGroupType(section.skill, g.ieltsType);
  const isJudgement = g.ieltsType === "TFNG" || g.ieltsType === "YNNG";
  const base = {
    passageText,
    points: 1,
    correctAnswer: "", // Không gán đáp án giả: GV phải nhập hoặc nạp Excel
    explanation: "",
    sectionKey,
    groupTitle,
    ieltsQuestionType: mapped.ieltsQuestionType,
  };
  const byNumber = new Map(g.questions.map((q) => [Math.round(q.number), q]));

  if (res.mode === "IMAGE") {
    out.warnings.push(
      `${section.title || section.skill} – ${groupTitle}: chưa dựng được giao diện (${res.reasons.join("; ")}). ` +
        "Đang hiển thị dạng ảnh đề gốc + ô đáp án, hãy đính kèm ảnh nhóm câu này."
    );
    return numbers.map((n) => ({
      ...base,
      questionNumber: n,
      prompt: blanksToUnderscore(byNumber.get(n)?.prompt || "") || `Câu ${n} – xem hình đề gốc (${groupTitle})`,
      type: isJudgement ? mapped.type : "FILL_IN_BLANK",
      options: isJudgement ? judgementOptions(g.ieltsType) : [],
      renderMode: "IMAGE" as const,
      ...figureFields(g, true),
    }));
  }
  res.reviewNotes.forEach((n) => out.warnings.push(`${section.title || section.skill} – ${n}`));

  // Nhóm có cấu trúc: prompt sinh từ ô bảng / hộp sơ đồ / đoạn ghi chú
  const id = `${sectionKey}_g${gIdx + 1}`;
  let derived: Map<number, string> | null = null;
  if (g.table) {
    const r = buildTable(g, `tbl_${id}`, sectionKey, numbers);
    out.tables.push(r.group);
    derived = r.prompts;
  } else if (g.flowchart) {
    const r = buildFlowchart(g, `fc_${id}`, sectionKey, numbers);
    out.flowcharts.push(r.group);
    derived = r.prompts;
  } else if (g.notesText) {
    const r = buildSummary(g, `sum_${id}`, sectionKey, numbers);
    out.summaries.push(r.group);
    derived = r.prompts;
  } else if (g.ieltsType === "MATCHING_HEADINGS" && g.sharedOptions && g.sharedOptions.length >= 2) {
    out.matchingHeadings.push(buildMatchingHeadings(g, `mh_${id}`, sectionKey, numbers));
  }

  const shared = (g.sharedOptions || []).map((o) => ({ optionLabel: o.label.trim(), content: o.text.trim(), isCorrect: false }));
  return numbers.map((n) => {
    const q = byNumber.get(n);
    const options = isJudgement
      ? judgementOptions(g.ieltsType)
      : q && q.options.length > 0
      ? q.options.map((o) => ({ optionLabel: o.label.trim(), content: o.text.trim(), isCorrect: false }))
      : shared;
    return {
      ...base,
      questionNumber: n,
      prompt: derived?.get(n) || blanksToUnderscore(q?.prompt || "") || `Câu ${n}`,
      type: mapped.type,
      options,
      renderMode: "STRUCTURED" as const,
      ...figureFields(g, false),
    };
  });
}

function resolvePassage(section: ExamReadSection, ctx: AssembleContext, cursor: { pos: number }, warnings: string[]): string {
  const p = section.passage;
  if (!p) return "";
  if (p.fullText && p.fullText.trim().length > 50) return p.fullText.trim();
  const fallback = ctx.cleanPages(Math.round(p.startPage), Math.round(p.endPage));
  const cut = cutPassageByMarkers(ctx.cleanedText, p.firstWords, p.lastWords, fallback, cursor.pos);
  if (cut.method === "fallback") {
    warnings.push(
      `${section.title || "Bài đọc"}: không khớp được mốc đầu/cuối bài đọc, đang dùng nguyên văn trang ${p.startPage}-${p.endPage}. Vui lòng kiểm tra lại cột bài đọc.`
    );
  } else {
    cursor.pos = cut.endIndex;
  }
  return cut.text;
}

export function assembleExam(read: ExamRead, check: ExamCheck, ctx: AssembleContext): ParsedExamResult {
  const out: Collected = { tables: [], flowcharts: [], summaries: [], matchingHeadings: [], warnings: [...check.warnings] };
  const wantAll = ctx.teacherSkill === "ALL_SKILLS";
  const kept = read.sections.filter((s) => wantAll || s.skill === ctx.teacherSkill);
  read.sections
    .filter((s) => !kept.includes(s))
    .forEach((s) =>
      out.warnings.push(`Phần "${s.title || s.skill}" là đề ${s.skill} nên đã bỏ qua trong bài ${ctx.teacherSkill}. Chọn đúng kỹ năng nếu muốn bóc phần này.`)
    );
  if (kept.length === 0) {
    const found = Array.from(new Set(read.sections.map((s) => s.skill))).join(", ") || "không xác định";
    throw new Error(`Không tìm thấy phần thi ${ctx.teacherSkill} trong tệp. Kỹ năng tìm thấy: ${found}.`);
  }

  const cursor = { pos: 0 };
  const sections: ParsedSection[] = kept.map((section, idx) => {
    const sectionKey = `${section.skill.toLowerCase()}_${idx + 1}`;
    let questions: ParsedQuestion[] = [];
    let passageText = "";

    if (section.skill === "WRITING") {
      const w = section.writing;
      const promptText = (w?.promptText || "").trim();
      passageText = promptText;
      const box = clampFigureBox(w?.figure?.box);
      const task = Math.round(w?.task || 2) === 1 ? 1 : 2;
      questions = [
        {
          // Đánh số theo Task (1 hoặc 2) để Task 1 và Task 2 cùng tệp không trùng "câu 1"
          questionNumber: task,
          passageText,
          prompt: promptText || "Viết bài luận hoàn chỉnh theo đề ở cột bên trái.",
          type: "ESSAY",
          points: 9,
          correctAnswer: "",
          explanation: "",
          options: [],
          sectionKey,
          ieltsQuestionType: writingTaskType(task),
          renderMode: "STRUCTURED",
          ...(box && w?.figure ? { figurePage: Math.round(w.figure.page), figureBox: box as number[] } : {}),
        },
      ];
      if (!promptText) out.warnings.push(`${section.title || "Writing"}: AI không đọc được đề bài Writing, vui lòng nhập tay.`);
    } else if (section.skill === "SPEAKING") {
      // Mỗi Part (1/2/3) là một câu ghi âm riêng, đánh số theo Part (khớp resolveIeltsQuestionType khi lưu)
      questions = buildSpeakingQuestions(section, sectionKey);
      if (questions.length === 0) {
        const partType = speakingPartType(section.title, idx);
        questions = [
          {
            questionNumber: Number(partType.slice(-1)),
            passageText: "",
            prompt: "Ghi âm phần trả lời Speaking theo đề bài.",
            type: "SPEAKING_RECORD",
            points: 3,
            correctAnswer: "",
            explanation: "",
            options: [],
            sectionKey,
            ieltsQuestionType: partType,
            renderMode: "STRUCTURED",
          },
        ];
        out.warnings.push(`${section.title || "Speaking"}: AI không đọc được câu hỏi Speaking, vui lòng nhập tay.`);
      }
      // Cột đề bài phía GV: bỏ ký hiệu "## " (chỉ giao diện học viên dùng để vẽ tiêu đề chủ đề)
      passageText = questions
        .map((q) => `${q.groupTitle}\n${(q.passageText || "").replace(/^## /gm, "")}`)
        .join("\n\n");
    } else {
      passageText = resolvePassage(section, ctx, cursor, out.warnings) || section.title;
      questions = section.groups
        .flatMap((g, gIdx) => buildGroupQuestions(section, sectionKey, g, gIdx, check, passageText, out))
        .sort((a, b) => a.questionNumber - b.questionNumber);
    }

    return {
      id: sectionKey,
      key: `${section.skill}_${idx + 1}`,
      skill: section.skill,
      // Tiêu đề phần thi chỉ là tên bài in trên đề (vd "Urban Beekeeping: ..."), không ghép tên tệp
      title: cleanSectionTitle(section.title) || ctx.title,
      durationMinutes: Math.max(15, Math.round(ctx.durationMinutes / Math.max(1, kept.length))),
      audioUrl: section.skill === "LISTENING" ? ctx.audioUrl : null,
      passageText,
      questions,
    };
  });

  return {
    title: ctx.title,
    skill: ctx.teacherSkill,
    durationMinutes: ctx.durationMinutes,
    audioUrl: ctx.audioUrl,
    passageText: sections[0]?.passageText || "",
    questions: sections.flatMap((s) => s.questions),
    sections: sections.length > 1 || wantAll ? sections : undefined,
    tables: out.tables.length > 0 ? out.tables : undefined,
    flowcharts: out.flowcharts.length > 0 ? out.flowcharts : undefined,
    summaries: out.summaries.length > 0 ? out.summaries : undefined,
    matchingHeadings: out.matchingHeadings.length > 0 ? out.matchingHeadings : undefined,
    warnings: out.warnings.length > 0 ? out.warnings : undefined,
    unassigned: read.unassigned.length > 0 ? read.unassigned : undefined,
  };
}
