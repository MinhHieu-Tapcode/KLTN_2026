/**
 * KỊCH BẢN KIỂM ĐỊNH THỰC NGHIỆM ĐỘC LẬP (EMPIRICAL QA CHALLENGE HARNESS)
 * Tác giả: Challenger 1 (Empirical QA Challenger)
 * Mục đích: Kiểm chứng thực nghiệm độc lập toàn bộ năng lực bóc tách đề IELTS:
 *   - Trích xuất tệp tài nguyên thực tế (.pdf, .docx) trong repo
 *   - Bóc tách đề thi IELTS Reading hoàn chỉnh 1-13 (Matching Headings, TFNG, Table)
 *   - Bóc tách đề thi IELTS Listening hoàn chỉnh (Form Completion, MCQ)
 *   - Đo lường 3 chỉ số: Tỷ lệ bóc tách, Bảo toàn Cột 1, Tính liên tục Invariants 1->N
 *   - Thử thách áp lực (Adversarial stress-testing, anti-contamination, fallback, sync)
 */

import fs from "fs";
import path from "path";
import { extractAndCleanDocument, splitIntoExamParts } from "../src/lib/exam-parser/extract-text";
import { buildExamSkeleton, checkGroupCoverage, extractGroupSkeletonsFromText } from "../src/lib/exam-parser/exam-skeleton";
import { validateQuestion } from "../src/lib/exam-parser/question-validator";
import { cleanPromptRedundantNumbers } from "../src/lib/exam-parser/clean-prompt";
import { fallbackRuleBasedParse } from "../src/lib/exam-parser/groq-parser";
import { parseIeltsExamContent } from "../src/services/ielts-parser.service";
import { checkExamInvariants } from "../src/services/ielts-invariants.service";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail: string = ""): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}${detail ? " -> " + detail : ""}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}${detail ? " -> " + detail : ""}`);
  }
}

async function runEmpiricalHarness() {
  console.log("================================================================================");
  console.log("CHALLENGER 1: BẮT ĐẦU KIỂM ĐỊNH THỰC NGHIỆM ĐỘC LẬP BỘ BÓC TÁCH ĐỀ THI IELTS");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // NHÓM 1: KIỂM CHỨNG TRÍCH XUẤT TỆP THẬT TẠI REPO (.pdf, .docx)
  // ---------------------------------------------------------------------------
  console.log("--- NHÓM 1: Trích xuất tệp học liệu thực tế trong Repo ---");

  // 1.1 Tệp Mindset_IELTS_Unit_1_Handout.pdf
  const handoutPath = path.resolve(process.cwd(), "test-hoc-lieu-mau/Unit_1_Mindset_IELTS/Mindset_IELTS_Unit_1_Handout.pdf");
  assert(fs.existsSync(handoutPath), "Tệp Handout.pdf tồn tại trên đĩa");
  const handoutBuf = fs.readFileSync(handoutPath);
  const handoutFile = new File([handoutBuf], "Mindset_IELTS_Unit_1_Handout.pdf", { type: "application/pdf" });
  const handoutExtracted = await extractAndCleanDocument(handoutFile);
  assert(handoutExtracted.ok, "extractAndCleanDocument đọc thành công Handout.pdf");
  if (handoutExtracted.ok) {
    const text = handoutExtracted.data.cleanedText;
    assert(text.length >= 1000, "Độ dài văn bản Handout.pdf đạt yêu cầu", `${text.length} chars`);
    assert(text.includes("PART 1: IELTS LISTENING SECTION 1"), "Nhận diện mốc PART 1 Listening");
    assert(text.includes("PART 2: READING COMPREHENSION PASSAGE"), "Nhận diện mốc PART 2 Reading");
    assert(text.includes("PART 3: LISTENING SECTION 2"), "Nhận diện mốc PART 3 Listening Section 2");
    assert(text.includes("Questions 1-5"), "Bảo toàn tiêu đề Questions 1-5");
    assert(text.includes("Questions 6-10"), "Bảo toàn tiêu đề Questions 6-10");
  }

  // 1.2 Tệp Mindset_IELTS_Unit_1_Vocabulary.docx
  const vocabPath = path.resolve(process.cwd(), "test-hoc-lieu-mau/Unit_1_Mindset_IELTS/Mindset_IELTS_Unit_1_Vocabulary.docx");
  assert(fs.existsSync(vocabPath), "Tệp Vocabulary.docx tồn tại trên đĩa");
  const vocabBuf = fs.readFileSync(vocabPath);
  const vocabFile = new File([vocabBuf], "Mindset_IELTS_Unit_1_Vocabulary.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const vocabExtracted = await extractAndCleanDocument(vocabFile);
  assert(vocabExtracted.ok, "extractAndCleanDocument đọc thành công Vocabulary.docx");
  if (vocabExtracted.ok) {
    const text = vocabExtracted.data.cleanedText;
    assert(text.length >= 500, "Độ dài văn bản Vocabulary.docx đạt yêu cầu", `${text.length} chars`);
    assert(text.includes("**MINDSET FOR IELTS"), "Bảo toàn cú pháp in đậm Markdown từ thẻ <strong> HTML");
    assert(text.includes("Curriculum") && text.includes("Blended Learning"), "Giữ trọn vẹn thuật ngữ học thuật");
  }

  // 1.3 Tệp public/sample-mindset.pdf
  const samplePdfPath = path.resolve(process.cwd(), "public/sample-mindset.pdf");
  assert(fs.existsSync(samplePdfPath), "Tệp sample-mindset.pdf tồn tại trên đĩa");
  const samplePdfBuf = fs.readFileSync(samplePdfPath);
  const samplePdfFile = new File([samplePdfBuf], "sample-mindset.pdf", { type: "application/pdf" });
  const sampleExtracted = await extractAndCleanDocument(samplePdfFile);
  assert(sampleExtracted.ok, "extractAndCleanDocument đọc thành công sample-mindset.pdf");
  if (sampleExtracted.ok) {
    assert(sampleExtracted.data.pageCount === 9, "Đếm đúng 9 trang PDF", `${sampleExtracted.data.pageCount} pages`);
    assert(sampleExtracted.data.cleanedText.length > 5000, "Trích xuất đầy đủ văn bản tài liệu", `${sampleExtracted.data.cleanedText.length} chars`);
  }

  // ---------------------------------------------------------------------------
  // NHÓM 2: KIỂM CHỨNG ĐỀ THI READING THỰC TẾ (13 CÂU: HEADINGS, TFNG, TABLE)
  // ---------------------------------------------------------------------------
  console.log("\n--- NHÓM 2: Đề thi Reading thực tế (Questions 1-13) & Đo lường 3 chỉ số then chốt ---");

  const readingExamText = `
READING PASSAGE 1
You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.

The Secret Life of Bees and Pollination Ecosystems

A. Honeybees are among the most remarkable creatures on Earth, possessing an intricate communication system known as the waggle dance. Through precise movements and vibrations, worker bees inform hive mates about the distance and direction of rich floral resources. This behavioral sophistication ensures that colonies maximize their foraging efficiency even in fragmented natural habitats.

B. In agricultural ecosystems, managed honeybees and wild pollinators provide vital ecological services that sustain crop production. Over one-third of the global food supply directly depends on animal pollination, including valuable fruit, nut, and vegetable harvests. Economists estimate that commercial pollination contributes hundreds of billions of dollars annually to global agricultural output.

C. Despite their ecological and economic importance, pollinator populations have suffered dramatic declines in recent decades. The phenomenon known as Colony Collapse Disorder, combined with habitat destruction and pervasive pesticide exposure, has placed unprecedented stress on managed apiaries. Biologists emphasize that modern monoculture farming further exacerbates this crisis by creating nutritional deserts for bees during non-flowering periods.

D. Conservation scientists and agronomists are now developing sustainable landscape interventions to reverse pollinator losses. By planting diverse wildflower strips along field margins and reducing synthetic agrochemical inputs, farmers can restore vital microhabitats. Ongoing scientific trials demonstrate that integrated pollination management strengthens both bee immunity and agricultural resilience.

Questions 1–4
Reading Passage 1 has four paragraphs, A–D.
Choose the correct heading for each paragraph from the list of headings below.
Write the correct number, i–vi, in boxes 1–4 on your answer sheet.

List of Headings
i. The immense economic contribution of pollinators to food crops
ii. Practical agricultural methods for restoring pollinator populations
iii. The communicative mechanisms and navigation of worker bees
iv. Severe threats and environmental drivers of pollinator decline
v. The evolutionary divergence between wild and managed species
vi. Technological innovations in automated robotic pollination

1. Paragraph A
2. Paragraph B
3. Paragraph C
4. Paragraph D

Questions 5–8
Do the following statements agree with the information given in Reading Passage 1?
In boxes 5–8 on your answer sheet, write
TRUE if the statement agrees with the information
FALSE if the statement contradicts the information
NOT GIVEN if there is no information on this

5. Worker bees use the waggle dance to convey information regarding nectar locations to other colony members.
6. More than fifty percent of the world's basic food crops require animal pollination for seed germination.
7. Monoculture agriculture provides continuous and abundant nutritional sustenance for wild bees throughout the year.
8. Integrated pollination management strategies have demonstrated measurable improvements in bee immunity.

Questions 9–13
Complete the table below.
Choose NO MORE THAN TWO WORDS from the passage for each answer.
Write your answers in boxes 9–13 on your answer sheet.

SUMMARY OF BEE CONSERVATION INITIATIVES
Action Undertaken | Target Problem Addressed | Expected Long-Term Benefit
Planting wildflower strips | Creating vital 9. _______ along field edges | Enhanced biodiversity
Eliminating synthetic pesticides | Alleviating widespread 10. _______ in colonies | Reduced toxicity
Restoring diverse floral margins | Overcoming nutritional 11. _______ in monocultures | Balanced bee diet
Conducting scientific trials | Evaluating integrated 12. _______ systems | Improved colony health
Strengthening bee immune response | Promoting overall 13. _______ against diseases | Resilient ecosystem
`;

  const parsedReading = await parseIeltsExamContent({
    title: "IELTS Academic Reading Test: Honeybee Ecology",
    skill: "READING",
    durationMinutes: 20,
    audioUrl: null,
    excelAnswersRaw: "",
    pdfTextRaw: readingExamText,
  });

  // CHỈ SỐ 1: TỶ LỆ CÂU HỎI BÓC TÁCH ĐƯỢC
  const qList = parsedReading.questions;
  const totalExpected = 13;
  const actualCount = qList.length;
  const extractionRate = (actualCount / totalExpected) * 100;
  console.log(`  -> [CHỈ SỐ 1] Tỷ lệ câu hỏi bóc tách: ${actualCount}/${totalExpected} (${extractionRate.toFixed(1)}%)`);
  assert(actualCount === 13, "Bóc tách trọn vẹn đủ 13/13 câu hỏi", `Thực tế: ${actualCount}`);

  // CHỈ SỐ 2: BẢO TOÀN BÀI ĐỌC CỘT 1 (Passage Text Preservation)
  const passage = parsedReading.passageText;
  const containsTitle = passage.includes("The Secret Life of Bees");
  const containsParaA = passage.includes("Honeybees are among the most remarkable");
  const containsParaD = passage.includes("integrated pollination management strengthens");
  const doesNotLeakQuestions = !passage.includes("Questions 5–8") && !passage.includes("SUMMARY OF BEE CONSERVATION");
  console.log(`  -> [CHỈ SỐ 2] Khả năng bảo toàn bài đọc Cột 1: độ dài ${passage.length} ký tự, không bị dính câu hỏi`);
  assert(containsTitle && containsParaA && containsParaD, "Cột 1 chứa đủ tiêu đề và toàn bộ các đoạn văn A, B, C, D");
  assert(doesNotLeakQuestions, "Cột 1 kết thúc chuẩn xác trước mốc câu hỏi đầu tiên (không nuốt câu hỏi vào bài đọc)");

  // CHỈ SỐ 3: TÍNH LIÊN TỤC VÀ BẤT BIẾN SƯ PHẠM (Invariants 1->N)
  const inv = parsedReading.invariantsReport;
  console.log(`  -> [CHỈ SỐ 3] Tính liên tục số thứ tự câu hỏi: sequential=${inv.isSequential}, missing=[${inv.missingNumbers.join()}], dup=[${inv.duplicateNumbers.join()}]`);
  assert(inv.isSequential, "Bất biến tính liên tục đạt chuẩn: 1 -> 13 không nhảy cóc");
  assert(inv.missingNumbers.length === 0, "Không có câu hỏi nào bị sót trong dải 1-13");
  assert(inv.duplicateNumbers.length === 0, "Không có số câu hỏi nào bị trùng lặp");

  // Kiểm tra tính chính xác của từng nhóm câu hỏi
  const q1 = qList.find((q) => q.questionNumber === 1);
  const q5 = qList.find((q) => q.questionNumber === 5);
  const q9 = qList.find((q) => q.questionNumber === 9);

  assert(Boolean(q1 && (q1.type === "MATCHING_HEADINGS" || q1.prompt.includes("Paragraph A"))), "Câu 1 nhận diện đúng dạng Matching Headings");
  assert(Boolean(q5 && q5.type === "TRUE_FALSE_NG"), "Câu 5 nhận diện đúng dạng TRUE_FALSE_NG");
  assert(Boolean(q9 && q9.type === "FILL_IN_BLANK" && q9.prompt.includes("_______")), "Câu 9 nhận diện đúng dạng FILL_IN_BLANK kèm chỗ trống chuẩn hóa");

  // ---------------------------------------------------------------------------
  // NHÓM 3: KIỂM CHỨNG ĐỀ THI LISTENING (FORM COMPLETION + MCQ)
  // ---------------------------------------------------------------------------
  console.log("\n--- NHÓM 3: Đề thi Listening mẫu từ Handout ---");

  const listeningExamText = `
MINDSET FOR IELTS - UNIT 1: EDUCATION & SOCIETY
PART 1: IELTS LISTENING SECTION 1 (Track 01)
Questions 1-5: Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.
1. Student Full Name: ........................................................
2. Preferred Course Level: .................................................
3. Current IELTS Band Score: .............................................
4. Available Study Days: ...................... and .......................
5. Contact Phone Number: ..................................................

PART 3: LISTENING SECTION 2 (Track 02)
Questions 6-8: Choose the correct letter, A, B, or C.
6. The main library building was renovated in:
A. 2018
B. 2021
C. 2024
7. Students can borrow reference books for up to:
A. 3 days
B. 7 days
C. 14 days
8. The self-study audio lab closes on weekdays at:
A. 6:00 PM
B. 8:30 PM
C. 10:00 PM
`;

  const parsedListening = await parseIeltsExamContent({
    title: "IELTS Listening Unit 1 Handout",
    skill: "LISTENING",
    durationMinutes: 30,
    audioUrl: "https://example.com/audio.mp3",
    excelAnswersRaw: "",
    pdfTextRaw: listeningExamText,
  });

  assert(parsedListening.questions.length === 8, "Bóc tách đầy đủ 8 câu Listening trong đề", `Thực tế: ${parsedListening.questions.length}`);
  const q6 = parsedListening.questions.find((q) => q.questionNumber === 6);
  assert(Boolean(q6 && q6.type === "MULTIPLE_CHOICE"), "Câu 6 là Multiple Choice");
  assert(Boolean(q6 && q6.options && q6.options.length === 3), "Câu 6 có đúng 3 phương án A, B, C", `Số phương án: ${q6?.options?.length}`);
  assert(Boolean(q6 && q6.options?.[0].content.includes("2018")), "Phương án A của câu 6 chứa nội dung '2018'");

  // Kiểm tra làm sạch prompt chỗ trống
  const q1Listen = parsedListening.questions.find((q) => q.questionNumber === 1);
  assert(Boolean(q1Listen && q1Listen.prompt.includes("_______") && !q1Listen.prompt.includes(".....")), "Chỗ trống câu 1 được chuẩn hóa từ '.....' sang '_______'");

  // ---------------------------------------------------------------------------
  // NHÓM 4: ADVERSARIAL STRESS-TESTS & BIÊN GIỚI BẢO MẬT/CHẤT LƯỢNG
  // ---------------------------------------------------------------------------
  console.log("\n--- NHÓM 4: Thử thách áp lực (Adversarial Stress-Testing) & Phòng thủ lỗi ---");

  // 4.1 Chống nuốt câu chỉ dẫn (Instruction Contamination)
  const instructionsToTest = [
    "Choose the correct letter, A, B or C.",
    "Do the following statements agree with the information given in Reading Passage 1?",
    "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    "Give TWO examples of the following categories from the passage.",
    "Choose TWO letters, A-E. Which two factors are mentioned?",
    "In boxes 1-5 on your answer sheet, write TRUE, FALSE or NOT GIVEN.",
  ];

  let rejectedInstructions = 0;
  for (const inst of instructionsToTest) {
    const v = validateQuestion({
      questionNumber: 1,
      prompt: inst,
      type: "FILL_IN_BLANK",
      points: 1,
      correctAnswer: "",
      explanation: "",
      options: [],
    });
    if (!v.isValid && v.reasons.some((r) => r.includes("prompt_la_cau_chi_dan"))) {
      rejectedInstructions++;
    }
  }
  assert(rejectedInstructions === instructionsToTest.length, "Chặn 100% các câu chỉ dẫn đề bài không cho lọt vào câu hỏi", `${rejectedInstructions}/${instructionsToTest.length}`);

  // 4.2 Chống lọt nhãn Placeholder tự sinh
  const placeholdersToTest = ["Câu hỏi số 1", "Question 15.", "Câu 30:", "question 4"];
  let rejectedPlaceholders = 0;
  for (const ph of placeholdersToTest) {
    const v = validateQuestion({
      questionNumber: 1,
      prompt: ph,
      type: "FILL_IN_BLANK",
      points: 1,
      correctAnswer: "",
      explanation: "",
      options: [],
    });
    if (!v.isValid && v.reasons.some((r) => r.includes("prompt_placeholder"))) {
      rejectedPlaceholders++;
    }
  }
  assert(rejectedPlaceholders === placeholdersToTest.length, "Chặn 100% các nhãn placeholder tự sinh không có nội dung", `${rejectedPlaceholders}/${placeholdersToTest.length}`);

  // 4.3 Độ bao hàm từ vựng (calculateWordContainment >= 85%)
  const groupSkeletonMock = {
    id: "g-test-36-40",
    partIndex: 0,
    groupIndex: 0,
    rawHeader: "Questions 36-40",
    title: "Questions 36-40",
    startNum: 36,
    endNum: 40,
    expectedNumbers: [36, 37, 38, 39, 40],
    kind: "FILL_IN_BLANK" as const,
    instruction: "Give TWO examples of the following categories. Choose NO MORE THAN TWO WORDS from the passage for each example.",
    hasImageOrTable: false,
  };

  const containmentTest = validateQuestion(
    {
      questionNumber: 36,
      prompt: "Give TWO examples of the following categories.",
      type: "FILL_IN_BLANK",
      points: 1,
      correctAnswer: "",
      explanation: "",
      options: [],
    },
    groupSkeletonMock
  );
  assert(!containmentTest.isValid, "Thuật toán Word Containment chặn trích đoạn instruction trùng với câu chỉ dẫn nhóm", containmentTest.reasons.join(", "));

  // 4.4 Khử số thứ tự thừa dính sát chỗ trống (cleanPromptRedundantNumbers)
  const dirtyPrompts = [
    { in: "want 23 _______ payback", qNum: 23, exp: "want _______ payback" },
    { in: "- can cause lack of 22 _______", qNum: 22, exp: "- can cause lack of _______" },
    { in: "20 _______ set of words", qNum: 20, exp: "_______ set of words" },
    { in: "Red wines use (5) ........... in fermentation.", qNum: 5, exp: "Red wines use _______ in fermentation." },
    { in: "23. The greatest advantage of Mars is that it has minerals.", qNum: 23, exp: "The greatest advantage of Mars is that it has minerals." },
  ];
  let cleanedCount = 0;
  for (const item of dirtyPrompts) {
    const res = cleanPromptRedundantNumbers(item.in, item.qNum);
    if (res === item.exp) cleanedCount++;
    else console.warn(`Clean mismatch: "${res}" !== "${item.exp}"`);
  }
  assert(cleanedCount === dirtyPrompts.length, "cleanPromptRedundantNumbers khử sạch 100% các số thừa cạnh chỗ trống", `${cleanedCount}/${dirtyPrompts.length}`);

  // 4.5 Nhận diện khuyết câu (Coverage Gap) trong đề có ảnh scan và tích hợp vào Invariants Report
  const partialText = `
Questions 27-30
Do the following statements agree with the information given in Reading Passage 1?
27. The advantage of Mars is minerals.
28. Settlement of the moon is expensive.
29. Water on Mars is accessible.
30. Radiation levels are manageable.

Questions 31-35
Complete the table below. Choose NO MORE THAN TWO WORDS from the passage for each answer.

Questions 36-40
Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.
`;
  const sk = buildExamSkeleton(partialText);
  const issues = checkGroupCoverage(sk.allGroups, [27, 28, 29, 30], "Phần 1");
  assert(issues.length === 2, "checkGroupCoverage nhận diện đúng 2 nhóm câu bị khuyết nội dung (31-35 và 36-40)");
  assert(issues[0].gap.missingNumbers.join() === "31,32,33,34,35", "Khoanh vùng chính xác 5 số câu thiếu của bảng 31-35");

  // Chạy qua parseIeltsExamContent để xác nhận warnings/invariantsReport.errors nhận cảnh báo tiếng Việt
  const parsedGapExam = await parseIeltsExamContent({
    title: "Exam with missing table",
    skill: "READING",
    durationMinutes: 20,
    audioUrl: null,
    excelAnswersRaw: "",
    pdfTextRaw: partialText,
  });
  const invGap = parsedGapExam.invariantsReport;
  assert(Boolean(invGap && !invGap.isValid), "invariantsReport đánh dấu không hợp lệ (isValid=false) khi phát hiện thiếu nhóm câu");
  assert(Boolean(invGap && invGap.errors.some((e: string) => e.includes("31-35") && e.includes("chưa đọc được nội dung"))), "Cảnh báo thiếu câu 31-35 xuất hiện rõ ràng trên invariantsReport.errors");


  // 4.6 Bảo toàn đoạn mở đầu Cambridge (Cambridge Preamble >= 400 ký tự)
  const longPreamble = "This is a detailed Cambridge introduction explaining the test structure and conditions for candidates taking the official examination. ".repeat(4);
  assert(longPreamble.length >= 400, "Đoạn preamble dài hơn 400 ký tự");
  const fullCambridgeText = `${longPreamble}\nSECTION 1  Questions 1-10\nYou will hear a conversation.\n1  Name: _______\n2  Date: _______\nSECTION 2  Questions 11-20\nYou will hear a talk.\n11  Topic: _______\n`;
  const cambridgeParts = splitIntoExamParts(fullCambridgeText);
  assert(cambridgeParts.length === 3, "splitIntoExamParts tách chuẩn 3 phần (Preamble cứu được + 2 Section Listening)", `Parts: ${cambridgeParts.length}`);
  assert(cambridgeParts[0].content.includes(longPreamble.slice(0, 100)), "Đoạn mở đầu Cambridge (preamble) được cứu giữ lại thành Part riêng thay vì bị vứt bỏ");
  assert(cambridgeParts[1].title.includes("SECTION 1"), "Section 1 được phân tách nguyên vẹn làm Part tiếp theo");


  console.log("\n================================================================================");
  console.log(`KẾT QUẢ TỔNG HỢP: ${passedTests}/${totalTests} TIÊU CHÍ ĐẠT (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  if (failedTests === 0) {
    console.log("KẾT LUẬN THỰC NGHIỆM: CONFIRMED CORRECT (HỆ THỐNG ĐẠT CHUẨN 100%)");
  } else {
    console.log(`KẾT LUẬN THỰC NGHIỆM: FAILED (${failedTests} TIÊU CHÍ THẤT BẠI)`);
  }
  console.log("================================================================================\n");

  process.exit(failedTests === 0 ? 0 : 1);
}

runEmpiricalHarness().catch((err) => {
  console.error("Lỗi nghiêm trọng khi thực thi kịch bản:", err);
  process.exit(1);
});
