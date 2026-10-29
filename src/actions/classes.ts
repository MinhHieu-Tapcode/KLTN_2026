"use server";

import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ClassStatus, StaffClassRole } from "@prisma/client";
import {
  generateClassCodeService,
  getClassesService,
  getClassDetailService,
  createClassService,
  updateClassService,
  deleteClassService,
  restoreClassService,
  deleteMultipleClassesService,
  assignStaffToClassService,
  removeStaffFromClassService,
  enrollStudentToClassService,
  removeStudentFromClassService,
  getAvailableStudentsForClassService,
  transferStudentClassService,
  getSchoolClassesWithStudentsService,
  getEligibleSchoolStudentsForClassService,
} from "@/services/class.service";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

// Sinh mã lớp học tự động (BUG_07) theo cấu trúc: [Chương trình]_[Mã trường]_[STT 2 số] (VD: IELTS_TD_01)
export async function generateClassCode(
  schoolId: string,
  program: string = "IELTS"
): Promise<string> {
  return generateClassCodeService(schoolId, program);
}

// Lấy mã lớp học tiếp theo cho Client xem trước (Preview)
export async function getNextClassCodeAction(
  schoolId: string,
  program: string
): Promise<{ success: boolean; code: string }> {
  if (!schoolId) return { success: false, code: "" };
  const code = await generateClassCodeService(schoolId, program);
  return { success: true, code };
}

// Lấy danh sách lớp học có phân quyền phạm vi Quản nhiệm & Lọc xóa mềm (BUG_03, BUG_10)
export async function getClassesAction(
  statusFilter: string = "ALL",
  searchKeyword: string = "",
  activeState: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  const session = await getSession();
  return getClassesService(session, statusFilter, searchKeyword, activeState);
}

export async function getClassDetailAction(id: string) {
  return getClassDetailService(id);
}

// Tạo lớp học mới - Tự động sinh mã nếu không nhập, hỗ trợ gán đa giáo viên / trợ giảng
export async function createClassAction(data: {
  code?: string;
  name: string;
  schoolId: string;
  program?: "IELTS" | "SAT" | "CAMBRIDGE" | "OTHER";
  level?: string;
  capacity?: number;
  teacherId?: string;
  taId?: string;
  teacherIds?: string[];
  taIds?: string[];
  startDate?: string;
  endDate?: string;
  schedule?: string;
}) {
  const res = await createClassService(data);
  if (res.success) safeRevalidate("/classes");
  return res;
}

export async function updateClassAction(
  id: string,
  data: {
    name?: string;
    program?: "IELTS" | "SAT" | "CAMBRIDGE" | "OTHER";
    level?: string;
    capacity?: number;
    status?: ClassStatus;
    teacherId?: string;
    taId?: string;
    teacherIds?: string[];
    taIds?: string[];
    startDate?: string;
    endDate?: string;
    schedule?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const res = await updateClassService(id, data);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Xóa mềm lớp học (isActive: false)
export async function deleteClassAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return deleteClassService(id);
}

// Khôi phục lớp học đã xóa mềm
export async function restoreClassAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  return restoreClassService(id);
}

export async function deleteMultipleClassesAction(
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  return deleteMultipleClassesService(ids);
}

export async function assignStaffToClassAction(
  classId: string,
  userId: string,
  roleInClass: StaffClassRole
) {
  const res = await assignStaffToClassService(classId, userId, roleInClass);
  if (res.success) safeRevalidate("/classes");
  return res;
}

export async function removeStaffFromClassAction(
  classId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await removeStaffFromClassService(classId, userId);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Thêm học viên vào lớp học
export async function enrollStudentToClassAction(
  classId: string,
  studentId: string
) {
  const res = await enrollStudentToClassService(classId, studentId);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Rút học viên khỏi lớp học
export async function removeStudentFromClassAction(
  classId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await removeStudentFromClassService(classId, studentId);
  if (res.success) safeRevalidate("/classes");
  return res;
}

// Lấy danh sách học viên khả dụng để thêm vào lớp (chưa ghi danh vào lớp này)
export async function getAvailableStudentsForClassAction(
  classId: string
): Promise<{ success: boolean; error?: string; students: any[] }> {
  return getAvailableStudentsForClassService(classId);
}

// Chuyển học viên giữa các lớp TRONG CÙNG MỘT TRƯỜNG (Bắt buộc cùng schoolId)
export async function transferStudentClassAction(
  currentClassId: string,
  targetClassId: string,
  studentId: string
) {
  const res = await transferStudentClassService(
    currentClassId,
    targetClassId,
    studentId
  );
  if (res.success) {
    safeRevalidate("/classes");
    safeRevalidate("/schools");
  }
  return res;
}

// Lấy toàn bộ danh sách lớp học kèm danh sách học sinh của từng lớp theo trường
export async function getSchoolClassesWithStudentsAction(
  schoolId: string
): Promise<{ success: boolean; error?: string; school: any }> {
  return getSchoolClassesWithStudentsService(schoolId);
}

// Lấy danh sách học sinh cùng trường khả dụng để thêm / chuyển sang lớp này
export async function getEligibleSchoolStudentsForClassAction(
  classId: string
): Promise<{
  success: boolean;
  error?: string;
  schoolName?: string;
  schoolId?: string;
  students: any[];
}> {
  return getEligibleSchoolStudentsForClassService(classId);
}
