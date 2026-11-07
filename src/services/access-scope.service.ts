/**
 * Kiểm tra PHẠM VI truy cập (trường / lớp / bài tập / học sinh / học liệu).
 *
 * - Chỉ nhận `SessionPayload` do action lấy từ getSession(), tuyệt đối không nhận userId từ client.
 * - Fail-closed: lỗi DB, không tìm thấy bản ghi hoặc không xác định được quyền => TỪ CHỐI.
 * - Khi DB không sống: chỉ cho qua nếu bật DEMO_MODE=1 (dữ liệu demo trong bộ nhớ).
 */
import { prisma, isDbAlive } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

export type ScopeResult = { ok: true } | { ok: false; error: string };
const OK: ScopeResult = { ok: true };
const deny = (error: string): ScopeResult => ({ ok: false, error });
const VERIFY_FAIL = "Không thể xác minh quyền, vui lòng thử lại!";

/** VIEW: xem | TEACH: GV dạy lớp | GRADE: GV hoặc TA chấm | MANAGE: Admin / Quản nhiệm quản lý lớp */
export type ClassNeed = "VIEW" | "TEACH" | "GRADE" | "MANAGE";

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "0") return false;
  return process.env.DEMO_MODE === "1" || Boolean(process.env.VERCEL);
}

async function dbGuard(): Promise<ScopeResult | null> {
  if (await isDbAlive()) return null;
  return isDemoMode() ? OK : deny("Hệ thống đang bảo trì CSDL, không thể xác minh quyền!");
}

export async function assertSchoolAccess(s: SessionPayload, schoolId: string): Promise<ScopeResult> {
  if (s.role === "ADMIN") return OK;
  if (s.role !== "SCHOOL_MANAGER") return deny("Bạn không có quyền truy cập trường học này!");
  if (!(await isDbAlive())) {
    if (!isDemoMode()) return deny("Hệ thống đang bảo trì CSDL, không thể xác minh quyền!");
    if (schoolId === "demo-school-1") {
      return s.userId === "demo-manager-1" || s.username === "manager_quan"
        ? OK
        : deny("Trường học này không thuộc phạm vi quản nhiệm của bạn!");
    }
    if (schoolId.startsWith("demo-school-")) {
      return deny("Trường học này không thuộc phạm vi quản nhiệm của bạn!");
    }
    return OK;
  }
  try {
    const sc = await prisma.school.findUnique({ where: { id: schoolId }, select: { managerId: true } });
    if (!sc) return deny("Trường học không tồn tại!");
    return sc.managerId === s.userId ? OK : deny("Trường học này không thuộc phạm vi quản nhiệm của bạn!");
  } catch {
    return deny(VERIFY_FAIL);
  }
}

export async function assertClassAccess(
  s: SessionPayload,
  classId: string,
  need: ClassNeed
): Promise<ScopeResult> {
  if (!classId) return deny("Thiếu mã lớp học!");
  if (s.role === "ADMIN") return OK;
  if (!(await isDbAlive())) {
    if (!isDemoMode()) return deny("Hệ thống đang bảo trì CSDL, không thể xác minh quyền!");
    if (s.role === "TEACHER" && need === "MANAGE") {
      return deny("Giáo viên không có quyền quản lý lớp học!");
    }
    if (s.role === "STUDENT" && need !== "VIEW") {
      return deny("Bạn không có quyền thao tác trên lớp học này!");
    }
    const demoClasses: any[] | undefined = (globalThis as any).demoClasses;
    if (Array.isArray(demoClasses) && demoClasses.length > 0) {
      const c = demoClasses.find((x) => x.id === classId && x.isActive !== false);
      if (!c) {
        return classId.startsWith("demo-") ? deny("Lớp học không tồn tại!") : OK;
      }
      const isStaff = (c.assignments || []).some(
        (a: any) =>
          a.userId === s.userId || a.staff?.id === s.userId || a.staff?.username === s.username
      );
      const isTeacher = (c.assignments || []).some(
        (a: any) =>
          (a.userId === s.userId || a.staff?.id === s.userId || a.staff?.username === s.username) &&
          a.roleInClass === "TEACHER"
      );
      const isEnrolled = (c.enrollments || []).some(
        (e: any) =>
          e.studentId === s.userId ||
          e.student?.id === s.userId ||
          e.student?.username === s.username
      );
      const isManager =
        c.school?.managerId === s.userId || c.school?.manager?.username === s.username;

      switch (s.role) {
        case "SCHOOL_MANAGER":
          return isManager && (need === "VIEW" || need === "MANAGE")
            ? OK
            : deny("Lớp học không thuộc trường bạn quản nhiệm!");
        case "TEACHER":
          return (need === "TEACH" ? isTeacher : isStaff)
            ? OK
            : deny("Bạn không được phân công giảng dạy lớp này!");
        case "TEACHING_ASSISTANT":
          return (need === "VIEW" || need === "GRADE") && isStaff
            ? OK
            : deny("Bạn không được phân công lớp này!");
        case "STUDENT":
          return need === "VIEW" && isEnrolled ? OK : deny("Bạn không thuộc lớp học này!");
        default:
          return deny("Bạn không có quyền truy cập lớp học này!");
      }
    }
    return OK;
  }
  try {
    const c = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        school: { select: { managerId: true } },
        assignments: { where: { userId: s.userId }, select: { roleInClass: true } },
        enrollments: { where: { studentId: s.userId }, select: { id: true } },
      },
    });
    if (!c) return deny("Lớp học không tồn tại!");
    const isStaff = c.assignments.length > 0;
    const isTeacher = c.assignments.some((a) => a.roleInClass === "TEACHER");
    switch (s.role) {
      case "SCHOOL_MANAGER":
        return c.school?.managerId === s.userId && (need === "VIEW" || need === "MANAGE")
          ? OK
          : deny("Lớp học không thuộc trường bạn quản nhiệm!");
      case "TEACHER":
        if (need === "MANAGE") return deny("Giáo viên không có quyền quản lý lớp học!");
        return (need === "TEACH" ? isTeacher : isStaff)
          ? OK
          : deny("Bạn không được phân công giảng dạy lớp này!");
      case "TEACHING_ASSISTANT":
        return (need === "VIEW" || need === "GRADE") && isStaff
          ? OK
          : deny("Bạn không được phân công lớp này!");
      case "STUDENT":
        return need === "VIEW" && c.enrollments.length > 0 ? OK : deny("Bạn không thuộc lớp học này!");
      default:
        return deny("Bạn không có quyền truy cập lớp học này!");
    }
  } catch {
    return deny(VERIFY_FAIL);
  }
}

/** Lớp mà bài tập đang được giao (lớp gốc + AssignmentClass). `activeOnly` dùng cho học sinh. */
export async function getAssignmentClassIds(
  assignmentId: string,
  activeOnly = false
): Promise<{ createdById: string | null; classIds: string[] } | null> {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      classId: true,
      createdById: true,
      assignedClasses: { select: { classId: true, isActive: true } },
    },
  });
  if (!a) return null;
  const links = a.assignedClasses;
  const ids = new Set<string>();
  for (const l of links) {
    if (!activeOnly || l.isActive) ids.add(l.classId);
  }
  // Bài cũ chưa có AssignmentClass: dùng lớp gốc
  if (links.length === 0 && a.classId) ids.add(a.classId);
  if (!activeOnly && a.classId) ids.add(a.classId);
  return { createdById: a.createdById ?? null, classIds: Array.from(ids) };
}

export async function assertAssignmentAccess(
  s: SessionPayload,
  assignmentId: string,
  need: "VIEW" | "EDIT" | "GRADE"
): Promise<ScopeResult> {
  if (!assignmentId) return deny("Thiếu mã bài tập!");
  if (s.role === "ADMIN") return OK;
  const g = await dbGuard();
  if (g) return g;
  try {
    const info = await getAssignmentClassIds(assignmentId, s.role === "STUDENT");
    if (!info) return deny("Không tìm thấy bài tập!");
    if (info.classIds.length === 0) return deny("Bài tập chưa được giao cho lớp nào!");

    if (need === "EDIT") {
      if (s.role !== "TEACHER") return deny("Bạn không có quyền chỉnh sửa bài tập này!");
      if (info.createdById === s.userId) return OK;
      const need2: ClassNeed = "TEACH";
      for (const cid of info.classIds) {
        if ((await assertClassAccess(s, cid, need2)).ok) return OK;
      }
      return deny("Bạn không phải người tạo hoặc giáo viên phụ trách lớp được giao bài này!");
    }
    if (need === "GRADE") {
      if (s.role !== "TEACHER" && s.role !== "TEACHING_ASSISTANT") {
        return deny("Bạn không có quyền chấm bài tập này!");
      }
      if (s.role === "TEACHER" && info.createdById === s.userId) return OK;
      for (const cid of info.classIds) {
        if ((await assertClassAccess(s, cid, "GRADE")).ok) return OK;
      }
      return deny("Bạn không phụ trách lớp được giao bài tập này!");
    }
    // VIEW
    if (s.role === "TEACHER" && info.createdById === s.userId) return OK;
    for (const cid of info.classIds) {
      if ((await assertClassAccess(s, cid, "VIEW")).ok) return OK;
    }
    return deny("Bạn không có quyền xem bài tập này!");
  } catch {
    return deny(VERIFY_FAIL);
  }
}

export async function assertStudentAccess(s: SessionPayload, studentId: string): Promise<ScopeResult> {
  if (!studentId) return deny("Thiếu mã học sinh!");
  if (s.role === "ADMIN") return OK;
  if (s.role === "STUDENT") {
    return studentId === s.userId ? OK : deny("Bạn chỉ được xem thông tin của chính mình!");
  }
  if (s.role !== "TEACHER" && s.role !== "SCHOOL_MANAGER") {
    return deny("Bạn không có quyền xem thông tin học sinh này!");
  }
  if (!(await isDbAlive())) {
    if (!isDemoMode()) return deny("Hệ thống đang bảo trì CSDL, không thể xác minh quyền!");
    const demoClasses: any[] | undefined = (globalThis as any).demoClasses;
    if (Array.isArray(demoClasses) && demoClasses.length > 0) {
      const hit = demoClasses.some((c) => {
        if (c.isActive === false) return false;
        const hasStudent = (c.enrollments || []).some(
          (e: any) => e.studentId === studentId || e.student?.id === studentId
        );
        if (!hasStudent) return false;
        if (s.role === "TEACHER") {
          return (c.assignments || []).some(
            (a: any) =>
              a.userId === s.userId || a.staff?.id === s.userId || a.staff?.username === s.username
          );
        }
        return c.school?.managerId === s.userId || c.school?.manager?.username === s.username;
      });
      return hit ? OK : deny("Học sinh này không thuộc phạm vi phụ trách của bạn!");
    }
    return OK;
  }
  try {
    const hit = await prisma.classEnrollment.findFirst({
      where:
        s.role === "TEACHER"
          ? { studentId, class: { assignments: { some: { userId: s.userId } } } }
          : { studentId, class: { school: { managerId: s.userId } } },
      select: { id: true },
    });
    return hit ? OK : deny("Học sinh này không thuộc phạm vi phụ trách của bạn!");
  } catch {
    return deny(VERIFY_FAIL);
  }
}

/** Quản nhiệm chỉ được tác động GV/TA/HS thuộc trường mình. */
export async function assertUserInManagerScope(
  s: SessionPayload,
  targetUserId: string
): Promise<ScopeResult> {
  if (s.role === "ADMIN") return OK;
  if (s.role !== "SCHOOL_MANAGER") return deny("Bạn không có quyền quản lý người dùng!");
  if (!(await isDbAlive())) {
    if (!isDemoMode()) return deny("Hệ thống đang bảo trì CSDL, không thể xác minh quyền!");
    const demoUsers: any[] | undefined = (globalThis as any).demoUsers;
    if (Array.isArray(demoUsers) && demoUsers.length > 0) {
      const u = demoUsers.find((x) => x.id === targetUserId);
      if (!u) return deny("Người dùng không tồn tại!");
      if (!["TEACHER", "TEACHING_ASSISTANT", "STUDENT"].includes(u.role?.code)) {
        return deny("Quản nhiệm không được thao tác trên tài khoản Quản trị viên hoặc Quản nhiệm!");
      }
      const demoClasses: any[] | undefined = (globalThis as any).demoClasses;
      if (Array.isArray(demoClasses) && demoClasses.length > 0) {
        const hit = demoClasses.some((c) => {
          const isManaged =
            c.school?.managerId === s.userId || c.school?.manager?.username === s.username;
          if (!isManaged) return false;
          const inStaff = (c.assignments || []).some(
            (a: any) => a.userId === targetUserId || a.staff?.id === targetUserId
          );
          const inStudents = (c.enrollments || []).some(
            (e: any) => e.studentId === targetUserId || e.student?.id === targetUserId
          );
          return inStaff || inStudents;
        });
        return hit ? OK : deny("Người dùng này không thuộc trường bạn quản nhiệm!");
      }
    }
    return OK;
  }
  try {
    const u = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: { select: { code: true } } },
    });
    if (!u) return deny("Người dùng không tồn tại!");
    if (!["TEACHER", "TEACHING_ASSISTANT", "STUDENT"].includes(u.role.code)) {
      return deny("Quản nhiệm không được thao tác trên tài khoản Quản trị viên hoặc Quản nhiệm!");
    }
    const hit = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        OR: [
          { classAssignments: { some: { class: { school: { managerId: s.userId } } } } },
          { classEnrollments: { some: { class: { school: { managerId: s.userId } } } } },
        ],
      },
      select: { id: true },
    });
    return hit ? OK : deny("Người dùng này không thuộc trường bạn quản nhiệm!");
  } catch {
    return deny(VERIFY_FAIL);
  }
}

type FolderRoot = { classId: string | null; ieltsLevelId: string | null };

async function resolveFolderRoot(folderId: string): Promise<FolderRoot | null> {
  let currentId: string | null = folderId;
  for (let i = 0; i < 25 && currentId; i++) {
    const f: { classId: string | null; ieltsLevelId: string | null; parentId: string | null } | null =
      await prisma.materialFolder.findUnique({
        where: { id: currentId },
        select: { classId: true, ieltsLevelId: true, parentId: true },
      });
    if (!f) return null;
    if (f.classId || f.ieltsLevelId) return { classId: f.classId, ieltsLevelId: f.ieltsLevelId };
    currentId = f.parentId;
  }
  return null;
}

async function assertRootAccess(
  s: SessionPayload,
  root: FolderRoot,
  need: "VIEW" | "EDIT"
): Promise<ScopeResult> {
  if (s.role === "ADMIN") return OK;
  if (root.classId) {
    if (need === "VIEW") return assertClassAccess(s, root.classId, "VIEW");
    if (s.role === "SCHOOL_MANAGER") return assertClassAccess(s, root.classId, "MANAGE");
    if (s.role === "TEACHER") return assertClassAccess(s, root.classId, "TEACH");
    return deny("Bạn không có quyền chỉnh sửa học liệu của lớp này!");
  }
  if (root.ieltsLevelId) {
    if (need === "EDIT") return deny("Chỉ Quản trị viên được chỉnh sửa kho học liệu chung!");
    if (s.role !== "STUDENT") return OK;
    const hit = await prisma.classEnrollment.findFirst({
      where: { studentId: s.userId, class: { ieltsLevelId: root.ieltsLevelId } },
      select: { id: true },
    });
    return hit ? OK : deny("Bạn không thuộc trình độ của kho học liệu này!");
  }
  return deny("Thư mục học liệu không hợp lệ!");
}

export async function assertFolderAccess(
  s: SessionPayload,
  folderId: string,
  need: "VIEW" | "EDIT"
): Promise<ScopeResult> {
  if (!folderId) return deny("Thiếu mã thư mục!");
  if (s.role === "ADMIN") return OK;
  const g = await dbGuard();
  if (g) return g;
  try {
    const root = await resolveFolderRoot(folderId);
    if (!root) return deny("Không tìm thấy thư mục học liệu!");
    return await assertRootAccess(s, root, need);
  } catch {
    return deny(VERIFY_FAIL);
  }
}

/** Kiểm tra theo tham số tạo/liệt kê thư mục: classId | ieltsLevelId | parentId */
export async function assertFolderScopeAccess(
  s: SessionPayload,
  scope: { classId?: string | null; ieltsLevelId?: string | null; parentId?: string | null },
  need: "VIEW" | "EDIT"
): Promise<ScopeResult> {
  if (s.role === "ADMIN") return OK;
  if (scope.parentId) return assertFolderAccess(s, scope.parentId, need);
  const g = await dbGuard();
  if (g) return g;
  try {
    if (scope.classId || scope.ieltsLevelId) {
      return await assertRootAccess(
        s,
        { classId: scope.classId ?? null, ieltsLevelId: scope.ieltsLevelId ?? null },
        need
      );
    }
    return deny("Thiếu thông tin lớp hoặc trình độ của thư mục!");
  } catch {
    return deny(VERIFY_FAIL);
  }
}

export async function assertMaterialAccess(
  s: SessionPayload,
  materialId: string,
  need: "VIEW" | "EDIT"
): Promise<ScopeResult> {
  if (!materialId) return deny("Thiếu mã tài liệu!");
  if (s.role === "ADMIN") return OK;
  const g = await dbGuard();
  if (g) return g;
  try {
    const m = await prisma.learningMaterial.findUnique({
      where: { id: materialId },
      select: { folderId: true },
    });
    if (!m) return deny("Không tìm thấy tài liệu!");
    return await assertFolderAccess(s, m.folderId, need);
  } catch {
    return deny(VERIFY_FAIL);
  }
}

const MANAGER_ASSIGNABLE_ROLES = ["TEACHER", "TEACHING_ASSISTANT", "STUDENT"];

/**
 * Kiểm tra thao tác tạo/sửa người dùng (AUTHZ-01, 02).
 * - ADMIN: được phép, nhưng không tự đổi vai trò của chính mình.
 * - SCHOOL_MANAGER: chỉ tác động GV/TA/HS thuộc trường mình, không gán schoolIds, classIds phải thuộc trường mình.
 */
export async function assertUserMutationAllowed(
  s: SessionPayload,
  input: { targetUserId?: string; roleCode?: string; schoolIds?: string[]; classIds?: string[] }
): Promise<ScopeResult> {
  if (s.role !== "ADMIN" && s.role !== "SCHOOL_MANAGER") {
    return deny("Bạn không có quyền quản lý người dùng!");
  }
  if (input.targetUserId && input.targetUserId === s.userId && input.roleCode !== undefined) {
    return deny("Bạn không thể tự thay đổi vai trò của chính mình!");
  }
  if (s.role === "ADMIN") return OK;

  if (input.roleCode !== undefined && !MANAGER_ASSIGNABLE_ROLES.includes(input.roleCode)) {
    return deny("Quản nhiệm chỉ được tạo/sửa Giáo viên, Trợ giảng và Học viên!");
  }
  if (input.schoolIds && input.schoolIds.filter(Boolean).length > 0) {
    return deny("Chỉ Quản trị viên mới được phân công quản nhiệm cho trường học!");
  }
  if (input.targetUserId) {
    const r = await assertUserInManagerScope(s, input.targetUserId);
    if (!r.ok) return r;
  }
  for (const cid of (input.classIds || []).filter(Boolean)) {
    const r = await assertClassAccess(s, cid, "MANAGE");
    if (!r.ok) return r;
  }
  return OK;
}

/** Người dùng phải đang hoạt động và có một trong các vai trò cho phép (vd: chỉ ghi danh được STUDENT). */
export async function assertUserHasRole(userId: string, roles: string[]): Promise<ScopeResult> {
  if (!userId) return deny("Thiếu mã người dùng!");
  const g = await dbGuard();
  if (g) return g;
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { code: true } } },
    });
    if (!u) return deny("Người dùng không tồn tại!");
    return roles.includes(u.role.code) ? OK : deny("Vai trò của người dùng không phù hợp với thao tác này!");
  } catch {
    return deny(VERIFY_FAIL);
  }
}

/** Học sinh phải có ghi danh trong lớp (dùng khi viết nhận xét cá nhân). */
export async function isStudentEnrolledInClass(studentId: string, classId: string): Promise<ScopeResult> {
  const g = await dbGuard();
  if (g) return g;
  try {
    const hit = await prisma.classEnrollment.findFirst({
      where: { studentId, classId },
      select: { id: true },
    });
    return hit ? OK : deny("Học sinh này không thuộc lớp học đã chọn!");
  } catch {
    return deny(VERIFY_FAIL);
  }
}
