"use server";

import { redactClassmatesForStudent, stripSensitive } from "@/lib/sanitize";
import { getSession } from "@/lib/auth";
import { checkAuth, checkRole, ROLE_GROUPS } from "@/lib/permissions";
import { requireFeature } from "@/services/feature-access.service";
import {
  assertClassAccess,
  assertSchoolAccess,
  assertUserHasRole,
} from "@/services/access-scope.service";
import { revalidatePath } from "next/cache";
import { ClassStatus, StaffClassRole } from "@prisma/client";
import {
  generateClassCodeService,
  getClassesService,
  getClassDetailService,
  createClassService,
  updateClassService,
  deleteClassService,
  restoreClassService,
  deleteMultipleClassesService,
  assignStaffToClassService,
  removeStaffFromClassService,
  enrollStudentToClassService,
  removeStudentFromClassService,
  getAvailableStudentsForClassService,
  transferStudentClassService,
  getSchoolClassesWithStudentsService,
  getEligibleSchoolStudentsForClassService,
} from "@/services/class.service";

// Chỉ Admin & Quản nhiệm trường mới được thay đổi thông tin lớp / nhân sự / danh sách học viên
async function requireClassManager(): Promise<{ success: false; error: string } | null> {
  const session = await getSession();
  const auth = checkRole(
    session,
    ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Chỉ Quản trị viên hoặc Quản nhiệm trường mới có quyền thay đổi thông tin lớp học!"
  );
  if (!auth.ok) return { success: false, error: auth.error };
  const feature = await requireFeature(auth.session, "VIEW_CLASSES", "Quyền quản lý lớp học đã bị tắt đối với vai trò của bạn!");
  return feature.ok ? null : { success: false, error: feature.error };
}

// Admin / Quản nhiệm + lớp phải thuộc trường mình quản nhiệm (AUTHZ-05, 15)
async function requireClassManagerFor(
  ...classIds: string[]
): Promise<{ success: false; error: string } | null> {
  const session = await getSession();
  const auth = checkRole(
    session,
    ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Chỉ Quản trị viên hoặc Quản nhiệm trường mới có quyền thay đổi thông tin lớp học!"
  );
  if (!auth.ok) return { success: false, error: auth.error };
  const feature = await requireFeature(auth.session, "VIEW_CLASSES", "Quyền quản lý lớp học đã bị tắt đối với vai trò của bạn!");
  if (!feature.ok) return { success: false, error: feature.error };
  for (const cid of classIds) {
    const scope = await assertClassAccess(auth.session, cid, "MANAGE");
    if (!scope.ok) return { success: false, error: scope.error };
  }
  return null;
}

function safeRevalidate(path: string = "/") {
  try {
    revalidatePath(path);
    revalidatePath("/");
  } catch {}
}

// Sinh mã lớp học tự động (BUG_07) theo cấu trúc: [Chương trình]_[Mã trường]_[STT 2 số] (VD: IELTS_TD_01)
export async function generateClassCode(
  schoolId: string,
  program: string = "IELTS"
): Promise<string> {
  const denied = await requireClassManager();
  if (denied) throw new Error(denied.error);
  return generateClassCodeService(schoolId, program);
}

// Lấy mã lớp học tiếp theo cho Client xem trước (Preview)
export async function getNextClassCodeAction(
  schoolId: string,
  program: string
): Promise<{ success: boolean; code: string }> {
  if (!schoolId) return { success: false, code: "" };
  const denied = await requireClassManager();
  if (denied) return { success: false, code: "" };
  const code = await generateClassCodeService(schoolId, program);
  return { success: true, code };
}

// Lấy danh sách lớp học có phân quyền phạm vi Quản nhiệm & Lọc xóa mềm (BUG_03, BUG_10)
export async function getClassesAction(
  statusFilter: string = "ALL",
  searchKeyword: string = "",
  activeState: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  const session = await getSession();
  const classes = stripSensitive(await getClassesService(session, statusFilter, searchKeyword, activeState));
  return session?.role === "STUDENT" ? redactClassmatesForStudent(classes, session.userId) : classes;
}

export async function getClassDetailAction(id: string) {
  const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để xem chi tiết lớp học!");
  if (!auth.ok) return null;
  const scope = await assertClassAccess(auth.session, id, "VIEW");
  if (!scope.ok) return null;
  const detail = stripSensitive(await getClassDetailService(id));
  return auth.session.role === "STUDENT" ? redactClassmatesForStudent(detail, auth.session.userId) : detail;
}

// Tạo lớp học mới - Tự động sinh mã nếu không nhập, hỗ trợ gán đa giáo viên / trợ giảng
export async function createClassAction(data: {
  code?: string;
  name: string;
  schoolId: string;
  program?: "IELTS" | "SAT" | "CAMBRIDGE" | "OTHER";
  level?: string;
  capacity?: number;
  teacherId?: string;
  taId?: string;
  teacherIds?: string[];
  taIds?: string[];
  startDate?: string;
  endDate?: string;
  schedule?: string;
}) {
  const denied = await requireClassManager();
  if (denied) return denied;
  const session = await getSession();
  if (!session) return { success: false, error: "Vui lòng đăng nhập!" };
  const schoolScope = await assertSchoolAccess(session, data.schoolId);
  if (!schoolScope.ok) return { success: false, error: schoolScope.error };
  const res = stripSensitive(await createClassService(data));
  if (res.success) safeRevalidate("/classes");
  return res;
}

export async function updateClassAction(
  id: string,
  data: {
    name?: string;
    program?: "IELTS" | "SAT" | "CAMBRIDGE" | "OTHER";
    level?: string;
    capacity?: number;
    status?: ClassStatus;
    teacherId?: string;
    taId?: string;
    teacherIds?: string[];
    taIds?: string[];
    startDate?: string;
    endDate?: string;
    schedule?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const denied = await requireClassManagerFor(id);
  if (denied) return denied;
  const res = await updateClassService(id, data);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Xóa mềm lớp học (isActive: false)
export async function deleteClassAction(
  id: string,
  confirmed?: boolean
): Promise<{ success: boolean; error?: string; requiresConfirm?: boolean; warnings?: string[] }> {
  const denied = await requireClassManagerFor(id);
  if (denied) return denied;
  return deleteClassService(id, { confirmed });
}

// Khôi phục lớp học đã xóa mềm
export async function restoreClassAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const denied = await requireClassManagerFor(id);
  if (denied) return denied;
  return restoreClassService(id);
}

export async function deleteMultipleClassesAction(
  ids: string[],
  confirmed?: boolean
): Promise<{ success: boolean; error?: string; requiresConfirm?: boolean; warnings?: string[] }> {
  const denied = await requireClassManagerFor(...ids);
  if (denied) return denied;
  return deleteMultipleClassesService(ids, { confirmed });
}

export async function assignStaffToClassAction(
  classId: string,
  userId: string,
  roleInClass: StaffClassRole
) {
  const denied = await requireClassManagerFor(classId);
  if (denied) return denied;
  const staffRole = await assertUserHasRole(userId, ["TEACHER", "TEACHING_ASSISTANT"]);
  if (!staffRole.ok) return { success: false, error: staffRole.error };
  const res = await assignStaffToClassService(classId, userId, roleInClass);
  if (res.success) safeRevalidate("/classes");
  return res;
}

export async function removeStaffFromClassAction(
  classId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const denied = await requireClassManagerFor(classId);
  if (denied) return denied;
  const res = await removeStaffFromClassService(classId, userId);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Thêm học viên vào lớp học
export async function enrollStudentToClassAction(
  classId: string,
  studentId: string
) {
  const denied = await requireClassManagerFor(classId);
  if (denied) return denied;
  const studentRole = await assertUserHasRole(studentId, ["STUDENT"]);
  if (!studentRole.ok) return { success: false, error: studentRole.error };
  const res = await enrollStudentToClassService(classId, studentId);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Rút học viên khỏi lớp học
export async function removeStudentFromClassAction(
  classId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  const denied = await requireClassManagerFor(classId);
  if (denied) return denied;
  const res = await removeStudentFromClassService(classId, studentId);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Lấy danh sách học viên khả dụng để thêm vào lớp (chưa ghi danh vào lớp này)
export async function getAvailableStudentsForClassAction(
  classId: string
): Promise<{ success: boolean; error?: string; students: any[] }> {
  const denied = await requireClassManagerFor(classId);
  if (denied) return { ...denied, students: [] };
  return stripSensitive(await getAvailableStudentsForClassService(classId));
}

// Chuyển học viên giữa các lớp TRONG CÙNG MỘT TRƯỜNG (Bắt buộc cùng schoolId)
export async function transferStudentClassAction(
  currentClassId: string,
  targetClassId: string,
  studentId: string
) {
  const denied = await requireClassManagerFor(currentClassId, targetClassId);
  if (denied) return denied;
  const res = await transferStudentClassService(
    currentClassId,
    targetClassId,
    studentId
  );
  if (res.success) {
    safeRevalidate("/classes");
    safeRevalidate("/schools");
  }
  return res;
}

// Lấy toàn bộ danh sách lớp học kèm danh sách học sinh của từng lớp theo trường
export async function getSchoolClassesWithStudentsAction(
  schoolId: string
): Promise<{ success: boolean; error?: string; school: any }> {
  const session = await getSession();
  const auth = checkRole(session, ROLE_GROUPS.ADMIN_AND_MANAGER, "Bạn không có quyền xem dữ liệu này!");
  if (!auth.ok) return { success: false, error: auth.error, school: null };
  const scope = await assertSchoolAccess(auth.session, schoolId);
  if (!scope.ok) return { success: false, error: scope.error, school: null };
  return stripSensitive(await getSchoolClassesWithStudentsService(schoolId));
}

// Lấy danh sách học sinh cùng trường khả dụng để thêm / chuyển sang lớp này
export async function getEligibleSchoolStudentsForClassAction(
  classId: string
): Promise<{
  success: boolean;
  error?: string;
  schoolName?: string;
  schoolId?: string;
  students: any[];
}> {
  const denied = await requireClassManagerFor(classId);
  if (denied) return { ...denied, students: [] };
  return stripSensitive(await getEligibleSchoolStudentsForClassService(classId));
}
