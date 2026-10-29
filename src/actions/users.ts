"use server";

import {
  getSession,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { checkRole, ROLE_GROUPS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { RoleCode, Gender } from "@prisma/client";
import {
  generateUserCodeService,
  getUsersService,
  getTeachersService,
  getTAsService,
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
  return generateUserCodeService(roleCode);
}

// Lấy mã người dùng tiếp theo dự kiến cho Client Form Preview
export async function getNextUserCodeAction(
  roleCode: RoleCode
): Promise<{ success: boolean; code: string }> {
  const code = await generateUserCodeService(roleCode);
  return { success: true, code };
}

// Lấy danh sách người dùng với cơ chế phân quyền chặt chẽ (Scoping) & Lọc trạng thái Xóa mềm
export async function getUsersAction(
  roleFilter: string = "Tất cả",
  searchKeyword: string = "",
  statusFilter: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  const session = await getSession();
  return getUsersService(session, roleFilter, searchKeyword, statusFilter);
}

export async function getTeachersAction() {
  return getTeachersService();
}

export async function getTAsAction() {
  return getTAsService();
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
  const res = await createUserService(data);
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
  const res = await updateUserService(id, data);
  if (res.success) safeRevalidate("/users");
  return res;
}

// Xóa mềm người dùng (isActive: false) - Tuyệt đối bảo vệ dữ liệu lịch sử (BUG_05)
export async function deleteUserAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  const roleCheck = checkRole(
    session,
    ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Bạn không có quyền xóa tài khoản người dùng!"
  );
  if (!roleCheck.ok) {
    return { success: false, error: roleCheck.error };
  }

  const res = await deleteUserService(roleCheck.session, id);
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
  return restoreUserService(id);
}

// Xóa mềm hàng loạt
export async function deleteMultipleUsersAction(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  const roleCheck = checkRole(
    session,
    ROLE_GROUPS.ADMIN_AND_MANAGER,
    "Bạn không có quyền xóa tài khoản người dùng!"
  );
  if (!roleCheck.ok) {
    return { success: false, error: roleCheck.error };
  }

  const res = await deleteMultipleUsersService(roleCheck.session, ids);
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
  const res = await updateProfileService(userId, data);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  const currentSession = await getSession();
  if (currentSession && currentSession.userId === userId) {
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
  return parseAndValidateExcelService(fileBase64);
}

// Lưu hàng loạt học viên từ Excel với mã sinh tự động HV...
export async function commitImportUsersAction(
  validRows: any[],
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  const res = await commitImportUsersService(validRows, fileName);
  if (res.success) {
    safeRevalidate("/users");
    safeRevalidate("/classes");
  }
  return res;
}
