import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const defaultPassword = "Simpace@2026";
  const passwordHash = await hashPassword(defaultPassword);

  const taRole = await prisma.role.findUnique({ where: { code: "TEACHING_ASSISTANT" } });
  const teacherRole = await prisma.role.findUnique({ where: { code: "TEACHER" } });

  if (!taRole || !teacherRole) {
    console.error("Roles not found!");
    return;
  }

  // Create TA 1: Hoàng Thùy Linh (TG1001)
  const ta1 = await prisma.user.upsert({
    where: { email: "linh.hoang@simpace.edu.vn" },
    create: {
      username: "TG1001",
      email: "linh.hoang@simpace.edu.vn",
      passwordHash,
      roleId: taRole.id,
      isActive: true,
      mustChangePassword: false,
      profile: {
        create: {
          fullName: "Hoàng Thùy Linh",
          phoneNumber: "0934567890",
          gender: "FEMALE",
          dateOfBirth: new Date("2000-05-12"),
          address: "Ba Đình, Hà Nội",
        },
      },
    },
    update: { isActive: true },
  });

  // Create TA 2: Nguyễn Quang Đăng (TG1002)
  const ta2 = await prisma.user.upsert({
    where: { email: "dang.nguyen@simpace.edu.vn" },
    create: {
      username: "TG1002",
      email: "dang.nguyen@simpace.edu.vn",
      passwordHash,
      roleId: taRole.id,
      isActive: true,
      mustChangePassword: false,
      profile: {
        create: {
          fullName: "Nguyễn Quang Đăng",
          phoneNumber: "0912349988",
          gender: "MALE",
          dateOfBirth: new Date("1999-08-20"),
          address: "Đống Đa, Hà Nội",
        },
      },
    },
    update: { isActive: true },
  });

  // Create Teacher 2: Đặng Minh Tuấn (GV1002)
  const teacher2 = await prisma.user.upsert({
    where: { email: "tuan.dang@simpace.edu.vn" },
    create: {
      username: "GV1002",
      email: "tuan.dang@simpace.edu.vn",
      passwordHash,
      roleId: teacherRole.id,
      isActive: true,
      mustChangePassword: false,
      profile: {
        create: {
          fullName: "Đặng Minh Tuấn",
          phoneNumber: "0988776655",
          gender: "MALE",
          dateOfBirth: new Date("1992-03-15"),
          address: "Cầu Giấy, Hà Nội",
        },
      },
    },
    update: { isActive: true },
  });

  // Assign teachers and TAs to all existing active classes so none are missing
  const classes = await prisma.class.findMany({ where: { isActive: true } });
  const teachers = await prisma.user.findMany({ where: { role: { code: "TEACHER" } } });

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const assignedTeacher = teachers[i % teachers.length];
    const assignedTa = i % 2 === 0 ? ta1 : ta2;

    await prisma.classAssignment.upsert({
      where: { classId_userId: { classId: cls.id, userId: assignedTeacher.id } },
      create: { classId: cls.id, userId: assignedTeacher.id, roleInClass: "TEACHER" },
      update: { roleInClass: "TEACHER" },
    });

    await prisma.classAssignment.upsert({
      where: { classId_userId: { classId: cls.id, userId: assignedTa.id } },
      create: { classId: cls.id, userId: assignedTa.id, roleInClass: "TEACHING_ASSISTANT" },
      update: { roleInClass: "TEACHING_ASSISTANT" },
    });
  }

  console.log("Seeded staff and assigned all classes successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
