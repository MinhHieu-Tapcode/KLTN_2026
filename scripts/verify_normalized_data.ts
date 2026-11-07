import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA TOÀN DIỆN DỮ LIỆU ĐÃ CHUẨN HÓA ===");

  // 1. Trường học THPT Trương Định
  const tdSchool = await prisma.school.findFirst({
    where: { code: "TD", isActive: true },
    include: {
      classes: {
        where: { isActive: true },
        include: {
          assignments: { include: { staff: true } },
          enrollments: { include: { student: true } },
        },
      },
    },
  });

  console.log("1. Trường THPT Trương Định:");
  console.log(`   - ID: ${tdSchool?.id}`);
  console.log(`   - Tên: ${tdSchool?.name}`);
  console.log(`   - Số lớp học: ${tdSchool?.classes.length}`);
  tdSchool?.classes.forEach((c) => {
    console.log(`     + Lớp [${c.code}]: ${c.name}`);
    console.log(`       * Giáo viên: ${c.assignments.map(a => a.staff.email).join(", ") || "Chưa có"}`);
    console.log(`       * Số học viên: ${c.enrollments.length}`);
  });

  // 2. Kiểm tra trường SCH_TD
  const dupSchool = await prisma.school.findFirst({ where: { code: "SCH_TD" } });
  console.log("2. Trường trùng lặp SCH_TD:");
  console.log(`   - Trạng thái isActive: ${dupSchool?.isActive} (Kỳ vọng: false)`);

  // 3. Kiểm tra Trợ giảng (TA)
  const activeTAs = await prisma.user.findMany({
    where: { role: { code: "TEACHING_ASSISTANT" }, isActive: true },
  });
  console.log("3. Trợ giảng còn Active:");
  console.log(`   - Số lượng: ${activeTAs.length} (Kỳ vọng: 0)`);
}

main().finally(() => prisma.$disconnect());
