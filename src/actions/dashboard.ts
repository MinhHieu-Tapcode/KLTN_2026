"use server";

import { getSession } from "@/lib/auth";
import { checkAuth } from "@/lib/permissions";
import { getRecentActivitiesService, SystemActivity } from "@/services/dashboard.service";

/**
 * Server Action lấy danh sách các hoạt động thực tế gần đây trên hệ thống
 */
export async function getRecentActivitiesAction(): Promise<{
  success: boolean;
  activities: SystemActivity[];
  error?: string;
}> {
  const session = await getSession();
  const auth = checkAuth(session, "Vui lòng đăng nhập");
  if (!auth.ok) {
    return { success: false, activities: [], error: auth.error };
  }

  const activities = await getRecentActivitiesService();
  return { success: true, activities };
}
