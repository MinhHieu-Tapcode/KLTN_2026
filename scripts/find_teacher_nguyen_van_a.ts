import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { profile: { fullName: { contains: "Nguyễn Văn A" } } },
        { email: { contains: "nguyenvan" } },
        { username: { contains: "teacher1" } },
        { role: { code: "TEACHER" } },
      ],
    },
    include: { role: true, profile: true },
  });

  console.log("=== DANH SÁCH GIÁO VIÊN NGUYỄN VĂN A HOẶC CÁC GIÁO VIÊN KHÁC ===");
  console.table(users.map(u => ({
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.profile?.fullName,
    role: u.role?.code,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
  })));
}

main().finally(() => prisma.$disconnect());
