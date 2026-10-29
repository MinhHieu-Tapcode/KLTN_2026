"use server";

import { isDbAlive } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkAuth, checkNotStudent } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  getMaterialFoldersService,
  createMaterialFolderService,
  deleteMaterialFolderService,
  getLearningMaterialsService,
  uploadLearningMaterialService,
  deleteLearningMaterialService,
  uploadMultipleLearningMaterialsService,
  updateLearningMaterialService,
  incrementMaterialDownloadCountService,
  distributeLearningMaterialsService,
  uploadCoursebookPackageService,
  getLevelRepositoryFoldersService,
} from "@/services/material.service";

function safeRevalidate(path: string = "/") {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * Lấy danh sách Thư mục học liệu (theo Lớp học hoặc theo Trình độ IELTS chung)
 * Tự động kế thừa giáo trình chuẩn cấp Trình độ vào thư mục gốc của lớp
 */
export async function getMaterialFoldersAction(params: {
  classId?: string;
  ieltsLevelId?: string;
  parentId?: string | null;
}): Promise<{ success: boolean; error?: string; folders: any[] }> {
  if (await isDbAlive()) {
    const auth = checkAuth(await getSession(), "Bạn chưa đăng nhập!");
    if (!auth.ok) {
      return { success: false, error: auth.error, folders: [] };
    }
  }
  return getMaterialFoldersService(params);
}

/**
 * Tạo Thư mục học liệu mới
 */
export async function createMaterialFolderAction(data: {
  name: string;
  description?: string;
  classId?: string;
  ieltsLevelId?: string;
  parentId?: string | null;
}): Promise<{ success: boolean; error?: string; folder?: any }> {
  const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để thực hiện!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await createMaterialFolderService(auth.session, data);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Xóa mềm Thư mục học liệu
 */
export async function deleteMaterialFolderAction(
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để thực hiện!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await deleteMaterialFolderService(folderId);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Lấy danh sách Tài liệu trong Thư mục
 */
export async function getLearningMaterialsAction(
  folderId: string
): Promise<{ success: boolean; error?: string; materials: any[] }> {
  if (await isDbAlive()) {
    const auth = checkAuth(await getSession(), "Bạn chưa đăng nhập!");
    if (!auth.ok) {
      return { success: false, error: auth.error, materials: [] };
    }
  }
  return getLearningMaterialsService(folderId);
}

/**
 * Tải lên Tài liệu học liệu mới
 */
export async function uploadLearningMaterialAction(data: {
  folderId: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
  fileUrl: string;
  mimeType?: string;
}): Promise<{ success: boolean; error?: string; material?: any }> {
  const auth = checkAuth(
    await getSession(),
    "Vui lòng đăng nhập để tải lên tài liệu!"
  );
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await uploadLearningMaterialService(auth.session, data);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Xóa mềm Tài liệu
 */
export async function deleteLearningMaterialAction(
  materialId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để thực hiện!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await deleteLearningMaterialService(materialId);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Tải lên Hàng loạt Tài liệu học liệu mới (Bulk Material Upload)
 */
export async function uploadMultipleLearningMaterialsAction(data: {
  folderId: string;
  materials: Array<{
    title: string;
    fileName: string;
    fileSize: number;
    fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
    fileUrl: string;
    mimeType?: string;
  }>;
}): Promise<{ success: boolean; error?: string; count?: number }> {
  const auth = checkAuth(
    await getSession(),
    "Vui lòng đăng nhập để tải lên tài liệu!"
  );
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await uploadMultipleLearningMaterialsService(auth.session, data);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Chỉnh sửa thông tin Tài liệu (Đổi tên, loại tệp)
 */
export async function updateLearningMaterialAction(data: {
  materialId: string;
  title: string;
  fileType?: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
}): Promise<{ success: boolean; error?: string }> {
  const auth = checkAuth(await getSession(), "Vui lòng đăng nhập để thực hiện!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await updateLearningMaterialService(data);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Tăng lượt tải của tài liệu
 */
export async function incrementMaterialDownloadCountAction(
  materialId: string
): Promise<{ success: boolean }> {
  return incrementMaterialDownloadCountService(materialId);
}

/**
 * Phân phối tài liệu học liệu hàng loạt theo Trình độ (Level) hoặc Đa lớp (Multi-class)
 */
export async function distributeLearningMaterialsAction(data: {
  distributionMode: "BY_LEVEL" | "BY_CLASSES" | "ALL_CLASSES";
  targetLevels?: string[];
  targetClassIds?: string[];
  folderName: string;
  folderDescription?: string;
  materials: Array<{
    title: string;
    fileName: string;
    fileSize: number;
    fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
    fileUrl: string;
    mimeType?: string;
  }>;
}): Promise<{
  success: boolean;
  error?: string;
  targetClassCount?: number;
  classNames?: string[];
  materialCount?: number;
  totalDistributed?: number;
}> {
  const auth = checkNotStudent(
    await getSession(),
    "Học viên không có quyền phân phối học liệu vào các lớp học!",
    "Vui lòng đăng nhập để thực hiện phân phối học liệu!"
  );
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await distributeLearningMaterialsService(auth.session, data);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Tải lên trọn gói Sách giáo khoa & Toàn bộ Audio bài nghe (Coursebook Package)
 */
export async function uploadCoursebookPackageAction(data: {
  targetType: "CLASS" | "LEVEL" | "MULTI_CLASSES";
  classId?: string;
  ieltsLevelId?: string;
  targetLevels?: string[];
  targetClassIds?: string[];
  parentId?: string | null;
  packageTitle: string;
  packageDescription?: string;
  bookFile: {
    title?: string;
    fileName: string;
    fileSize: number;
    fileUrl: string;
    mimeType?: string;
  };
  audioFiles: Array<{
    title: string;
    fileName: string;
    fileSize: number;
    fileUrl: string;
    mimeType?: string;
  }>;
  audioFolderName?: string;
  answerKeyFile?: {
    title?: string;
    fileName: string;
    fileSize: number;
    fileUrl: string;
    mimeType?: string;
  };
}): Promise<{
  success: boolean;
  error?: string;
  folderId?: string;
  audioFolderId?: string;
  count?: number;
  classNames?: string[];
}> {
  const auth = checkNotStudent(
    await getSession(),
    "Học viên không có quyền tải gói sách giáo khoa!",
    "Vui lòng đăng nhập để tải gói sách giáo khoa!"
  );
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  const res = await uploadCoursebookPackageService(auth.session, data);
  if (res.success) safeRevalidate();
  return res;
}

/**
 * Lấy danh sách các Giáo trình chuẩn thuộc Kho Trình độ (Level Repository)
 */
export async function getLevelRepositoryFoldersAction(): Promise<{
  success: boolean;
  error?: string;
  folders: any[];
}> {
  return getLevelRepositoryFoldersService();
}
