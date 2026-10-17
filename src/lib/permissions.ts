import { RoleCode } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";

export const DEFAULT_PERMISSIONS = [
  {
    featureKey: "VIEW_DASHBOARD",
    name: "Xem Tổng quan (Dashboard)",
    category: "Chung",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT", "STUDENT"] as RoleCode[],
  },
  {
    featureKey: "VIEW_USERS",
    name: "Quản lý Người dùng (Danh sách, Thêm, Sửa, Xóa)",
    category: "Người dùng",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER"] as RoleCode[],
  },
  {
    featureKey: "VIEW_SCHOOLS",
    name: "Quản lý Trường học (Danh sách, Thêm, Sửa, Xóa)",
    category: "Trường học",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER"] as RoleCode[],
  },
  {
    featureKey: "VIEW_CLASSES",
    name: "Quản lý Lớp học (Danh sách, Chi tiết, Tạo lớp)",
    category: "Lớp học",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT"] as RoleCode[],
  },
  {
    featureKey: "VIEW_SCHEDULE",
    name: "Xem Lịch học & Giảng dạy",
    category: "Đào tạo",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT", "STUDENT"] as RoleCode[],
  },
  {
    featureKey: "IMPORT_EXCEL",
    name: "Import Excel Học viên hàng loạt",
    category: "Nhập liệu",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER"] as RoleCode[],
  },
  {
    featureKey: "SYSTEM_SETTINGS",
    name: "Cấu hình Hệ thống & Phân quyền động",
    category: "Cài đặt",
    allowedRoles: ["ADMIN"] as RoleCode[],
  },
];

export const ROLE_GROUPS = {
  ADMIN_ONLY: ["ADMIN"] as readonly RoleCode[],
  ADMIN_AND_MANAGER: ["ADMIN", "SCHOOL_MANAGER"] as readonly RoleCode[],
  STAFF_AND_ADMIN: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT"] as readonly RoleCode[],
  TEACHING_STAFF: ["TEACHER", "TEACHING_ASSISTANT"] as readonly RoleCode[],
  EXAM_CREATORS: ["ADMIN", "TEACHER"] as readonly RoleCode[],
};

export type AuthCheckResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; error: string };

export function hasRole(
  session: SessionPayload | null | undefined,
  allowedRoles: readonly RoleCode[]
): boolean {
  if (!session?.role) return false;
  return allowedRoles.includes(session.role as RoleCode);
}

export function isAdmin(
  session: SessionPayload | null | undefined
): session is SessionPayload & { role: "ADMIN" } {
  return session?.role === "ADMIN";
}

export function isSchoolManager(
  session: SessionPayload | null | undefined
): session is SessionPayload & { role: "SCHOOL_MANAGER" } {
  return session?.role === "SCHOOL_MANAGER";
}

export function isTeacherOrTA(
  session: SessionPayload | null | undefined
): session is SessionPayload & { role: "TEACHER" | "TEACHING_ASSISTANT" } {
  return session?.role === "TEACHER" || session?.role === "TEACHING_ASSISTANT";
}

export function isStudent(
  session: SessionPayload | null | undefined
): session is SessionPayload & { role: "STUDENT" } {
  return session?.role === "STUDENT";
}

export function checkAuth(
  session: SessionPayload | null | undefined,
  unauthMsg: string = "Vui lòng đăng nhập để thực hiện!"
): AuthCheckResult {
  if (!session) {
    return { ok: false, error: unauthMsg };
  }
  return { ok: true, session };
}

export function checkRole(
  session: SessionPayload | null | undefined,
  allowedRoles: readonly RoleCode[],
  forbiddenMsg: string = "Bạn không có quyền thực hiện thao tác này!",
  unauthMsg: string = "Vui lòng đăng nhập để thực hiện!"
): AuthCheckResult {
  const auth = checkAuth(session, unauthMsg);
  if (!auth.ok) return auth;
  if (!hasRole(auth.session, allowedRoles)) {
    return { ok: false, error: forbiddenMsg };
  }
  return auth;
}

export function checkNotStudent(
  session: SessionPayload | null | undefined,
  forbiddenMsg: string = "Học viên không có quyền thực hiện thao tác này!",
  unauthMsg: string = "Vui lòng đăng nhập để thực hiện!"
): AuthCheckResult {
  const auth = checkAuth(session, unauthMsg);
  if (!auth.ok) return auth;
  if (isStudent(auth.session)) {
    return { ok: false, error: forbiddenMsg };
  }
  return auth;
}

export function hasFeatureAccess(
  session: SessionPayload | null | undefined,
  featureKey: string,
  customAllowedRoles?: readonly RoleCode[] | null
): boolean {
  if (!session?.role) return false;
  if (isAdmin(session)) return true;

  const role = session.role as RoleCode;
  if (customAllowedRoles) {
    return customAllowedRoles.includes(role);
  }

  const defaultPerm = DEFAULT_PERMISSIONS.find((p) => p.featureKey === featureKey);
  return defaultPerm ? defaultPerm.allowedRoles.includes(role) : false;
}

