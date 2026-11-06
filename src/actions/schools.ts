"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdmin, isSchoolManager } from "@/lib/permissions";
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
  if (!name || !name.trim()) return { success: true, code: "SCH_SIM" };
  const code = await generateSchoolCode(name.trim());
  return { success: true, code };
}

export async function getSchoolsAction(
  searchKeyword: string = "",
  statusFilter: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  const session = await getSession();
  const managerId = isSchoolManager(session) ? session?.userId : undefined;

  return await getSchoolsService({
    searchKeyword,
    statusFilter,
    managerId,
  });
}

export async function getSchoolDetailAction(schoolId: string) {
  return await getSchoolDetailService(schoolId);
}

export async function getSchoolManagersAction() {
  return await getSchoolManagersService();
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
  const session = await getSession();
  if (!session || (!isAdmin(session) && !isSchoolManager(session))) {
    return { success: false, error: "Bạn không có quyền cập nhật thông tin trường học!" };
  }

  const res = await updateSchoolService(id, data);
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}

export async function deleteSchoolAction(id: string) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền xóa trường học!" };
  }

  const res = await deleteSchoolService(id);
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

export async function deleteMultipleSchoolsAction(ids: string[]) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền xóa hàng loạt trường học!" };
  }

  const res = await deleteMultipleSchoolsService(ids);
  if (res.success) {
    safeRevalidate("/schools");
  }
  return res;
}

export async function checkSchoolManagerScheduleConflictAction(
  targetSchoolId: string,
  managerId: string
) {
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
