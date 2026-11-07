import { prisma } from "../src/lib/prisma";

async function main() {
  const [
    userCount,
    schoolCount,
    classCount,
    enrollmentCount,
    assignmentCount,
    submissionCount,
    materialFolderCount,
    materialCount,
    ieltsLevelCount,
    notificationCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.school.count(),
    prisma.class.count(),
    prisma.classEnrollment.count(),
    prisma.assignment.count(),
    prisma.assignmentSubmission.count(),
    prisma.materialFolder.count(),
    prisma.learningMaterial.count(),
    prisma.ieltsLevel.count(),
    prisma.notification.count(),
  ]);

  console.log("=== THỐNG KÊ DỮ LIỆU HIỆN CÓ TRÊN SUPABASE CLOUD ===");
  console.log(`- Người dùng (User): ${userCount}`);
  console.log(`- Trường học (School): ${schoolCount}`);
  console.log(`- Lớp học (Class): ${classCount}`);
  console.log(`- Ghi danh học viên (ClassEnrollment): ${enrollmentCount}`);
  console.log(`- Bài tập (Assignment): ${assignmentCount}`);
  console.log(`- Bài nộp học sinh (AssignmentSubmission): ${submissionCount}`);
  console.log(`- Thư mục tài liệu (MaterialFolder): ${materialFolderCount}`);
  console.log(`- Tài liệu học tập (LearningMaterial): ${materialCount}`);
  console.log(`- Cấp độ IELTS (IeltsLevel): ${ieltsLevelCount}`);
  console.log(`- Thông báo (Notification): ${notificationCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
