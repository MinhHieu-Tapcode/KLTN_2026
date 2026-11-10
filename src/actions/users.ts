"use server";

import { stripSensitive } from "@/lib/sanitize";
import {
  getSession,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { checkAuth, checkRole, ROLE_GROUPS } from "@/lib/permissions";
import { requireFeature } from "@/services/feature-access.service";
import {
  assertClassAccess,
  assertUserInManagerScope,
  assertUserMutationAllowed,
} from "@/services/access-scope.service";

const NO_MANAGE_USER_MSG = "Chỉ Quản trị viên hoặc Quản nhiệm trường mới có quyền quản lý người dùng!";
async function requireUserManager(featureKey: string = "VIEW_USERS") {
  const auth = checkRole(await getSession(), ROLE_GROUPS.ADMIN_AND_MANAGER, NO_MANAGE_USER_MSG);
  if (!auth.ok) return auth;
  return requireFeature(auth.session, featureKey, NO_MANAGE_USER_MSG);
}
import { revalidatePath } from "next/cache";
import { RoleCode, Gender } from "@prisma/client";
import {
  generateUserCodeService,
  getUsersService,
  getTeachersService,
  createUserService,
  updateUserService,
  deleteUserService,
  restoreUserService,
  deleteMultipleUsersService,
  updateProfileService,
  parseAndValidateExcelService,
  commitImportUsersService,
} from "@/services/user.service";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

// Hàm sinh mã tài khoản tuần tự theo vai trò (HV1001, GV1001, TG1001, QN1001, AD1001)
export async function generateUserCode(roleCode: RoleCode): Promise<string> {
  const auth = await requireUserManager();
  if (!auth.ok) throw new Error(auth.error);
  return generateUserCodeService(roleCode);
}

// Lấy mã người dùng tiếp theo dự kiến cho Client Form Preview
export async function getNextUserCodeAction(
  roleCode: RoleCode
): Promise<{ success: boolean; code: string; error?: string }> {
  const auth = await requireUserManager();
  if (!auth.ok) return { success: false, code: "", error: auth.error };
  const code = await generateUserCodeService(roleCode);
  return { success: true, code };
}

// Lấy danh sách người dùng với cơ chế phân quyền chặt chẽ (Scoping) & Lọc trạng thái Xóa mềm
export async function getUsersAction(
  roleFilter: string = "Tất cả",
  searchKeyword: string = "",
  statusFilter: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  // AUTHZ-10: chỉ Admin / Quản nhiệm được xem danh sách người dùng (Quản nhiệm bị lọc theo trường trong service)
  const auth = await requireUserManager();
  if (!auth.ok) return [];
  return stripSensitive(await getUsersService(auth.session, roleFilter, searchKeyword, statusFilter));
}

export async function getTeachersAction() {
  const auth = await requireUserManager();
  if (!auth.ok) return [];
  return stripSensitive(await getTeachersService());
}

/**
 * @deprecated Vai trò TEACHING_ASSISTANT đã được loại bỏ theo chuẩn 4 vai trò của dự án.
 * Hàm luôn trả về mảng rỗng [] một cách an toàn mà không làm gãy type.
 */
export async function getTAsAction(): Promise<any[]> {
  return [];
}

// Tạo người dùng mới với cơ chế Role-First, RFC5322 validation, sinh mã tuần tự & gán đa nhiệm (+)
export async function createUserAction(data: {
  fullName: string;
  email: string;
  roleCode: RoleCode;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
  schoolIds?: string[];
  classIds?: string[];
  extraInfo?: any;
  entryIeltsScore?: number;
  ieltsLevelId?: string;
}): Promise<{ success: boolean; error?: string; user?: any; mailResult?: any }> {
  // AUTHZ-01
  const auth = await requireUserManager();
  if (!auth.ok) return { success: false, error: auth.error };
  const scope = await assertUserMutationAllowed(auth.session, {
    roleCode: data.roleCode,
    schoolIds: data.schoolIds,
    classIds: data.classIds,
  });
  if (!scope.ok) return { success: false, error: scope.error };

  const res = stripSensitive(await createUserService(data));
  if (res.success) safeRevalidate("/users");
  return res;
}

// Cập nhật thông tin người dùng
export async function updateUserAction(
  id: string,
  data: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: Gender;
    roleCode?: RoleCode;
    newPassword?: string;
    schoolIds?: string[];
    classIds?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  // AUTHZ-02
  const auth = await requireUserManager();
  if (!auth.ok) return { success: false, error: auth.error };
  const scope = await assertUserMutationAllowed(auth.session, {
    targetUserId: id,
    roleCode: data.roleCode,
    schoolIds: data.schoolIds,
    classIds: data.classIds,
  });
  if (!scope.ok) return { success: false, error: scope.error };

  const res = await updateUserService(id, data);
  if (res.success) safeRevalidate("/users");
  return res;
}

// Xóa mềm người dùng (isActive: false) - Tuyệt đối bảo vệ dữ liệu lịch sử (BUG_05)
export async function deleteUserAction(
  id: string,
  confirmed?: boolean
): Promise<{ success: boolean; error?: string; requiresConfirm?: boolean; warnings?: string[] }> {
  const session = await getSession();
  const roleCheck = checkRole(
    session,
    ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Bạn không có quyền xóa tài khoản người dùng!"
  );
  if (!roleCheck.ok) {
    return { success: false, error: roleCheck.error };
  }
  // AUTHZ-16
  const userScope = await assertUserInManagerScope(roleCheck.session, id);
  if (!userScope.ok) return { success: false, error: userScope.error };

  const res = await deleteUserService(roleCheck.session, id, { confirmed });
  if (res.success) {
    safeRevalidate("/users");
    safeRevalidate("/classes");
  }
  return res;
}

// Khôi phục tài khoản người dùng đã xóa mềm
export async function restoreUserAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireUserManager();
  if (!auth.ok) return { success: false, error: auth.error };
  const scope = await assertUserInManagerScope(auth.session, id);
  if (!scope.ok) return { success: false, error: scope.error };
  return restoreUserService(id);
}

// Xóa mềm hàng loạt
export async function deleteMultipleUsersAction(
  ids: string[],
  confirmed?: boolean
): Promise<{ success: boolean; error?: string; requiresConfirm?: boolean; warnings?: string[] }> {
  const session = await getSession();
  const roleCheck = checkRole(
    session,
    ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Bạn không có quyền xóa tài khoản người dùng!"
  );
  if (!roleCheck.ok) {
    return { success: false, error: roleCheck.error };
  }
  // AUTHZ-16: Quản nhiệm chỉ xóa người dùng thuộc trường mình
  for (const uid of ids) {
    const userScope = await assertUserInManagerScope(roleCheck.session, uid);
    if (!userScope.ok) return { success: false, error: userScope.error };
  }

  const res = await deleteMultipleUsersService(roleCheck.session, ids, { confirmed });
  if (res.success) {
    safeRevalidate("/users");
    safeRevalidate("/classes");
  }
  return res;
}

// Cập nhật hồ sơ cá nhân (Hỗ trợ đổi Email, cập nhật thông tin profile; cố định username)
export async function updateProfileAction(
  userId: string,
  data: {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: Gender;
    avatarUrl?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  // AUTHZ-03: chỉ cập nhật hồ sơ của CHÍNH người đang đăng nhập, bỏ qua `userId` do client gửi
  const profileAuth = checkAuth(await getSession(), "Vui lòng đăng nhập để cập nhật hồ sơ!");
  if (!profileAuth.ok) return { success: false, error: profileAuth.error };
  if (userId && userId !== profileAuth.session.userId) {
    return { success: false, error: "Bạn chỉ được cập nhật hồ sơ của chính mình!" };
  }
  const selfId = profileAuth.session.userId;

  const res = await updateProfileService(selfId, data);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  const currentSession = profileAuth.session;
  if (currentSession && currentSession.userId === selfId) {
    const newToken = await createSessionToken({
      ...currentSession,
      email: res.cleanEmail || currentSession.email,
      fullName: data.fullName.trim(),
    });
    await setSessionCookie(newToken);
  }

  safeRevalidate("/");
  safeRevalidate("/users");
  return { success: true };
}

// Phân tích và kiểm tra tính hợp lệ của File Excel (Validation & Preview)
export async function parseAndValidateExcelAction(fileBase64: string): Promise<{
  success: boolean;
  error?: string;
  totalRows?: number;
  validCount?: number;
  errorCount?: number;
  validRows?: any[];
  errorRows?: any[];
}> {
  const auth = await requireUserManager("IMPORT_EXCEL");
  if (!auth.ok) return { success: false, error: auth.error };
  return parseAndValidateExcelService(fileBase64);
}

// Lưu hàng loạt học viên từ Excel với mã sinh tự động HV...
export async function commitImportUsersAction(
  validRows: any[],
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireUserManager("IMPORT_EXCEL");
  if (!auth.ok) return { success: false, error: auth.error };
  if (auth.session.role === "SCHOOL_MANAGER") {
    // Lớp đích của từng dòng phải thuộc trường mình quản nhiệm
    const classIds = Array.from(new Set(validRows.map((r: any) => r?.classId).filter(Boolean)));
    for (const cid of classIds) {
      const scope = await assertClassAccess(auth.session, cid as string, "MANAGE");
      if (!scope.ok) return { success: false, error: scope.error };
    }
  }
  const res = await commitImportUsersService(validRows, fileName);
  if (res.success) {
    safeRevalidate("/users");
    safeRevalidate("/classes");
  }
  return res;
}
