import { prisma, isDbAlive } from "@/lib/prisma";
import { ReportPeriodKey, resolvePeriodRange } from "@/lib/ielts-report-config";

export interface ReportCommentDTO {
  id: string;
  scope: "CLASS" | "STUDENT";
  classId: string;
  className?: string;
  studentId: string | null;
  periodKey: string;
  periodFrom: string | null;
  periodTo: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  isReadByStudent: boolean;
  updatedAt: string;
}

const globalReportCommentsStore = globalThis as unknown as {
  memoryReportComments?: ReportCommentDTO[];
};

if (!globalReportCommentsStore.memoryReportComments) {
  const nowIso = new Date().toISOString();
  globalReportCommentsStore.memoryReportComments = [
    {
      id: "rc-demo-class-1",
      scope: "CLASS",
      classId: "demo-class-1",
      className: "IELTS Bứt Phá - 10A1",
      studentId: null,
      periodKey: "30_DAYS",
      periodFrom: null,
      periodTo: nowIso,
      authorId: "demo-staff-1",
      authorName: "Cô Nguyễn Thu Hường",
      authorRole: "Giáo viên",
      content:
        "Trong 30 ngày qua, tập thể lớp IELTS_TD_01 có ý thức hoàn thành tốt các bài Reading & Listening. Tuy nhiên tỷ lệ đúng ở dạng Summary Completion và True/False/Not Given còn cần cải thiện thêm. Các em chú ý nộp bài trước hạn để không bị hệ thống khóa nút nộp (BR-06).",
      isReadByStudent: false,
      updatedAt: nowIso,
    },
    {
      id: "rc-demo-student-an",
      scope: "STUDENT",
      classId: "demo-class-1",
      className: "IELTS Bứt Phá - 10A1",
      studentId: "demo-student-1",
      periodKey: "30_DAYS",
      periodFrom: null,
      periodTo: nowIso,
      authorId: "demo-staff-1",
      authorName: "Cô Nguyễn Thu Hường",
      authorRole: "Giáo viên",
      content:
        "An có phong độ học tập rất ổn định! Kỹ năng Writing Task 2 đạt Band 7.0 với vốn từ vựng học thuật (Lexical Resource 7.5) nổi bật. Ở kỹ năng Speaking, em cần chú ý thêm tiêu chí Grammatical Range & Accuracy (GRA hiện tại 6.0) để bứt phá lên Overall 7.0.",
      isReadByStudent: false,
      updatedAt: nowIso,
    },
  ];
}

/**
 * Lấy nhận xét chung của lớp hoặc nhận xét cá nhân của học sinh theo khoảng thời gian lọc (NX-03, NX-04)
 */
export async function getReportCommentService(params: {
  scope: "CLASS" | "STUDENT";
  classId: string;
  studentId?: string | null;
  periodKey: ReportPeriodKey;
}): Promise<ReportCommentDTO | null> {
  const { scope, classId, studentId, periodKey } = params;

  const findInMemory = () => {
    const list = globalReportCommentsStore.memoryReportComments || [];
    return (
      list.find(
        (c) =>
          c.scope === scope &&
          c.classId === classId &&
          (scope === "CLASS" ? !c.studentId : c.studentId === studentId) &&
          c.periodKey === periodKey
      ) || null
    );
  };

  if (!(await isDbAlive())) {
    return findInMemory();
  }

  try {
    const record = await prisma.reportComment.findFirst({
      where: {
        isActive: true,
        scope,
        classId,
        studentId: scope === "CLASS" ? null : studentId || undefined,
        periodKey,
      },
      include: {
        class: { select: { name: true, code: true } },
        author: {
          include: {
            role: true,
            profile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!record) return findInMemory();

    return {
      id: record.id,
      scope: record.scope as "CLASS" | "STUDENT",
      classId: record.classId,
      className: record.class?.name,
      studentId: record.studentId,
      periodKey: record.periodKey,
      periodFrom: record.periodFrom ? record.periodFrom.toISOString() : null,
      periodTo: record.periodTo ? record.periodTo.toISOString() : null,
      authorId: record.authorId,
      authorName: record.author.profile?.fullName || record.author.username,
      authorRole: record.author.role?.name || "Giáo viên",
      content: record.content,
      isReadByStudent: record.isReadByStudent,
      updatedAt: record.updatedAt.toISOString(),
    };
  } catch {
    return findInMemory();
  }
}

/**
 * Lưu hoặc cập nhật nhận xét chung lớp / nhận xét cá nhân (NX-01 đến NX-06)
 * Mỗi lớp hoặc mỗi học sinh có 1 nhận xét cho mỗi khoảng thời gian báo cáo; cập nhật sau ghi đè bản hiện tại.
 */
export async function upsertReportCommentService(params: {
  scope: "CLASS" | "STUDENT";
  classId: string;
  studentId?: string | null;
  periodKey: ReportPeriodKey;
  content: string;
  author: {
    userId: string;
    fullName: string;
    roleName: string;
  };
}): Promise<{ success: boolean; comment?: ReportCommentDTO; error?: string }> {
  const cleanContent = (params.content || "").trim();
  // NX-06: Nội dung rỗng hoặc chỉ khoảng trắng không được lưu
  if (!cleanContent) {
    return {
      success: false,
      error: "Nội dung nhận xét không được để trống hoặc chỉ chứa khoảng trắng (Quy tắc NX-06)!",
    };
  }

  const range = resolvePeriodRange(params.periodKey);
  const nowIso = new Date().toISOString();

  const saveInMemory = (): { success: boolean; comment: ReportCommentDTO } => {
    const list = globalReportCommentsStore.memoryReportComments || [];
    const idx = list.findIndex(
      (c) =>
        c.scope === params.scope &&
        c.classId === params.classId &&
        (params.scope === "CLASS" ? !c.studentId : c.studentId === params.studentId) &&
        c.periodKey === params.periodKey
    );

    const dto: ReportCommentDTO = {
      id: idx >= 0 ? list[idx].id : `rc-${Date.now()}`,
      scope: params.scope,
      classId: params.classId,
      studentId: params.scope === "CLASS" ? null : params.studentId || null,
      periodKey: params.periodKey,
      periodFrom: range.fromDate ? range.fromDate.toISOString() : null,
      periodTo: range.toDate.toISOString(),
      authorId: params.author.userId,
      authorName: params.author.fullName,
      authorRole: params.author.roleName,
      content: cleanContent,
      isReadByStudent: false, // NX-08: Đánh dấu chấm đỏ mới cho học sinh
      updatedAt: nowIso,
    };

    if (idx >= 0) {
      list[idx] = dto;
    } else {
      list.unshift(dto);
    }
    globalReportCommentsStore.memoryReportComments = list;
    return { success: true, comment: dto };
  };

  if (!(await isDbAlive())) {
    return saveInMemory();
  }

  try {
    // Kiểm tra lớp hoặc học sinh còn tồn tại (Luồng ngoại lệ F-2a)
    const cls = await prisma.class.findUnique({
      where: { id: params.classId },
      select: { id: true, name: true, isActive: true },
    });
    if (!cls || !cls.isActive) {
      return {
        success: false,
        error: "Lớp học không còn khả dụng hoặc đã bị xóa. Vui lòng tải lại báo cáo (F-2a)!",
      };
    }

    if (params.scope === "STUDENT") {
      if (!params.studentId) {
        return { success: false, error: "Vui lòng chọn học sinh để lưu nhận xét cá nhân!" };
      }
      const st = await prisma.user.findUnique({
        where: { id: params.studentId },
        select: { id: true, isActive: true },
      });
      if (!st || !st.isActive) {
        return {
          success: false,
          error: "Học sinh không còn khả dụng hoặc đã bị xóa. Vui lòng tải lại báo cáo (F-2a)!",
        };
      }
    }

    const existing = await prisma.reportComment.findFirst({
      where: {
        isActive: true,
        scope: params.scope,
        classId: params.classId,
        studentId: params.scope === "CLASS" ? null : params.studentId || undefined,
        periodKey: params.periodKey,
      },
    });

    const saved = existing
      ? await prisma.reportComment.update({
          where: { id: existing.id },
          data: {
            content: cleanContent,
            authorId: params.author.userId,
            periodFrom: range.fromDate,
            periodTo: range.toDate,
            isReadByStudent: false,
          },
          include: {
            author: {
              include: {
                role: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        })
      : await prisma.reportComment.create({
          data: {
            scope: params.scope,
            classId: params.classId,
            studentId: params.scope === "CLASS" ? null : params.studentId || null,
            periodKey: params.periodKey,
            periodFrom: range.fromDate,
            periodTo: range.toDate,
            authorId: params.author.userId,
            content: cleanContent,
            isReadByStudent: false,
          },
          include: {
            author: {
              include: {
                role: true,
                profile: { select: { fullName: true } },
              },
            },
          },
        });

    return {
      success: true,
      comment: {
        id: saved.id,
        scope: saved.scope as "CLASS" | "STUDENT",
        classId: saved.classId,
        className: cls.name,
        studentId: saved.studentId,
        periodKey: saved.periodKey,
        periodFrom: saved.periodFrom ? saved.periodFrom.toISOString() : null,
        periodTo: saved.periodTo ? saved.periodTo.toISOString() : null,
        authorId: saved.authorId,
        authorName: saved.author.profile?.fullName || saved.author.username || params.author.fullName,
        authorRole: saved.author.role?.name || params.author.roleName,
        content: saved.content,
        isReadByStudent: saved.isReadByStudent,
        updatedAt: saved.updatedAt.toISOString(),
      },
    };
  } catch {
    return saveInMemory();
  }
}

/**
 * Đánh dấu học sinh đã đọc nhận xét mới (tắt chấm đỏ NX-08)
 */
export async function markReportCommentReadService(
  commentId: string,
  studentId: string
): Promise<{ success: boolean }> {
  const list = globalReportCommentsStore.memoryReportComments || [];
  const found = list.find((c) => c.id === commentId);
  if (found) {
    found.isReadByStudent = true;
  }

  if (!(await isDbAlive())) {
    return { success: true };
  }

  try {
    await prisma.reportComment.updateMany({
      where: {
        id: commentId,
        OR: [{ studentId }, { scope: "CLASS" }],
      },
      data: { isReadByStudent: true },
    });
  } catch {}

  return { success: true };
}
