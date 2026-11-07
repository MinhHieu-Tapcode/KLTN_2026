import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { authenticateUserService } from "../src/services/auth.service";

async function main() {
  const teacherA = await prisma.user.findFirst({
    where: { email: "gv.nguyenvan@simpace.vn" },
  });

  if (!teacherA) {
    console.log("Không tìm thấy teacher1!");
    return;
  }

  // Đảm bảo mật khẩu là simpace2026
  const hash = await bcrypt.hash("simpace2026", 10);
  await prisma.user.update({
    where: { id: teacherA.id },
    data: {
      passwordHash: hash,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const authTest = await authenticateUserService("gv.nguyenvan@simpace.vn", "simpace2026");
  console.log("Xác thực ThS. Nguyễn Văn A:", authTest.success ? "Thành công 100%" : "Thất bại");
}

main().finally(() => prisma.$disconnect());
