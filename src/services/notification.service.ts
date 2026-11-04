import { prisma, isDbAlive } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

export interface CreateNotificationItem {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  refType?: "ASSIGNMENT" | "SUBMISSION" | "MATERIAL";
  refId?: string;
  classId?: string | null;
  dedupeKey: string;
}

// Lưu trữ tạm in-memory cho nhánh demo (nếu DB offline hoặc tài khoản mẫu)
const demoNotifications: any[] = [];

function getSampleNotificationsForUser(userId: string): any[] {
  const now = Date.now();
  const lower = (userId || "").toLowerCase();

  if (lower.startsWith("mgr") || lower.includes("manager") || lower.includes("quan")) {
    return [
      {
        id: `notif-sample-mgr-1-${userId}`,
        userId,
        type: "MATERIAL_ADDED" as NotificationType,
        title: "Báo cáo chuyên cần tuần 44 đã hoàn tất",
        message: "Trường THPT Trương Định đã hoàn thành 100% các ca học tuần qua và gửi báo cáo chuyên cần.",
        refType: "MATERIAL",
        refId: "rep-44",
        classId: null,
        isRead: false,
        createdAt: new Date(now - 12 * 60 * 1000).toISOString(),
      },
      {
        id: `notif-sample-mgr-2-${userId}`,
        userId,
        type: "SUBMISSION_RECEIVED" as NotificationType,
        title: "Học viên mới được phân bổ vào lớp",
        message: "Học viên Nguyễn Văn An vừa được phân bổ thành công vào lớp IELTS Bứt Phá - 10A1.",
        refType: "ASSIGNMENT",
        refId: "demo-class-1",
        classId: "demo-class-1",
        isRead: false,
        createdAt: new Date(now - 65 * 60 * 1000).toISOString(),
      },
      {
        id: `notif-sample-mgr-3-${userId}`,
        userId,
        type: "ASSIGNMENT_ASSIGNED" as NotificationType,
        title: "Kế hoạch khảo thí Mock Test tháng 11",
        message: "Đã cập nhật lịch thi thử Mock Test 4 kỹ năng IELTS cho toàn bộ các lớp đối tác.",
        refType: "ASSIGNMENT",
        refId: "mock-11",
        classId: null,
        isRead: true,
        createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  if (lower.startsWith("tc") || lower.includes("teacher") || lower.includes("gv") || lower.includes("dung")) {
    return [
      {
        id: `notif-sample-tc-1-${userId}`,
        userId,
        type: "SUBMISSION_RECEIVED" as NotificationType,
        title: "Học sinh nộp bài tập mới",
        message: "Học viên Nguyễn Văn An đã nộp bài 'IELTS Academic Writing Task 1 - Process Diagram'.",
        refType: "SUBMISSION",
        refId: "sub-1",
        classId: "demo-class-1",
        isRead: false,
        createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
      },
      {
        id: `notif-sample-tc-2-${userId}`,
        userId,
        type: "OUT_TAB_ALERT" as NotificationType,
        title: "Cảnh báo Out Tab: Trần Minh Đức",
        message: "Học sinh Trần Minh Đức phát sinh 1 lần rời khỏi tab thi trong bài kiểm tra Reading 10A1.",
        refType: "ASSIGNMENT",
        refId: "assign-1",
        classId: "demo-class-1",
        isRead: false,
        createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
      },
      {
        id: `notif-sample-tc-3-${userId}`,
        userId,
        type: "MATERIAL_ADDED" as NotificationType,
        title: "Tài liệu giảng dạy mới",
        message: "Bộ đề IELTS Speaking Forecast Quý 4 đã được tải lên kho học liệu cấp độ Advanced.",
        refType: "MATERIAL",
        refId: "mat-speaking-q4",
        classId: null,
        isRead: true,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  if (lower.startsWith("st") || lower.includes("student") || lower.includes("hv") || lower.includes("lan") || lower.includes("long") || lower.includes("an")) {
    return [
      {
        id: `notif-sample-st-1-${userId}`,
        userId,
        type: "SUBMISSION_GRADED" as NotificationType,
        title: "Thầy/Cô đã chấm bài viết IELTS",
        message: "ThS. Nguyễn Văn A đã nhận xét chi tiết bài IELTS Writing Task 1 của bạn (Điểm: 6.5).",
        refType: "SUBMISSION",
        refId: "sub-1",
        classId: "demo-class-1",
        isRead: false,
        createdAt: new Date(now - 20 * 60 * 1000).toISOString(),
      },
      {
        id: `notif-sample-st-2-${userId}`,
        userId,
        type: "ASSIGNMENT_ASSIGNED" as NotificationType,
        title: "Bài tập mới cần hoàn thành",
        message: "Lớp 10A1 có bài tập mới 'IELTS Reading Practice Test 3', hạn nộp đến 23:59 ngày 08/11/2026.",
        refType: "ASSIGNMENT",
        refId: "assign-read-3",
        classId: "demo-class-1",
        isRead: false,
        createdAt: new Date(now - 110 * 60 * 1000).toISOString(),
      },
      {
        id: `notif-sample-st-3-${userId}`,
        userId,
        type: "MATERIAL_ADDED" as NotificationType,
        title: "Tài liệu học tập mới",
        message: "Giáo viên vừa chia sẻ tài liệu 'Tổng hợp từ vựng Collocations Band 7.5+ chủ đề Môi trường'.",
        refType: "MATERIAL",
        refId: "mat-vocab",
        classId: "demo-class-1",
        isRead: true,
        createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  // Admin hoặc mặc định:
  return [
    {
      id: `notif-sample-adm-1-${userId}`,
      userId,
      type: "MATERIAL_ADDED" as NotificationType,
      title: "Sao lưu hệ thống tự động",
      message: "Dữ liệu định kỳ toàn hệ thống LMS SIMPACE đã được sao lưu an toàn.",
      refType: "MATERIAL",
      refId: "sys-backup",
      classId: null,
      isRead: false,
      createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
    },
    {
      id: `notif-sample-adm-2-${userId}`,
      userId,
      type: "SUBMISSION_RECEIVED" as NotificationType,
      title: "Cập nhật ma trận phân quyền",
      message: "Đã đồng bộ thành công 8 nhóm quyền năng theo chuẩn RBAC bảo mật.",
      refType: "ASSIGNMENT",
      refId: "rbac-sync",
      classId: null,
      isRead: false,
      createdAt: new Date(now - 120 * 60 * 1000).toISOString(),
    },
    {
      id: `notif-sample-adm-3-${userId}`,
      userId,
      type: "ASSIGNMENT_ASSIGNED" as NotificationType,
      title: "Khởi tạo năm học mới 2026",
      message: "Hệ thống đã sẵn sàng cho kỳ tuyển sinh và khảo thí chứng chỉ IELTS đợt mới.",
      refType: "ASSIGNMENT",
      refId: "term-2026",
      classId: null,
      isRead: true,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function ensureDemoNotifications(userId: string) {
  if (!demoNotifications.some((n) => n.userId === userId)) {
    const samples = getSampleNotificationsForUser(userId);
    demoNotifications.unshift(...samples);
  }
}

/**
 * Tạo danh sách thông báo chống trùng lặp (dựa trên dedupeKey).
 * Tự động bỏ qua lỗi nếu DB chưa push bảng mới hoặc offline để không làm hỏng luồng chính.
 */
export async function createNotifications(items: CreateNotificationItem[]): Promise<void> {
  if (!items || items.length === 0) return;

  if (!(await isDbAlive())) {
    for (const item of items) {
      if (!demoNotifications.some((n) => n.dedupeKey === item.dedupeKey)) {
        demoNotifications.unshift({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ...item,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return;
  }

  try {
    await (prisma as any).notification.createMany({
      data: items.map((it) => ({
        userId: it.userId,
        type: it.type,
        title: it.title,
        message: it.message || null,
        refType: it.refType || null,
        refId: it.refId || null,
        classId: it.classId || null,
        dedupeKey: it.dedupeKey,
        isRead: false,
      })),
      skipDuplicates: true,
    });
  } catch (err: any) {
    console.warn("[createNotifications] Bỏ qua lỗi lưu thông báo:", err?.message || err);
  }
}

/**
 * Lấy danh sách thông báo của một người dùng
 */
export async function getMyNotificationsService(
  userId: string,
  limit = 30
): Promise<{ success: boolean; notifications: any[]; error?: string }> {
  ensureDemoNotifications(userId);

  if (!(await isDbAlive())) {
    const list = demoNotifications
      .filter((n) => n.userId === userId)
      .slice(0, limit);
    return { success: true, notifications: list };
  }

  try {
    const list = await (prisma as any).notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (list.length === 0) {
      // Nếu DB chưa có bản ghi thông báo nào của user này, trả về danh sách mẫu in-memory
      const fallbackList = demoNotifications
        .filter((n) => n.userId === userId)
        .slice(0, limit);
      return { success: true, notifications: fallbackList };
    }

    return {
      success: true,
      notifications: list.map((n: any) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        refType: n.refType,
        refId: n.refId,
        classId: n.classId,
        isRead: n.isRead,
        createdAt: n.createdAt?.toISOString?.() || n.createdAt,
      })),
    };
  } catch (err: any) {
    console.warn("[getMyNotificationsService] Lỗi đọc thông báo, dùng dữ liệu mẫu:", err?.message);
    const fallbackList = demoNotifications
      .filter((n) => n.userId === userId)
      .slice(0, limit);
    return { success: true, notifications: fallbackList };
  }
}

/**
 * Đánh dấu thông báo đã đọc
 */
export async function markNotificationsReadService(
  userId: string,
  notificationIds?: string[]
): Promise<{ success: boolean; error?: string }> {
  // Đồng bộ trong in-memory demoNotifications
  demoNotifications.forEach((n) => {
    if (n.userId === userId) {
      if (!notificationIds || notificationIds.length === 0 || notificationIds.includes(n.id)) {
        n.isRead = true;
      }
    }
  });

  if (!(await isDbAlive())) {
    return { success: true };
  }

  try {
    const whereClause: any = { userId };
    if (notificationIds && notificationIds.length > 0) {
      whereClause.id = { in: notificationIds };
    }
    await (prisma as any).notification.updateMany({
      where: whereClause,
      data: { isRead: true },
    });
    return { success: true };
  } catch (err: any) {
    console.warn("[markNotificationsReadService] Lỗi update DB, đã cập nhật in-memory:", err?.message);
    return { success: true };
  }
}

/**
 * Đếm số thông báo chưa đọc
 */
export async function countUnreadNotificationsService(userId: string): Promise<number> {
  ensureDemoNotifications(userId);

  if (!(await isDbAlive())) {
    return demoNotifications.filter((n) => n.userId === userId && !n.isRead).length;
  }

  try {
    const count = await (prisma as any).notification.count({
      where: { userId, isRead: false },
    });
    if (count === 0) {
      return demoNotifications.filter((n) => n.userId === userId && !n.isRead).length;
    }
    return count;
  } catch (err: any) {
    return demoNotifications.filter((n) => n.userId === userId && !n.isRead).length;
  }
}

/**
 * Ghi nhận nhật ký sự kiện Out Tab và tạo thông báo cho Giáo viên phụ trách
 */
export async function recordOutTabEventService(data: {
  assignmentId: string;
  studentId: string;
  submissionId?: string;
}): Promise<{ success: boolean }> {
  const occurredAt = new Date();

  if (await isDbAlive()) {
    try {
      await (prisma as any).outTabEvent.create({
        data: {
          assignmentId: data.assignmentId,
          studentId: data.studentId,
          submissionId: data.submissionId || null,
          occurredAt,
        },
      });

      // Lấy thông tin bài tập, học sinh và danh sách giáo viên phụ trách lớp
      const assignment = await prisma.assignment.findUnique({
        where: { id: data.assignmentId },
        select: {
          id: true,
          title: true,
          classId: true,
          class: {
            select: {
              name: true,
              assignments: {
                where: { roleInClass: { in: ["TEACHER", "TEACHING_ASSISTANT"] } },
                select: { userId: true },
              },
            },
          },
        },
      });

      const student = await prisma.user.findUnique({
        where: { id: data.studentId },
        select: { username: true, profile: { select: { fullName: true } } },
      });

      const studentName = student?.profile?.fullName || student?.username || "Học sinh";
      const teacherIds = assignment?.class?.assignments?.map((a) => a.userId) || [];

      if (teacherIds.length > 0) {
        // Làm tròn mốc thời gian theo phút/giây để dedupeKey không bị spam quá dày
        const timeSec = Math.floor(occurredAt.getTime() / 15000); // 15 giây 1 lần
        const notifItems: CreateNotificationItem[] = teacherIds.map((tId) => ({
          userId: tId,
          type: "OUT_TAB_ALERT" as NotificationType,
          title: `Cảnh báo Out Tab: ${studentName}`,
          message: `Học sinh ${studentName} vừa phát sinh cảnh báo Out Tab khi đang làm bài "${assignment?.title}" (${assignment?.class?.name}).`,
          refType: "ASSIGNMENT",
          refId: data.assignmentId,
          classId: assignment?.classId,
          dedupeKey: `OUT_TAB_ALERT:${data.studentId}:${data.assignmentId}:${tId}:${timeSec}`,
        }));
        await createNotifications(notifItems);
      }
    } catch (err: any) {
      console.warn("[recordOutTabEventService] Bỏ qua lỗi ghi Out Tab:", err?.message);
    }
  }

  return { success: true };
}
