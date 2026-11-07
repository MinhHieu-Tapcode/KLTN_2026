import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== KIỂM TRA VÀ KÍCH HOẠT TÀI KHOẢN GIÁO VIÊN & HỌC SINH TRÊN SUPABASE ===");

  const passwordPlain = "simpace2026";
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  // 1. Đồng bộ các vai trò
  const roles = [
    { code: "ADMIN", name: "Quản trị viên toàn hệ thống", description: "Toàn quyền quản trị" },
    { code: "SCHOOL_MANAGER", name: "Quản nhiệm trường học", description: "Quản lý trường liên kết" },
    { code: "TEACHER", name: "Giáo viên giảng dạy", description: "Giảng dạy, giao bài, chấm điểm" },
    { code: "TEACHING_ASSISTANT", name: "Trợ giảng (TA)", description: "Hỗ trợ học viên và lớp học" },
    { code: "STUDENT", name: "Học viên", description: "Học sinh tham gia lớp học" },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { code: r.code as any },
      update: { name: r.name, description: r.description },
      create: { code: r.code as any, name: r.name, description: r.description },
    });
    roleMap[r.code] = roleRecord.id;
  }
  console.log("✓ Đã đảm bảo đầy đủ các vai trò hệ thống.");

  // 2. Tạo hoặc lấy trường học & lớp học
  let school = await prisma.school.findFirst({ where: { isActive: true } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        code: "SCH_TD",
        name: "THPT Trương Định",
        address: "Hoàng Mai, Hà Nội",
        isActive: true,
      },
    });
  }
  console.log(`✓ Trường học: ${school.name} (${school.code})`);

  let classRoom = await prisma.class.findFirst({
    where: { schoolId: school.id, isActive: true },
  });
  if (!classRoom) {
    classRoom = await prisma.class.create({
      data: {
        code: "IELTS_TD_01",
        name: "IELTS Bứt Phá - 10A1",
        schoolId: school.id,
        program: "IELTS",
        level: "5.5 - 6.5",
        capacity: 30,
        status: "ACTIVE",
        isActive: true,
      },
    });
  }
  console.log(`✓ Lớp học: ${classRoom.name} (${classRoom.code})`);

  // 3. Xử lý Giáo viên: teacher@simpace.vn
  let teacherUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: "teacher@simpace.vn" }, { username: "teacher_huong" }],
    },
    include: { profile: true },
  });

  if (teacherUser) {
    teacherUser = await prisma.user.update({
      where: { id: teacherUser.id },
      data: {
        email: "teacher@simpace.vn",
        roleId: roleMap.TEACHER,
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
      include: { profile: true },
    });
    console.log(`✓ Đã kích hoạt tài khoản Giáo viên có sẵn: ${teacherUser.email} (Username: ${teacherUser.username})`);
  } else {
    // Tìm username không bị trùng
    let teacherUsername = "teacher_huong";
    const existing = await prisma.user.findUnique({ where: { username: teacherUsername } });
    if (existing) {
      teacherUsername = `teacher_${Date.now().toString().slice(-4)}`;
    }

    teacherUser = await prisma.user.create({
      data: {
        email: "teacher@simpace.vn",
        username: teacherUsername,
        passwordHash,
        isActive: true,
        mustChangePassword: false,
        roleId: roleMap.TEACHER,
        profile: {
          create: {
            fullName: "Cô Nguyễn Thu Hường",
            phoneNumber: "0912345678",
          },
        },
      },
      include: { profile: true },
    });
    console.log(`✓ Đã tạo mới tài khoản Giáo viên: ${teacherUser.email} (Username: ${teacherUser.username})`);
  }

  // Phân công Giáo viên vào lớp
  await prisma.classAssignment.upsert({
    where: {
      classId_userId: { classId: classRoom.id, userId: teacherUser.id },
    },
    update: { roleInClass: "TEACHER" },
    create: {
      classId: classRoom.id,
      userId: teacherUser.id,
      roleInClass: "TEACHER",
    },
  });
  console.log(`✓ Đã phân công Giáo viên ${teacherUser.username} vào lớp ${classRoom.name}`);

  // 4. Xử lý Học sinh: student@simpace.vn
  let studentUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: "student@simpace.vn" }, { username: "HV_AN" }, { username: "HV1001" }],
    },
    include: { profile: true },
  });

  if (studentUser) {
    studentUser = await prisma.user.update({
      where: { id: studentUser.id },
      data: {
        email: "student@simpace.vn",
        roleId: roleMap.STUDENT,
        isActive: true,
        mustChangePassword: false,
        passwordHash,
      },
      include: { profile: true },
    });
    console.log(`✓ Đã kích hoạt tài khoản Học sinh: ${studentUser.email} (Username: ${studentUser.username})`);
  } else {
    // Tìm username không trùng
    let studentUsername = "HV_AN";
    const existing = await prisma.user.findUnique({ where: { username: studentUsername } });
    if (existing) {
      studentUsername = `HV_${Date.now().toString().slice(-4)}`;
    }

    studentUser = await prisma.user.create({
      data: {
        email: "student@simpace.vn",
        username: studentUsername,
        passwordHash,
        isActive: true,
        mustChangePassword: false,
        roleId: roleMap.STUDENT,
        profile: {
          create: {
            fullName: "Nguyễn Văn An",
            phoneNumber: "0934567801",
            entryIeltsScore: 6.0,
          },
        },
      },
      include: { profile: true },
    });
    console.log(`✓ Đã tạo mới tài khoản Học sinh: ${studentUser.email} (Username: ${studentUser.username})`);
  }

  // Ghi danh Học sinh vào lớp
  await prisma.classEnrollment.upsert({
    where: {
      classId_studentId: { classId: classRoom.id, studentId: studentUser.id },
    },
    update: { status: "STUDYING" },
    create: {
      classId: classRoom.id,
      studentId: studentUser.id,
      status: "STUDYING",
    },
  });
  console.log(`✓ Đã ghi danh Học sinh ${studentUser.username} vào lớp ${classRoom.name}`);

  // 5. Kiểm tra một vài tài khoản khác hiện có trong DB
  const userCount = await prisma.user.count();
  const sampleUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      isActive: true,
      role: { select: { code: true, name: true } },
    },
    take: 10,
  });

  console.log(`\n=== TỔNG QUAN DỮ LIỆU NGƯỜI DÙNG TRÊN SUPABASE ===`);
  console.log(`Tổng số tài khoản trong Database: ${userCount}`);
  console.log("Danh sách 10 tài khoản tiêu biểu:");
  console.table(
    sampleUsers.map((u) => ({
      ID: u.id,
      Email: u.email,
      Username: u.username,
      Role: u.role?.code,
      Active: u.isActive,
    }))
  );

  console.log("\n==========================================");
  console.log("THÔNG TIN TÀI KHOẢN ĐÃ KÍCH HOẠT:");
  console.log(`1. GIÁO VIÊN:`);
  console.log(`   - Email / Đăng nhập: ${teacherUser.email} (hoặc username: ${teacherUser.username})`);
  console.log(`   - Mật khẩu: ${passwordPlain}`);
  console.log(`   - Vai trò: TEACHER (Cô Nguyễn Thu Hường)`);
  console.log(`   - Trạng thái: isActive = ${teacherUser.isActive}, mustChangePassword = false`);
  console.log(`2. HỌC SINH:`);
  console.log(`   - Email / Đăng nhập: ${studentUser.email} (hoặc username: ${studentUser.username})`);
  console.log(`   - Mật khẩu: ${passwordPlain}`);
  console.log(`   - Vai trò: STUDENT (Nguyễn Văn An)`);
  console.log(`   - Trạng thái: isActive = ${studentUser.isActive}, mustChangePassword = false`);
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
