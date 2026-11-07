import { prisma } from "../src/lib/prisma";

async function main() {
  const roles = await prisma.role.findMany({
    include: {
      _count: { select: { users: true } },
    },
  });
  console.log("=== THỐNG KÊ NGƯỜI DÙNG THEO VAI TRÒ ===");
  console.table(roles.map(r => ({ code: r.code, name: r.name, count: r._count.users })));

  const tas = await prisma.user.findMany({
    where: { role: { code: "TEACHING_ASSISTANT" } },
    select: { id: true, email: true, username: true, profile: { select: { fullName: true } } },
  });
  console.log("=== DANH SÁCH TRỢ GIẢNG (TA) ===");
  console.table(tas.map(t => ({ id: t.id, email: t.email, username: t.username, name: t.profile?.fullName })));
}

main().finally(() => prisma.$disconnect());
