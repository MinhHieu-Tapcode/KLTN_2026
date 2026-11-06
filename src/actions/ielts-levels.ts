"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import {
  getIeltsLevelsService,
  determineIeltsLevelService,
  createIeltsLevelService,
  updateIeltsLevelService,
  updateIeltsClassAllocationService,
  deleteIeltsLevelService,
  normalizeIeltsLevelCode,
  CreateIeltsLevelData,
  UpdateIeltsLevelData,
} from "@/services/ielts-levels.service";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export { normalizeIeltsLevelCode };

/**
 * Lấy danh sách tất cả các trình độ IELTS, sắp xếp theo điểm tối thiểu
 */
export async function getIeltsLevelsAction() {
  return await getIeltsLevelsService();
}

/**
 * Tự động xác định trình độ IELTS dựa trên điểm số đầu vào
 */
export async function determineIeltsLevelAction(score: number) {
  return await determineIeltsLevelService(score);
}

/**
 * Thêm mới trình độ IELTS (Chỉ dành cho Admin / Quyền hệ thống)
 */
export async function createIeltsLevelAction(data: CreateIeltsLevelData) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền thêm mới trình độ IELTS!" };
  }

  const res = await createIeltsLevelService(data);
  if (res.success) {
    safeRevalidate("/settings");
    safeRevalidate("/users");
  }
  return res;
}

/**
 * Cập nhật trình độ IELTS (Tên, khoảng điểm, mô tả)
 */
export async function updateIeltsLevelAction(id: string, data: UpdateIeltsLevelData) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền cập nhật cấu hình trình độ IELTS!" };
  }

  const res = await updateIeltsLevelService(id, data);
  if (res.success) {
    safeRevalidate("/settings");
    safeRevalidate("/users");
  }
  return res;
}

/**
 * Cập nhật Cấu hình phân lớp IELTS (Số lớp phân bổ của từng trình độ)
 */
export async function updateIeltsClassAllocationAction(id: string, targetClassCount: number) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền thay đổi phân bổ số lớp học!" };
  }

  const res = await updateIeltsClassAllocationService(id, targetClassCount);
  if (res.success) {
    safeRevalidate("/settings");
  }
  return res;
}

/**
 * Xóa trình độ IELTS (Ràng buộc: Không xóa nếu có học sinh hoặc lớp học liên kết)
 */
export async function deleteIeltsLevelAction(id: string) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return { success: false, error: "Bạn không có quyền xóa trình độ IELTS!" };
  }

  const res = await deleteIeltsLevelService(id);
  if (res.success) {
    safeRevalidate("/settings");
    safeRevalidate("/users");
  }
  return res;
}
