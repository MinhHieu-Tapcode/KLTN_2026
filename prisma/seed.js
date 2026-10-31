const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- 1. Đang khởi tạo danh mục 5 Vai trò chuẩn (Roles) ---');

  const defaultRoles = [
    {
      code: 'ADMIN',
      name: 'Quản trị viên toàn hệ thống',
      description: 'Toàn quyền cấu hình, quản lý người dùng và giám sát toàn trung tâm',
    },
    {
      code: 'SCHOOL_MANAGER',
      name: 'Quản nhiệm trường học',
      description: 'Phụ trách trường liên kết, quản lý lớp học, học viên và duyệt báo cáo',
    },
    {
      code: 'TEACHER',
      name: 'Giáo viên giảng dạy',
      description: 'Giáo viên phụ trách giảng dạy, giao bài tập, chấm điểm và học liệu',
    },
    {
      code: 'TEACHING_ASSISTANT',
      name: 'Trợ giảng (TA)',
      description: 'Hỗ trợ lớp học, theo dõi học viên nộp bài, điểm danh và lập báo cáo buổi học',
    },
    {
      code: 'STUDENT',
      name: 'Học viên',
      description: 'Học sinh tham gia các lớp học IELTS/SAT tại các trường đối tác',
    },
  ];

  const roleMap = {};
  for (const role of defaultRoles) {
    const r = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
    roleMap[role.code] = r.id;
    console.log(`✔ Đã nạp vai trò: ${r.name} (${r.code})`);
  }

  console.log('--- 2. Đang khởi tạo Người dùng, Trường & Lớp học mẫu ---');
  const passwordHash = await bcrypt.hash('simpace2026', 10);

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@simpace.vn' },
    update: {},
    create: {
      username: 'teacher_huong',
      email: 'teacher@simpace.vn',
      passwordHash,
      roleId: roleMap.TEACHER,
      mustChangePassword: false,
      profile: { create: { fullName: 'Cô Nguyễn Thu Hường' } },
    },
  });

  const studentAn = await prisma.user.upsert({
    where: { email: 'student@simpace.vn' },
    update: {},
    create: {
      username: 'student_an',
      email: 'student@simpace.vn',
      passwordHash,
      roleId: roleMap.STUDENT,
      mustChangePassword: false,
      profile: { create: { fullName: 'Nguyễn Văn An', entryIeltsScore: 6.0 } },
    },
  });

  const school = await prisma.school.upsert({
    where: { code: 'SCH_TD' },
    update: {},
    create: {
      code: 'SCH_TD',
      name: 'THPT Trương Định',
      address: 'Hoàng Mai, Hà Nội',
    },
  });

  const cls = await prisma.class.upsert({
    where: { code: 'IELTS_TD_01' },
    update: {},
    create: {
      code: 'IELTS_TD_01',
      name: 'IELTS Bứt Phá - 10A1',
      schoolId: school.id,
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 30 * 86400000),
      endDate: new Date(Date.now() + 60 * 86400000),
    },
  });

  await prisma.classAssignment.upsert({
    where: {
      classId_userId: {
        classId: cls.id,
        userId: teacher.id,
      },
    },
    update: {},
    create: {
      classId: cls.id,
      userId: teacher.id,
      roleInClass: 'TEACHER',
    },
  });

  await prisma.classEnrollment.upsert({
    where: {
      classId_studentId: {
        classId: cls.id,
        studentId: studentAn.id,
      },
    },
    update: {},
    create: {
      classId: cls.id,
      studentId: studentAn.id,
    },
  });

  console.log('--- Hoàn tất khởi tạo dữ liệu mẫu thành công! ---');
}

main()
  .catch((e) => {
    console.error('Lỗi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

