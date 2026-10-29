export {
  createAssignmentService,
  updateAssignmentService,
  deleteAssignmentService,
} from "./assignment-mutation.service";
export type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "./assignment-mutation.service";
export {
  regradeAssignmentSubmissionsService,
} from "./assignment-regrade.service";

import { prisma, isDbAlive } from "@/lib/prisma";
import { isAnswerCorrect, isObjectiveOnly as allObjective, isObjectiveType } from "@/lib/grading";
import {
  calculateCriteriaBand,
  estimateAcademicBand,
  buildWordTokensFromRawText,
} from "@/lib/ielts-report-config";
import { resolveIeltsQuestionType } from "./assignment-mutation.service";

const DEMO_STORE_VERSION = "v2026-reports-v3";

const globalAssignmentsStore = globalThis as unknown as {
  demoAssignments?: any[];
  demoAssignmentsVersion?: string;
};

if (
  !globalAssignmentsStore.demoAssignments ||
  globalAssignmentsStore.demoAssignmentsVersion !== DEMO_STORE_VERSION
) {
  globalAssignmentsStore.demoAssignmentsVersion = DEMO_STORE_VERSION;
  const nowMs = Date.now();
  const teaPassage =
    "READING PASSAGE: THE HISTORY OF TEA CULTURE\n\nParagraph A: According to Chinese legend, tea was first discovered in 2737 BC by Emperor Shennong, a renowned herbalist and scholar. While boiling drinking water in the shade of a wild tea tree, a light breeze blew a few leaves into the pot, infusing the water with a delicate aroma and refreshing flavour.\n\nParagraph B: During the Han dynasty (202 BC – 220 AD), tea was primarily used as a medicinal concoction by royal physicians and Daoist monks to promote alertness and aid digestion. It was not until the Tang dynasty that tea drinking evolved into a widespread cultural art form across East Asia.\n\nParagraph C: In the 17th century, Dutch and Portuguese merchants introduced tea to Europe, where it quickly became a status symbol among the aristocracy in Britain and France.";

  const buildSeedAnnotation = (
    fullText: string,
    quote: string,
    meta: {
      id: string;
      type: "comment" | "delete" | "replace" | "insert";
      criterion: string;
      text: string;
      timestampSec?: number | null;
    }
  ) => {
    const startOffset = Math.max(0, fullText.indexOf(quote));
    return {
      id: meta.id,
      startOffset,
      endOffset: startOffset + quote.length,
      quote,
      type: meta.type,
      criterion: meta.criterion,
      text: meta.text,
      timestampSec: meta.timestampSec ?? null,
    };
  };

  const anSpokenRaw =
    "Well, I would like to talk about my laptop which I bought two years ago. Um, it is a very useful device for my studies. I use it almost every day, mostly for writing essays and doing research. Actually, it helps me to save a lot of time because I can find information quickly. In addition, I also use it to watch online lessons and practice my listening. I think technology is very important for students nowadays.";
  const sampleSpeakingTranscriptAn = {
    rawText: anSpokenRaw,
    words: buildWordTokensFromRawText(anSpokenRaw, 32),
    durationSec: 32,
    isVisibleToStudent: true,
    generatedAt: new Date(Date.now() - 86400000).toISOString(),
  };
  const anTask1Essay =
    "The provided table illustrates the percentage of city dwellers across four Asian nations from 1970 to 2020, alongside forecasts for 2040. Overall, all four countries experienced a steady upward trajectory in urbanization, with Malaysia recording the highest urban ratio throughout the period.";
  const anTask2Essay =
    "Over the past few decades, rural-to-urban migration among young adults has accelerated dramatically. This essay argues that while metropolitan centers offer superior educational and career prospects, the resulting pressure on urban infrastructure requires balanced regional policies.";
  const lanTask1Essay =
    "The table compares the urban population percentages in four Asian countries between 1970 and 2040. Overall, urbanization increased significantly in all surveyed nations, especially in Malaysia and Indonesia where more than two-thirds of citizens will reside in cities by 2040.";
  const lanTask2Essay =
    "Nowadays, an increasing number of young people choose to relocate from the countryside to major metropolitan areas. The primary drivers are prestigious universities and higher-paying jobs in the technology and service sectors. Despite traffic congestion and high living costs, I believe the long-term career benefits is more important than the drawbacks.";

  globalAssignmentsStore.demoAssignments = [
    {
      id: "demo-assign-1",
      classId: "demo-class-1",
      title: "IELTS Reading Practice: The History of Tea Culture",
      description: "Đọc bài khóa học thuật và hoàn thành 4 câu hỏi thuộc các dạng MCQ, True/False/Not Given và Summary Completion.",
      skill: "READING",
      type: "HOMEWORK",
      durationMinutes: 45,
      dueDate: new Date(nowMs + 7 * 86400000).toISOString(),
      startDate: new Date(nowMs - 6 * 86400000).toISOString(),
      maxAttempts: 2,
      audioUrl: null,
      enableProctoring: true,
      maxTabSwitches: 3,
      passingScore: 5.0,
      createdById: "demo-staff-1",
      totalPoints: 4,
      submittedCount: 3,
      flaggedCount: 1,
      isActive: true,
      questions: [
        {
          id: "q-r1",
          questionNumber: 1,
          questionType: "MULTIPLE_CHOICE",
          type: "MULTIPLE_CHOICE",
          ieltsQuestionType: "READING_MCQ",
          groupTitle: "Questions 1–2 (Multiple Choice)",
          passageText: teaPassage,
          prompt: "Where was tea first discovered according to Chinese legend?",
          points: 1,
          correctAnswer: "B",
          explanation:
            "Đoạn A nêu rõ: 'While boiling drinking water in the shade of a wild tea tree, a light breeze blew a few leaves into the pot...' (Khi Hoàng đế Thần Nông đang đun nước dưới bóng cây trà dại, lá trà bay vào nồi nước).",
          options: [
            { id: "opt-1", optionLabel: "A", content: "In an ancient forest in Yunnan", isCorrect: false },
            { id: "opt-2", optionLabel: "B", content: "Under Emperor Shennong's boiling water", isCorrect: true },
            { id: "opt-3", optionLabel: "C", content: "By Buddhist monks during meditation", isCorrect: false },
            { id: "opt-4", optionLabel: "D", content: "Along the Silk Road trade route", isCorrect: false },
          ],
        },
        {
          id: "q-r2",
          questionNumber: 2,
          questionType: "MULTIPLE_CHOICE",
          type: "MULTIPLE_CHOICE",
          ieltsQuestionType: "READING_MCQ",
          groupTitle: "Questions 1–2 (Multiple Choice)",
          passageText: teaPassage,
          prompt: "What was tea primarily used for during the Han dynasty?",
          points: 1,
          correctAnswer: "A",
          explanation:
            "Đoạn B khẳng định: 'During the Han dynasty (202 BC – 220 AD), tea was primarily used as a medicinal concoction by royal physicians and Daoist monks' (Trà chủ yếu được dùng làm thuốc thảo dược).",
          options: [
            { id: "opt-21", optionLabel: "A", content: "As a medicinal concoction", isCorrect: true },
            { id: "opt-22", optionLabel: "B", content: "As a daily breakfast beverage", isCorrect: false },
            { id: "opt-23", optionLabel: "C", content: "As religious offering only", isCorrect: false },
            { id: "opt-24", optionLabel: "D", content: "As currency in foreign trade", isCorrect: false },
          ],
        },
        {
          id: "q-r3",
          questionNumber: 3,
          questionType: "TRUE_FALSE_NOT_GIVEN",
          type: "TRUE_FALSE_NOT_GIVEN",
          ieltsQuestionType: "READING_TFNG",
          groupTitle: "Question 3 (True / False / Not Given)",
          passageText: teaPassage,
          prompt: "Tea drinking became a popular cultural art form across East Asia during the Han dynasty.",
          points: 1,
          correctAnswer: "FALSE",
          explanation:
            "Đoạn B ghi: 'It was not until the Tang dynasty that tea drinking evolved into a widespread cultural art form across East Asia' (Mãi đến thời nhà Đường trà mới trở thành nghệ thuật văn hóa phổ biến, không phải thời nhà Hán → FALSE).",
          options: [],
        },
        {
          id: "q-r4",
          questionNumber: 4,
          questionType: "GAP_FILL",
          type: "GAP_FILL",
          ieltsQuestionType: "READING_SUMMARY_COMPLETION",
          groupTitle: "Question 4 (Summary Completion)",
          passageText: teaPassage,
          prompt: "In the 17th century, tea was introduced to Europe by Dutch and Portuguese ________.",
          points: 1,
          correctAnswer: "merchants",
          explanation:
            "Đoạn C ghi: 'In the 17th century, Dutch and Portuguese merchants introduced tea to Europe' → Từ cần điền vào chỗ trống là 'merchants'.",
          options: [],
        },
      ],
      submissions: [
        {
          id: "sub-r-an-1",
          assignmentId: "demo-assign-1",
          classId: "demo-class-1",
          studentId: "demo-student-1",
          studentName: "Nguyễn Văn An",
          studentEmail: "student@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 3,
          totalPoints: 4,
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 4 * 86400000).toISOString(),
          answers: [
            { id: "ans-ra1-1", questionId: "q-r1", studentAnswer: "B", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-ra1-2", questionId: "q-r2", studentAnswer: "A", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-ra1-3", questionId: "q-r3", studentAnswer: "TRUE", isCorrect: false, awardedPoints: 0, criteriaScores: [] },
            { id: "ans-ra1-4", questionId: "q-r4", studentAnswer: "merchants", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
          ],
        },
        {
          id: "sub-r-an-2",
          assignmentId: "demo-assign-1",
          classId: "demo-class-1",
          studentId: "demo-student-1",
          studentName: "Nguyễn Văn An",
          studentEmail: "student@simpace.vn",
          attemptNumber: 2,
          status: "GRADED",
          score: 4,
          totalPoints: 4,
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 3 * 86400000).toISOString(),
          answers: [
            { id: "ans-ra2-1", questionId: "q-r1", studentAnswer: "B", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-ra2-2", questionId: "q-r2", studentAnswer: "A", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-ra2-3", questionId: "q-r3", studentAnswer: "FALSE", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-ra2-4", questionId: "q-r4", studentAnswer: "merchants", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
          ],
        },
        {
          id: "sub-r-lan",
          assignmentId: "demo-assign-1",
          classId: "demo-class-1",
          studentId: "st-1",
          studentName: "Trần Thị Lan",
          studentEmail: "hv001@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 3,
          totalPoints: 4,
          tabSwitchCount: 1,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 3 * 86400000).toISOString(),
          answers: [
            { id: "ans-rl-1", questionId: "q-r1", studentAnswer: "B", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-rl-2", questionId: "q-r2", studentAnswer: "A", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-rl-3", questionId: "q-r3", studentAnswer: "FALSE", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-rl-4", questionId: "q-r4", studentAnswer: "traders", isCorrect: false, awardedPoints: 0, criteriaScores: [] },
          ],
        },
        {
          id: "sub-r-long",
          assignmentId: "demo-assign-1",
          classId: "demo-class-1",
          studentId: "st-2",
          studentName: "Lê Hoàng Long",
          studentEmail: "hv002@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 1,
          totalPoints: 4,
          tabSwitchCount: 4,
          isCheatingFlagged: true,
          autoSubmittedReason: "VIOLATED_TAB_SWITCH_LIMIT",
          submittedAt: new Date(nowMs - 2 * 86400000).toISOString(),
          answers: [
            { id: "ans-rlg-1", questionId: "q-r1", studentAnswer: "B", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-rlg-2", questionId: "q-r2", studentAnswer: "C", isCorrect: false, awardedPoints: 0, criteriaScores: [] },
            { id: "ans-rlg-3", questionId: "q-r3", studentAnswer: "TRUE", isCorrect: false, awardedPoints: 0, criteriaScores: [] },
            { id: "ans-rlg-4", questionId: "q-r4", studentAnswer: "sailors", isCorrect: false, awardedPoints: 0, criteriaScores: [] },
          ],
        },
      ],
    },
    {
      id: "demo-assign-2",
      classId: "demo-class-1",
      title: "IELTS Listening Practice: Campus Accommodation & Library Tour",
      description: "Nghe audio và hoàn thành 3 câu hỏi Form Completion, Multiple Choice & Map Labeling.",
      skill: "LISTENING",
      type: "QUIZ",
      durationMinutes: 30,
      dueDate: new Date(nowMs - 2 * 86400000).toISOString(),
      startDate: new Date(nowMs - 7 * 86400000).toISOString(),
      maxAttempts: 2,
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      enableProctoring: true,
      maxTabSwitches: 3,
      passingScore: 6.0,
      createdById: "demo-staff-1",
      totalPoints: 3,
      submittedCount: 2,
      flaggedCount: 0,
      isActive: true,
      questions: [
        {
          id: "q-l1",
          questionNumber: 1,
          questionType: "GAP_FILL",
          type: "GAP_FILL",
          ieltsQuestionType: "LISTENING_FORM_NOTE_TABLE",
          groupTitle: "Question 1 (Form Completion)",
          passageText: "SECTION 1: Student Accommodation Application Form",
          prompt: "Preferred room type: Single ________ room with balcony.",
          points: 1,
          correctAnswer: "ensuite",
          explanation:
            "Trong băng nghe (00:42), sinh viên nói: 'I would prefer a single ensuite room with a small balcony overlooking the courtyard' → Điền 'ensuite'.",
          options: [],
        },
        {
          id: "q-l2",
          questionNumber: 2,
          questionType: "MULTIPLE_CHOICE",
          type: "MULTIPLE_CHOICE",
          ieltsQuestionType: "LISTENING_MCQ",
          groupTitle: "Question 2 (Multiple Choice)",
          passageText: "SECTION 2: University Library Orientation",
          prompt: "Which floor of the library is reserved for silent postgraduate study?",
          points: 1,
          correctAnswer: "C",
          explanation:
            "Thủ thư giải thích (01:55): 'While the Second Floor allows group discussion, the entire Fourth Floor is strictly designated for silent postgraduate research' → Chọn C.",
          options: [
            { id: "opt-l1", optionLabel: "A", content: "Ground Floor", isCorrect: false },
            { id: "opt-l2", optionLabel: "B", content: "Second Floor", isCorrect: false },
            { id: "opt-l3", optionLabel: "C", content: "Fourth Floor", isCorrect: true },
          ],
        },
        {
          id: "q-l3",
          questionNumber: 3,
          questionType: "GAP_FILL",
          type: "GAP_FILL",
          ieltsQuestionType: "LISTENING_MAP_PLAN_DIAGRAM",
          groupTitle: "Question 3 (Map Labeling)",
          passageText: "SECTION 2: Campus Map Labeling",
          prompt: "The Multimedia Lab is located next to the Main ________.",
          points: 1,
          correctAnswer: "Auditorium",
          explanation:
            "Hướng dẫn viên chỉ trên sơ đồ (02:38): 'Walk past the cafeteria, and you will see the Multimedia Lab right beside the Main Auditorium' → Điền 'Auditorium'.",
          options: [],
        },
      ],
      submissions: [
        {
          id: "sub-l-an",
          assignmentId: "demo-assign-2",
          classId: "demo-class-1",
          studentId: "demo-student-1",
          studentName: "Nguyễn Văn An",
          studentEmail: "student@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 3,
          totalPoints: 3,
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 2 * 86400000).toISOString(),
          answers: [
            { id: "ans-la-1", questionId: "q-l1", studentAnswer: "ensuite", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-la-2", questionId: "q-l2", studentAnswer: "C", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-la-3", questionId: "q-l3", studentAnswer: "Auditorium", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
          ],
        },
        {
          id: "sub-l-lan",
          assignmentId: "demo-assign-2",
          classId: "demo-class-1",
          studentId: "st-1",
          studentName: "Trần Thị Lan",
          studentEmail: "hv001@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 2,
          totalPoints: 3,
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 2 * 86400000).toISOString(),
          answers: [
            { id: "ans-ll-1", questionId: "q-l1", studentAnswer: "ensuite", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-ll-2", questionId: "q-l2", studentAnswer: "C", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-ll-3", questionId: "q-l3", studentAnswer: "Cafeteria", isCorrect: false, awardedPoints: 0, criteriaScores: [] },
          ],
        },
      ],
    },
    {
      id: "demo-assign-3",
      classId: "demo-class-1",
      title: "IELTS Academic Writing Test: Task 1 & Task 2 (Urbanization)",
      description: "Bài thi Writing gồm Task 1 (150 từ) và Task 2 (250 từ). Chấm theo 4 tiêu chí chuẩn IELTS: TA/TR, CC, LR, GRA.",
      skill: "WRITING",
      type: "EXAM",
      durationMinutes: 60,
      dueDate: new Date(nowMs + 4 * 86400000).toISOString(),
      startDate: new Date(nowMs - 4 * 86400000).toISOString(),
      maxAttempts: 1,
      audioUrl: null,
      enableProctoring: true,
      maxTabSwitches: 3,
      passingScore: 6.0,
      createdById: "demo-staff-1",
      totalPoints: 18,
      submittedCount: 3,
      flaggedCount: 0,
      isActive: true,
      questions: [
        {
          id: "q-w1",
          questionNumber: 1,
          questionType: "ESSAY",
          type: "ESSAY",
          ieltsQuestionType: "WRITING_TASK_1",
          groupTitle: "Writing Task 1 (Report - 150 words)",
          passageText:
            "WRITING TASK 1:\nThe table below shows the proportion of the population living in urban areas in four Asian countries between 1970 and 2020, with projections for 2040.\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
          prompt: "Write at least 150 words summarizing the main trends in urban population growth.",
          points: 9,
          correctAnswer: null,
          options: [],
        },
        {
          id: "q-w2",
          questionNumber: 2,
          questionType: "ESSAY",
          type: "ESSAY",
          ieltsQuestionType: "WRITING_TASK_2",
          groupTitle: "Writing Task 2 (Essay - 250 words)",
          passageText:
            "WRITING TASK 2:\nIn many countries, young people are leaving rural areas to study and work in major cities.\nWhat are the reasons for this trend, and do the advantages outweigh the disadvantages?",
          prompt: "Write at least 250 words presenting your arguments and relevant examples.",
          points: 9,
          correctAnswer: null,
          options: [],
        },
      ],
      submissions: [
        {
          id: "sub-w-an",
          assignmentId: "demo-assign-3",
          classId: "demo-class-1",
          studentId: "demo-student-1",
          studentName: "Nguyễn Văn An",
          studentEmail: "student@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 13.5,
          totalPoints: 18,
          gradedById: "demo-staff-1",
          gradedAt: new Date(nowMs - 1 * 86400000).toISOString(),
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 2 * 86400000).toISOString(),
          feedback: "Bài viết mạch lạc, Task 2 lập luận chặt chẽ và dùng từ vựng học thuật tốt. Cần chú ý đa dạng hóa cấu trúc câu phức ở Task 1.",
          teacherFeedback:
            "Bài viết mạch lạc, Task 2 lập luận chặt chẽ và dùng từ vựng học thuật tốt. Cần chú ý đa dạng hóa cấu trúc câu phức và thêm số liệu đối chiếu cụ thể ở Task 1.",
          answers: [
            {
              id: "ans-wa-1",
              questionId: "q-w1",
              studentAnswer: anTask1Essay,
              isCorrect: true,
              awardedPoints: 6.5,
              teacherComment: "Bố cục Overview rõ ràng, số liệu đối chiếu chính xác.",
              criteriaScores: [
                {
                  criterion: "TA_TR",
                  criterionCode: "TA_TR",
                  score: 6.5,
                  bandScore: 6.5,
                  comment: "Trả lời đúng trọng tâm bảng số liệu, có đoạn Overview rõ xu hướng tăng của 4 quốc gia.",
                },
                {
                  criterion: "CC",
                  criterionCode: "CC",
                  score: 6.5,
                  bandScore: 6.5,
                  comment: "Sử dụng từ nối liên kết tốt ('Overall', 'alongside', 'with Malaysia recording...').",
                },
                {
                  criterion: "LR",
                  criterionCode: "LR",
                  score: 6.5,
                  bandScore: 6.5,
                  comment: "Paraphrase đề bài tốt ('city dwellers', 'steady upward trajectory').",
                },
                {
                  criterion: "GRA",
                  criterionCode: "GRA",
                  score: 6.5,
                  bandScore: 6.5,
                  comment: "Cấu trúc phân từ 'with + N + V-ing' dùng chính xác.",
                },
              ],
              gradingAnnotations: {
                annotations: [
                  buildSeedAnnotation(anTask1Essay, "Overall, all four countries", {
                    id: "ann-wa1-1",
                    type: "comment",
                    criterion: "TA_TR",
                    text: "Overview tốt, nêu bật được xu hướng chung của cả 4 quốc gia.",
                  }),
                  buildSeedAnnotation(anTask1Essay, "steady upward trajectory", {
                    id: "ann-wa1-2",
                    type: "comment",
                    criterion: "LR",
                    text: "Collocation học thuật rất đắt giá (Band 7.0+).",
                  }),
                  buildSeedAnnotation(anTask1Essay, "urban ratio", {
                    id: "ann-wa1-3",
                    type: "replace",
                    criterion: "LR",
                    text: "urbanization rate",
                  }),
                ],
              },
            },
            {
              id: "ans-wa-2",
              questionId: "q-w2",
              studentAnswer: anTask2Essay,
              isCorrect: true,
              awardedPoints: 7.0,
              teacherComment: "Luận điểm thuyết phục, từ vựng C1 phong phú.",
              criteriaScores: [
                {
                  criterion: "TA_TR",
                  criterionCode: "TA_TR",
                  score: 7.0,
                  bandScore: 7.0,
                  comment: "Nêu rõ nguyên nhân (giáo dục, nghề nghiệp) và lập trường cân bằng.",
                },
                {
                  criterion: "CC",
                  criterionCode: "CC",
                  score: 7.0,
                  bandScore: 7.0,
                  comment: "Mạch văn tự nhiên, chuyển ý mượt bằng mệnh đề nhượng bộ 'while...'.",
                },
                {
                  criterion: "LR",
                  criterionCode: "LR",
                  score: 7.5,
                  bandScore: 7.5,
                  comment: "Dùng từ vựng học thuật xuất sắc: 'rural-to-urban migration', 'accelerated dramatically'.",
                },
                {
                  criterion: "GRA",
                  criterionCode: "GRA",
                  score: 6.5,
                  bandScore: 6.5,
                  comment: "Câu phức đa dạng, không mắc lỗi ngữ pháp cơ bản.",
                },
              ],
              gradingAnnotations: {
                annotations: [
                  buildSeedAnnotation(anTask2Essay, "accelerated dramatically", {
                    id: "ann-wa2-1",
                    type: "comment",
                    criterion: "LR",
                    text: "Cụm động từ + trạng từ mức độ rất tự nhiên và học thuật.",
                  }),
                  buildSeedAnnotation(anTask2Essay, "while metropolitan centers", {
                    id: "ann-wa2-2",
                    type: "comment",
                    criterion: "CC",
                    text: "Cấu trúc câu ghép nhượng bộ mở đầu Thesis Statement rất mạch lạc.",
                  }),
                ],
              },
            },
          ],
        },
        {
          id: "sub-w-lan-pending",
          assignmentId: "demo-assign-3",
          classId: "demo-class-1",
          studentId: "st-1",
          studentName: "Trần Thị Lan",
          studentEmail: "hv001@simpace.vn",
          attemptNumber: 1,
          status: "SUBMITTED",
          score: null,
          totalPoints: 18,
          tabSwitchCount: 1,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 6 * 3600000).toISOString(),
          answers: [
            {
              id: "ans-wl-1",
              questionId: "q-w1",
              studentAnswer: lanTask1Essay,
              isCorrect: null,
              awardedPoints: null,
              criteriaScores: [],
              gradingAnnotations: {
                annotations: [
                  buildSeedAnnotation(lanTask1Essay, "Overall,", {
                    id: "ann-wl1-1",
                    type: "comment",
                    criterion: "TA_TR",
                    text: "Overview tốt, nhưng cần nêu rõ nước cao nhất / thấp nhất.",
                  }),
                  buildSeedAnnotation(lanTask1Essay, "increased significantly", {
                    id: "ann-wl1-2",
                    type: "comment",
                    criterion: "LR",
                    text: "Dùng tốt. Có thể nâng cấp: “rose markedly”.",
                  }),
                  buildSeedAnnotation(lanTask1Essay, "citizens will reside", {
                    id: "ann-wl1-3",
                    type: "replace",
                    criterion: "LR",
                    text: "residents will live",
                  }),
                ],
              },
            },
            {
              id: "ans-wl-2",
              questionId: "q-w2",
              studentAnswer: lanTask2Essay,
              isCorrect: null,
              awardedPoints: null,
              criteriaScores: [],
              gradingAnnotations: {
                annotations: [
                  buildSeedAnnotation(
                    lanTask2Essay,
                    "Despite traffic congestion and high living costs",
                    {
                      id: "ann-wl2-1",
                      type: "comment",
                      criterion: "CC",
                      text: "Câu mở đoạn nhượng bộ ổn; cần câu chốt ý rõ hơn ở cuối đoạn.",
                    }
                  ),
                  buildSeedAnnotation(lanTask2Essay, "is more important", {
                    id: "ann-wl2-2",
                    type: "replace",
                    criterion: "GRA",
                    text: "are more important",
                  }),
                ],
              },
            },
          ],
        },
        {
          id: "sub-w-long-pending",
          assignmentId: "demo-assign-3",
          classId: "demo-class-1",
          studentId: "st-2",
          studentName: "Lê Hoàng Long",
          studentEmail: "hv002@simpace.vn",
          attemptNumber: 1,
          status: "SUBMITTED",
          score: null,
          totalPoints: 18,
          tabSwitchCount: 2,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 3 * 3600000).toISOString(),
          answers: [
            {
              id: "ans-wlg-1",
              questionId: "q-w1",
              studentAnswer:
                "Looking at the chart, we can see that the number of people living in cities went up from 1970 to 2020 and will keep rising in 2040 in all four countries.",
              isCorrect: null,
              awardedPoints: null,
              criteriaScores: [],
            },
            {
              id: "ans-wlg-2",
              questionId: "q-w2",
              studentAnswer:
                "Many young people move to big cities because there are more jobs and modern hospitals. However, cities are becoming too crowded and polluted, so governments should invest more in rural areas.",
              isCorrect: null,
              awardedPoints: null,
              criteriaScores: [],
            },
          ],
        },
      ],
    },
    {
      id: "demo-assign-4",
      classId: "demo-class-1",
      title: "IELTS Speaking Mock Test: Part 2 & Part 3 (Technology in Education)",
      description: "Bài thi Speaking thu âm trực tiếp. Giáo viên chấm theo 4 tiêu chí chuẩn IELTS: FC, LR, GRA, P.",
      skill: "SPEAKING",
      type: "EXAM",
      durationMinutes: 15,
      dueDate: new Date(nowMs + 5 * 86400000).toISOString(),
      startDate: new Date(nowMs - 4 * 86400000).toISOString(),
      maxAttempts: 3,
      audioUrl: null,
      enableProctoring: false,
      maxTabSwitches: 3,
      passingScore: 6.0,
      createdById: "demo-staff-1",
      totalPoints: 9,
      submittedCount: 2,
      flaggedCount: 0,
      isActive: true,
      questions: [
        {
          id: "q-s1",
          questionNumber: 1,
          questionType: "SPEAKING_RECORD",
          type: "SPEAKING_RECORD",
          ieltsQuestionType: "SPEAKING_PART_2",
          groupTitle: "Speaking Part 2 (Cue Card - 2 minutes)",
          passageText:
            "SPEAKING PART 2 CUE CARD:\nDescribe a piece of technology (not a phone) that you find particularly useful for your studies.\nYou should say:\n- what it is and when you got it\n- how often you use it\n- what you use it for\nand explain why it helps you study effectively.",
          prompt: "Record a 2-minute talk describing this piece of technology and follow-up Part 3 discussion.",
          points: 9,
          correctAnswer: null,
          options: [],
        },
      ],
      submissions: [
        {
          id: "sub-s-an",
          assignmentId: "demo-assign-4",
          classId: "demo-class-1",
          studentId: "demo-student-1",
          studentName: "Nguyễn Văn An",
          studentEmail: "student@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 6.5,
          totalPoints: 9,
          gradedById: "demo-staff-1",
          gradedAt: new Date(nowMs - 1 * 86400000).toISOString(),
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 2 * 86400000).toISOString(),
          feedback: "Phát âm rõ ràng, trôi chảy, sử dụng tốt các cụm collocations về công nghệ giáo dục.",
          teacherFeedback:
            "Phát âm rõ ràng, trôi chảy, sử dụng tốt các cụm collocations về công nghệ giáo dục. Chú ý chia động từ ngôi thứ 3 số ít và danh từ số nhiều.",
          answers: [
            {
              id: "ans-sa-1",
              questionId: "q-s1",
              studentAnswer: "",
              audioUrl: "/uploads/speaking/speaking-an-part2.wav",
              isCorrect: true,
              awardedPoints: 6.5,
              teacherComment: "Fluency & Coherence đạt 6.5, phát âm có ngữ điệu tự nhiên.",
              criteriaScores: [
                {
                  criterion: "FC",
                  criterionCode: "FC",
                  score: 6.5,
                  bandScore: 6.5,
                  comment: "Trình bày mạch lạc, dùng từ nối 'Actually', 'In addition' tự nhiên; đôi chỗ còn ngập ngừng 'Um'.",
                },
                {
                  criterion: "LR",
                  criterionCode: "LR",
                  score: 6.5,
                  bandScore: 6.5,
                  comment: "Từ vựng phù hợp chủ đề học tập ('useful device', 'doing research', 'online lessons').",
                },
                {
                  criterion: "GRA",
                  criterionCode: "GRA",
                  score: 6.0,
                  bandScore: 6.0,
                  comment: "Có dùng mệnh đề quan hệ ('which I bought...'), cấu trúc câu đa dạng.",
                },
                {
                  criterion: "P",
                  criterionCode: "P",
                  score: 7.0,
                  bandScore: 7.0,
                  comment: "Phát âm rõ âm cuối, ngữ điệu nhấn nhá tự nhiên dễ nghe.",
                },
              ],
              gradingAnnotations: {
                speakingTranscript: sampleSpeakingTranscriptAn,
                annotations: [
                  buildSeedAnnotation(sampleSpeakingTranscriptAn.rawText, "bought", {
                    id: "ann-sa1-1",
                    type: "replace",
                    criterion: "LR",
                    text: "purchased",
                    timestampSec: 4.2,
                  }),
                  buildSeedAnnotation(sampleSpeakingTranscriptAn.rawText, "Um,", {
                    id: "ann-sa1-2",
                    type: "delete",
                    criterion: "FC",
                    text: "Từ đệm “Um” – ngập ngừng, ảnh hưởng độ trôi chảy.",
                    timestampSec: 6.1,
                  }),
                  buildSeedAnnotation(sampleSpeakingTranscriptAn.rawText, "save a lot of time", {
                    id: "ann-sa1-3",
                    type: "comment",
                    criterion: "LR",
                    text: "Cụm từ tự nhiên, có thể nâng cấp thành 'conserve considerable time'.",
                    timestampSec: 17.5,
                  }),
                ],
              },
            },
          ],
        },
        {
          id: "sub-s-lan-pending",
          assignmentId: "demo-assign-4",
          classId: "demo-class-1",
          studentId: "st-1",
          studentName: "Trần Thị Lan",
          studentEmail: "hv001@simpace.vn",
          attemptNumber: 1,
          status: "SUBMITTED",
          score: null,
          totalPoints: 9,
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 4 * 3600000).toISOString(),
          answers: [
            {
              id: "ans-sl-1",
              questionId: "q-s1",
              studentAnswer: "",
              audioUrl: "/uploads/speaking/speaking-lan-part2.wav",
              isCorrect: null,
              awardedPoints: null,
              criteriaScores: [],
            },
          ],
        },
      ],
    },
    {
      id: "demo-assign-5",
      classId: "demo-class-1",
      title: "IELTS Reading Intensive: Renewable Energy (Bài tập đã quá hạn)",
      description: "Bài tập đã qua hạn nộp để kiểm tra quy tắc khóa nút nộp bài (BR-05, BR-06) và cảnh báo học sinh quá hạn.",
      skill: "READING",
      type: "HOMEWORK",
      durationMinutes: 30,
      dueDate: new Date(nowMs - 2 * 86400000).toISOString(),
      startDate: new Date(nowMs - 10 * 86400000).toISOString(),
      maxAttempts: 1,
      audioUrl: null,
      enableProctoring: true,
      maxTabSwitches: 3,
      passingScore: 5.0,
      createdById: "demo-staff-1",
      totalPoints: 2,
      submittedCount: 1,
      flaggedCount: 0,
      isActive: true,
      questions: [
        {
          id: "q-ro1",
          questionNumber: 1,
          questionType: "TRUE_FALSE_NOT_GIVEN",
          type: "TRUE_FALSE_NOT_GIVEN",
          ieltsQuestionType: "READING_YES_NO_NG",
          groupTitle: "Questions 1–2",
          passageText: "Solar and wind power have grown exponentially over the last decade.",
          prompt: "Solar energy is currently cheaper than coal in every country worldwide.",
          points: 1,
          correctAnswer: "NOT GIVEN",
          explanation:
            "Bài đọc chỉ đề cập năng lượng mặt trời và gió tăng trưởng mạnh trong thập kỷ qua, hoàn toàn không có thông tin so sánh chi phí với than đá ở mọi quốc gia → NOT GIVEN.",
          options: [],
        },
        {
          id: "q-ro2",
          questionNumber: 2,
          questionType: "MULTIPLE_CHOICE",
          type: "MULTIPLE_CHOICE",
          ieltsQuestionType: "READING_MATCHING_HEADINGS",
          groupTitle: "Questions 1–2",
          passageText: "Solar and wind power have grown exponentially over the last decade.",
          prompt: "Choose the most suitable heading for the paragraph.",
          points: 1,
          correctAnswer: "A",
          explanation:
            "Cụm 'grown exponentially over the last decade' tương ứng trực tiếp với tiêu đề A: 'The rapid rise of clean energy'.",
          options: [
            { id: "opt-ro1", optionLabel: "A", content: "The rapid rise of clean energy", isCorrect: true },
            { id: "opt-ro2", optionLabel: "B", content: "The decline of hydroelectric dams", isCorrect: false },
          ],
        },
      ],
      submissions: [
        {
          id: "sub-ro-an",
          assignmentId: "demo-assign-5",
          classId: "demo-class-1",
          studentId: "demo-student-1",
          studentName: "Nguyễn Văn An",
          studentEmail: "student@simpace.vn",
          attemptNumber: 1,
          status: "GRADED",
          score: 2,
          totalPoints: 2,
          tabSwitchCount: 0,
          isCheatingFlagged: false,
          submittedAt: new Date(nowMs - 5 * 86400000).toISOString(),
          answers: [
            { id: "ans-roa-1", questionId: "q-ro1", studentAnswer: "NOT GIVEN", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
            { id: "ans-roa-2", questionId: "q-ro2", studentAnswer: "A", isCorrect: true, awardedPoints: 1, criteriaScores: [] },
          ],
        },
      ],
    },
  ];
}

export async function getClassAssignmentsService(classId: string, currentUserId?: string) {
  const now = new Date();

  if (!(await isDbAlive())) {
    const list = (globalAssignmentsStore.demoAssignments || []).filter(
      (a) =>
        a.isActive !== false &&
        (!classId ||
          a.classId === classId ||
          (Array.isArray(a.assignedClasses) &&
            a.assignedClasses.some((ac: any) => ac.classId === classId && ac.isActive !== false)))
    );
    const formatted = list.map((a) => {
      const classLink = (a.assignedClasses || []).find((ac: any) => ac.classId === classId);
      const dueDate = classLink?.dueDate || a.dueDate || null;
      const startDate = classLink?.startDate || a.startDate || a.createdAt || null;
      const isOverdue = Boolean(dueDate && new Date(dueDate) < now);
      const enableProctoring =
        classLink?.enableProctoring !== undefined ? classLink.enableProctoring : a.enableProctoring;
      const maxTabSwitches =
        classLink?.maxTabSwitches !== undefined ? classLink.maxTabSwitches : a.maxTabSwitches;
      const totalPoints = (a.questions || []).reduce(
        (sum: number, q: any) => sum + (Number(q.points) || 1),
        0
      );
      const classSubs = (a.submissions || []).filter(
        (s: any) => !classId || !s.classId || s.classId === classId
      );
      const submittedCount = classSubs.filter(
        (s: any) => s.status === "SUBMITTED" || s.status === "GRADED"
      ).length;
      const pendingGradingCount = classSubs.filter((s: any) => s.status === "SUBMITTED").length;
      const flaggedCount = classSubs.filter((s: any) => s.isCheatingFlagged).length;

      const mySubs = currentUserId
        ? classSubs.filter((s: any) => s.studentId === currentUserId)
        : [];
      // BR-09: Ưu tiên hiển thị lần có điểm cao nhất
      const bestSub =
        mySubs.length > 0
          ? [...mySubs].sort((x, y) => (Number(y.score) || -1) - (Number(x.score) || -1))[0]
          : null;
      const mySubmission = bestSub
        ? {
            id: bestSub.id,
            status: bestSub.status,
            score: bestSub.score,
            totalPoints: bestSub.totalPoints || totalPoints,
            submittedAt: bestSub.submittedAt,
            isCheatingFlagged: bestSub.isCheatingFlagged,
            attemptNumber: bestSub.attemptNumber || 1,
            estimatedBand: estimateAcademicBand(
              a.skill,
              Number(bestSub.score) || 0,
              (a.questions || []).length
            ),
          }
        : null;

      return {
        ...a,
        dueDate,
        startDate,
        isOverdue,
        maxAttempts: a.maxAttempts || 2,
        myAttemptCount: mySubs.length,
        enableProctoring,
        maxTabSwitches,
        questionCount: (a.questions || []).length,
        totalPoints,
        submittedCount,
        pendingGradingCount,
        flaggedCount,
        mySubmission,
        assignedClassCount: Array.isArray(a.assignedClasses)
          ? a.assignedClasses.filter((ac: any) => ac.isActive !== false).length
          : 1,
      };
    });
    return { success: true, assignments: formatted };
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      isActive: true,
      OR: [
        { classId },
        { assignedClasses: { some: { classId, isActive: true } } },
      ],
    },
    include: {
      assignedClasses: {
        where: { isActive: true },
        include: {
          class: { select: { id: true, name: true, code: true } },
        },
      },
      questions: {
        select: { id: true, points: true, ieltsQuestionType: true },
      },
      submissions: {
        where: {
          OR: [{ classId }, { classId: null }],
        },
        select: {
          id: true,
          studentId: true,
          attemptNumber: true,
          status: true,
          score: true,
          totalPoints: true,
          tabSwitchCount: true,
          isCheatingFlagged: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = assignments.map((a) => {
    const classLink = a.assignedClasses.find((ac) => ac.classId === classId);
    const totalPoints = a.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const submittedCount = a.submissions.filter(
      (s) => s.status === "SUBMITTED" || s.status === "GRADED"
    ).length;
    const pendingGradingCount = a.submissions.filter((s) => s.status === "SUBMITTED").length;
    const flaggedCount = a.submissions.filter((s) => s.isCheatingFlagged).length;

    const dueDateObj = classLink?.dueDate || a.dueDate || null;
    const startDateObj = classLink?.startDate || a.createdAt || null;
    const dueDate = dueDateObj ? dueDateObj.toISOString() : null;
    const startDate = startDateObj ? startDateObj.toISOString() : null;
    const isOverdue = Boolean(dueDateObj && dueDateObj < now);

    const enableProctoring =
      classLink?.enableProctoring !== undefined ? classLink.enableProctoring : a.enableProctoring;
    const maxTabSwitches =
      classLink?.maxTabSwitches !== undefined ? classLink.maxTabSwitches : a.maxTabSwitches;

    const mySubs = currentUserId
      ? a.submissions.filter((s) => s.studentId === currentUserId)
      : [];
    // BR-09: Lấy lần có điểm cao nhất làm đại diện KPI
    const bestSub =
      mySubs.length > 0
        ? [...mySubs].sort((x, y) => (Number(y.score) ?? -1) - (Number(x.score) ?? -1))[0]
        : null;
    const mySubmission = bestSub
      ? {
          id: bestSub.id,
          status: bestSub.status,
          score: bestSub.score,
          totalPoints: bestSub.totalPoints || totalPoints,
          submittedAt: bestSub.submittedAt ? bestSub.submittedAt.toISOString() : null,
          isCheatingFlagged: bestSub.isCheatingFlagged,
          attemptNumber: bestSub.attemptNumber,
          estimatedBand: estimateAcademicBand(
            a.skill,
            Number(bestSub.score) || 0,
            a.questions.length
          ),
        }
      : null;

    return {
      id: a.id,
      classId: classId || a.classId,
      originalClassId: a.classId,
      title: a.title,
      description: a.description,
      skill: a.skill,
      type: a.type,
      durationMinutes: a.durationMinutes,
      dueDate,
      startDate,
      isOverdue,
      maxAttempts: a.maxAttempts || 1,
      myAttemptCount: mySubs.length,
      audioUrl: a.audioUrl,
      enableProctoring,
      maxTabSwitches,
      questionCount: a.questions.length,
      totalPoints,
      submissionCount: a.submissions.length,
      submittedCount,
      pendingGradingCount,
      flaggedCount,
      mySubmission,
      assignedClassCount: Math.max(a.assignedClasses.length, 1),
      assignedClassNames: a.assignedClasses.map((ac) => ac.class.name),
      createdAt: a.createdAt.toISOString(),
    };
  });

  return { success: true, assignments: formatted };
}

function resolveLegacyShortPassageText(rawPassage?: string | null, assignmentTitle?: string): string | null | undefined {
  const txt = (rawPassage || "").trim();
  const titleCheck = `${txt} ${assignmentTitle || ""}`;

  if (txt.length < 60) {
    if (/Reading\s*Passage\s*1/i.test(titleCheck)) {
      return `Part 1 – Reading Passage 1\nUrban Beekeeping: Sweet Success or Sticky Problem?\n\nA. Once associated with meadows and orchards, beekeeping has in recent years found an unlikely home in the world's largest cities. Since 2007, the number of registered hives in London has roughly tripled, and similar growth has been recorded in Paris, New York and Berlin. Enthusiasts argue that cities are, in fact, kinder to bees than modern farmland.\n\nB. The reasons lie in the way agriculture has changed. Vast fields of a single crop, such as wheat or oilseed rape, provide food for only a few weeks each year, and the pesticides sprayed on them can weaken or kill colonies. City gardens, parks and street trees, by contrast, flower at different times from early spring to late autumn, giving bees a steady supply of nectar. Researchers have also found that honey from urban hives is often more varied in flavour than rural honey, reflecting the diversity of plants nearby.\n\nC. However, the boom has its critics. Some ecologists warn that there are now more honeybees in certain cities than the available flowers can support. Because honeybees are efficient foragers, they may outcompete wild pollinators such as bumblebees and hoverflies, many of which are already in decline. One conservation scientist compared keeping honeybees to save bees with keeping chickens to save wild birds.\n\nD. Supporters respond that urban beekeeping serves a different purpose. It rarely aims to rescue wild species; instead, it educates residents. Many schemes run workshops where office workers and children learn how pollination supports food production. Some companies have installed hives on their roofs as part of sustainability programmes. Organisers say participants become more likely to plant flowers and to avoid chemicals in their own gardens.\n\nE. Several cities are now trying to balance both views. Brussels, for example, has introduced guidelines limiting the number of hives in each area and encourages the planting of wildflower meadows on unused land. Early results suggest that this approach supports both honeybees and wild species, although researchers say more long-term data are needed.`;
    }
    if (/Reading\s*Passage\s*2/i.test(titleCheck)) {
      return `Part 2 – Reading Passage 2\nWhy Teenagers Struggle to Wake Up\n\nA. Anyone who has tried to wake a teenager for school knows the struggle. Scientists say the problem is not laziness but biology. During puberty, the body clock shifts so that melatonin, the hormone that signals sleepiness, is released roughly two hours later than in childhood. A fifteen-year-old who cannot fall asleep before midnight is therefore behaving normally, yet many schools expect that same student to be alert at 7.30 a.m.\n\nB. The consequences are well documented. Teenagers need between eight and ten hours of sleep, but surveys suggest that most get far less on school nights. Sleep-deprived students find it harder to concentrate and are more prone to low mood. Researchers also point out that sleep plays a part in memory consolidation, the process by which the brain turns new information into lasting knowledge. A student who sleeps too little may therefore forget much of what was taught that day.\n\nC. To test whether later starts help, researchers worked with eight secondary schools that moved the first lesson from 7.30 to 8.45 a.m. Pupils reported sleeping about an hour longer, fewer arrived late to first lessons, and teachers noted better participation in morning classes. Exam results rose modestly, though the researchers cautioned that other factors might have contributed.\n\nD. Not everyone is convinced. Critics argue that later starts disrupt bus timetables, force after-school sports to finish in darkness and complicate working parents' schedules. Some school leaders also fear that reorganising transport would fall on already tight budgets. Supporters reply that these are logistical problems rather than reasons to ignore the evidence, and several districts have found creative solutions, such as staggering start times between younger and older pupils.`;
    }
    if (/Writing\s*Task\s*2/i.test(titleCheck)) {
      return `Part 3 – Writing Task 2\nYou should spend about 40 minutes on this task. Write at least 250 words.\n\nSome people think that governments should spend money on improving public transport rather than building new roads.\nTo what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.`;
    }
    if (/Listening/i.test(titleCheck)) {
      return `Part 4 – Listening (Section 1)\nQuestions 1–8. Complete the form. Write ONE WORD AND/OR A NUMBER for each answer.\n\nRiverside Sports Club – Membership Form\n• Surname: (1) _______\n• Address: 42 (2) _______ Road\n• Postcode: KL9 (3) _______\n• Phone: 07700 900 (4) _______\n• Type of membership: (5) _______\n• Monthly cost: £ (6) _______\n• Health note: Problem with his (7) _______\n• Induction session: Saturday at 8 _______ with Maria`;
    }
  }

  return rawPassage;
}

export async function getAssignmentDetailService(
  assignmentId: string,
  studentId: string
): Promise<{ success: boolean; assignment?: any; error?: string }> {
  if (!(await isDbAlive())) {
    const found =
      (globalAssignmentsStore.demoAssignments || []).find((a) => a.id === assignmentId) ||
      (globalAssignmentsStore.demoAssignments || [])[0];
    if (found) {
      let flowcharts = found.flowcharts || [];
      if (!flowcharts || flowcharts.length === 0) {
        const qNums = (found.questions || []).map((q: any) => Number(q.questionNumber));
        if (qNums.includes(18) && qNums.includes(19) && qNums.includes(23)) {
          flowcharts = [
            {
              id: "fc-envisioning",
              title: "The Envisioning Process",
              instruction:
                "Complete the flow chart. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
              boxes: [
                {
                  id: "box-1",
                  textTemplate: "manager (having just obtained _______)",
                  questionNumbers: [18],
                  isStatic: false,
                  nextBoxIds: ["box-center"],
                },
                {
                  id: "box-2",
                  textTemplate: "people with greatly varied _______",
                  questionNumbers: [19],
                  isStatic: false,
                  nextBoxIds: ["box-center", "box-6"],
                },
                {
                  id: "box-center",
                  textTemplate: "playing with language for a long time",
                  isStatic: true,
                  nextBoxIds: ["box-4"],
                },
                {
                  id: "box-4",
                  textTemplate: "_______ set of words",
                  questionNumbers: [20],
                  isStatic: false,
                  nextBoxIds: ["box-5"],
                },
                {
                  id: "box-5",
                  textTemplate: "- obeyed only at _______\n- can cause lack of _______",
                  questionNumbers: [21, 22],
                  isStatic: false,
                  nextBoxIds: [],
                },
                {
                  id: "box-6",
                  textTemplate: "want _______ payback",
                  questionNumbers: [23],
                  isStatic: false,
                  nextBoxIds: [],
                },
              ],
              questionNumbers: [18, 19, 20, 21, 22, 23],
            },
          ];
        }
      }
      const studentSubs = (found.submissions || [])
        .filter((s: any) => s.studentId === studentId)
        .sort((a: any, b: any) => (b.attemptNumber || 1) - (a.attemptNumber || 1));
      const demoLatestSub = studentSubs[0] || (found.submissions || [])[0] || null;

      return {
        success: true,
        assignment: {
          ...found,
          flowcharts,
          tables: found.tables || [],
          matchingHeadings: found.matchingHeadings || [],
          summaries: found.summaries || [],
          questions: (found.questions || []).map((q: any) => ({
            ...q,
            passageText: resolveLegacyShortPassageText(q.passageText, found.title),
          })),
          latestSubmission: demoLatestSub
            ? {
                ...demoLatestSub,
                teacherFeedback: demoLatestSub.teacherFeedback || demoLatestSub.feedback || null,
                answers: (demoLatestSub.answers || []).map((ans: any) => ({
                  ...ans,
                  teacherComment: ans.teacherComment || ans.feedback || null,
                  criteriaScores: (ans.criteriaScores || []).map((cs: any) => ({
                    criterion: cs.criterion || cs.criterionCode,
                    score: typeof cs.score === "number" ? cs.score : cs.bandScore,
                    comment: cs.comment || "",
                  })),
                  gradingAnnotations: ans.gradingAnnotations || null,
                })),
              }
            : null,
        },
      };
    }
    return { success: true, assignment: found };
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      questions: {
        include: {
          options: true,
        },
        orderBy: { orderIndex: "asc" },
      },
      submissions: {
        where: { studentId },
        include: {
          answers: {
            include: { criteriaScores: true },
          },
        },
        orderBy: { attemptNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!assignment || !assignment.isActive) {
    return { success: false, error: "Bài tập không tồn tại hoặc đã bị xóa!" };
  }

  const latestSubmission = assignment.submissions[0] || null;

  let parsedMeta: any = null;
  try {
    if (assignment.description && assignment.description.startsWith("{")) {
      parsedMeta = JSON.parse(assignment.description);
    }
  } catch {}

  let flowcharts: any[] = parsedMeta?.flowcharts || [];
  let tables: any[] = parsedMeta?.tables || [];
  let matchingHeadings: any[] = parsedMeta?.matchingHeadings || [];
  let summaries: any[] = parsedMeta?.summaries || [];

  if (flowcharts.length === 0) {
    const qNums = assignment.questions.map((q) => q.questionNumber);
    const hasEnvisioningFlowchart =
      qNums.includes(18) && qNums.includes(19) && qNums.includes(23);

    if (hasEnvisioningFlowchart) {
      flowcharts = [
        {
          id: "fc-envisioning",
          title: "The Envisioning Process",
          instruction:
            "Complete the flow chart. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
          boxes: [
            {
              id: "box-1",
              textTemplate: "manager (having just obtained _______)",
              questionNumbers: [18],
              isStatic: false,
              nextBoxIds: ["box-center"],
            },
            {
              id: "box-2",
              textTemplate: "people with greatly varied _______",
              questionNumbers: [19],
              isStatic: false,
              nextBoxIds: ["box-center", "box-6"],
            },
            {
              id: "box-center",
              textTemplate: "playing with language for a long time",
              isStatic: true,
              nextBoxIds: ["box-4"],
            },
            {
              id: "box-4",
              textTemplate: "_______ set of words",
              questionNumbers: [20],
              isStatic: false,
              nextBoxIds: ["box-5"],
            },
            {
              id: "box-5",
              textTemplate: "- obeyed only at _______\n- can cause lack of _______",
              questionNumbers: [21, 22],
              isStatic: false,
              nextBoxIds: [],
            },
            {
              id: "box-6",
              textTemplate: "want _______ payback",
              questionNumbers: [23],
              isStatic: false,
              nextBoxIds: [],
            },
          ],
          questionNumbers: [18, 19, 20, 21, 22, 23],
        },
      ];
    }
  }

  return {
    success: true,
    assignment: {
      id: assignment.id,
      classId: assignment.classId,
      title: assignment.title,
      description: parsedMeta?.instruction || assignment.description,
      flowcharts,
      tables,
      matchingHeadings,
      summaries,
      skill: assignment.skill,
      type: assignment.type,
      durationMinutes: assignment.durationMinutes,
      dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
      maxAttempts: assignment.maxAttempts,
      audioUrl: assignment.audioUrl,
      enableProctoring: assignment.enableProctoring,
      maxTabSwitches: assignment.maxTabSwitches,
      questions: assignment.questions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        passageText: resolveLegacyShortPassageText(q.passageText, assignment.title),
        prompt: q.prompt,
        type: q.type,
        ieltsQuestionType:
          q.ieltsQuestionType ||
          resolveIeltsQuestionType(null, q.type, assignment.skill, q.questionNumber),
        groupTitle: q.groupTitle,
        points: q.points,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        options: q.options.map((opt) => ({
          id: opt.id,
          optionLabel: opt.optionLabel,
          content: opt.content,
          isCorrect: opt.isCorrect,
        })),
      })),
      latestSubmission: latestSubmission
        ? {
            id: latestSubmission.id,
            status: latestSubmission.status,
            score: latestSubmission.score,
            totalPoints: latestSubmission.totalPoints,
            tabSwitchCount: latestSubmission.tabSwitchCount,
            isCheatingFlagged: latestSubmission.isCheatingFlagged,
            teacherFeedback: latestSubmission.teacherFeedback,
            submittedAt: latestSubmission.submittedAt?.toISOString(),
            answers: latestSubmission.answers.map((ans) => ({
              questionId: ans.questionId,
              studentAnswer: ans.studentAnswer,
              audioUrl: ans.audioUrl,
              isCorrect: ans.isCorrect,
              awardedPoints: ans.awardedPoints,
              teacherComment: ans.teacherComment,
              criteriaScores: (ans.criteriaScores || []).map((cs) => ({
                criterion: cs.criterion,
                score: cs.score,
                comment: cs.comment,
              })),
              gradingAnnotations: (ans as any).gradingAnnotations || null,
            })),
          }
        : null,
    },
  };
}

export async function submitAssignmentService(
  data: {
    assignmentId: string;
    classId?: string;
    answers: Array<{
      questionId: string;
      studentAnswer?: string;
      audioUrl?: string;
    }>;
    tabSwitchCount: number;
    isCheatingFlagged: boolean;
    autoSubmittedReason?: string;
  },
  studentInfo: { userId: string; fullName?: string; email?: string }
): Promise<{
  success: boolean;
  submissionId?: string;
  score?: number | null;
  totalPoints?: number | null;
  isCheatingFlagged?: boolean;
  error?: string;
}> {
  const now = new Date();

  if (!(await isDbAlive())) {
    const assign =
      (globalAssignmentsStore.demoAssignments || []).find(
        (a: any) => a.id === data.assignmentId
      ) || (globalAssignmentsStore.demoAssignments || [])[0];

    if (!assign) {
      return { success: false, error: "Bài tập không tồn tại!" };
    }

    const classLink = (assign.assignedClasses || []).find(
      (ac: any) => ac.classId === data.classId && ac.isActive !== false
    );
    const effectiveDueDate = classLink?.dueDate || assign.dueDate;
    // BR-05 & BR-06: Hết hạn nộp của lớp thì học sinh không được nộp nữa
    if (effectiveDueDate && new Date(effectiveDueDate) < now) {
      return {
        success: false,
        error: "Đã hết hạn nộp bài của lớp, hệ thống không nhận thêm bài nộp (Quy tắc BR-05)!",
      };
    }

    let totalScore = 0;
    let maxScore = 0;

    const formattedAnswers = data.answers.map((ans, idx) => {
      const q = (assign.questions || []).find((quest: any) => quest.id === ans.questionId);
      const pts = q?.points ? Number(q.points) : 1;
      maxScore += pts;
      let isCorrect: boolean | null = null;
      let awardedPoints = 0;

      if (isObjectiveType(q?.type)) {
        isCorrect = isAnswerCorrect(q.correctAnswer, ans.studentAnswer);
        awardedPoints = isCorrect ? pts : 0;
        totalScore += awardedPoints;
      }

      return {
        id: `ans-${Date.now()}-${idx}`,
        questionId: ans.questionId,
        questionNumber: q?.questionNumber || idx + 1,
        prompt: q?.prompt || "",
        passageText: q?.passageText || null,
        type: q?.type || "MULTIPLE_CHOICE",
        ieltsQuestionType: q?.ieltsQuestionType || null,
        points: pts,
        correctAnswer: q?.correctAnswer || "",
        studentAnswer: ans.studentAnswer || null,
        audioUrl: ans.audioUrl || null,
        isCorrect,
        awardedPoints,
        teacherComment: null,
        criteriaScores: [],
      };
    });

    const isObjectiveOnly = allObjective(assign.questions || []);
    const maxTabLimit = classLink?.maxTabSwitches ?? assign.maxTabSwitches ?? 3;
    const isCheating = Boolean(
      data.isCheatingFlagged || data.tabSwitchCount > maxTabLimit
    );

    const myPrevCount = (assign.submissions || []).filter(
      (s: any) => s.studentId === (studentInfo.userId || "demo-student-1")
    ).length;

    const submissionId = `sub-${Date.now()}`;
    const newSub = {
      id: submissionId,
      studentId: studentInfo.userId || "demo-student-1",
      classId: data.classId || assign.classId || null,
      studentName: studentInfo.fullName || "Trần Thị Lan",
      studentEmail: studentInfo.email || "hv001@simpace.vn",
      attemptNumber: myPrevCount + 1,
      submittedAt: now.toISOString(),
      status: isObjectiveOnly ? "GRADED" : "SUBMITTED",
      score: isObjectiveOnly ? totalScore : null,
      totalPoints: maxScore,
      tabSwitchCount: data.tabSwitchCount || 0,
      isCheatingFlagged: isCheating,
      autoSubmittedReason: data.autoSubmittedReason || null,
      teacherFeedback: null,
      answers: formattedAnswers,
    };

    assign.submissions = [newSub, ...(assign.submissions || [])];
    assign.submittedCount = (assign.submissions || []).filter(
      (s: any) => s.status === "SUBMITTED" || s.status === "GRADED"
    ).length;
    assign.flaggedCount = (assign.submissions || []).filter(
      (s: any) => s.isCheatingFlagged
    ).length;

    return {
      success: true,
      submissionId: newSub.id,
      score: newSub.score,
      totalPoints: newSub.totalPoints,
      isCheatingFlagged: newSub.isCheatingFlagged,
    };
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: data.assignmentId },
    include: {
      questions: true,
      assignedClasses: {
        where: { isActive: true },
      },
    },
  });

  if (!assignment) {
    return { success: false, error: "Bài tập không tồn tại!" };
  }

  const targetClassId = data.classId || assignment.classId;
  const classLink = assignment.assignedClasses.find((ac) => ac.classId === targetClassId);
  const effectiveDueDate = classLink?.dueDate || assignment.dueDate;

  // BR-05 & BR-06: Chặn nộp bài sau dueDate của lớp
  if (effectiveDueDate && effectiveDueDate < now) {
    return {
      success: false,
      error: "Đã hết hạn nộp bài của lớp, hệ thống không nhận thêm bài nộp (Quy tắc BR-05)!",
    };
  }

  let totalScore = 0;
  let maxScore = 0;

  const answersToCreate = data.answers.map((ans) => {
    const q = assignment.questions.find((quest) => quest.id === ans.questionId);
    if (!q) {
      return {
        questionId: ans.questionId,
        studentAnswer: ans.studentAnswer || null,
        audioUrl: ans.audioUrl || null,
        isCorrect: null,
        awardedPoints: 0,
      };
    }

    maxScore += q.points;
    let isCorrect: boolean | null = null;
    let awardedPoints = 0;

    if (isObjectiveType(q.type)) {
      isCorrect = isAnswerCorrect(q.correctAnswer, ans.studentAnswer);
      awardedPoints = isCorrect ? q.points : 0;
      totalScore += awardedPoints;
    }

    return {
      questionId: ans.questionId,
      studentAnswer: ans.studentAnswer || null,
      audioUrl: ans.audioUrl || null,
      isCorrect,
      awardedPoints,
    };
  });

  const previousSubmissionsCount = await prisma.assignmentSubmission.count({
    where: {
      assignmentId: data.assignmentId,
      studentId: studentInfo.userId,
    },
  });

  const isObjectiveOnly = allObjective(assignment.questions);
  const maxTabLimit = classLink?.maxTabSwitches ?? assignment.maxTabSwitches ?? 3;

  const submission = await prisma.assignmentSubmission.create({
    data: {
      assignmentId: data.assignmentId,
      studentId: studentInfo.userId,
      classId: targetClassId || null,
      assignmentClassId: classLink?.id || null,
      attemptNumber: previousSubmissionsCount + 1,
      submittedAt: now,
      status: isObjectiveOnly ? "GRADED" : "SUBMITTED",
      score: isObjectiveOnly ? totalScore : null,
      totalPoints: maxScore,
      tabSwitchCount: data.tabSwitchCount || 0,
      isCheatingFlagged:
        Boolean(data.isCheatingFlagged) || (data.tabSwitchCount || 0) > maxTabLimit,
      autoSubmittedReason: data.autoSubmittedReason || null,
      answers: {
        create: answersToCreate,
      },
    },
  });

  return {
    success: true,
    submissionId: submission.id,
    score: submission.score,
    totalPoints: submission.totalPoints,
    isCheatingFlagged: submission.isCheatingFlagged,
  };
}

export async function getSubmissionsForAssignmentService(assignmentId: string) {
  if (!(await isDbAlive())) {
    const assign =
      (globalAssignmentsStore.demoAssignments || []).find(
        (a: any) => a.id === assignmentId
      ) || (globalAssignmentsStore.demoAssignments || [])[0];

    const questionsMap = new Map<string, any>();
    (assign?.questions || []).forEach((q: any) => {
      questionsMap.set(q.id, q);
    });

    const enrichedSubmissions = (assign?.submissions || []).map((s: any) => ({
      ...s,
      teacherFeedback: s.teacherFeedback ?? s.feedback ?? "",
      answers: (s.answers || []).map((a: any, idx: number) => {
        const q = questionsMap.get(a.questionId);
        return {
          ...a,
          questionNumber: a.questionNumber ?? q?.questionNumber ?? idx + 1,
          prompt: a.prompt ?? q?.prompt ?? "",
          passageText: a.passageText ?? q?.passageText ?? null,
          groupTitle: a.groupTitle ?? q?.groupTitle ?? null,
          type: a.type ?? q?.type ?? q?.questionType ?? "ESSAY",
          ieltsQuestionType: a.ieltsQuestionType ?? q?.ieltsQuestionType ?? null,
          points: a.points ?? q?.points ?? 9,
          correctAnswer: a.correctAnswer ?? q?.correctAnswer ?? null,
          explanation: a.explanation ?? q?.explanation ?? null,
          teacherComment: a.teacherComment ?? a.feedback ?? "",
          criteriaScores: (a.criteriaScores || []).map((cs: any) => ({
            criterion: cs.criterion || cs.criterionCode,
            score: typeof cs.score === "number" ? cs.score : cs.bandScore,
            comment: cs.comment || "",
          })),
          gradingAnnotations: a.gradingAnnotations || null,
        };
      }),
    }));

    return {
      success: true,
      submissions: enrichedSubmissions,
    };
  }

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId },
    include: {
      student: {
        select: {
          id: true,
          username: true,
          email: true,
          profile: {
            select: { fullName: true, avatarUrl: true },
          },
        },
      },
      answers: {
        include: {
          question: true,
          criteriaScores: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const formatted = submissions.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    studentName: s.student.profile?.fullName || s.student.username,
    studentEmail: s.student.email,
    attemptNumber: s.attemptNumber,
    submittedAt: s.submittedAt?.toISOString(),
    status: s.status,
    score: s.score,
    totalPoints: s.totalPoints,
    tabSwitchCount: s.tabSwitchCount,
    isCheatingFlagged: s.isCheatingFlagged,
    autoSubmittedReason: s.autoSubmittedReason,
    teacherFeedback: s.teacherFeedback,
    answers: s.answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      questionNumber: a.question.questionNumber,
      prompt: a.question.prompt,
      passageText: a.question.passageText,
      groupTitle: a.question.groupTitle,
      type: a.question.type,
      ieltsQuestionType: a.question.ieltsQuestionType,
      points: a.question.points,
      correctAnswer: a.question.correctAnswer,
      explanation: a.question.explanation,
      studentAnswer: a.studentAnswer,
      audioUrl: a.audioUrl,
      isCorrect: a.isCorrect,
      awardedPoints: a.awardedPoints,
      teacherComment: a.teacherComment,
      criteriaScores: a.criteriaScores.map((cs) => ({
        criterion: cs.criterion,
        score: cs.score,
        comment: cs.comment,
      })),
      gradingAnnotations: (a as any).gradingAnnotations || null,
    })),
  }));

  return { success: true, submissions: formatted };
}

export async function gradeSubmissionService(
  data: {
    submissionId: string;
    isDraft?: boolean;
    gradedAnswers: Array<{
      answerId: string;
      awardedPoints: number;
      teacherComment?: string;
      criteriaScores?: Array<{
        criterion: string;
        score: number;
        comment?: string;
      }>;
      gradingAnnotations?: any;
    }>;
    teacherFeedback?: string;
  },
  gradedById: string
): Promise<{ success: boolean; totalScore?: number | null; status?: string; error?: string }> {
  const isDraftMode = Boolean(data.isDraft);

  if (!(await isDbAlive())) {
    let calculatedTotalScore = 0;
    for (const assign of globalAssignmentsStore.demoAssignments || []) {
      const sub = (assign.submissions || []).find((s: any) => s.id === data.submissionId);
      if (sub) {
        let allSubjectiveComplete = true;
        for (const item of data.gradedAnswers) {
          const ans = (sub.answers || []).find((a: any) => a.id === item.answerId);
          const q = (assign.questions || []).find((quest: any) => quest.id === ans?.questionId);
          const isSubjective =
            ans?.type === "ESSAY" ||
            ans?.type === "SPEAKING_RECORD" ||
            q?.type === "ESSAY" ||
            q?.type === "SPEAKING_RECORD" ||
            assign.skill === "WRITING" ||
            assign.skill === "SPEAKING";

          if (ans && item.gradingAnnotations !== undefined) {
            ans.gradingAnnotations = item.gradingAnnotations;
          }

          if (isSubjective) {
            const critList = item.criteriaScores || [];
            if (critList.length < 4) {
              allSubjectiveComplete = false;
            }
            const band = calculateCriteriaBand(critList.map((c) => c.score));
            if (band === null) {
              allSubjectiveComplete = false;
            }
            if (ans) {
              ans.criteriaScores = critList.map((c) => ({
                criterion: c.criterion,
                criterionCode: c.criterion,
                score: c.score,
                bandScore: c.score,
                comment: c.comment?.trim() || "",
              }));
              ans.awardedPoints = band ?? (Number(item.awardedPoints) || 0);
              ans.teacherComment = item.teacherComment?.trim() || null;
              ans.feedback = item.teacherComment?.trim() || null;
            }
            calculatedTotalScore += band ?? (Number(item.awardedPoints) || 0);
          } else {
            if (ans) {
              ans.awardedPoints = Number(item.awardedPoints) || 0;
              ans.teacherComment = item.teacherComment?.trim() || null;
            }
            calculatedTotalScore += Number(item.awardedPoints) || 0;
          }
        }

        sub.teacherFeedback = data.teacherFeedback?.trim() || null;
        sub.feedback = data.teacherFeedback?.trim() || null;

        if (isDraftMode) {
          return {
            success: true,
            totalScore: sub.score ?? null,
            status: sub.status,
          };
        }

        if (!allSubjectiveComplete) {
          sub.status = "SUBMITTED";
          sub.score = null;
          return {
            success: false,
            status: "SUBMITTED",
            error:
              "Bài Writing/Speaking bắt buộc phải nhập đủ điểm của cả 4 tiêu chí IELTS trước khi hoàn tất chấm (Quy tắc BR-07)!",
          };
        }

        sub.score = calculatedTotalScore;
        sub.status = "GRADED";
        sub.gradedById = gradedById;
        sub.gradedAt = new Date().toISOString();
        return { success: true, totalScore: calculatedTotalScore, status: "GRADED" };
      }
    }
    return { success: true, totalScore: 0, status: isDraftMode ? "SUBMITTED" : "GRADED" };
  }

  const existingSub = await prisma.assignmentSubmission.findUnique({
    where: { id: data.submissionId },
    include: {
      assignment: true,
      answers: {
        include: { question: true },
      },
    },
  });

  if (!existingSub) {
    return { success: false, error: "Không tìm thấy bài nộp để chấm điểm!" };
  }

  let calculatedTotalScore = 0;

  for (const item of data.gradedAnswers) {
    const dbAns = existingSub.answers.find((a) => a.id === item.answerId);
    const qType = dbAns?.question?.type;
    const isSubjective = qType === "ESSAY" || qType === "SPEAKING_RECORD";

    let finalAwardedPoints = Number(item.awardedPoints) || 0;

    if (isSubjective && item.criteriaScores !== undefined) {
      const band = calculateCriteriaBand(item.criteriaScores.map((c) => Number(c.score)));
      if (!isDraftMode && band === null) {
        return {
          success: false,
          status: "SUBMITTED",
          error:
            "Bài Writing/Speaking bắt buộc phải nhập đủ cả 4 tiêu chí IELTS (0.0 - 9.0) để chuyển trạng thái Đã chấm (Quy tắc BR-07)!",
        };
      }
      if (band !== null) {
        finalAwardedPoints = band;
      }

      // Lưu chi tiết 4 tiêu chí vào bảng submission_criteria_scores
      for (const crit of item.criteriaScores) {
        await prisma.submissionCriteriaScore.upsert({
          where: {
            submissionAnswerId_criterion: {
              submissionAnswerId: item.answerId,
              criterion: crit.criterion,
            },
          },
          update: {
            score: Number(crit.score),
            comment: crit.comment?.trim() || null,
          },
          create: {
            submissionAnswerId: item.answerId,
            criterion: crit.criterion,
            score: Number(crit.score),
            comment: crit.comment?.trim() || null,
          },
        });
      }
    }

    const updateData: any = {
      awardedPoints: finalAwardedPoints,
      teacherComment: item.teacherComment?.trim() || null,
    };
    if (item.gradingAnnotations !== undefined) {
      updateData.gradingAnnotations = item.gradingAnnotations;
    }

    await (prisma.submissionAnswer as any).update({
      where: { id: item.answerId },
      data: updateData,
    });
    calculatedTotalScore += finalAwardedPoints;
  }

  await prisma.assignmentSubmission.update({
    where: { id: data.submissionId },
    data: {
      score: isDraftMode ? existingSub.score : calculatedTotalScore,
      status: isDraftMode ? existingSub.status : "GRADED",
      teacherFeedback: data.teacherFeedback?.trim() || null,
      gradedById,
    },
  });

  return {
    success: true,
    totalScore: isDraftMode ? existingSub.score : calculatedTotalScore,
    status: isDraftMode ? existingSub.status : "GRADED",
  };
}
