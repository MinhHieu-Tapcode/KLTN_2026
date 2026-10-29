"use server";

import { revalidatePath } from "next/cache";
import {
  type ValidatedStudentRow,
  type InvalidStudentRow,
  type ProposedClass,
  type LevelAllocationPlan,
  type BulkAllocationSuggestion,
  parseAndValidateBulkStudentsService,
  distributeStudentsBalancedService,
  generateBulkClassSuggestionService,
  rebalanceOnStudentTransferService,
  rebalanceOnClassCountChangeService,
  rebalanceByCapacityService,
  removeClassAndRebalanceService,
  updateClassCapacitiesAndRebalanceService,
  commitBulkAllocationService,
} from "@/services/bulk-allocation.service";

export type {
  ValidatedStudentRow,
  InvalidStudentRow,
  ProposedClass,
  LevelAllocationPlan,
  BulkAllocationSuggestion,
};

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * 1. Phân tích tệp Excel/CSV học sinh IELTS
 */
export async function parseAndValidateBulkStudentsAction(fileBase64: string): Promise<{
  success: boolean;
  validRows?: ValidatedStudentRow[];
  invalidRows?: InvalidStudentRow[];
  totalRows?: number;
  error?: string;
}> {
  try {
    return await parseAndValidateBulkStudentsService(fileBase64);
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi xử lý tệp học sinh!" };
  }
}

/**
 * 2. Thuật toán chia đều học sinh vào N lớp (chênh lệch sĩ số giữa các lớp <= 1)
 */
export async function distributeStudentsBalanced(
  students: ValidatedStudentRow[],
  classCount: number,
  levelCode: string,
  levelName: string,
  levelId: string,
  schoolCode: string = "TD"
): Promise<ProposedClass[]> {
  return distributeStudentsBalancedService(
    students,
    classCount,
    levelCode,
    levelName,
    levelId,
    schoolCode
  );
}

/**
 * 3. Tạo phương án phân lớp đề xuất (Suggestion Generation)
 */
export async function generateBulkClassSuggestionAction(
  validRows: ValidatedStudentRow[],
  schoolId?: string,
  classCountOverrides?: Record<string, number>
): Promise<{
  success: boolean;
  suggestion?: BulkAllocationSuggestion;
  error?: string;
}> {
  try {
    return await generateBulkClassSuggestionService(validRows, schoolId, classCountOverrides);
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo phương án đề xuất phân lớp!" };
  }
}

/**
 * 4. Chuyển học sinh giữa các lớp cùng trình độ
 */
export async function rebalanceOnStudentTransferAction(
  currentPlan: LevelAllocationPlan,
  studentEmail: string,
  targetClassTempId: string,
  _schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlan?: LevelAllocationPlan;
  message?: string;
  error?: string;
}> {
  try {
    return await rebalanceOnStudentTransferService(currentPlan, studentEmail, targetClassTempId);
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi chuyển lớp!" };
  }
}

/**
 * 5. Điều chỉnh số lớp của một trình độ & chia lại toàn bộ
 */
export async function rebalanceOnClassCountChangeAction(
  currentPlan: LevelAllocationPlan,
  newClassCount: number,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlan?: LevelAllocationPlan;
  message?: string;
  error?: string;
}> {
  try {
    return await rebalanceOnClassCountChangeService(currentPlan, newClassCount, schoolCode);
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi điều chỉnh số lớp!" };
  }
}

/**
 * 5b. Điều chỉnh theo sĩ số tối đa / lớp cho toàn bộ các trình độ
 */
export async function rebalanceByCapacityAction(
  currentPlans: LevelAllocationPlan[],
  maxCapacity: number,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlans?: LevelAllocationPlan[];
  message?: string;
  error?: string;
}> {
  try {
    return await rebalanceByCapacityService(currentPlans, maxCapacity, schoolCode);
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi chia lại lớp theo sĩ số!" };
  }
}

/**
 * 5c. Xóa một lớp học và phân bổ lại học sinh vào các lớp còn lại cùng trình độ
 */
export async function removeClassAndRebalanceAction(
  currentPlan: LevelAllocationPlan,
  classTempIdToRemove: string,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlan?: LevelAllocationPlan;
  message?: string;
  error?: string;
}> {
  try {
    return await removeClassAndRebalanceService(currentPlan, classTempIdToRemove, schoolCode);
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi xóa lớp và chia lại!" };
  }
}

/**
 * 5d. Cấu hình sĩ số từng lớp (hoặc xóa lớp khi sĩ số = 0) và phân bổ lại học sinh
 */
export async function updateClassCapacitiesAndRebalanceAction(
  currentPlans: LevelAllocationPlan[],
  classSettings: Record<string, { capacity: number; isRemoved?: boolean }>,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlans?: LevelAllocationPlan[];
  message?: string;
  error?: string;
}> {
  try {
    return await updateClassCapacitiesAndRebalanceService(
      currentPlans,
      classSettings,
      schoolCode
    );
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi cấu hình sĩ số lớp!" };
  }
}

/**
 * 6. XÁC NHẬN PHÂN LỚP HÀNG LOẠT (COMMIT TRANSACTION)
 */
export async function commitBulkAllocationAction(
  plans: LevelAllocationPlan[],
  schoolId: string,
  fileName: string = "import_ielts.xlsx"
): Promise<{
  success: boolean;
  createdCount?: number;
  createdClassesCount?: number;
  summary?: { email: string; fullName: string; username: string; className: string }[];
  error?: string;
}> {
  try {
    const res = await commitBulkAllocationService(plans, schoolId, fileName);
    if (res.success) {
      safeRevalidate("/users");
      safeRevalidate("/classes");
      safeRevalidate("/schools");
    }
    return res;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Lỗi khi lưu phương án phân lớp vào hệ thống!",
    };
  }
}
