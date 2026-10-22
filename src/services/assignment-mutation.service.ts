import { prisma, isDbAlive } from "@/lib/prisma";
import { AssignmentSkill, AssignmentType, QuestionType } from "@prisma/client";

const globalAssignmentsStore = globalThis as unknown as {
  demoAssignments?: any[];
};

/**
 * Ánh xạ an toàn giữa QuestionType của bộ Exam Parser và Enum QuestionType của Prisma DB
 */
function mapQuestionTypeToDbEnum(typeStr?: string): QuestionType {
  switch (typeStr) {
    case "MULTIPLE_CHOICE_MULTI":
    case "MULTIPLE_SELECT":
      return "MULTIPLE_SELECT" as QuestionType;
    case "TRUE_FALSE_NG":
      return "TRUE_FALSE_NG" as QuestionType;
    case "FILL_IN_BLANK":
    case "MATCHING_HEADINGS":
    case "MATCHING_INFO":
    case "MATCHING_FEATURES":
    case "SENTENCE_ENDINGS":
    case "MAP":
    case "SHORT_ANSWER":
      return "FILL_IN_BLANK" as QuestionType;
    case "ESSAY":
      return "ESSAY" as QuestionType;
    case "SPEAKING_RECORD":
      return "SPEAKING_RECORD" as QuestionType;
    case "MULTIPLE_CHOICE":
    default:
      return "MULTIPLE_CHOICE" as QuestionType;
  }
}

export interface CreateAssignmentInput {
  classId?: string;
  targetClassIds?: string[];
  title: string;
  description?: string;
  skill: string;
  type?: string;
  durationMinutes?: number;
  dueDate?: string | null;
  startDate?: string | null;
  audioUrl?: string | null;
  enableProctoring?: boolean;
  maxTabSwitches?: number;
  flowcharts?: any[];
  tables?: any[];
  matchingHeadings?: any[];
  summaries?: any[];
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
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  skill?: string;
  type?: string;
  durationMinutes?: number;
  audioUrl?: string | null;
  classId?: string; // Sửa hạn nộp/cài đặt cho riêng lớp này
  updateAllClasses?: boolean; // Áp dụng cài đặt cho tất cả các lớp
  dueDate?: string | null;
  startDate?: string | null;
  enableProctoring?: boolean;
  maxTabSwitches?: number;
  questions?: Array<{
    id?: string;
    questionNumber: number;
    passageText?: string;
    prompt: string;
    type: string;
    points: number;
    correctAnswer?: string;
    explanation?: string;
    options?: Array<{
      id?: string;
      optionLabel: string;
      content: string;
      isCorrect: boolean;
    }>;
  }>;
}

/**
 * Tạo một Assignment gốc và tạo liên kết AssignmentClass cho nhiều lớp học cùng lúc
 */
export async function createAssignmentService(
  data: CreateAssignmentInput,
  createdById: string
): Promise<{ success: boolean; assignmentId?: string; assignedClassCount?: number; error?: string }> {
  const targetClassList: string[] = Array.from(
    new Set([...(data.targetClassIds || []), ...(data.classId ? [data.classId] : [])].filter(Boolean))
  );

  if (targetClassList.length === 0) {
    return { success: false, error: "Vui lòng chọn ít nhất 1 lớp học để giao bài tập!" };
  }

  const primaryClassId = targetClassList[0];

  const saveToDemoStore = () => {
    const totalPts = data.questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);
    const assignId = `assign-${Date.now()}`;
    const assignedClasses = targetClassList.map((cId) => ({
      id: `ac-${Date.now()}-${cId}`,
      assignmentId: assignId,
      classId: cId,
      dueDate: data.dueDate || null,
      startDate: data.startDate || null,
      enableProctoring: data.enableProctoring !== false,
      maxTabSwitches: 999, // Không giới hạn số lần out tab
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const newAssign = {
      id: assignId,
      classId: primaryClassId,
      title: data.title.trim(),
      description: JSON.stringify({
        instruction: data.description?.trim() || null,
        flowcharts: data.flowcharts || [],
        tables: data.tables || [],
        matchingHeadings: data.matchingHeadings || [],
        summaries: data.summaries || [],
      }),
      skill: data.skill || "READING",
      type: data.type || "HOMEWORK",
      durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : 60,
      dueDate: data.dueDate || null,
      audioUrl: data.audioUrl || null,
      enableProctoring: data.enableProctoring !== false,
      maxTabSwitches: 999, // Không giới hạn số lần out tab
      createdById: createdById || "SYSTEM",
      totalPoints: totalPts,
      submittedCount: 0,
      flaggedCount: 0,
      isActive: true,
      assignedClasses,
      flowcharts: data.flowcharts || [],
      tables: data.tables || [],
      matchingHeadings: data.matchingHeadings || [],
      summaries: data.summaries || [],
      createdAt: new Date().toISOString(),
      questions: data.questions.map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        questionNumber: q.questionNumber || idx + 1,
        passageText: q.passageText?.trim() || null,
        prompt: q.prompt.trim(),
        type: mapQuestionTypeToDbEnum(q.type),
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

    return {
      success: true,
      assignmentId: newAssign.id,
      assignedClassCount: targetClassList.length,
    };
  };

  if (!(await isDbAlive())) {
    return saveToDemoStore();
  }

  try {
    const assignment = await prisma.assignment.create({
      data: {
        classId: primaryClassId,
        title: data.title.trim(),
        description: JSON.stringify({
          instruction: data.description?.trim() || null,
          flowcharts: data.flowcharts || [],
          tables: data.tables || [],
          matchingHeadings: data.matchingHeadings || [],
          summaries: data.summaries || [],
        }),
        skill: (data.skill as AssignmentSkill) || "READING",
        type: (data.type as AssignmentType) || "HOMEWORK",
        durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        audioUrl: data.audioUrl || null,
        enableProctoring: data.enableProctoring !== false,
        maxTabSwitches: 999, // Không giới hạn số lần out tab
        createdById: createdById || "SYSTEM",
        assignedClasses: {
          create: targetClassList.map((cId) => ({
            classId: cId,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            startDate: data.startDate ? new Date(data.startDate) : null,
            enableProctoring: data.enableProctoring !== false,
            maxTabSwitches: 999,
          })),
        },
        questions: {
          create: data.questions.map((q, idx) => ({
            questionNumber: q.questionNumber || idx + 1,
            passageText: q.passageText?.trim() || null,
            prompt: q.prompt.trim(),
            type: mapQuestionTypeToDbEnum(q.type),
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
        assignedClasses: true,
        questions: {
          include: { options: true },
        },
      },
    });

    return {
      success: true,
      assignmentId: assignment.id,
      assignedClassCount: assignment.assignedClasses.length,
    };
  } catch (dbErr: any) {
    const errText = String(dbErr?.message || dbErr || "");
    // Bắt lỗi P2021 hoặc text lỗi nếu bảng assignments chưa được tạo trên Supabase PostgreSQL
    if (dbErr?.code === "P2021" || errText.includes("does not exist")) {
      console.warn(
        "[createAssignmentService] CSDL chưa có bảng 'assignments', tự động chuyển sang lưu tạm bộ nhớ:",
        errText
      );
      return saveToDemoStore();
    }
    throw dbErr;
  }
}

/**
 * Cập nhật Bài tập (sửa nội dung đề gốc, hoặc chỉnh sửa cài đặt/hạn nộp theo từng lớp)
 */
export async function updateAssignmentService(
  assignmentId: string,
  data: UpdateAssignmentInput
): Promise<{
  success: boolean;
  submissionCount?: number;
  message?: string;
  error?: string;
}> {
  if (!(await isDbAlive())) {
    const assign = (globalAssignmentsStore.demoAssignments || []).find((a) => a.id === assignmentId);
    if (!assign) return { success: false, error: "Không tìm thấy bài tập!" };

    if (data.title !== undefined) assign.title = data.title.trim();
    if (data.description !== undefined) assign.description = data.description?.trim() || null;
    if (data.skill !== undefined) assign.skill = data.skill;
    if (data.type !== undefined) assign.type = data.type;
    if (data.durationMinutes !== undefined) assign.durationMinutes = data.durationMinutes;
    if (data.audioUrl !== undefined) assign.audioUrl = data.audioUrl;

    // Cập nhật cài đặt lớp
    if (data.updateAllClasses) {
      if (data.dueDate !== undefined) assign.dueDate = data.dueDate;
      if (data.enableProctoring !== undefined) assign.enableProctoring = data.enableProctoring;
      if (data.maxTabSwitches !== undefined) assign.maxTabSwitches = data.maxTabSwitches;
      if (Array.isArray(assign.assignedClasses)) {
        assign.assignedClasses.forEach((ac: any) => {
          if (data.dueDate !== undefined) ac.dueDate = data.dueDate;
          if (data.enableProctoring !== undefined) ac.enableProctoring = data.enableProctoring;
          if (data.maxTabSwitches !== undefined) ac.maxTabSwitches = data.maxTabSwitches;
        });
      }
    } else if (data.classId && Array.isArray(assign.assignedClasses)) {
      const classLink = assign.assignedClasses.find((ac: any) => ac.classId === data.classId);
      if (classLink) {
        if (data.dueDate !== undefined) classLink.dueDate = data.dueDate;
        if (data.enableProctoring !== undefined) classLink.enableProctoring = data.enableProctoring;
        if (data.maxTabSwitches !== undefined) classLink.maxTabSwitches = data.maxTabSwitches;
      }
    }

    // Cập nhật câu hỏi nếu có
    if (data.questions && data.questions.length > 0) {
      assign.questions = data.questions.map((q, idx) => ({
        id: q.id || `q-${Date.now()}-${idx}`,
        questionNumber: q.questionNumber || idx + 1,
        passageText: q.passageText?.trim() || null,
        prompt: q.prompt.trim(),
        type: mapQuestionTypeToDbEnum(q.type),
        points: Number(q.points) || 1.0,
        correctAnswer: q.correctAnswer?.trim() || null,
        explanation: q.explanation?.trim() || null,
        orderIndex: idx,
        options: (q.options || []).map((opt, oIdx) => ({
          id: opt.id || `opt-${Date.now()}-${idx}-${oIdx}`,
          optionLabel: opt.optionLabel,
          content: opt.content,
          isCorrect: Boolean(opt.isCorrect),
        })),
      }));
    }

    const subCount = (assign.submissions || []).length;
    return {
      success: true,
      submissionCount: subCount,
      message: "Cập nhật bài tập thành công!",
    };
  }

  // Cập nhật Prisma
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.skill !== undefined) updateData.skill = data.skill as AssignmentSkill;
  if (data.type !== undefined) updateData.type = data.type as AssignmentType;
  if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes ? Number(data.durationMinutes) : null;
  if (data.audioUrl !== undefined) updateData.audioUrl = data.audioUrl;

  if (data.updateAllClasses) {
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.enableProctoring !== undefined) updateData.enableProctoring = data.enableProctoring;
    if (data.maxTabSwitches !== undefined) updateData.maxTabSwitches = data.maxTabSwitches;

    await prisma.assignmentClass.updateMany({
      where: { assignmentId, isActive: true },
      data: {
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        enableProctoring: data.enableProctoring !== undefined ? data.enableProctoring : undefined,
        maxTabSwitches: data.maxTabSwitches !== undefined ? data.maxTabSwitches : undefined,
      },
    });
  } else if (data.classId) {
    await prisma.assignmentClass.updateMany({
      where: { assignmentId, classId: data.classId },
      data: {
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        enableProctoring: data.enableProctoring !== undefined ? data.enableProctoring : undefined,
        maxTabSwitches: data.maxTabSwitches !== undefined ? data.maxTabSwitches : undefined,
      },
    });
  }

  // Cập nhật các câu hỏi nếu được gửi kèm
  if (data.questions && data.questions.length > 0) {
    // Xóa câu hỏi cũ và tạo mới trong transaction
    await prisma.$transaction([
      prisma.assignmentQuestion.deleteMany({ where: { assignmentId } }),
      ...data.questions.map((q, idx) =>
        prisma.assignmentQuestion.create({
          data: {
            assignmentId,
            questionNumber: q.questionNumber || idx + 1,
            passageText: q.passageText?.trim() || null,
            prompt: q.prompt.trim(),
            type: mapQuestionTypeToDbEnum(q.type),
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
          },
        })
      ),
    ]);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
    });
  }

  const existingSubmissions = await prisma.assignmentSubmission.count({
    where: { assignmentId },
  });

  return {
    success: true,
    submissionCount: existingSubmissions,
    message: "Cập nhật bài tập thành công!",
  };
}

/**
 * Xóa mềm Bài tập
 * Nếu có classId và không chọn deleteFromAll: chỉ xóa liên kết AssignmentClass của lớp đó.
 * Chỉ xóa hẳn Assignment gốc khi không còn lớp nào liên kết hoặc khi chọn deleteFromAll.
 */
export async function deleteAssignmentService(
  assignmentId: string,
  classId?: string,
  deleteFromAll?: boolean
): Promise<{ success: boolean; deletedFromAll?: boolean; error?: string }> {
  if (!(await isDbAlive())) {
    const item = (globalAssignmentsStore.demoAssignments || []).find((a) => a.id === assignmentId);
    if (!item) return { success: true };

    if (classId && !deleteFromAll && Array.isArray(item.assignedClasses)) {
      const link = item.assignedClasses.find((ac: any) => ac.classId === classId);
      if (link) link.isActive = false;
      const remainingActive = item.assignedClasses.filter((ac: any) => ac.isActive !== false);
      if (remainingActive.length === 0) {
        item.isActive = false;
        return { success: true, deletedFromAll: true };
      }
      return { success: true, deletedFromAll: false };
    }

    item.isActive = false;
    if (Array.isArray(item.assignedClasses)) {
      item.assignedClasses.forEach((ac: any) => {
        ac.isActive = false;
      });
    }
    return { success: true, deletedFromAll: true };
  }

  if (classId && !deleteFromAll) {
    await prisma.assignmentClass.updateMany({
      where: { assignmentId, classId },
      data: { isActive: false },
    });

    const activeRemaining = await prisma.assignmentClass.count({
      where: { assignmentId, isActive: true },
    });

    if (activeRemaining === 0) {
      await prisma.assignment.update({
        where: { id: assignmentId },
        data: { isActive: false },
      });
      return { success: true, deletedFromAll: true };
    }

    return { success: true, deletedFromAll: false };
  }

  await prisma.$transaction([
    prisma.assignmentClass.updateMany({
      where: { assignmentId },
      data: { isActive: false },
    }),
    prisma.assignment.update({
      where: { id: assignmentId },
      data: { isActive: false },
    }),
  ]);

  return { success: true, deletedFromAll: true };
}
