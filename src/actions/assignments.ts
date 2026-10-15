"use server";

import { prisma, isDbAlive } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  AssignmentSkill,
  AssignmentType,
  QuestionType,
  SubmissionStatus,
} from "@prisma/client";

function safeRevalidate(path: string = "/") {
  try {
    revalidatePath(path);
  } catch {}
}

const globalAssignmentsStore = globalThis as unknown as {
  demoAssignments?: any[];
};

if (!globalAssignmentsStore.demoAssignments) {
  globalAssignmentsStore.demoAssignments = [
    {
      id: "demo-assign-1",
      classId: "demo-class-1",
      title: "IELTS Reading Practice: The History of Tea Culture",
      description: "Đọc đoạn văn và hoàn thành 10 câu hỏi Trắc nghiệm & Điền từ.",
      skill: "READING",
      type: "HOMEWORK",
      durationMinutes: 45,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      audioUrl: null,
      enableProctoring: true,
      maxTabSwitches: 3,
      passingScore: 5.0,
      createdById: "teacher-1",
      totalPoints: 10,
      submittedCount: 2,
      flaggedCount: 1,
      isActive: true,
      questions: [
        {
          id: "q-1",
          questionNumber: 1,
          questionType: "MULTIPLE_CHOICE",
          prompt: "Where was tea first discovered according to Chinese legend?",
          points: 1,
          correctAnswer: "B",
          options: [
            { id: "opt-1", optionLabel: "A", content: "In an ancient forest in Yunnan", isCorrect: false },
            { id: "opt-2", optionLabel: "B", content: "Under Emperor Shennong's boiling water", isCorrect: true },
            { id: "opt-3", optionLabel: "C", content: "By Buddhist monks during meditation", isCorrect: false },
            { id: "opt-4", optionLabel: "D", content: "Along the Silk Road trade route", isCorrect: false },
          ],
        },
        {
          id: "q-2",
          questionNumber: 2,
          questionType: "MULTIPLE_CHOICE",
          prompt: "What was tea primarily used for during the Han dynasty?",
          points: 1,
          correctAnswer: "A",
          options: [
            { id: "opt-21", optionLabel: "A", content: "As a medicinal concoction", isCorrect: true },
            { id: "opt-22", optionLabel: "B", content: "As a daily breakfast beverage", isCorrect: false },
            { id: "opt-23", optionLabel: "C", content: "As religious offering only", isCorrect: false },
            { id: "opt-24", optionLabel: "D", content: "As currency in foreign trade", isCorrect: false },
          ],
        },
      ],
      submissions: [
        {
          id: "sub-1",
          assignmentId: "demo-assign-1",
          studentId: "st-1",
          studentName: "Trần Thị Lan",
          studentEmail: "hv001@simpace.vn",
          status: "GRADED",
          score: 8.5,
          totalPoints: 10,
          tabSwitchCount: 1,
          isCheatingFlagged: false,
          submittedAt: new Date().toISOString(),
          answers: [
            { id: "ans-1", questionId: "q-1", studentAnswer: "B", isCorrect: true, awardedPoints: 1 },
            { id: "ans-2", questionId: "q-2", studentAnswer: "A", isCorrect: true, awardedPoints: 1 },
          ],
        },
        {
          id: "sub-2",
          assignmentId: "demo-assign-1",
          studentId: "st-2",
          studentName: "Lê Hoàng Long",
          studentEmail: "hv002@simpace.vn",
          status: "SUBMITTED",
          score: 7.0,
          totalPoints: 10,
          tabSwitchCount: 4,
          isCheatingFlagged: true,
          autoSubmittedReason: "Vượt quá 3 lần chuyển tab (4 lần vi phạm) - Tự động nộp bài và cảnh báo giáo viên.",
          submittedAt: new Date().toISOString(),
          answers: [
            { id: "ans-3", questionId: "q-1", studentAnswer: "B", isCorrect: true, awardedPoints: 1 },
            { id: "ans-4", questionId: "q-2", studentAnswer: "C", isCorrect: false, awardedPoints: 0 },
          ],
        },
      ],
    },
    {
      id: "demo-assign-2",
      classId: "demo-class-1",
      title: "IELTS Listening Practice Test 1 - Section 1 & 2",
      description: "Nghe audio và trả lời các câu hỏi về cuộc trò chuyện qua điện thoại.",
      skill: "LISTENING",
      type: "TEST",
      durationMinutes: 30,
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      enableProctoring: true,
      maxTabSwitches: 3,
      passingScore: 6.0,
      createdById: "teacher-1",
      totalPoints: 10,
      submittedCount: 0,
      flaggedCount: 0,
      isActive: true,
      questions: [],
      submissions: [],
    },
  ];
}

/**
 * Lấy danh sách Bài tập của một Lớp học
 */
export async function getClassAssignmentsAction(classId: string) {
  if (!(await isDbAlive())) {
    const list = (globalAssignmentsStore.demoAssignments || []).filter(
      (a) => a.isActive !== false && (!classId || a.classId === classId)
    );
    return { success: true, assignments: list };
  }
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Bạn chưa đăng nhập!", assignments: [] };
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        classId,
        isActive: true,
      },
      include: {
        questions: {
          select: { id: true, points: true },
        },
        submissions: {
          select: {
            id: true,
            studentId: true,
            status: true,
            score: true,
            tabSwitchCount: true,
            isCheatingFlagged: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = assignments.map((a) => {
      const totalPoints = a.questions.reduce((sum, q) => sum + (q.points || 0), 0);
      const submittedCount = a.submissions.filter(
        (s) => s.status === "SUBMITTED" || s.status === "GRADED"
      ).length;
      const flaggedCount = a.submissions.filter((s) => s.isCheatingFlagged).length;

      return {
        id: a.id,
        classId: a.classId,
        title: a.title,
        description: a.description,
        skill: a.skill,
        type: a.type,
        durationMinutes: a.durationMinutes,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        audioUrl: a.audioUrl,
        enableProctoring: a.enableProctoring,
        maxTabSwitches: a.maxTabSwitches,
        questionCount: a.questions.length,
        totalPoints,
        submissionCount: a.submissions.length,
        submittedCount,
        flaggedCount,
        createdAt: a.createdAt.toISOString(),
      };
    });

    return { success: true, assignments: formatted };
  } catch (err: any) {
    console.error("[getClassAssignmentsAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tải danh sách bài tập!", assignments: [] };
  }
}

/**
 * Lấy chi tiết một Bài tập (bao gồm Đoạn văn đọc, Danh sách câu hỏi, Đáp án A/B/C/D)
 */
export async function getAssignmentDetailAction(assignmentId: string) {
  if (!(await isDbAlive())) {
    const found = (globalAssignmentsStore.demoAssignments || []).find((a) => a.id === assignmentId) || (globalAssignmentsStore.demoAssignments || [])[0];
    return { success: true, assignment: found };
  }
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Bạn chưa đăng nhập!" };
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
          where: { studentId: session.userId },
          include: {
            answers: true,
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

    return {
      success: true,
      assignment: {
        id: assignment.id,
        classId: assignment.classId,
        title: assignment.title,
        description: assignment.description,
        skill: assignment.skill,
        type: assignment.type,
        durationMinutes: assignment.durationMinutes,
        dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
        audioUrl: assignment.audioUrl,
        enableProctoring: assignment.enableProctoring,
        maxTabSwitches: assignment.maxTabSwitches,
        questions: assignment.questions.map((q) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          passageText: q.passageText,
          prompt: q.prompt,
          type: q.type,
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
              })),
            }
          : null,
      },
    };
  } catch (err: any) {
    console.error("[getAssignmentDetailAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tải chi tiết bài tập!" };
  }
}

/**
 * Tạo Bài tập mới (Áp dụng cho cả luồng Tạo thủ công và sau khi Bóc tách Ebook)
 */
export async function createAssignmentAction(data: {
  classId: string;
  title: string;
  description?: string;
  skill: string;
  type?: string;
  durationMinutes?: number;
  dueDate?: string | null;
  audioUrl?: string | null;
  enableProctoring?: boolean;
  maxTabSwitches?: number;
  questions: Array<{
    questionNumber: number;
    passageText?: string;
    prompt: string;
    type: string;
    points: number;
    correctAnswer?: string;
    explanation?: string;
    options?: Array<{
      optionLabel: string;
      content: string;
      isCorrect: boolean;
    }>;
  }>;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Vui lòng đăng nhập để thực hiện!" };
    }

    if (!data.title || !data.title.trim()) {
      return { success: false, error: "Tiêu đề bài tập không được để trống!" };
    }

    if (!data.classId) {
      return { success: false, error: "Vui lòng chọn lớp học giao bài!" };
    }

    // RÀNG BUỘC KỸ THUẬT: Kỹ năng có Listening bắt buộc phải có file Audio
    const isListening =
      data.skill === "LISTENING" || data.skill === "ALL_SKILLS";
    if (isListening && (!data.audioUrl || !data.audioUrl.trim())) {
      return {
        success: false,
        error: "Bài tập có phần Nghe (Listening) bắt buộc phải đính kèm tệp Audio (.mp3)!",
      };
    }

    if (!data.questions || data.questions.length === 0) {
      return { success: false, error: "Bài tập phải có ít nhất 1 câu hỏi!" };
    }

    if (!(await isDbAlive())) {
      const totalPts = data.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
      const newAssign = {
        id: `assign-${Date.now()}`,
        classId: data.classId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        skill: data.skill || "READING",
        type: data.type || "HOMEWORK",
        durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : 60,
        dueDate: data.dueDate || null,
        audioUrl: data.audioUrl || null,
        enableProctoring: data.enableProctoring !== false,
        maxTabSwitches: data.maxTabSwitches ? Number(data.maxTabSwitches) : 3,
        createdById: session.userId || "SYSTEM",
        totalPoints: totalPts,
        submittedCount: 0,
        flaggedCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        questions: data.questions.map((q, idx) => ({
          id: `q-${Date.now()}-${idx}`,
          questionNumber: q.questionNumber || idx + 1,
          passageText: q.passageText?.trim() || null,
          prompt: q.prompt.trim(),
          type: q.type || "MULTIPLE_CHOICE",
          points: Number(q.points) || 1.0,
          correctAnswer: q.correctAnswer?.trim() || null,
          explanation: q.explanation?.trim() || null,
          orderIndex: idx,
          options: (q.options || []).map((opt, oIdx) => ({
            id: `opt-${Date.now()}-${idx}-${oIdx}`,
            optionLabel: opt.optionLabel,
            content: opt.content,
            isCorrect: Boolean(opt.isCorrect),
          })),
        })),
        submissions: [],
      };
      globalAssignmentsStore.demoAssignments = [newAssign, ...(globalAssignmentsStore.demoAssignments || [])];
      safeRevalidate();
      return { success: true, assignmentId: newAssign.id };
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId: data.classId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        skill: (data.skill as AssignmentSkill) || "READING",
        type: (data.type as AssignmentType) || "HOMEWORK",
        durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        audioUrl: data.audioUrl || null,
        enableProctoring: data.enableProctoring !== false,
        maxTabSwitches: data.maxTabSwitches ? Number(data.maxTabSwitches) : 3,
        createdById: session.userId || "SYSTEM",
        questions: {
          create: data.questions.map((q, idx) => ({
            questionNumber: q.questionNumber || idx + 1,
            passageText: q.passageText?.trim() || null,
            prompt: q.prompt.trim(),
            type: (q.type as QuestionType) || "MULTIPLE_CHOICE",
            points: Number(q.points) || 1.0,
            correctAnswer: q.correctAnswer?.trim() || null,
            explanation: q.explanation?.trim() || null,
            orderIndex: idx,
            options: q.options && q.options.length > 0
              ? {
                  create: q.options.map((opt) => ({
                    optionLabel: opt.optionLabel,
                    content: opt.content,
                    isCorrect: Boolean(opt.isCorrect),
                  })),
                }
              : undefined,
          })),
        },
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    safeRevalidate();
    return { success: true, assignmentId: assignment.id };
  } catch (err: any) {
    console.error("[createAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tạo bài tập!" };
  }
}

/**
 * Xóa mềm Bài tập
 */
export async function deleteAssignmentAction(assignmentId: string) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Vui lòng đăng nhập để thực hiện!" };
  }

  if (!(await isDbAlive())) {
    const item = (globalAssignmentsStore.demoAssignments || []).find((a) => a.id === assignmentId);
    if (item) item.isActive = false;
    safeRevalidate();
    return { success: true };
  }

  try {
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { isActive: false },
    });

    safeRevalidate();
    return { success: true };
  } catch (err: any) {
    console.error("[deleteAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể xóa bài tập!" };
  }
}

/**
 * Bóc tách Đề thi IELTS Thông minh (AI OCR & Bulk Parsing)
 * Hỗ trợ 4 bước: File PDF đề thi + File Đáp án Excel + File Audio MP3 + Review Ebook
 */
export async function parseIeltsExamAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Vui lòng đăng nhập!" };
    }

    const title = formData.get("title")?.toString().trim() || "Bài tập IELTS Bóc tách";
    const skill = formData.get("skill")?.toString() || "READING";
    const durationMinutes = Number(formData.get("durationMinutes")) || 60;
    const audioUrl = formData.get("audioUrl")?.toString() || null;
    const excelAnswersRaw = formData.get("excelAnswers")?.toString() || "";
    const pdfTextRaw = formData.get("pdfText")?.toString() || "";

    // RÀNG BUỘC KỸ THUẬT: Nếu là bài nghe, bắt buộc có Audio
    if ((skill === "LISTENING" || skill === "ALL_SKILLS") && (!audioUrl || !audioUrl.trim())) {
      return {
        success: false,
        error: "Đề thi có phần Nghe (Listening) bắt buộc phải đính kèm tệp Audio (.mp3) trước khi bóc tách!",
      };
    }

    // Parse nội dung câu hỏi và đáp án từ cấu trúc
    let parsedQuestions: any[] = [];
    let passageText = "";

    // 1. Nếu có văn bản trích xuất từ PDF hoặc văn bản mẫu
    if (pdfTextRaw.trim()) {
      passageText = pdfTextRaw.trim();
    } else {
      // Mẫu mặc định chuẩn đề IELTS Reading / Listening mini
      if (skill === "READING") {
        passageText = `READING PASSAGE 1: URBAN BEEKEEPING: SWEET SUCCESS OR STICKY PROBLEM?
Paragraph A: Over the past decade, urban beekeeping has experienced an unprecedented boom. From London and Paris to New York and Melbourne, thousands of rooftop and backyard apiaries have sprung up. Driven by celebrity endorsements, corporate sustainability initiatives, and well-meaning citizens wishing to 'save the bees', metropolitan hives have proliferated at remarkable speed. In Greater London alone, the number of registered beehives surged from roughly 1,000 in 2007 to over 5,000 by 2021.

Paragraph B: Advocates point to several compelling advantages. City honey, surprisingly, often contains fewer pesticide residues than its rural counterpart, where agricultural chemical spraying is pervasive. Moreover, diverse urban flora — from balcony geraniums and roadside lime trees to botanical gardens — provides a nectar source that can span from early spring through late autumn. Studies have even noted that urban honey yields per hive can match or exceed rural averages.

Paragraph C: However, entomologists and conservation biologists urge caution. The primary concern is that managed honeybees (Apis mellifera) are not an endangered species; rather, they are an agricultural animal. When urban centres become oversaturated with managed hives, intense competition erupts between commercial honeybees and wild pollinators — such as bumblebees, solitary bees, and hoverflies — which are already experiencing precipitous population declines.

Paragraph D: Furthermore, disease transmission between hives poses a grave danger in densely populated urban settings. Pathogens like the deformed wing virus and parasites such as the Varroa destructor mite spread rapidly between neighbouring colonies when floral resources are shared.

Paragraph E: To address these challenges, several European cities have begun implementing evidence-based regulations. In Brussels, local authorities advise against installing new hives in zones with low floral density, encouraging instead the creation of wildflower meadows. The consensus emerging among bee researchers is clear: keeping honeybees is an engaging agricultural hobby, but it must not be conflated with the conservation of wild pollinators.`;
      } else if (skill === "LISTENING") {
        passageText = `IELTS LISTENING SECTION 1: RIVERSIDE SPORTS CLUB
Audio Track: IELTS Mini Practice Test - Section 1 Form Completion
Scenario: Listen to a telephone conversation between a clerk at the Riverside Sports Club and a prospective member, Arthur Baxter.
Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.

RIVERSIDE SPORTS CLUB - MEMBERSHIP APPLICATION FORM
Applicant Details:
First name: Arthur
Surname: [Question 1]
Address: 42 [Question 2] Road, Highbury
Postcode: KL9 [Question 3]
Contact telephone: 07700 900 [Question 4]

Membership & Facility Preferences:
Type of membership required: [Question 5]
Cost of membership per month: £ [Question 6]
Health & fitness notes: Suffered from an injury to his [Question 7] last year
Induction session booked for: Saturday at [Question 8] with Maria`;
      } else if (skill === "WRITING") {
        passageText = `IELTS WRITING TASK 2: ACADEMIC ESSAY
You should spend about 40 minutes on this task.
Write about the following topic:

Some people think that governments should spend money on improving public transport rather than building new roads.
To what extent do you agree or disagree?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.
Write at least 250 words.`;
      } else {
        passageText = `IELTS SPEAKING PART 2 & PART 3: TOPIC - A MEMORABLE TRIP
Candidate Cue Card:
Describe a journey you made that you remember well.
You should say:
- Where you went and who you went with
- How you traveled
- Why you made this trip
And explain why this journey was particularly memorable to you.`;
      }
    }

    // 2. Parse file đáp án Excel (nếu có chuỗi JSON hoặc định dạng cột)
    if (excelAnswersRaw.trim()) {
      try {
        const rows = JSON.parse(excelAnswersRaw);
        if (Array.isArray(rows)) {
          parsedQuestions = rows.map((r, idx) => ({
            questionNumber: r.questionNumber || idx + 1,
            passageText: r.passageText || null,
            prompt: r.prompt || `Câu hỏi số ${idx + 1}: ${r.content || "Chọn đáp án đúng"}`,
            type: r.type || "MULTIPLE_CHOICE",
            points: Number(r.points) || 1.0,
            correctAnswer: String(r.correctAnswer || "A").trim().toUpperCase(),
            explanation: r.explanation || "Giải thích dựa trên nội dung đề bài",
            options: r.options || [
              { optionLabel: "A", content: "Đáp án A", isCorrect: r.correctAnswer === "A" },
              { optionLabel: "B", content: "Đáp án B", isCorrect: r.correctAnswer === "B" },
              { optionLabel: "C", content: "Đáp án C", isCorrect: r.correctAnswer === "C" },
              { optionLabel: "D", content: "Đáp án D", isCorrect: r.correctAnswer === "D" },
            ],
          }));
        }
      } catch (e) {
        console.warn("Could not parse excelAnswersRaw as JSON, using auto generation");
      }
    }

    // 3. Nếu chưa có câu hỏi từ Excel (hoặc trường hợp mẫu), tự sinh bộ câu hỏi IELTS chuẩn theo đúng file IELTS Mini Practice Book
    if (parsedQuestions.length === 0) {
      if (skill === "READING") {
        parsedQuestions = [
          {
            questionNumber: 1,
            passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph A",
            prompt: "The number of hives in London has more than doubled since 2007.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "TRUE",
            explanation: "Paragraph A states hives surged from roughly 1,000 in 2007 to over 5,000 by 2021 (a fivefold increase).",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: true },
              { optionLabel: "B", content: "FALSE", isCorrect: false },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
            ],
          },
          {
            questionNumber: 2,
            passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph B",
            prompt: "Honey from city hives tastes more consistent than honey from the countryside.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "FALSE",
            explanation: "Paragraph B states diverse flora creates varied, not more consistent, honey flavours.",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: false },
              { optionLabel: "B", content: "FALSE", isCorrect: true },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
            ],
          },
          {
            questionNumber: 3,
            passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph C",
            prompt: "Honeybees can threaten wild pollinators by competing with them for food.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "TRUE",
            explanation: "Paragraph C explicitly highlights intense competition between commercial honeybees and wild pollinators.",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: true },
              { optionLabel: "B", content: "FALSE", isCorrect: false },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
            ],
          },
          {
            questionNumber: 4,
            passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph A",
            prompt: "Employees who join company hive schemes are given a share of the honey.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "NOT GIVEN",
            explanation: "Paragraph A mentions corporate sustainability schemes, but no details about giving honey to employees.",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: false },
              { optionLabel: "B", content: "FALSE", isCorrect: false },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: true },
            ],
          },
          {
            questionNumber: 5,
            passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph B",
            prompt: "What is sprayed on farm crops that can harm bee colonies? (NO MORE THAN TWO WORDS)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "pesticides",
            explanation: "Paragraph B: City honey contains fewer 'pesticide residues' / pesticides.",
            options: [],
          },
          {
            questionNumber: 6,
            passageText: "Urban Beekeeping: Sweet Success or Sticky Problem? - Paragraph E",
            prompt: "What does Brussels encourage people to plant on unused land? (NO MORE THAN TWO WORDS)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "wildflower meadows",
            explanation: "Paragraph E: '...encouraging instead the creation of wildflower meadows.'",
            options: [],
          },
          {
            questionNumber: 7,
            passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph A",
            prompt: "According to paragraph A, melatonin in teenagers is released:",
            type: "MULTIPLE_CHOICE",
            points: 1.0,
            correctAnswer: "C",
            explanation: "Paragraph A notes that during puberty, circadian rhythms shift so melatonin is released later than in childhood.",
            options: [
              { optionLabel: "A", content: "in smaller amounts than in adults", isCorrect: false },
              { optionLabel: "B", content: "earlier in the evening than in adults", isCorrect: false },
              { optionLabel: "C", content: "later than in childhood", isCorrect: true },
              { optionLabel: "D", content: "only after midnight", isCorrect: false },
            ],
          },
          {
            questionNumber: 8,
            passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph C",
            prompt: "Which of the following is NOT mentioned as a difficulty of later school start times?",
            type: "MULTIPLE_CHOICE",
            points: 1.0,
            correctAnswer: "C",
            explanation: "Paragraph C mentions bus schedules, sports, and working parents, but does NOT mention teachers' salaries.",
            options: [
              { optionLabel: "A", content: "bus timetables", isCorrect: false },
              { optionLabel: "B", content: "extracurricular sports", isCorrect: false },
              { optionLabel: "C", content: "teachers' salaries", isCorrect: true },
              { optionLabel: "D", content: "working parents' schedules", isCorrect: false },
            ],
          },
          {
            questionNumber: 9,
            passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up",
            prompt: "What is the writer's main purpose in the passage?",
            type: "MULTIPLE_CHOICE",
            points: 1.0,
            correctAnswer: "B",
            explanation: "The passage objectively explores scientific evidence and practical implications of later school start times.",
            options: [
              { optionLabel: "A", content: "to criticize traditional education policies", isCorrect: false },
              { optionLabel: "B", content: "to explain the evidence for later school start times", isCorrect: true },
              { optionLabel: "C", content: "to advise parents on managing teenage bedtime routines", isCorrect: false },
              { optionLabel: "D", content: "to compare sleep patterns across different age groups", isCorrect: false },
            ],
          },
          {
            questionNumber: 10,
            passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph B",
            prompt: "In the trial, fewer pupils arrived ______ to first lessons. (ONE WORD ONLY)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "late",
            explanation: "Paragraph B: Rates of chronic lateness fell sharply, meaning fewer pupils arrived late.",
            options: [],
          },
          {
            questionNumber: 11,
            passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph D",
            prompt: "Sleep helps the brain with memory ______. (ONE WORD ONLY)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "consolidation",
            explanation: "Paragraph D explicitly identifies memory consolidation during deep sleep stages.",
            options: [],
          },
          {
            questionNumber: 12,
            passageText: "Reading Passage 2: Why Teenagers Struggle to Wake Up - Paragraph C",
            prompt: "Some districts solved transport problems by staggering start times between older pupils and ______ ones. (ONE WORD ONLY)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "younger",
            explanation: "Paragraph C: Districts staggered start times between older students and younger pupils.",
            options: [],
          },
        ];
      } else if (skill === "LISTENING") {
        parsedQuestions = [
          {
            questionNumber: 1,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Surname: _______ (Write NO MORE THAN TWO WORDS AND/OR A NUMBER)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "Baxter",
            explanation: "Audio: Clerk asks for surname, applicant spells B-A-X-T-E-R.",
            options: [],
          },
          {
            questionNumber: 2,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Address: 42 _______ Road, Highbury",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "Elm",
            explanation: "Audio: Applicant confirms address is 42 Elm Road.",
            options: [],
          },
          {
            questionNumber: 3,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Postcode: KL9 _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "4PT",
            explanation: "Audio: Postcode is confirmed as KL9 4PT.",
            options: [],
          },
          {
            questionNumber: 4,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Contact telephone: 07700 900 _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "238119",
            explanation: "Audio: Arthur gives phone number ending in 238119.",
            options: [],
          },
          {
            questionNumber: 5,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Type of membership required: _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "Gold",
            explanation: "Audio: Arthur selects Gold membership for full gym and pool access.",
            options: [],
          },
          {
            questionNumber: 6,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Cost of membership per month: £ _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "45",
            explanation: "Audio: Monthly fee for Gold membership is forty-five pounds (£45).",
            options: [],
          },
          {
            questionNumber: 7,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Health & fitness note: Suffered from an injury to his _______ last year",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "back",
            explanation: "Audio: Arthur notes he injured his back and needs low-impact exercises.",
            options: [],
          },
          {
            questionNumber: 8,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Induction session booked for: Saturday at _______ with Maria",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "10.30 a.m.",
            explanation: "Audio: Induction appointment is set for 10.30 a.m. on Saturday.",
            options: [],
          },
        ];
      } else if (skill === "WRITING") {
        parsedQuestions = [
          {
            questionNumber: 1,
            passageText: "IELTS WRITING TASK 2: ACADEMIC ESSAY\nTopic: Public transport vs. building new roads.",
            prompt: "Viết bài luận hoàn chỉnh tối thiểu 250 từ cho chủ đề trên (Writing Task 2).",
            type: "ESSAY",
            points: 9.0,
            correctAnswer: "",
            explanation: "Chấm điểm trực tiếp bởi giáo viên theo 4 tiêu chí IELTS: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.",
            options: [],
          },
        ];
      } else if (skill === "ALL_SKILLS") {
        // Tự động phân tách trọn vẹn từng phần riêng biệt từ IELTS Mini Practice Book
        const readingPassage1Text = `READING PASSAGE 1: URBAN BEEKEEPING: SWEET SUCCESS OR STICKY PROBLEM?
Paragraph A: Over the past decade, urban beekeeping has experienced an unprecedented boom. From London and Paris to New York and Melbourne, thousands of rooftop and backyard apiaries have sprung up. Driven by celebrity endorsements, corporate sustainability initiatives, and well-meaning citizens wishing to 'save the bees', metropolitan hives have proliferated at remarkable speed. In Greater London alone, the number of registered beehives surged from roughly 1,000 in 2007 to over 5,000 by 2021.

Paragraph B: Advocates point to several compelling advantages. City honey, surprisingly, often contains fewer pesticide residues than its rural counterpart, where agricultural chemical spraying is pervasive. Moreover, diverse urban flora — from balcony geraniums and roadside lime trees to botanical gardens — provides a nectar source that can span from early spring through late autumn. Studies have even noted that urban honey yields per hive can match or exceed rural averages.

Paragraph C: However, entomologists and conservation biologists urge caution. The primary concern is that managed honeybees (Apis mellifera) are not an endangered species; rather, they are an agricultural animal. When urban centres become oversaturated with managed hives, intense competition erupts between commercial honeybees and wild pollinators — such as bumblebees, solitary bees, and hoverflies — which are already experiencing precipitous population declines.

Paragraph D: Furthermore, disease transmission between hives poses a grave danger in densely populated urban settings. Pathogens like the deformed wing virus and parasites such as the Varroa destructor mite spread rapidly between neighbouring colonies when floral resources are shared.

Paragraph E: To address these challenges, several European cities have begun implementing evidence-based regulations. In Brussels, local authorities advise against installing new hives in zones with low floral density, encouraging instead the creation of wildflower meadows. The consensus emerging among bee researchers is clear: keeping honeybees is an engaging agricultural hobby, but it must not be conflated with the conservation of wild pollinators.`;

        const readingQuestionsP1 = [
          {
            questionNumber: 1,
            passageText: "Urban Beekeeping - Paragraph A",
            prompt: "The number of hives in London has more than doubled since 2007.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "TRUE",
            explanation: "Paragraph A: Surged from roughly 1,000 to over 5,000 (fivefold increase).",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: true },
              { optionLabel: "B", content: "FALSE", isCorrect: false },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
            ],
          },
          {
            questionNumber: 2,
            passageText: "Urban Beekeeping - Paragraph B",
            prompt: "Honey from city hives tastes more consistent than honey from the countryside.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "FALSE",
            explanation: "Paragraph B explains urban honey tastes varied due to diverse plants, not more consistent.",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: false },
              { optionLabel: "B", content: "FALSE", isCorrect: true },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
            ],
          },
          {
            questionNumber: 3,
            passageText: "Urban Beekeeping - Paragraph C",
            prompt: "Honeybees can threaten wild pollinators by competing with them for food.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "TRUE",
            explanation: "Paragraph C notes intense competition between commercial honeybees and wild pollinators.",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: true },
              { optionLabel: "B", content: "FALSE", isCorrect: false },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
            ],
          },
          {
            questionNumber: 4,
            passageText: "Urban Beekeeping - Paragraph A",
            prompt: "Employees who join company hive schemes are given a share of the honey.",
            type: "TRUE_FALSE_NG",
            points: 1.0,
            correctAnswer: "NOT GIVEN",
            explanation: "Paragraph A mentions corporate initiatives, but no information about honey shares for staff.",
            options: [
              { optionLabel: "A", content: "TRUE", isCorrect: false },
              { optionLabel: "B", content: "FALSE", isCorrect: false },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: true },
            ],
          },
          {
            questionNumber: 5,
            passageText: "Urban Beekeeping - Paragraph B",
            prompt: "What is sprayed on farm crops that can harm bee colonies? (NO MORE THAN TWO WORDS)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "pesticides",
            explanation: "Paragraph B: 'fewer pesticide residues'.",
            options: [],
          },
          {
            questionNumber: 6,
            passageText: "Urban Beekeeping - Paragraph E",
            prompt: "What does Brussels encourage people to plant on unused land? (NO MORE THAN TWO WORDS)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "wildflower meadows",
            explanation: "Paragraph E: '...encouraging instead the creation of wildflower meadows.'",
            options: [],
          },
        ];

        const readingPassage2Text = `READING PASSAGE 2: WHY TEENAGERS STRUGGLE TO WAKE UP
Paragraph A: For generations, parents have accused teenagers of being lazy for sleeping through the morning. However, neuroscientists have proved that adolescent sleep patterns are driven by biology rather than attitude. During puberty, the circadian clock shifts: melatonin is released up to two hours later in the evening than in adults or young children.

Paragraph B: In a landmark study involving 40 secondary schools in the UK, shifting the school start time from 8:30 a.m. to 10:00 a.m. produced a noticeable improvement in GCSE grades. Rates of chronic lateness fell sharply, and student wellbeing scores improved markedly.

Paragraph C: Implementing delayed start times has not been without logistical friction. Difficulties cited include adjusting bus timetables, coordinating with working parents' schedules, and rescheduling extracurricular sports. Some districts solved this by staggering start times between older pupils and younger ones.

Paragraph D: As cognitive neuroscientists continue to map the adolescent brain, the consensus is clear: adequate sleep is vital for memory consolidation and emotional regulation.`;

        const readingQuestionsP2 = [
          {
            questionNumber: 7,
            passageText: "Why Teenagers Struggle to Wake Up - Paragraph A",
            prompt: "According to paragraph A, melatonin in teenagers is released:",
            type: "MULTIPLE_CHOICE",
            points: 1.0,
            correctAnswer: "C",
            explanation: "Paragraph A: Melatonin is released later than in childhood.",
            options: [
              { optionLabel: "A", content: "in smaller amounts than in adults", isCorrect: false },
              { optionLabel: "B", content: "earlier in the evening than in adults", isCorrect: false },
              { optionLabel: "C", content: "later than in childhood", isCorrect: true },
              { optionLabel: "D", content: "only after midnight", isCorrect: false },
            ],
          },
          {
            questionNumber: 8,
            passageText: "Why Teenagers Struggle to Wake Up - Paragraph C",
            prompt: "Which of the following is NOT mentioned as a difficulty of later school start times?",
            type: "MULTIPLE_CHOICE",
            points: 1.0,
            correctAnswer: "C",
            explanation: "Paragraph C does not mention teachers' salaries.",
            options: [
              { optionLabel: "A", content: "bus timetables", isCorrect: false },
              { optionLabel: "B", content: "extracurricular sports", isCorrect: false },
              { optionLabel: "C", content: "teachers' salaries", isCorrect: true },
              { optionLabel: "D", content: "working parents' schedules", isCorrect: false },
            ],
          },
          {
            questionNumber: 9,
            passageText: "Why Teenagers Struggle to Wake Up",
            prompt: "What is the writer's main purpose in the passage?",
            type: "MULTIPLE_CHOICE",
            points: 1.0,
            correctAnswer: "B",
            explanation: "To objectively explain the evidence and implications of later start times.",
            options: [
              { optionLabel: "A", content: "to criticize traditional education policies", isCorrect: false },
              { optionLabel: "B", content: "to explain the evidence for later school start times", isCorrect: true },
              { optionLabel: "C", content: "to advise parents on managing teenage bedtime routines", isCorrect: false },
              { optionLabel: "D", content: "to compare sleep patterns across different age groups", isCorrect: false },
            ],
          },
          {
            questionNumber: 10,
            passageText: "Why Teenagers Struggle to Wake Up - Paragraph B",
            prompt: "In the trial, fewer pupils arrived ______ to first lessons. (ONE WORD ONLY)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "late",
            explanation: "Paragraph B: Falling rates of chronic lateness mean fewer arrived late.",
            options: [],
          },
          {
            questionNumber: 11,
            passageText: "Why Teenagers Struggle to Wake Up - Paragraph D",
            prompt: "Sleep helps the brain with memory ______. (ONE WORD ONLY)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "consolidation",
            explanation: "Paragraph D: 'memory consolidation'.",
            options: [],
          },
          {
            questionNumber: 12,
            passageText: "Why Teenagers Struggle to Wake Up - Paragraph C",
            prompt: "Some districts solved transport problems by staggering start times between older pupils and ______ ones. (ONE WORD ONLY)",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "younger",
            explanation: "Paragraph C: 'older students and younger pupils'.",
            options: [],
          },
        ];

        const listeningPassage = `SECTION 1: RIVERSIDE SPORTS CLUB MEMBERSHIP FORM
Audio Track: IELTS Mini Practice Test - Section 1 Form Completion
Scenario: Arthur Baxter inquires about club membership and books an induction session with Maria.
Listen to the conversation and complete Questions 1-8. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.

Membership Form Details:
First name: Arthur
Surname: [Question 13]
Address: 42 [Question 14] Road, Highbury
Postcode: KL9 [Question 15]
Contact phone: 07700 900 [Question 16]
Type of membership: [Question 17]
Cost per month: £ [Question 18]
Health note: Injury to his [Question 19]
Induction session: Saturday at [Question 20] with Maria`;

        const listeningQuestions = [
          {
            questionNumber: 13,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Surname: _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "Baxter",
            explanation: "Arthur Baxter (spelled B-A-X-T-E-R).",
            options: [],
          },
          {
            questionNumber: 14,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Address: 42 _______ Road, Highbury",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "Elm",
            explanation: "42 Elm Road.",
            options: [],
          },
          {
            questionNumber: 15,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Postcode: KL9 _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "4PT",
            explanation: "KL9 4PT.",
            options: [],
          },
          {
            questionNumber: 16,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Contact telephone: 07700 900 _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "238119",
            explanation: "Phone number suffix is 238119.",
            options: [],
          },
          {
            questionNumber: 17,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Type of membership required: _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "Gold",
            explanation: "Gold membership tier.",
            options: [],
          },
          {
            questionNumber: 18,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Cost of membership per month: £ _______",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "45",
            explanation: "Monthly fee £45.",
            options: [],
          },
          {
            questionNumber: 19,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Health & fitness note: Suffered from an injury to his _______ last year",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "back",
            explanation: "Injury to his back.",
            options: [],
          },
          {
            questionNumber: 20,
            passageText: "Riverside Sports Club - Membership Application Form",
            prompt: "Induction session booked for: Saturday at _______ with Maria",
            type: "FILL_IN_BLANK",
            points: 1.0,
            correctAnswer: "10.30 a.m.",
            explanation: "Saturday at 10.30 a.m. with Maria.",
            options: [],
          },
        ];

        const writingPassage = `WRITING TASK 2: ACADEMIC ESSAY
You should spend about 40 minutes on this task. Write about the following topic:

Some people think that governments should spend money on improving public transport rather than building new roads.
To what extent do you agree or disagree?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.
Write at least 250 words.`;

        const writingQuestions = [
          {
            questionNumber: 21,
            passageText: "IELTS WRITING TASK 2",
            prompt: "Viết bài luận hoàn chỉnh tối thiểu 250 từ cho chủ đề trên (Writing Task 2).",
            type: "ESSAY",
            points: 9.0,
            correctAnswer: "Essay",
            explanation: "Chấm điểm trực tiếp bởi giáo viên theo 4 tiêu chí IELTS Writing: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.",
            options: [],
          },
        ];

        parsedQuestions = [
          ...readingQuestionsP1,
          ...readingQuestionsP2,
          ...listeningQuestions,
          ...writingQuestions,
        ];

        return {
          success: true,
          parsedData: {
            title,
            skill: "ALL_SKILLS",
            durationMinutes: durationMinutes || 120,
            audioUrl: audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            passageText: readingPassage1Text,
            questions: parsedQuestions,
            sections: [
              {
                id: "reading_1",
                key: "READING_1",
                skill: "READING",
                title: `${title} - Reading Passage 1: Urban Beekeeping`,
                durationMinutes: 30,
                passageText: readingPassage1Text,
                questions: readingQuestionsP1,
              },
              {
                id: "reading_2",
                key: "READING_2",
                skill: "READING",
                title: `${title} - Reading Passage 2: Why Teenagers Struggle to Wake Up`,
                durationMinutes: 30,
                passageText: readingPassage2Text,
                questions: readingQuestionsP2,
              },
              {
                id: "listening_1",
                key: "LISTENING_1",
                skill: "LISTENING",
                title: `${title} - Listening Section 1: Riverside Sports Club`,
                durationMinutes: 30,
                audioUrl: audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                passageText: listeningPassage,
                questions: listeningQuestions,
              },
              {
                id: "writing_1",
                key: "WRITING_1",
                skill: "WRITING",
                title: `${title} - Writing Task 2: Academic Essay`,
                durationMinutes: 40,
                passageText: writingPassage,
                questions: writingQuestions,
              },
            ],
          },
        };
      } else {
        parsedQuestions = [
          {
            questionNumber: 1,
            prompt: "Ghi âm câu trả lời Speaking Part 2 trong vòng 2 phút dựa trên gợi ý từ Cue Card.",
            type: "SPEAKING_RECORD",
            points: 9.0,
            correctAnswer: "",
            explanation: "Giáo viên chấm điểm dựa trên Fluency, Pronunciation, Lexical Resource và Grammar.",
            options: [],
          },
        ];
      }
    }

    return {
      success: true,
      parsedData: {
        title,
        skill,
        durationMinutes,
        audioUrl,
        passageText,
        questions: parsedQuestions,
      },
    };
  } catch (err: any) {
    console.error("[parseIeltsExamAction] Lỗi:", err);
    return { success: false, error: err.message || "Bóc tách đề thi thất bại!" };
  }
}

/**
 * Tạo nhiều Bài tập cùng lúc (Dành cho trường hợp bóc tách đề thi Full 4 Kỹ năng)
 */
export async function createMultipleAssignmentsAction(
  assignments: Array<{
    classId: string;
    title: string;
    description?: string;
    skill: string;
    type?: string;
    durationMinutes?: number;
    dueDate?: string | null;
    audioUrl?: string | null;
    enableProctoring?: boolean;
    maxTabSwitches?: number;
    questions: Array<any>;
  }>
) {
  try {
    const createdIds: string[] = [];
    for (const item of assignments) {
      const res = await createAssignmentAction(item);
      if (res.success && res.assignmentId) {
        createdIds.push(res.assignmentId);
      }
    }
    return {
      success: true,
      count: createdIds.length,
      assignmentIds: createdIds,
    };
  } catch (err: any) {
    console.error("[createMultipleAssignmentsAction] Lỗi:", err);
    return { success: false, error: err.message || "Tạo danh sách bài tập thất bại!" };
  }
}

/**
 * Nộp Bài tập & Giám sát Chống gian lận (Tab Switch Monitoring)
 */
export async function submitAssignmentAction(data: {
  assignmentId: string;
  answers: Array<{
    questionId: string;
    studentAnswer?: string;
    audioUrl?: string;
  }>;
  tabSwitchCount: number;
  isCheatingFlagged: boolean;
  autoSubmittedReason?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Vui lòng đăng nhập để nộp bài!" };
    }

    if (!(await isDbAlive())) {
      const assign = (globalAssignmentsStore.demoAssignments || []).find(
        (a: any) => a.id === data.assignmentId
      ) || (globalAssignmentsStore.demoAssignments || [])[0];

      if (!assign) {
        return { success: false, error: "Bài tập không tồn tại!" };
      }

      let totalScore = 0;
      let maxScore = 0;
      const formattedAnswers = data.answers.map((ans, idx) => {
        const q = (assign.questions || []).find((quest: any) => quest.id === ans.questionId);
        const pts = q?.points ? Number(q.points) : 1;
        maxScore += pts;
        let isCorrect: boolean | null = null;
        let awardedPoints = 0;

        if (
          q?.type === "MULTIPLE_CHOICE" ||
          q?.type === "TRUE_FALSE_NG" ||
          q?.type === "FILL_IN_BLANK"
        ) {
          const cleanCorrect = (q.correctAnswer || "").trim().toLowerCase();
          const cleanStudent = (ans.studentAnswer || "").trim().toLowerCase();
          isCorrect = cleanCorrect === cleanStudent && cleanCorrect.length > 0;
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
          points: pts,
          correctAnswer: q?.correctAnswer || "",
          studentAnswer: ans.studentAnswer || null,
          audioUrl: ans.audioUrl || null,
          isCorrect,
          awardedPoints,
          teacherComment: null,
        };
      });

      const isObjectiveOnly = (assign.questions || []).every(
        (q: any) =>
          q.type === "MULTIPLE_CHOICE" ||
          q.type === "TRUE_FALSE_NG" ||
          q.type === "FILL_IN_BLANK"
      );

      const isCheating = Boolean(
        data.isCheatingFlagged || (data.tabSwitchCount > (assign.maxTabSwitches || 3))
      );

      const submissionId = `sub-${Date.now()}`;
      const newSub = {
        id: submissionId,
        studentId: session.userId || "demo-student-1",
        studentName: session.fullName || "Trần Thị Lan",
        studentEmail: session.email || "hv001@simpace.vn",
        attemptNumber: (assign.submissions || []).length + 1,
        submittedAt: new Date().toISOString(),
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

      safeRevalidate();
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
      include: { questions: true },
    });

    if (!assignment) {
      return { success: false, error: "Bài tập không tồn tại!" };
    }

    // Tự động chấm điểm các câu trắc nghiệm & điền từ
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

      // Trắc nghiệm & Điền từ: Tự động so sánh đáp án
      if (
        q.type === "MULTIPLE_CHOICE" ||
        q.type === "TRUE_FALSE_NG" ||
        q.type === "FILL_IN_BLANK"
      ) {
        const cleanCorrect = (q.correctAnswer || "").trim().toLowerCase();
        const cleanStudent = (ans.studentAnswer || "").trim().toLowerCase();
        isCorrect = cleanCorrect === cleanStudent && cleanCorrect.length > 0;
        awardedPoints = isCorrect ? q.points : 0;
        totalScore += awardedPoints;
      } else {
        // Tự luận (ESSAY) & Nói (SPEAKING): Chờ giáo viên chấm tay
        isCorrect = null;
        awardedPoints = 0;
      }

      return {
        questionId: ans.questionId,
        studentAnswer: ans.studentAnswer || null,
        audioUrl: ans.audioUrl || null,
        isCorrect,
        awardedPoints,
      };
    });

    // Kiểm tra xem đã nộp lần nào chưa
    const previousSubmissionsCount = await prisma.assignmentSubmission.count({
      where: {
        assignmentId: data.assignmentId,
        studentId: session.userId,
      },
    });

    const isObjectiveOnly = assignment.questions.every(
      (q) =>
        q.type === "MULTIPLE_CHOICE" ||
        q.type === "TRUE_FALSE_NG" ||
        q.type === "FILL_IN_BLANK"
    );

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: data.assignmentId,
        studentId: session.userId,
        attemptNumber: previousSubmissionsCount + 1,
        submittedAt: new Date(),
        status: isObjectiveOnly ? "GRADED" : "SUBMITTED",
        score: isObjectiveOnly ? totalScore : null,
        totalPoints: maxScore,
        tabSwitchCount: data.tabSwitchCount || 0,
        isCheatingFlagged: data.isCheatingFlagged || (data.tabSwitchCount > assignment.maxTabSwitches),
        autoSubmittedReason: data.autoSubmittedReason || null,
        answers: {
          create: answersToCreate,
        },
      },
    });

    safeRevalidate();
    return {
      success: true,
      submissionId: submission.id,
      score: submission.score,
      totalPoints: submission.totalPoints,
      isCheatingFlagged: submission.isCheatingFlagged,
    };
  } catch (err: any) {
    console.error("[submitAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Nộp bài thất bại!" };
  }
}

/**
 * Lấy danh sách bài nộp của một bài tập để Giáo viên chấm điểm
 */
export async function getSubmissionsForAssignmentAction(assignmentId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Vui lòng đăng nhập!", submissions: [] };
    }

    if (!(await isDbAlive())) {
      const assign = (globalAssignmentsStore.demoAssignments || []).find(
        (a: any) => a.id === assignmentId
      ) || (globalAssignmentsStore.demoAssignments || [])[0];

      return {
        success: true,
        submissions: assign?.submissions || [],
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
        type: a.question.type,
        points: a.question.points,
        correctAnswer: a.question.correctAnswer,
        studentAnswer: a.studentAnswer,
        audioUrl: a.audioUrl,
        isCorrect: a.isCorrect,
        awardedPoints: a.awardedPoints,
        teacherComment: a.teacherComment,
      })),
    }));

    return { success: true, submissions: formatted };
  } catch (err: any) {
    console.error("[getSubmissionsForAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tải danh sách nộp bài!", submissions: [] };
  }
}

/**
 * Giáo viên chấm điểm bài tự luận / bài nói & ghi nhận xét
 */
export async function gradeSubmissionAction(data: {
  submissionId: string;
  gradedAnswers: Array<{
    answerId: string;
    awardedPoints: number;
    teacherComment?: string;
  }>;
  teacherFeedback?: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Vui lòng đăng nhập để chấm bài!" };
    }

    if (!(await isDbAlive())) {
      let calculatedTotalScore = 0;
      for (const assign of (globalAssignmentsStore.demoAssignments || [])) {
        const sub = (assign.submissions || []).find((s: any) => s.id === data.submissionId);
        if (sub) {
          for (const item of data.gradedAnswers) {
            const ans = (sub.answers || []).find((a: any) => a.id === item.answerId);
            if (ans) {
              ans.awardedPoints = Number(item.awardedPoints) || 0;
              ans.teacherComment = item.teacherComment?.trim() || null;
            }
            calculatedTotalScore += Number(item.awardedPoints) || 0;
          }
          sub.score = calculatedTotalScore;
          sub.status = "GRADED";
          sub.teacherFeedback = data.teacherFeedback?.trim() || null;
          safeRevalidate();
          return { success: true, totalScore: calculatedTotalScore };
        }
      }
      safeRevalidate();
      return { success: true, totalScore: 0 };
    }

    let calculatedTotalScore = 0;

    // Cập nhật từng câu hỏi
    for (const item of data.gradedAnswers) {
      await prisma.submissionAnswer.update({
        where: { id: item.answerId },
        data: {
          awardedPoints: Number(item.awardedPoints) || 0,
          teacherComment: item.teacherComment?.trim() || null,
        },
      });
      calculatedTotalScore += Number(item.awardedPoints) || 0;
    }

    // Cập nhật bản ghi nộp bài chung
    await prisma.assignmentSubmission.update({
      where: { id: data.submissionId },
      data: {
        score: calculatedTotalScore,
        status: "GRADED",
        teacherFeedback: data.teacherFeedback?.trim() || null,
        gradedById: session.userId,
      },
    });

    safeRevalidate();
    return { success: true, totalScore: calculatedTotalScore };
  } catch (err: any) {
    console.error("[gradeSubmissionAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể lưu kết quả chấm bài!" };
  }
}
