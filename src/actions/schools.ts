"use server";

import { stripSensitive } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { checkRole, isAdmin, isSchoolManager, ROLE_GROUPS } from "@/lib/permissions";
import { assertSchoolAccess } from "@/services/access-scope.service";
import { requireFeature } from "@/services/feature-access.service";

async function requireSchoolStaff() {
  const auth = checkRole(await getSession(), ROLE_GROUPS.ADMIN_AND_MANAGER, "Bạn không có quyền truy cập dữ liệu trường học!");
  if (!auth.ok) return auth;
  return requireFeature(auth.session, "VIEW_SCHOOLS", "Quyền quản lý trường học đã bị tắt đối với vai trò của bạn!");
}

async function requireSchoolAdmin() {
  return checkRole(await getSession(), ROLE_GROUPS.ADMIN_ONLY, "Chỉ Quản trị viên mới có quyền thực hiện thao tác này!");
}
import {
  generateSchoolCode,
  getSchoolsService,
  getSchoolDetailService,
  getSchoolManagersService,
  createSchoolService,
  updateSchoolService,
  deleteSchoolService,
  restoreSchoolService,
  deleteMultipleSchoolsService,
  checkSchoolManagerScheduleConflictService,
  changeSchoolManagerService,
  CreateSchoolData,
  UpdateSchoolData,
  ChangeSchoolManagerParams,
} from "@/services/school.service";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export { generateSchoolCode };

export async function getNextSchoolCodeAction(name: string) {
  const auth = await requireSchoolAdmin();
  if (!auth.ok) return { success: false, code: "", error: auth.error };
  if (!name || !name.trim()) return { success: true, code: "SCH_SIM" };
  const code = await generateSchoolCode(name.trim());
  return { success: true, code };
}

export async function getSchoolsAction(
  searchKeyword: string = "",
  statusFilter: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  // AUTHZ-12: Admin xem tất cả, Quản nhiệm xem trường mình, vai trò khác không xem danh sách trường
  const auth = await requireSchoolStaff();
  if (!auth.ok) return [];
  const session = auth.session;
  const managerId = isSchoolManager(session) ? session.userId : undefined;

  return stripSensitive(await getSchoolsService({
    searchKeyword,
    statusFilter,
    managerId,
  }));
}

export async function getSchoolDetailAction(schoolId: string) {
  const auth = await requireSchoolStaff();
  if (!auth.ok) return null;
  const scope = await assertSchoolAccess(auth.session, schoolId);
  if (!scope.ok) return null;
  return stripSensitive(await getSchoolDetailService(schoolId));
}

export async function getSchoolManagersAction() {
  const auth = await requireSchoolAdmin();
  if (!auth.ok) return [];
  return stripSensitive(await getSchoolManagersService());
}

export async function createSchoolAction(data: CreateSchoolData) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền tạo trường học mới!" };
  }

  const res = await createSchoolService(data);
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}

export async function updateSchoolAction(id: string, data: UpdateSchoolData) {
  const staff = await requireSchoolStaff();
  if (!staff.ok) {
    return { success: false, error: staff.error };
  }
  const session = staff.session;

  // AUTHZ-14: Quản nhiệm chỉ sửa trường mình và không được đổi Quản nhiệm phụ trách
  let safeData = data;
  if (isSchoolManager(session)) {
    const scope = await assertSchoolAccess(session, id);
    if (!scope.ok) return { success: false, error: scope.error };
    const { managerId: _ignored, ...rest } = data;
    safeData = rest;
  }
  const res = await updateSchoolService(id, safeData);
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}

export async function deleteSchoolAction(id: string, confirmed?: boolean) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền xóa trường học!" };
  }

  const res = await deleteSchoolService(id, { confirmed });
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}

export async function restoreSchoolAction(id: string) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền khôi phục trường học!" };
  }

  const res = await restoreSchoolService(id);
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}

export async function deleteMultipleSchoolsAction(ids: string[], confirmed?: boolean) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền xóa hàng loạt trường học!" };
  }

  const res = await deleteMultipleSchoolsService(ids, { confirmed });
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}

export async function checkSchoolManagerScheduleConflictAction(
  targetSchoolId: string,
  managerId: string
) {
  const auth = await requireSchoolAdmin();
  if (!auth.ok) return { hasConflict: false, error: auth.error } as any;
  return await checkSchoolManagerScheduleConflictService(targetSchoolId, managerId);
}

export async function changeSchoolManagerAction(data: ChangeSchoolManagerParams) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền thay đổi quản nhiệm trường học!" };
  }

  const res = await changeSchoolManagerService(data);
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}
