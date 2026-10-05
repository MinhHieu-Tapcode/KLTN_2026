"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RoleCode } from "@prisma/client";

import { DEFAULT_PERMISSIONS } from "@/lib/permissions";

export async function getSystemPermissionsAction() {
  let perms = await prisma.systemPermission.findMany({
    orderBy: { featureKey: "asc" },
  });

  if (perms.length === 0) {
    // Tự khởi tạo các quyền mặc định
    for (const p of DEFAULT_PERMISSIONS) {
      await prisma.systemPermission.create({
        data: p,
      });
    }
    perms = await prisma.systemPermission.findMany({
      orderBy: { featureKey: "asc" },
    });
  }

  return perms;
}

import { getSession } from "@/lib/auth";

async function verifySettingsAccess() {
  const session = await getSession();
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  const perm = await prisma.systemPermission.findUnique({
    where: { featureKey: "SYSTEM_SETTINGS" },
  });
  return !!perm?.allowedRoles.includes(session.role as RoleCode);
}

export async function updateSystemPermissionAction(
  featureKey: string,
  allowedRoles: RoleCode[]
) {
  try {
    const hasAccess = await verifySettingsAccess();
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền thay đổi cấu hình phân quyền hệ thống!" };
    }

    await prisma.systemPermission.update({
      where: { featureKey },
      data: { allowedRoles },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật phân quyền!" };
  }
}

export async function createSystemPermissionAction(data: {
  featureKey: string;
  name: string;
  category?: string;
  allowedRoles: RoleCode[];
}) {
  try {
    const hasAccess = await verifySettingsAccess();
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền tạo thêm màn hình/tính năng mới!" };
    }

    const key = data.featureKey.trim().toUpperCase().replace(/\s+/g, "_");
    if (!key || !data.name.trim()) {
      return { success: false, error: "Mã và tên tính năng không được để trống!" };
    }

    const existing = await prisma.systemPermission.findUnique({
      where: { featureKey: key },
    });
    if (existing) {
      return { success: false, error: `Mã tính năng '${key}' đã tồn tại!` };
    }

    const newPerm = await prisma.systemPermission.create({
      data: {
        featureKey: key,
        name: data.name.trim(),
        category: data.category?.trim() || "Mở rộng",
        allowedRoles: data.allowedRoles || ["ADMIN"],
      },
    });

    revalidatePath("/");
    return { success: true, data: newPerm };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo tính năng mới!" };
  }
}

export async function deleteSystemPermissionAction(featureKey: string) {
  try {
    const hasAccess = await verifySettingsAccess();
    if (!hasAccess) {
      return { success: false, error: "Bạn không có quyền xóa tính năng này!" };
    }

    await prisma.systemPermission.delete({
      where: { featureKey },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa quyền này!" };
  }
}

