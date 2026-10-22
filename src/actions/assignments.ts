"use server";

import { isDbAlive } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkAuth, checkRole, ROLE_GROUPS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  createAssignmentService,
  updateAssignmentService,
  deleteAssignmentService,
  regradeAssignmentSubmissionsService,
  getAssignmentDetailService,
  getClassAssignmentsService,
  getSubmissionsForAssignmentService,
  gradeSubmissionService,
  submitAssignmentService,
} from "@/services/assignment.service";
import { parseIeltsExamContent } from "@/services/ielts-parser.service";

function safeRevalidate(path: string = "/") {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * Lấy danh sách Bài tập của một Lớp học
 */
export async function getClassAssignmentsAction(
  classId: string
): Promise<{ success: boolean; assignments: any[]; error?: string }> {
  if (!(await isDbAlive())) {
    const session = await getSession();
    return getClassAssignmentsService(classId, session?.userId);
  }
  try {
    const auth = checkAuth(await getSession(), "Bạn chưa đăng nhập!");
    if (!auth.ok) {
      return { success: false, error: auth.error, assignments: [] };
    }
    return await getClassAssignmentsService(classId, auth.session.userId);
  } catch (err: any) {
    console.error("[getClassAssignmentsAction] Lỗi:", err);
    return {
      success: false,
      error: err.message || "Không thể tải danh sách bài tập!",
      assignments: [],
    };
  }
}

/**
 * Lấy chi tiết một Bài tập (bao gồm Đoạn văn đọc, Danh sách câu hỏi, Đáp án A/B/C/D)
 */
export async function getAssignmentDetailAction(
  assignmentId: string
): Promise<{ success: boolean; assignment?: any; error?: string }> {
  if (!(await isDbAlive())) {
    return getAssignmentDetailService(assignmentId, "demo-student-1");
  }
  try {
    const auth = checkAuth(await getSession(), "Bạn chưa đăng nhập!");
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    return await getAssignmentDetailService(assignmentId, auth.session.userId);
  } catch (err: any) {
    console.error("[getAssignmentDetailAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tải chi tiết bài tập!" };
  }
}

/**
 * Tạo Bài tập mới (Áp dụng cho cả luồng Tạo thủ công và sau khi Bóc tách Ebook)
 */
export async function createAssignmentAction(data: {
  classId?: string;
  targetClassIds?: string[];
  title: string;
  description?: string;
  skill: string;
  type?: string;
  durationMinutes?: number;
  dueDate?: string | null;
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
}): Promise<{ success: boolean; assignmentId?: string; error?: string }> {
  try {
    const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để thực hiện!");
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    if (!data.title || !data.title.trim()) {
      return { success: false, error: "Tiêu đề bài tập không được để trống!" };
    }

    const targetClassList = Array.from(
      new Set([...(data.targetClassIds || []), ...(data.classId ? [data.classId] : [])].filter(Boolean))
    );
    if (targetClassList.length === 0) {
      return { success: false, error: "Vui lòng chọn ít nhất 1 lớp học giao bài!" };
    }

    const isListening = data.skill === "LISTENING" || data.skill === "ALL_SKILLS";
    if (isListening && (!data.audioUrl || !data.audioUrl.trim())) {
      return {
        success: false,
        error: "Bài tập có phần Nghe (Listening) bắt buộc phải đính kèm tệp Audio (.mp3)!",
      };
    }

    if (!data.questions || data.questions.length === 0) {
      return { success: false, error: "Bài tập phải có ít nhất 1 câu hỏi!" };
    }

    const res = await createAssignmentService(data, auth.session.userId);
    safeRevalidate();
    return res;
  } catch (err: any) {
    console.error("[createAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tạo bài tập!" };
  }
}

/**
 * Xóa mềm Bài tập
 */
export async function deleteAssignmentAction(
  assignmentId: string,
  classId?: string,
  deleteFromAll?: boolean
): Promise<{ success: boolean; deletedFromAll?: boolean; error?: string }> {
  const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để thực hiện!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    const res = await deleteAssignmentService(assignmentId, classId, deleteFromAll);
    safeRevalidate();
    return res;
  } catch (err: any) {
    console.error("[deleteAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể xóa bài tập!" };
  }
}

/**
 * Cập nhật nội dung hoặc cài đặt hạn nộp của Bài tập
 */
export async function updateAssignmentAction(
  assignmentId: string,
  data: {
    title?: string;
    description?: string;
    skill?: string;
    type?: string;
    durationMinutes?: number;
    audioUrl?: string | null;
    classId?: string;
    updateAllClasses?: boolean;
    dueDate?: string | null;
    startDate?: string | null;
    enableProctoring?: boolean;
    maxTabSwitches?: number;
    questions?: Array<any>;
  }
): Promise<{
  success: boolean;
  submissionCount?: number;
  message?: string;
  error?: string;
}> {
  try {
    const auth = checkRole(
      await getSession(),
      ROLE_GROUPS.EXAM_CREATORS,
      "Chỉ Giáo viên và Quản trị viên mới có quyền cập nhật bài tập!",
      "Vui lòng đăng nhập!"
    );
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const res = await updateAssignmentService(assignmentId, data);
    safeRevalidate();
    return res;
  } catch (err: any) {
    console.error("[updateAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Cập nhật bài tập thất bại!" };
  }
}

/**
 * Tự động chấm lại toàn bộ bài nộp trắc nghiệm khi sửa đáp án
 */
export async function regradeAssignmentSubmissionsAction(
  assignmentId: string,
  classId?: string
): Promise<{
  success: boolean;
  regradedCount: number;
  message?: string;
  error?: string;
}> {
  try {
    const auth = checkRole(
      await getSession(),
      ROLE_GROUPS.EXAM_CREATORS,
      "Chỉ Giáo viên và Quản trị viên mới có quyền chấm lại bài tập!",
      "Vui lòng đăng nhập!"
    );
    if (!auth.ok) {
      return { success: false, regradedCount: 0, error: auth.error };
    }

    const res = await regradeAssignmentSubmissionsService(assignmentId, classId);
    safeRevalidate();
    return res;
  } catch (err: any) {
    console.error("[regradeAssignmentSubmissionsAction] Lỗi:", err);
    return {
      success: false,
      regradedCount: 0,
      error: err.message || "Chấm lại bài tập thất bại!",
    };
  }
}


/**
 * Bóc tách Đề thi IELTS từ tệp PDF / Word (.docx) sang cấu trúc Ebook 2 cột
 */
export async function parseIeltsExamAction(
  formData: FormData
): Promise<{
  success: boolean;
  parsedData?: any;
  isScannedPdf?: boolean;
  error?: string;
}> {
  try {
    const auth = checkRole(
      await getSession(),
      ROLE_GROUPS.EXAM_CREATORS,
      "Chỉ Giáo viên và Quản trị viên mới có quyền bóc tách đề thi!",
      "Vui lòng đăng nhập!"
    );
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const title = formData.get("title")?.toString().trim() || "Bài tập IELTS Bóc tách";
    const skill = formData.get("skill")?.toString() || "READING";
    const durationMinutes = Number(formData.get("durationMinutes")) || 60;
    const audioUrl = formData.get("audioUrl")?.toString() || null;
    const excelAnswersRaw = formData.get("excelAnswers")?.toString() || "";
    const pdfTextRaw = formData.get("pdfText")?.toString() || "";
    const rawFile = formData.get("file");
    const file = (rawFile && typeof rawFile === "object" && "size" in rawFile && (rawFile as any).size > 0) ? (rawFile as File) : null;

    const parsedData = await parseIeltsExamContent({
      title,
      skill,
      durationMinutes,
      audioUrl,
      excelAnswersRaw,
      pdfTextRaw,
      file,
    });

    return {
      success: true,
      parsedData,
    };
  } catch (err: any) {
    if (err?.isScannedPdf) {
      return {
        success: false,
        isScannedPdf: true,
        error: err.message,
      };
    }
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
    flowcharts?: any[];
    tables?: any[];
  matchingHeadings?: any[];
  summaries?: any[];
    questions: Array<any>;
  }>
): Promise<{ success: boolean; count?: number; assignmentIds?: string[]; error?: string }> {
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
}): Promise<{
  success: boolean;
  submissionId?: string;
  score?: number | null;
  totalPoints?: number | null;
  isCheatingFlagged?: boolean;
  error?: string;
}> {
  try {
    const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để nộp bài!");
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }
    const { session } = auth;

    const res = await submitAssignmentService(data, {
      userId: session.userId,
      fullName: session.fullName,
      email: session.email,
    });
    if (res.success) {
      safeRevalidate();
    }
    return res;
  } catch (err: any) {
    console.error("[submitAssignmentAction] Lỗi:", err);
    return { success: false, error: err.message || "Nộp bài thất bại!" };
  }
}

/**
 * Lấy danh sách bài nộp của một bài tập để Giáo viên chấm điểm
 */
export async function getSubmissionsForAssignmentAction(
  assignmentId: string
): Promise<{ success: boolean; submissions: any[]; error?: string }> {
  try {
    const auth = checkAuth(await getSession(), "Vui lòng đăng nhập!");
    if (!auth.ok) {
      return { success: false, error: auth.error, submissions: [] };
    }

    return await getSubmissionsForAssignmentService(assignmentId);
  } catch (err: any) {
    console.error("[getSubmissionsForAssignmentAction] Lỗi:", err);
    return {
      success: false,
      error: err.message || "Không thể tải danh sách nộp bài!",
      submissions: [],
    };
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
}): Promise<{ success: boolean; totalScore?: number; error?: string }> {
  try {
    const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để chấm bài!");
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const res = await gradeSubmissionService(data, auth.session.userId);
    safeRevalidate();
    return res;
  } catch (err: any) {
    console.error("[gradeSubmissionAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể lưu kết quả chấm bài!" };
  }
}
