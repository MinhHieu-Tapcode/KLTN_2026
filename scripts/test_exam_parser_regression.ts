/**
 * Kiểm thử hồi quy cho bộ bóc tách đề IELTS (tách Part, Skeleton, cổng kiểm tra, cảnh báo thiếu câu).
 *
 * Chạy:   npx tsx scripts/test_exam_parser_regression.ts
 * Thêm bước AI thật (cần GROQ_API_KEY):  RUN_AI=1 npx tsx scripts/test_exam_parser_regression.ts
 *
 * Đề kiểm thử được dựng trong file (không cần PDF): 4 kỹ năng, 85 mục
 * (Listening 40 + Reading 40 + Writing 2 + Speaking 3), tiêu đề kiểu Cambridge "SECTION n  Questions x–y".
 */
import { cleanAndReflowPages, splitIntoExamParts } from "../src/lib/exam-parser/extract-text";
import { buildExamSkeleton, checkGroupCoverage } from "../src/lib/exam-parser/exam-skeleton";
import { validateQuestion } from "../src/lib/exam-parser/question-validator";
import { fallbackRuleBasedParse, parseExamTextWithGroq } from "../src/lib/exam-parser/groq-parser";
import { mergeVisionResult } from "../src/services/ielts-parser.service";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
  if (!ok) failed++;
}

const filler = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => `This is sentence ${i + seed} of the passage describing a topic in academic detail.`).join(" ");

function buildExamPages(): string[] {
  const hdr = "IELTS Practice Test 1\n";
  const form = (a: number, b: number) => {
    let s = `Questions ${a}–${b}\nComplete the notes below.\nWrite NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.\nBooking Form\n`;
    for (let n = a; n <= b; n++) s += `Item ${n}: ${n}  ____________\n`;
    return s;
  };
  const mcq = (a: number, b: number) => {
    let s = `Questions ${a}–${b}\nChoose the correct letter, A, B or C.\n`;
    for (let n = a; n <= b; n++)
      s += `${n}  What does the speaker say about topic ${n}?\nA  it is cheaper than expected\nB  it is more popular than before\nC  it will close soon\n`;
    return s;
  };
  const sec = (i: number, a: number) =>
    `SECTION ${i}  Questions ${a}–${a + 9}\nYou will hear a conversation. ${filler(4, i)}\n` + form(a, a + 4) + mcq(a + 5, a + 9);
  const reading = (i: number, a: number, b: number) => {
    let s = `READING PASSAGE ${i}\nYou should spend about 20 minutes on Questions ${a}–${b}, which are based on Reading Passage ${i} below.\nThe History of Topic ${i}\n`;
    for (const L of "ABCDEFG") s += `${L} ${filler(9, i * 10)}\n`;
    s += `Questions ${a}–${a + 6}\nDo the following statements agree with the information given in Reading Passage ${i}?\nIn boxes ${a}–${a + 6} on your answer sheet, write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this\n`;
    for (let n = a; n <= a + 6; n++) s += `${n}  The researchers found that statement ${n} about the topic was widely accepted.\n`;
    s += `Questions ${a + 7}–${b}\nComplete the summary below.\nChoose NO MORE THAN TWO WORDS from the passage for each answer.\n`;
    for (let n = a + 7; n <= b; n++) s += `${n}  Researchers later relied on ${n} ____________ for their work.\n`;
    return s;
  };
  return [
    hdr + sec(1, 1) + "\n" + sec(2, 11),
    hdr + sec(3, 21) + "\n" + sec(4, 31),
    hdr + reading(1, 1, 13),
    hdr + reading(2, 14, 26),
    hdr + reading(3, 27, 40),
    hdr +
      "WRITING TASK 1\nYou should spend about 20 minutes on this task.\nThe chart below shows data. Write at least 150 words.\n\n" +
      "WRITING TASK 2\nYou should spend about 40 minutes on this task.\nWrite at least 250 words.\n\n" +
      "SPEAKING PART 1\nLet's talk about your hometown.\nSPEAKING PART 2\nCUE CARD Describe a place you like.\nSPEAKING PART 3\nDiscuss tourism.",
  ];
}

(async () => {
  console.log("=== A. Tách Part (đề 4 kỹ năng, tiêu đề 'SECTION n  Questions x–y') ===");
  const text = cleanAndReflowPages(buildExamPages());
  const parts = splitIntoExamParts(text);
  const count = (re: RegExp) => parts.filter((p) => re.test(p.title)).length;
  check("Có 4 Part Listening (SECTION 1..4)", count(/^SECTION\s*\d/i) === 4, `thực tế ${count(/^SECTION\s*\d/i)}`);
  check("Có 3 Part Reading", count(/^READING PASSAGE/i) === 3);
  check("Có 2 Part Writing Task", count(/^WRITING TASK/i) === 2, `thực tế ${count(/^WRITING TASK/i)}`);
  check("Có 3 Part Speaking", count(/^SPEAKING PART/i) === 3, `thực tế ${count(/^SPEAKING PART/i)}`);
  check("Không Part nào bị gán nhầm kỹ năng (Section 4 không dính Reading)", parts.every((p) => !(/^SECTION/i.test(p.title) && p.detectedSkill === "READING")));

  console.log("\n=== B. Skeleton: đếm kỳ vọng theo từng Part ===");
  const sk = buildExamSkeleton(text, parts);
  check("Tổng kỳ vọng = 80 (L40 + R40), không bị gộp bằng Set", sk.totalExpectedQuestions === 80, `thực tế ${sk.totalExpectedQuestions}`);

  console.log("\n=== C. Quy tắc dự phòng: số câu theo từng Part ===");
  let totalFb = 0;
  parts.forEach((p, i) => {
    const g = sk.parts[i].groups;
    if (g.length === 0) return;
    const fb = fallbackRuleBasedParse(p.title, p.content, (p.detectedSkill || "READING") as any, g[0].startNum, g);
    totalFb += fb.questions.length;
  });
  check("Quy tắc dự phòng lấy từ 60 câu trở lên trong 80 câu Listening+Reading", totalFb >= 60, `thực tế ${totalFb}`);

  console.log("\n=== D. Trường hợp test_3.pdf: bảng nằm trong ảnh ===");
  const t3 =
    "Questions 27-30\nDo the following statements agree with the information given in Reading Passage One? Write\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN If there is no information on this\n27. The greatest advantage of Mars is that it has many basic minerals.\n28. Settlement of the moon would be more expensive.\nQuestions 31-35\nComplete the table. Choose NO MORE THAN TWO WORDS from the passage for each answer.\nQuestions 36-40\nGive TWO examples of the following categories. Choose NO MORE THAN TWO WORDS from the passage for each example.\n";
  const g = buildExamSkeleton(t3).allGroups;
  const issues = checkGroupCoverage(g, [27, 28, 29, 30], "Phần 1");
  check("Báo thiếu câu 31-35 (TABLE) và 36-40", issues.length === 2 && issues[0].missingNumbers.join() === "31,32,33,34,35", issues.map((i) => i.message).join(" | "));
  const g36 = g.find((x) => x.startNum === 36)!;
  const junk = validateQuestion({ questionNumber: 36, prompt: "Give TWO examples of the following categories.", type: "FILL_IN_BLANK", points: 1, correctAnswer: "", explanation: "", options: [] } as any, g36);
  check("Câu 36 có prompt là câu chỉ dẫn bị loại", !junk.isValid, junk.reasons.join(", "));
  const real = validateQuestion({ questionNumber: 27, prompt: "The greatest advantage of Mars is that it has many basic minerals.", type: "TRUE_FALSE_NG", points: 1, correctAnswer: "", explanation: "", options: [] } as any, g.find((x) => x.startNum === 27)!);
  check("Câu hỏi thật (27) không bị loại nhầm", real.isValid, real.reasons.join(", "));
  const ph = validateQuestion({ questionNumber: 31, prompt: "Câu hỏi số 31", type: "FILL_IN_BLANK", points: 1, correctAnswer: "", explanation: "", options: [] } as any, g.find((x) => x.startNum === 31)!);
  check("Prompt nhãn tự điền 'Câu hỏi số 31' bị coi là CHƯA có nội dung", ph.reasons.some((r) => r.includes("prompt_placeholder")), ph.reasons.map((r) => r.slice(0, 30)).join(" ; "));
  const split = splitIntoExamParts("Mars is a planet. ".repeat(60) + "\nQuestions 27-30\nDo the following...\n27. A\nTask 2 –\nSome people think that children should study. To what extent do you agree or disagree?");
  check("'Task 2 –' được tách thành Part Writing riêng", split.some((p) => p.detectedSkill === "WRITING"), split.map((p) => p.detectedSkill).join(","));

  console.log("\n=== F. Gộp kết quả Gemini Vision (dữ liệu giả lập, KHÔNG gọi mạng) ===");
  const q = (n: number, prompt: string, extra: any = {}) => ({ questionNumber: n, prompt, type: "FILL_IN_BLANK", points: 1, correctAnswer: "", explanation: "", options: [], ...extra });
  const mk = () => {
    const reading = { id: "reading_1", key: "READING_1", skill: "READING", title: "R", durationMinutes: 20, passageText: "P", questions: [q(27, "A statement about Mars goes here."), q(30, "Another statement goes here.")] };
    const listening = { id: "listening_2", key: "LISTENING_2", skill: "LISTENING", title: "L", durationMinutes: 20, passageText: "", questions: [q(1, "Name: ____"), q(2, "Date: ____")] };
    return { title: "t", skill: "ALL_SKILLS", durationMinutes: 60, audioUrl: null, passageText: "", questions: [...reading.questions, ...listening.questions], sections: [reading, listening] } as any;
  };
  const vision = {
    questions: [q(31, "Infrequent (31) ____ launch window"), q(32, "effect of space on (32) ____"), q(5, "Cell (5) ____ in the listening form")],
    tables: [{ id: "t1", headers: ["a", "b"], rows: [["x", "(31) ____"]], questionNumbers: [31, 32] }],
  };
  const exam = mk();
  exam.tables = [{ id: "old", headers: ["h"], rows: [["z"]], questionNumbers: [99] }];
  const gaps = [
    { sectionKey: "reading_1", partLabel: "Phần 3", kind: "TABLE", startNum: 31, endNum: 33, missingNumbers: [31, 32, 33] },
    { sectionKey: "listening_2", partLabel: "Phần 2", kind: "FILL_IN_BLANK", startNum: 3, endNum: 5, missingNumbers: [3, 4, 5] },
  ];
  mergeVisionResult(exam, vision, gaps as any);
  const rNums = exam.sections[0].questions.map((x: any) => x.questionNumber).join();
  const lNums = exam.sections[1].questions.map((x: any) => x.questionNumber).join();
  check("Câu 31, 32 điền vào ĐÚNG section Reading", rNums === "27,30,31,32", rNums);
  check("Câu 5 điền vào ĐÚNG section Listening", lNums === "1,2,5", lNums);
  check("Bảng cũ giữ nguyên, bảng mới được thêm (không ghi đè)", exam.tables.length === 2);
  check("Phần còn thiếu được tính lại (33 và 3, 4)", exam.coverageGaps.map((g: any) => g.missingNumbers.join()).join("|") === "33|3,4", JSON.stringify(exam.coverageGaps?.map((g: any) => g.missingNumbers)));
  const exam2 = mk();
  mergeVisionResult(exam2, { questions: [q(5, "Ambiguous (5) ____")] }, [
    { sectionKey: "reading_1", partLabel: "R", kind: "TABLE", startNum: 5, endNum: 5, missingNumbers: [5] },
    { sectionKey: "listening_2", partLabel: "L", kind: "TABLE", startNum: 5, endNum: 5, missingNumbers: [5] },
  ] as any);
  check("Số câu mơ hồ (cùng thiếu ở 2 section) KHÔNG bị điền nhầm", exam2.sections[0].questions.length === 2 && exam2.sections[1].questions.length === 2);

  if (process.env.RUN_AI === "1") {
    console.log("\n=== E. Chạy AI thật (ALL_SKILLS) ===");
    const out = await parseExamTextWithGroq({ title: "test", skill: "ALL_SKILLS", durationMinutes: 180, audioUrl: "a.mp3", cleanedText: text });
    const byKey = (k: string) => (out.sections || []).filter((s) => s.key.startsWith(k)).reduce((a, s) => a + s.questions.length, 0);
    check("Listening ≥ 36/40 câu", byKey("LISTENING") >= 36, `thực tế ${byKey("LISTENING")}`);
    check("Reading ≥ 36/40 câu", byKey("READING") >= 36, `thực tế ${byKey("READING")}`);
    check("Writing = 2, Speaking = 3", byKey("WRITING") === 2 && byKey("SPEAKING") === 3, `W=${byKey("WRITING")} S=${byKey("SPEAKING")}`);
  }

  console.log(failed === 0 ? "\nTẤT CẢ ĐẠT" : `\n${failed} KIỂM TRA THẤT BẠI`);
  process.exit(failed === 0 ? 0 : 1);
})();
