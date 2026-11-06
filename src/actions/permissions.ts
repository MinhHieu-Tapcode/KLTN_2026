"use server";

import { revalidatePath } from "next/cache";
import { RoleCode } from "@prisma/client";
import { hasFeatureAccess, isAdmin } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import {
  getSystemPermissionsService,
  getPermissionAllowedRolesService,
  updateSystemPermissionService,
  createSystemPermissionService,
  deleteSystemPermissionService,
  CreatePermissionData,
} from "@/services/permission.service";

async function verifySettingsAccess() {
  const session = await getSession();
  if (!session) return false;
  if (isAdmin(session)) return true;

  const allowedRoles = await getPermissionAllowedRolesService("SYSTEM_SETTINGS");
  return hasFeatureAccess(session, "SYSTEM_SETTINGS", allowedRoles);
}

export async function getSystemPermissionsAction() {
  return await getSystemPermissionsService();
}

export async function updateSystemPermissionAction(
  featureKey: string,
  allowedRoles: RoleCode[]
) {
  const hasAccess = await verifySettingsAccess();
  if (!hasAccess) {
    return { success: false, error: "Bạn không có quyền thay đổi cấu hình phân quyền hệ thống!" };
  }

  const res = await updateSystemPermissionService(featureKey, allowedRoles);
  if (res.success) {
    revalidatePath("/");
  }
  return res;
}

export async function createSystemPermissionAction(data: CreatePermissionData) {
  const hasAccess = await verifySettingsAccess();
  if (!hasAccess) {
    return { success: false, error: "Bạn không có quyền tạo thêm màn hình/tính năng mới!" };
  }

  const res = await createSystemPermissionService(data);
  if (res.success) {
    revalidatePath("/");
  }
  return res;
}

export async function deleteSystemPermissionAction(featureKey: string) {
  const hasAccess = await verifySettingsAccess();
  if (!hasAccess) {
    return { success: false, error: "Bạn không có quyền xóa tính năng này!" };
  }

  const res = await deleteSystemPermissionService(featureKey);
  if (res.success) {
    revalidatePath("/");
  }
  return res;
}
