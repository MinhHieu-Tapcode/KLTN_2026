import { prisma } from "../src/lib/prisma";
import { getPermissionAllowedRolesService } from "../src/services/permission.service";
import { hasFeatureAccess } from "../src/lib/permissions";

async function main() {
  const adminUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: "admin@simpace.vn" },
        { profile: { fullName: { contains: "Ban Quản trị" } } },
        { role: { code: "ADMIN" } },
      ],
    },
    include: { role: true, profile: true },
  });

  console.log("=== DANH SÁCH TÀI KHOẢN ADMIN ===");
  for (const u of adminUsers) {
    console.log({
      id: u.id,
      email: u.email,
      username: u.username,
      roleCode: u.role?.code,
      fullName: u.profile?.fullName,
      isActive: u.isActive,
    });
  }

  // Kiểm tra quyền SystemPermission
  const allowedRoles = await getPermissionAllowedRolesService("VIEW_USERS");
  console.log("=== PERMISSIONS FOR VIEW_USERS ===");
  console.log("Allowed Roles:", allowedRoles);

  const permissions = await prisma.systemPermission.findMany();
  console.log("=== ALL SYSTEM PERMISSIONS IN DB ===");
  console.table(permissions);
}

main().finally(() => prisma.$disconnect());
