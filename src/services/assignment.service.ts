import { prisma, isDbAlive } from "@/lib/prisma";
import { isAnswerCorrect, isObjectiveOnly as allObjective, isObjectiveType } from "@/lib/grading";
import { AssignmentSkill, AssignmentType, QuestionType } from "@prisma/client";

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
          passageText:
            "READING PASSAGE: THE HISTORY OF TEA CULTURE\n\nParagraph A: According to Chinese legend, tea was first discovered in 2737 BC by Emperor Shennong, a renowned herbalist and scholar. While boiling drinking water in the shade of a wild tea tree, a light breeze blew a few leaves into the pot, infusing the water with a delicate aroma and refreshing flavour.\n\nParagraph B: During the Han dynasty (202 BC – 220 AD), tea was primarily used as a medicinal concoction by royal physicians and Daoist monks to promote alertness and aid digestion. It was not until the Tang dynasty that tea drinking evolved into a widespread cultural art form across East Asia.",
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
          passageText:
            "READING PASSAGE: THE HISTORY OF TEA CULTURE\n\nParagraph A: According to Chinese legend, tea was first discovered in 2737 BC by Emperor Shennong, a renowned herbalist and scholar. While boiling drinking water in the shade of a wild tea tree, a light breeze blew a few leaves into the pot, infusing the water with a delicate aroma and refreshing flavour.\n\nParagraph B: During the Han dynasty (202 BC – 220 AD), tea was primarily used as a medicinal concoction by royal physicians and Daoist monks to promote alertness and aid digestion. It was not until the Tang dynasty that tea drinking evolved into a widespread cultural art form across East Asia.",
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

export async function getClassAssignmentsService(classId: string) {
  if (!(await isDbAlive())) {
    const list = (globalAssignmentsStore.demoAssignments || []).filter(
      (a) => a.isActive !== false && (!classId || a.classId === classId)
    );
    return { success: true, assignments: list };
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
      return {
        success: true,
        assignment: {
          ...found,
          questions: (found.questions || []).map((q: any) => ({
            ...q,
            passageText: resolveLegacyShortPassageText(q.passageText, found.title),
          })),
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
        passageText: resolveLegacyShortPassageText(q.passageText, assignment.title),
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
}

export async function createAssignmentService(
  data: {
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
  },
  createdById: string
): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
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
      createdById: createdById || "SYSTEM",
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
    globalAssignmentsStore.demoAssignments = [
      newAssign,
      ...(globalAssignmentsStore.demoAssignments || []),
    ];
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
      createdById: createdById || "SYSTEM",
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
          options:
            q.options && q.options.length > 0
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

  return { success: true, assignmentId: assignment.id };
}

export async function deleteAssignmentService(
  assignmentId: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isDbAlive())) {
    const item = (globalAssignmentsStore.demoAssignments || []).find((a) => a.id === assignmentId);
    if (item) item.isActive = false;
    return { success: true };
  }

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { isActive: false },
  });

  return { success: true };
}

export async function submitAssignmentService(
  data: {
    assignmentId: string;
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
  if (!(await isDbAlive())) {
    const assign =
      (globalAssignmentsStore.demoAssignments || []).find(
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
        points: pts,
        correctAnswer: q?.correctAnswer || "",
        studentAnswer: ans.studentAnswer || null,
        audioUrl: ans.audioUrl || null,
        isCorrect,
        awardedPoints,
        teacherComment: null,
      };
    });

    const isObjectiveOnly = allObjective(assign.questions || []);
    const isCheating = Boolean(
      data.isCheatingFlagged || data.tabSwitchCount > (assign.maxTabSwitches || 3)
    );

    const submissionId = `sub-${Date.now()}`;
    const newSub = {
      id: submissionId,
      studentId: studentInfo.userId || "demo-student-1",
      studentName: studentInfo.fullName || "Trần Thị Lan",
      studentEmail: studentInfo.email || "hv001@simpace.vn",
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

  const submission = await prisma.assignmentSubmission.create({
    data: {
      assignmentId: data.assignmentId,
      studentId: studentInfo.userId,
      attemptNumber: previousSubmissionsCount + 1,
      submittedAt: new Date(),
      status: isObjectiveOnly ? "GRADED" : "SUBMITTED",
      score: isObjectiveOnly ? totalScore : null,
      totalPoints: maxScore,
      tabSwitchCount: data.tabSwitchCount || 0,
      isCheatingFlagged:
        data.isCheatingFlagged || data.tabSwitchCount > assignment.maxTabSwitches,
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
}

export async function gradeSubmissionService(
  data: {
    submissionId: string;
    gradedAnswers: Array<{
      answerId: string;
      awardedPoints: number;
      teacherComment?: string;
    }>;
    teacherFeedback?: string;
  },
  gradedById: string
): Promise<{ success: boolean; totalScore?: number; error?: string }> {
  if (!(await isDbAlive())) {
    let calculatedTotalScore = 0;
    for (const assign of globalAssignmentsStore.demoAssignments || []) {
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
        return { success: true, totalScore: calculatedTotalScore };
      }
    }
    return { success: true, totalScore: 0 };
  }

  let calculatedTotalScore = 0;

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

  await prisma.assignmentSubmission.update({
    where: { id: data.submissionId },
    data: {
      score: calculatedTotalScore,
      status: "GRADED",
      teacherFeedback: data.teacherFeedback?.trim() || null,
      gradedById,
    },
  });

  return { success: true, totalScore: calculatedTotalScore };
}
