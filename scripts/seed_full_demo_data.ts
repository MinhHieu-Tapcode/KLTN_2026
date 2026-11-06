import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== BẮT ĐẦU NẠP 15 DỮ LIỆU MẪU ĐẦY ĐỦ CHO HỆ THỐNG LMS SIMPACE ===");

  const passwordHash =
    "$2a$10$kBQUZavMrSd7zY/VMpYOdeYWfzP5ZJ9QxQQ59Jncrlj2ytKSCtjhy"; // simpace2026

  // 1. Khởi tạo / Cập nhật 5 Vai trò
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
  console.log("✓ Đã đồng bộ 5 Vai trò hệ thống.");

  // 2. Khởi tạo Trường học
  const school = await prisma.school.upsert({
    where: { code: "SCH_TD" },
    update: { name: "THPT Trương Định", address: "Hoàng Mai, Hà Nội" },
    create: {
      code: "SCH_TD",
      name: "THPT Trương Định",
      address: "Hoàng Mai, Hà Nội",
      isActive: true,
    },
  });
  console.log(`✓ Đã tạo/cập nhật trường: ${school.name}`);

  // 3. Khởi tạo 2 Lớp học
  const class1 = await prisma.class.upsert({
    where: { code: "IELTS_TD_01" },
    update: { name: "IELTS Bứt Phá - 10A1", program: "IELTS", level: "5.5 - 6.5", isActive: true },
    create: {
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

  const class2 = await prisma.class.upsert({
    where: { code: "IELTS_TD_02" },
    update: { name: "IELTS Nền Tảng - 11B2", program: "IELTS", level: "4.5 - 5.5", isActive: true },
    create: {
      code: "IELTS_TD_02",
      name: "IELTS Nền Tảng - 11B2",
      schoolId: school.id,
      program: "IELTS",
      level: "4.5 - 5.5",
      capacity: 25,
      status: "ACTIVE",
      isActive: true,
    },
  });
  console.log(`✓ Đã tạo/cập nhật 2 lớp học: ${class1.name} & ${class2.name}`);

  // 4. Khởi tạo Đội ngũ Nhân sự (Admin, Quản nhiệm, 2 Giáo viên, 1 Trợ giảng)
  const staffList = [
    {
      username: "admin",
      email: "admin@simpace.vn",
      roleCode: "ADMIN",
      fullName: "Quản trị viên Hệ thống",
      phone: "0987654321",
    },
    {
      username: "manager_quan",
      email: "manager@simpace.vn",
      roleCode: "SCHOOL_MANAGER",
      fullName: "ThS. Hoàng Văn Quản",
      phone: "0981234567",
    },
    {
      username: "teacher_huong",
      email: "teacher@simpace.vn",
      roleCode: "TEACHER",
      fullName: "Cô Nguyễn Thu Hường",
      phone: "0912345678",
    },
    {
      username: "teacher1",
      email: "gv.nguyenvan@simpace.vn",
      roleCode: "TEACHER",
      fullName: "ThS. Nguyễn Văn A",
      phone: "0901234567",
    },
    {
      username: "ta_mai",
      email: "ta.mai@simpace.vn",
      roleCode: "TEACHING_ASSISTANT",
      fullName: "Vũ Phương Mai",
      phone: "0907654321",
    },
  ];

  const staffUserMap: Record<string, string> = {};
  for (const s of staffList) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        username: s.username,
        isActive: true,
        mustChangePassword: false,
        passwordHash,
        roleId: roleMap[s.roleCode],
      },
      create: {
        username: s.username,
        email: s.email,
        passwordHash,
        isActive: true,
        mustChangePassword: false,
        roleId: roleMap[s.roleCode],
        profile: {
          create: {
            fullName: s.fullName,
            phoneNumber: s.phone,
          },
        },
      },
    });
    staffUserMap[s.email] = user.id;

    // Phân công giáo viên & trợ giảng vào lớp
    if (s.roleCode === "TEACHER" || s.roleCode === "TEACHING_ASSISTANT") {
      const staffRole = s.roleCode === "TEACHER" ? "TEACHER" : "TEACHING_ASSISTANT";
      await prisma.classAssignment.upsert({
        where: {
          classId_userId: { classId: class1.id, userId: user.id },
        },
        update: { roleInClass: staffRole },
        create: {
          classId: class1.id,
          userId: user.id,
          roleInClass: staffRole,
        },
      });
      await prisma.classAssignment.upsert({
        where: {
          classId_userId: { classId: class2.id, userId: user.id },
        },
        update: { roleInClass: staffRole },
        create: {
          classId: class2.id,
          userId: user.id,
          roleInClass: staffRole,
        },
      });
    }
  }
  console.log("✓ Đã khởi tạo và phân công 5 nhân sự (Admin, Quản nhiệm, 2 Giáo viên, 1 Trợ giảng).");

  // 5. Khởi tạo 15 Học viên mẫu
  const studentList = [
    { username: "HV1001", email: "student@simpace.vn", fullName: "Nguyễn Văn An", phone: "0934567801", score: 6.0, classId: class1.id },
    { username: "HV1002", email: "lan.tran@simpace.vn", fullName: "Trần Thị Lan", phone: "0934567802", score: 5.5, classId: class1.id },
    { username: "HV1003", email: "long.le@simpace.vn", fullName: "Lê Hoàng Long", phone: "0934567803", score: 6.5, classId: class1.id },
    { username: "HV1004", email: "chau.pham@simpace.vn", fullName: "Phạm Minh Châu", phone: "0934567804", score: 5.0, classId: class1.id },
    { username: "HV1005", email: "duc.hoang@simpace.vn", fullName: "Hoàng Anh Đức", phone: "0934567805", score: 7.0, classId: class1.id },
    { username: "HV1006", email: "ngoc.vu@simpace.vn", fullName: "Vũ Bảo Ngọc", phone: "0934567806", score: 4.5, classId: class1.id },
    { username: "HV1007", email: "tuan.dang@simpace.vn", fullName: "Đặng Quốc Tuấn", phone: "0934567807", score: 6.0, classId: class1.id },
    { username: "HV1008", email: "mai.bui@simpace.vn", fullName: "Bùi Thanh Mai", phone: "0934567808", score: 7.5, classId: class1.id },
    { username: "HV1009", email: "nam.dinh@simpace.vn", fullName: "Đinh Hải Nam", phone: "0934567809", score: 3.5, classId: class2.id },
    { username: "HV1010", email: "linh.do@simpace.vn", fullName: "Đỗ Khánh Linh", phone: "0934567810", score: 5.5, classId: class2.id },
    { username: "HV1011", email: "trung.ngo@simpace.vn", fullName: "Ngô Quang Trung", phone: "0934567811", score: 6.5, classId: class2.id },
    { username: "HV1012", email: "ha.duong@simpace.vn", fullName: "Dương Thu Hà", phone: "0934567812", score: 4.0, classId: class2.id },
    { username: "HV1013", email: "huy.ly@simpace.vn", fullName: "Lý Gia Huy", phone: "0934567813", score: 5.0, classId: class2.id },
    { username: "HV1014", email: "nhu.phan@simpace.vn", fullName: "Phan Quỳnh Như", phone: "0934567814", score: 8.0, classId: class2.id },
    { username: "HV1015", email: "khoa.truong@simpace.vn", fullName: "Trương Đăng Khoa", phone: "0934567815", score: 6.0, classId: class2.id },
  ];

  for (const st of studentList) {
    const user = await prisma.user.upsert({
      where: { email: st.email },
      update: {
        username: st.username,
        isActive: true,
        mustChangePassword: false,
        passwordHash,
        roleId: roleMap.STUDENT,
      },
      create: {
        username: st.username,
        email: st.email,
        passwordHash,
        isActive: true,
        mustChangePassword: false,
        roleId: roleMap.STUDENT,
        profile: {
          create: {
            fullName: st.fullName,
            phoneNumber: st.phone,
            entryIeltsScore: st.score,
          },
        },
      },
    });

    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: { classId: st.classId, studentId: user.id },
      },
      update: { status: "STUDYING" },
      create: {
        classId: st.classId,
        studentId: user.id,
        status: "STUDYING",
      },
    });
  }
  console.log(`✓ Đã nạp thành công 15 học viên mẫu vào 2 lớp (${class1.code}: 8 HV, ${class2.code}: 7 HV).`);
  console.log("\n=== TỔNG KẾT TÀI KHOẢN MẪU ===");
  console.log("Mật khẩu chung cho tất cả tài khoản: simpace2026");
  console.log("1. Giáo viên (Chấm bài, giao bài): teacher@simpace.vn (Cô Nguyễn Thu Hường)");
  console.log("2. Học sinh (Làm bài, xem điểm): student@simpace.vn (Nguyễn Văn An)");
  console.log("3. Quản trị viên (Quản lý hệ thống): admin@simpace.vn (Quản trị viên Hệ thống)");
  console.log("4. Quản nhiệm trường: manager@simpace.vn (ThS. Hoàng Văn Quản)");
}

main()
  .catch((e) => {
    console.error("Lỗi khi nạp dữ liệu mẫu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
