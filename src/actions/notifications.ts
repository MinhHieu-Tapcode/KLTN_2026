"use server";

import { getSession } from "@/lib/auth";
import { checkAuth } from "@/lib/permissions";
import {
  getMyNotificationsService,
  markNotificationsReadService,
  countUnreadNotificationsService,
  recordOutTabEventService,
} from "@/services/notification.service";

/**
 * Lấy danh sách thông báo của tài khoản đang đăng nhập
 */
export async function getMyNotificationsAction(limit = 30) {
  const session = await getSession();
  const auth = checkAuth(session, "Vui lòng đăng nhập để xem thông báo!");
  if (!auth.ok) {
    return { success: false, notifications: [], error: auth.error };
  }

  return await getMyNotificationsService(auth.session.userId, limit);
}

/**
 * Đánh dấu đã đọc cho các thông báo
 */
export async function markNotificationsReadAction(notificationIds?: string[]) {
  const session = await getSession();
  const auth = checkAuth(session, "Vui lòng đăng nhập!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  return await markNotificationsReadService(auth.session.userId, notificationIds);
}

/**
 * Đếm số lượng thông báo chưa đọc
 */
export async function countUnreadNotificationsAction() {
  const session = await getSession();
  if (!session?.userId) return { count: 0 };

  const count = await countUnreadNotificationsService(session.userId);
  return { count };
}

/**
 * Ghi nhận sự kiện học sinh Out Tab và bắn thông báo tới giáo viên phụ trách
 */
export async function recordOutTabAction(data: {
  assignmentId: string;
  submissionId?: string;
}) {
  const session = await getSession();
  const auth = checkAuth(session, "Vui lòng đăng nhập!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  return await recordOutTabEventService({
    assignmentId: data.assignmentId,
    studentId: auth.session.userId,
    submissionId: data.submissionId,
  });
}
