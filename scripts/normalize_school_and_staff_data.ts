import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== BẮT ĐẦU CHUẨN HÓA DỮ LIỆU TRƯỜNG HỌC, LỚP HỌC VÀ NHÂN SỰ ===");

  // =========================================================================
  // 1. CHUẨN HÓA TRƯỜNG THPT TRƯƠNG ĐỊNH & GỘP TRƯỜNG TRÙNG LẶP
  // =========================================================================
  console.log("\n--- 1. Chuẩn hóa Trường THPT Trương Định ---");
  // Tìm trường chuẩn TD
  let mainTdSchool = await prisma.school.findFirst({
    where: { code: "TD" },
  });

  if (!mainTdSchool) {
    mainTdSchool = await prisma.school.create({
      data: {
        code: "TD",
        name: "THPT Trương Định",
        address: "105 Bạch Mai, Hai Bà Trưng, Hà Nội",
        isActive: true,
      },
    });
  } else {
    mainTdSchool = await prisma.school.update({
      where: { id: mainTdSchool.id },
      data: {
        name: "THPT Trương Định",
        address: "105 Bạch Mai, Hai Bà Trưng, Hà Nội",
        isActive: true,
      },
    });
  }
  console.log(`✓ Trường chuẩn: ${mainTdSchool.name} (Mã: ${mainTdSchool.code}, ID: ${mainTdSchool.id})`);

  // Tìm trường trùng lặp SCH_TD (nếu có) và xóa mềm (isActive: false)
  const dupTdSchool = await prisma.school.findFirst({
    where: { code: "SCH_TD" },
  });
  if (dupTdSchool) {
    // Chuyển bất kỳ lớp nào (nếu có) sang trường chuẩn mainTdSchool
    await prisma.class.updateMany({
      where: { schoolId: dupTdSchool.id },
      data: { schoolId: mainTdSchool.id },
    });
    // Vô hiệu hóa trường trùng lặp
    await prisma.school.update({
      where: { id: dupTdSchool.id },
      data: { isActive: false, name: "THPT Trương Định (Cũ - Đã gộp)" },
    });
    console.log(`✓ Đã vô hiệu hóa trường trùng lặp: SCH_TD`);
  }

  // Vô hiệu hóa lớp rác "khuyến mãi trang chủ" (mã 52908) nếu còn
  await prisma.class.updateMany({
    where: { code: "52908" },
    data: { isActive: false },
  });

  // =========================================================================
  // 2. GÁN 2 LỚP IELTS_TD_01 VÀ IELTS_TD_02 VỀ ĐÚNG TRƯỜNG TRƯƠNG ĐỊNH
  // =========================================================================
  console.log("\n--- 2. Chuẩn hóa 2 lớp học của THPT Trương Định ---");
  const class1 = await prisma.class.upsert({
    where: { code: "IELTS_TD_01" },
    update: {
      name: "IELTS Bứt Phá - 10A1",
      schoolId: mainTdSchool.id,
      program: "IELTS",
      level: "5.5 - 6.5",
      status: "ACTIVE",
      isActive: true,
    },
    create: {
      code: "IELTS_TD_01",
      name: "IELTS Bứt Phá - 10A1",
      schoolId: mainTdSchool.id,
      program: "IELTS",
      level: "5.5 - 6.5",
      capacity: 30,
      status: "ACTIVE",
      isActive: true,
    },
  });

  const class2 = await prisma.class.upsert({
    where: { code: "IELTS_TD_02" },
    update: {
      name: "IELTS Nền Tảng - 11B2",
      schoolId: mainTdSchool.id,
      program: "IELTS",
      level: "4.5 - 5.5",
      status: "ACTIVE",
      isActive: true,
    },
    create: {
      code: "IELTS_TD_02",
      name: "IELTS Nền Tảng - 11B2",
      schoolId: mainTdSchool.id,
      program: "IELTS",
      level: "4.5 - 5.5",
      capacity: 25,
      status: "ACTIVE",
      isActive: true,
    },
  });
  console.log(`✓ Lớp 1: ${class1.name} (${class1.code}) -> Thuộc: ${mainTdSchool.name}`);
  console.log(`✓ Lớp 2: ${class2.name} (${class2.code}) -> Thuộc: ${mainTdSchool.name}`);

  // =========================================================================
  // 3. DỌN DẸP / VÔ HIỆU HÓA DATA TRỢ GIẢNG (TEACHING_ASSISTANT)
  // =========================================================================
  console.log("\n--- 3. Dọn dẹp tài khoản Trợ giảng (TA) ---");
  const taUsers = await prisma.user.findMany({
    where: {
      role: { code: "TEACHING_ASSISTANT" },
    },
    select: { id: true, email: true, username: true },
  });

  const updatedTAs = await prisma.user.updateMany({
    where: {
      role: { code: "TEACHING_ASSISTANT" },
    },
    data: {
      isActive: false,
    },
  });
  console.log(`✓ Đã xóa mềm (${updatedTAs.count} tài khoản Trợ giảng) bao gồm: ${taUsers.map(t => t.email).join(", ")}`);

  // =========================================================================
  // 4. ĐẢM BẢO PHÂN CÔNG GIÁO VIÊN VÀ HỌC SINH VÀO ĐÚNG LỚP TRƯƠNG ĐỊNH
  // =========================================================================
  console.log("\n--- 4. Phân công Giáo viên và Học sinh ---");
  const teacher = await prisma.user.findFirst({ where: { email: "teacher@simpace.vn" } });
  const student = await prisma.user.findFirst({ where: { email: "student@simpace.vn" } });

  if (teacher) {
    // Phân công giáo viên vào cả 2 lớp của trường Trương Định
    await prisma.classAssignment.upsert({
      where: { classId_userId: { classId: class1.id, userId: teacher.id } },
      update: { roleInClass: "TEACHER" },
      create: { classId: class1.id, userId: teacher.id, roleInClass: "TEACHER" },
    });
    await prisma.classAssignment.upsert({
      where: { classId_userId: { classId: class2.id, userId: teacher.id } },
      update: { roleInClass: "TEACHER" },
      create: { classId: class2.id, userId: teacher.id, roleInClass: "TEACHER" },
    });
    console.log(`✓ Giáo viên ${teacher.email} đã được phân công phụ trách cả 2 lớp ${class1.code} & ${class2.code}`);
  }

  if (student) {
    // Ghi danh học viên vào lớp IELTS_TD_01
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: class1.id, studentId: student.id } },
      update: { status: "STUDYING" },
      create: { classId: class1.id, studentId: student.id, status: "STUDYING" },
    });
    console.log(`✓ Học viên ${student.email} đã được ghi danh vào lớp ${class1.name}`);
  }

  // Đảm bảo các bài tập đã tạo trước đó gắn với class1 (IELTS_TD_01)
  const assignments = await prisma.assignment.findMany({ where: { classId: class1.id } });
  console.log(`✓ Lớp ${class1.code} hiện có ${assignments.length} bài tập đã sẵn sàng.`);

  // =========================================================================
  // 5. KIỂM TRA LẠI DỮ LIỆU SAU CHUẨN HÓA
  // =========================================================================
  console.log("\n=== KIỂM TRA LẠI SAU KHI CHUẨN HÓA ===");
  const activeSchools = await prisma.school.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      classes: {
        where: { isActive: true },
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  console.log("Danh sách các trường hoạt động và lớp trực thuộc:");
  for (const s of activeSchools) {
    console.log(`- ${s.name} (Mã: ${s.code}): ${s.classes.length} lớp [${s.classes.map(c => c.code).join(", ")}]`);
  }

  const activeTAs = await prisma.user.count({
    where: { role: { code: "TEACHING_ASSISTANT" }, isActive: true },
  });
  console.log(`- Số lượng Trợ giảng đang hiển thị (Active): ${activeTAs}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
