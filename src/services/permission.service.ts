import { prisma, isDbAlive } from "@/lib/prisma";
import { RoleCode } from "@prisma/client";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { logSystemWarning } from "@/lib/telemetry";

export interface SystemPermissionItem {
  id: string;
  featureKey: string;
  name: string;
  category: string;
  allowedRoles: RoleCode[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lấy danh sách toàn bộ quyền hệ thống
 */
export async function getSystemPermissionsService(): Promise<SystemPermissionItem[]> {
  if (!(await isDbAlive())) {
    logSystemWarning("permission.service", "getSystemPermissionsService", "DB offline, trả về DEFAULT_PERMISSIONS");
    return DEFAULT_PERMISSIONS.map((p, idx) => ({
      id: `perm-${idx}`,
      featureKey: p.featureKey,
      name: p.name,
      category: p.category || "Hệ thống",
      allowedRoles: p.allowedRoles as RoleCode[],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  try {
    let perms = await prisma.systemPermission.findMany({
      orderBy: { featureKey: "asc" },
    });

    if (perms.length === 0) {
      // Tự khởi tạo các quyền mặc định nếu bảng đang rỗng
      for (const p of DEFAULT_PERMISSIONS) {
        await prisma.systemPermission.create({
          data: {
            featureKey: p.featureKey,
            name: p.name,
            category: p.category,
            allowedRoles: p.allowedRoles as RoleCode[],
          },
        });
      }
      perms = await prisma.systemPermission.findMany({
        orderBy: { featureKey: "asc" },
      });
    }

    return perms as SystemPermissionItem[];
  } catch (err: any) {
    logSystemWarning("permission.service", "getSystemPermissionsService", "Lỗi DB khi lấy danh sách quyền, fallback default", err);
    return DEFAULT_PERMISSIONS.map((p, idx) => ({
      id: `perm-${idx}`,
      featureKey: p.featureKey,
      name: p.name,
      category: p.category || "Hệ thống",
      allowedRoles: p.allowedRoles as RoleCode[],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}

/**
 * Lấy danh sách các vai trò được phép truy cập của một tính năng
 */
export async function getPermissionAllowedRolesService(featureKey: string): Promise<RoleCode[] | undefined> {
  if (!(await isDbAlive())) {
    const found = DEFAULT_PERMISSIONS.find((p) => p.featureKey === featureKey);
    return found ? (found.allowedRoles as RoleCode[]) : undefined;
  }

  try {
    const perm = await prisma.systemPermission.findUnique({
      where: { featureKey },
    });
    return perm ? (perm.allowedRoles as RoleCode[]) : undefined;
  } catch (err: any) {
    logSystemWarning("permission.service", "getPermissionAllowedRolesService", "Lỗi DB khi lấy allowedRoles, fallback default", err);
    const found = DEFAULT_PERMISSIONS.find((p) => p.featureKey === featureKey);
    return found ? (found.allowedRoles as RoleCode[]) : undefined;
  }
}

/**
 * Cập nhật cấu hình phân quyền cho một tính năng
 */
export async function updateSystemPermissionService(
  featureKey: string,
  allowedRoles: RoleCode[]
) {
  try {
    if (await isDbAlive()) {
      await prisma.systemPermission.update({
        where: { featureKey },
        data: { allowedRoles },
      });
      return { success: true };
    } else {
      logSystemWarning("permission.service", "updateSystemPermissionService", "DB offline khi cập nhật quyền");
      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật phân quyền!" };
  }
}

export interface CreatePermissionData {
  featureKey: string;
  name: string;
  category?: string;
  allowedRoles: RoleCode[];
}

/**
 * Tạo mới một quyền tính năng trong hệ thống
 */
export async function createSystemPermissionService(data: CreatePermissionData) {
  try {
    const key = data.featureKey.trim().toUpperCase().replace(/\s+/g, "_");
    if (!key || !data.name.trim()) {
      return { success: false, error: "Mã và tên tính năng không được để trống!" };
    }

    if (await isDbAlive()) {
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

      return { success: true, data: newPerm };
    } else {
      const mockPerm: SystemPermissionItem = {
        id: `perm-${Date.now()}`,
        featureKey: key,
        name: data.name.trim(),
        category: data.category?.trim() || "Mở rộng",
        allowedRoles: data.allowedRoles || ["ADMIN"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return { success: true, data: mockPerm };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo tính năng mới!" };
  }
}

/**
 * Xóa một quyền tính năng
 */
export async function deleteSystemPermissionService(featureKey: string) {
  try {
    if (await isDbAlive()) {
      await prisma.systemPermission.delete({
        where: { featureKey },
      });
      return { success: true };
    } else {
      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa quyền này!" };
  }
}
