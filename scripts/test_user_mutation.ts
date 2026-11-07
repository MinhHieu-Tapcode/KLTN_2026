import { prisma } from "../src/lib/prisma";
import { assertUserMutationAllowed } from "../src/services/access-scope.service";
import { updateUserService } from "../src/services/user.service";

async function main() {
  const admin = await prisma.user.findFirst({
    where: { email: "admin@simpace.vn" },
    include: { role: true, profile: true },
  });
  console.log("Admin User:", { id: admin?.id, email: admin?.email, role: admin?.role?.code });

  const target = await prisma.user.findFirst({
    where: { email: "26a4041235@hvnh.edu.vn" },
    include: { role: true, profile: true },
  });
  console.log("Target User (Minh Hieu Hoang):", {
    id: target?.id,
    email: target?.email,
    username: target?.username,
    role: target?.role?.code,
  });

  if (!admin || !target) return;

  const session = {
    userId: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role.code,
    fullName: admin.profile?.fullName || admin.username,
  };

  const scopeRes = await assertUserMutationAllowed(session, {
    targetUserId: target.id,
    roleCode: "STUDENT",
  });
  console.log("Scope check result with Admin session:", scopeRes);
}

main().finally(() => prisma.$disconnect());
