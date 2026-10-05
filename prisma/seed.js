const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang khởi tạo danh mục 5 Vai trò chuẩn (Roles) ---');

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

  for (const role of defaultRoles) {
    const r = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
    console.log(`✔ Đã nạp vai trò: ${r.name} (${r.code})`);
  }

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
