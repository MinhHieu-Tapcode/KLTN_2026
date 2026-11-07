import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== NẠP DỮ LIỆU BỔ SUNG CHO HỌC LIỆU VÀ THÔNG BÁO ===");

  const teacher = await prisma.user.findFirst({ where: { email: "teacher@simpace.vn" } });
  const student = await prisma.user.findFirst({ where: { email: "student@simpace.vn" } });
  const cls = await prisma.class.findFirst({ where: { code: "IELTS_TD_01" } });

  if (!teacher || !student || !cls) {
    console.error("Thiếu teacher, student hoặc class!");
    return;
  }

  // 1. Tạo Thư mục học liệu
  const folder = await prisma.materialFolder.upsert({
    where: { id: "folder-reading-01" },
    update: {},
    create: {
      id: "folder-reading-01",
      name: "Tài liệu IELTS Reading Bứt Phá",
      description: "Tổng hợp chiến thuật làm bài Skimming, Scanning và đề luyện tập",
      classId: cls.id,
      createdById: teacher.id,
      sortOrder: 1,
      isActive: true,
    },
  });

  // 2. Tạo File học liệu
  await prisma.learningMaterial.upsert({
    where: { id: "mat-reading-guide-01" },
    update: {},
    create: {
      id: "mat-reading-guide-01",
      folderId: folder.id,
      title: "Chiến thuật Skimming & Scanning IELTS Band 7.0+",
      fileName: "IELTS_Reading_Mastery_Guide.pdf",
      fileUrl: "https://example.com/materials/reading-guide.pdf",
      fileSize: 2450000,
      fileType: "PDF",
      mimeType: "application/pdf",
      uploadedById: teacher.id,
      downloadCount: 15,
      isActive: true,
    },
  });

  await prisma.learningMaterial.upsert({
    where: { id: "mat-listening-audio-01" },
    update: {},
    create: {
      id: "mat-listening-audio-01",
      folderId: folder.id,
      title: "Audio Luyện Nghe Section 1 - Khách Sạn và Đặt Chỗ",
      fileName: "Listening_Practice_Section1.mp3",
      fileUrl: "https://example.com/materials/listening-sec1.mp3",
      fileSize: 5200000,
      fileType: "AUDIO",
      mimeType: "audio/mpeg",
      uploadedById: teacher.id,
      downloadCount: 8,
      isActive: true,
    },
  });

  // 3. Tạo Thông báo cho học sinh
  await prisma.notification.upsert({
    where: { dedupeKey: "notif-asgn-reading-mini-01-student" },
    update: {},
    create: {
      userId: student.id,
      type: "ASSIGNMENT_ASSIGNED",
      title: "Bài tập mới: IELTS Reading Mini-Test 01",
      message: "Cô Nguyễn Thu Hường đã giao bài tập Reading mới. Hạn nộp còn 3 ngày.",
      refType: "ASSIGNMENT",
      refId: "asgn-reading-mini-01",
      classId: cls.id,
      dedupeKey: "notif-asgn-reading-mini-01-student",
      isRead: false,
    },
  });

  await prisma.notification.upsert({
    where: { dedupeKey: "notif-submission-graded-student" },
    update: {},
    create: {
      userId: student.id,
      type: "SUBMISSION_GRADED",
      title: "Bài tập của bạn đã được chấm điểm!",
      message: "Bài IELTS Reading Mini-Test 01 của bạn đã đạt 3.0/3.0 (Band 8.0).",
      refType: "SUBMISSION",
      refId: "asgn-reading-mini-01",
      classId: cls.id,
      dedupeKey: "notif-submission-graded-student",
      isRead: false,
    },
  });

  // Thông báo cho giáo viên
  await prisma.notification.upsert({
    where: { dedupeKey: "notif-submission-submitted-teacher" },
    update: {},
    create: {
      userId: teacher.id,
      type: "SUBMISSION_RECEIVED",
      title: "Học sinh nộp bài: Nguyễn Văn An",
      message: "Học sinh Nguyễn Văn An đã hoàn thành bài tập IELTS Reading Mini-Test 01.",
      refType: "SUBMISSION",
      refId: "asgn-reading-mini-01",
      classId: cls.id,
      dedupeKey: "notif-submission-submitted-teacher",
      isRead: false,
    },
  });

  console.log("✓ Đã nạp thành công Thư mục học liệu, File học liệu và Thông báo!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
