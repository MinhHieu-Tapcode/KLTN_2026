"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { checkAuth, checkRole, ROLE_GROUPS } from "@/lib/permissions";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import {
  getClassReportService,
  getReportScopeOptionsService,
  getSchoolReportService,
  getStudentReportService,
} from "@/services/report.service";
import {
  markReportCommentReadService,
  upsertReportCommentService,
} from "@/services/report-comment.service";

const periodKeySchema = z.enum(["7_DAYS", "30_DAYS", "90_DAYS", "ALL"]).default("30_DAYS");

const schoolReportSchema = z.object({
  schoolId: z.string().min(1, "Vui lòng chọn Trường để xem báo cáo!"),
  periodKey: periodKeySchema.optional().default("30_DAYS"),
});

const classReportSchema = z.object({
  classId: z.string().min(1, "Vui lòng chọn Lớp học để xem báo cáo!"),
  periodKey: periodKeySchema.optional().default("30_DAYS"),
});

const studentReportSchema = z.object({
  studentId: z.string().optional(),
  classId: z.string().nullable().optional(),
  periodKey: periodKeySchema.optional().default("30_DAYS"),
});

const saveCommentSchema = z.object({
  scope: z.enum(["CLASS", "STUDENT"]),
  classId: z.string().min(1, "Vui lòng chọn lớp học!"),
  studentId: z.string().nullable().optional(),
  periodKey: periodKeySchema,
  content: z
    .string()
    .trim()
    .min(1, "Nội dung nhận xét không được để trống hoặc chỉ chứa khoảng trắng!"),
});

/**
 * Lấy danh sách phạm vi Trường -> Lớp -> Học sinh mà người dùng được phép xem
 */
export async function getReportScopeOptionsAction() {
  const session = await getSession();
  const auth = checkAuth(session);
  if (!auth.ok) {
    return { success: false as const, error: auth.error };
  }

  const options = await getReportScopeOptionsService({
    userId: auth.session.userId,
    role: auth.session.role,
  });

  return { success: true as const, data: options };
}

/**
 * Lấy Báo cáo cấp Trường (Chỉ Quản nhiệm & Admin - Mục 2.1, 6.1)
 */
export async function getSchoolReportAction(input: {
  schoolId: string;
  periodKey?: ReportPeriodKey;
}) {
  const session = await getSession();
  const auth = checkRole(
    session,
    ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Chỉ Quản nhiệm và Quản trị viên mới có quyền xem Báo cáo cấp Trường!"
  );
  if (!auth.ok) {
    return { success: false as const, error: auth.error };
  }

  const parsed = schoolReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Tham số báo cáo trường không hợp lệ!",
    };
  }

  return getSchoolReportService({
    schoolId: parsed.data.schoolId,
    periodKey: parsed.data.periodKey,
    user: {
      userId: auth.session.userId,
      role: auth.session.role,
    },
  });
}

/**
 * Lấy Báo cáo cấp Lớp & Vận hành Lớp (Quản nhiệm, Admin & Giáo viên phụ trách - Mục 6.2, 6.7)
 */
export async function getClassReportAction(input: {
  classId: string;
  periodKey?: ReportPeriodKey;
}) {
  const session = await getSession();
  const auth = checkRole(
    session,
    ROLE_GROUPS.REPORT_COMMENT_AUTHORS,
    "Bạn không có quyền truy cập Báo cáo cấp Lớp!"
  );
  if (!auth.ok) {
    return { success: false as const, error: auth.error };
  }

  const parsed = classReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Tham số báo cáo lớp không hợp lệ!",
    };
  }

  return getClassReportService({
    classId: parsed.data.classId,
    periodKey: parsed.data.periodKey,
    user: {
      userId: auth.session.userId,
      role: auth.session.role,
    },
  });
}

/**
 * Lấy Báo cáo chi tiết Học sinh / Cá nhân (Quản nhiệm, Admin, Giáo viên phụ trách, hoặc chính Học sinh đó)
 */
export async function getStudentReportAction(input: {
  studentId?: string;
  classId?: string | null;
  periodKey?: ReportPeriodKey;
}) {
  const session = await getSession();
  const auth = checkAuth(session);
  if (!auth.ok) {
    return { success: false as const, error: auth.error };
  }

  const parsed = studentReportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Tham số báo cáo học sinh không hợp lệ!",
    };
  }

  const resolvedStudentId =
    auth.session.role === "STUDENT"
      ? auth.session.userId
      : parsed.data.studentId || "";

  if (!resolvedStudentId) {
    return {
      success: false as const,
      error: "Vui lòng chọn học sinh cần xem báo cáo!",
    };
  }

  return getStudentReportService({
    studentId: resolvedStudentId,
    classId: parsed.data.classId,
    periodKey: parsed.data.periodKey,
    user: {
      userId: auth.session.userId,
      role: auth.session.role,
    },
  });
}

/**
 * Lưu / cập nhật Nhận xét chung của lớp hoặc Nhận xét cá nhân của học sinh (NX-01 đến NX-06)
 */
export async function saveReportCommentAction(input: {
  scope: "CLASS" | "STUDENT";
  classId: string;
  studentId?: string | null;
  periodKey: ReportPeriodKey;
  content: string;
}) {
  const session = await getSession();
  const auth = checkRole(
    session,
    ROLE_GROUPS.REPORT_COMMENT_AUTHORS,
    "Chỉ Quản nhiệm và Giáo viên mới được quyền viết nhận xét trong báo cáo!"
  );
  if (!auth.ok) {
    return { success: false as const, error: auth.error };
  }

  const parsed = saveCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Dữ liệu nhận xét không hợp lệ!",
    };
  }

  const roleLabelMap: Record<string, string> = {
    ADMIN: "Quản trị viên",
    SCHOOL_MANAGER: "Quản nhiệm",
    TEACHER: "Giáo viên",
  };

  const res = await upsertReportCommentService({
    scope: parsed.data.scope,
    classId: parsed.data.classId,
    studentId: parsed.data.studentId,
    periodKey: parsed.data.periodKey,
    content: parsed.data.content,
    author: {
      userId: auth.session.userId,
      fullName: auth.session.fullName || auth.session.username,
      roleName: roleLabelMap[auth.session.role] || auth.session.role,
    },
  });

  if (res.success) {
    revalidatePath("/");
  }

  return res;
}

/**
 * Đánh dấu Học sinh đã đọc nhận xét mới (tắt chấm đỏ NX-08)
 */
export async function markReportCommentReadAction(commentId: string) {
  const session = await getSession();
  const auth = checkAuth(session);
  if (!auth.ok) {
    return { success: false as const, error: auth.error };
  }

  if (!commentId) {
    return { success: false as const, error: "Thiếu mã nhận xét!" };
  }

  const res = await markReportCommentReadService(commentId, auth.session.userId);
  revalidatePath("/");
  return res;
}
