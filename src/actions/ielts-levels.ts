"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * Lấy danh sách tất cả các trình độ IELTS, sắp xếp theo điểm tối thiểu
 */
export async function getIeltsLevelsAction() {
  try {
    const levels = await prisma.ieltsLevel.findMany({
      orderBy: [{ minScore: "asc" }, { sortOrder: "asc" }],
      include: {
        _count: {
          select: {
            students: true,
            classes: true,
          },
        },
      },
    });
    return { success: true, levels };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể lấy danh sách trình độ IELTS!" };
  }
}

/**
 * Tự động xác định trình độ IELTS dựa trên điểm số đầu vào
 */
export async function determineIeltsLevelAction(score: number) {
  try {
    if (typeof score !== "number" || isNaN(score) || score < 0 || score > 9.0) {
      return { success: false, error: "Điểm IELTS phải là số từ 0.0 đến 9.0!" };
    }

    const levels = await prisma.ieltsLevel.findMany({
      where: { isActive: true },
      orderBy: { minScore: "asc" },
    });

    const matchedLevel = levels.find(
      (lvl) => score >= lvl.minScore && score <= lvl.maxScore
    );

    if (!matchedLevel) {
      return {
        success: false,
        error: `Không tìm thấy trình độ IELTS phù hợp cho điểm ${score}! Vui lòng kiểm tra lại cấu hình khoảng điểm.`,
      };
    }

    return {
      success: true,
      level: matchedLevel,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xác định trình độ IELTS!" };
  }
}

/**
 * Kiểm tra xem khoảng điểm mới có bị chồng lấn (overlapping) với các trình độ khác không
 */
async function checkScoreOverlap(minScore: number, maxScore: number, excludeId?: string) {
  const existingLevels = await prisma.ieltsLevel.findMany({
    where: {
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  for (const lvl of existingLevels) {
    // Hai đoạn [minA, maxA] và [minB, maxB] chồng lấn khi:
    // minScore <= lvl.maxScore && maxScore >= lvl.minScore
    // Lưu ý: Điểm IELTS thường liền kề như 0.0-4.0 và 4.5-6.0 (không overlap nếu minScore > lvl.maxScore hoặc maxScore < lvl.minScore)
    // Nếu minScore = lvl.maxScore thì là chạm biên. Với IELTS: 4.0 và 4.5 là hai band khác nhau.
    const isOverlapping = minScore < lvl.maxScore && maxScore > lvl.minScore;
    if (isOverlapping) {
      return {
        overlap: true,
        conflictingLevel: lvl,
      };
    }
  }

  return { overlap: false };
}

/**
 * Thêm mới trình độ IELTS
 */
export async function createIeltsLevelAction(data: {
  name: string;
  code?: string;
  minScore: number;
  maxScore: number;
  description?: string;
  targetClassCount?: number;
}) {
  try {
    const min = Number(data.minScore);
    const max = Number(data.maxScore);

    if (isNaN(min) || isNaN(max) || min < 0 || max > 9.0 || min >= max) {
      return {
        success: false,
        error: "Khoảng điểm không hợp lệ! Điểm IELTS phải từ 0.0 đến 9.0 và Điểm tối thiểu phải nhỏ hơn Điểm tối đa.",
      };
    }

    const overlapCheck = await checkScoreOverlap(min, max);
    if (overlapCheck.overlap && overlapCheck.conflictingLevel) {
      return {
        success: false,
        error: `Khoảng điểm [${min} - ${max}] bị chồng lấn với trình độ '${overlapCheck.conflictingLevel.name}' [${overlapCheck.conflictingLevel.minScore} - ${overlapCheck.conflictingLevel.maxScore}]!`,
      };
    }

    // Tự sinh mã code nếu chưa có
    let code = data.code?.trim().toUpperCase();
    if (!code) {
      code = data.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toUpperCase();
      if (!code) code = `LEVEL_${Date.now()}`;
    }

    // Đảm bảo mã code là duy nhất
    let uniqueCode = code;
    let count = 1;
    while (await prisma.ieltsLevel.findUnique({ where: { code: uniqueCode } })) {
      uniqueCode = `${code}_${count++}`;
    }

    const newLevel = await prisma.ieltsLevel.create({
      data: {
        code: uniqueCode,
        name: data.name.trim(),
        minScore: min,
        maxScore: max,
        description: data.description?.trim() || null,
        targetClassCount: Math.max(1, Number(data.targetClassCount) || 1),
      },
    });

    safeRevalidate("/settings");
    safeRevalidate("/users");
    return { success: true, level: newLevel };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo trình độ IELTS!" };
  }
}

/**
 * Cập nhật trình độ IELTS (Tên, khoảng điểm, mô tả)
 */
export async function updateIeltsLevelAction(
  id: string,
  data: {
    name?: string;
    minScore?: number;
    maxScore?: number;
    description?: string;
    targetClassCount?: number;
    isActive?: boolean;
  }
) {
  try {
    const existing = await prisma.ieltsLevel.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Trình độ IELTS không tồn tại!" };
    }

    const min = data.minScore !== undefined ? Number(data.minScore) : existing.minScore;
    const max = data.maxScore !== undefined ? Number(data.maxScore) : existing.maxScore;

    if (isNaN(min) || isNaN(max) || min < 0 || max > 9.0 || min >= max) {
      return {
        success: false,
        error: "Khoảng điểm không hợp lệ! Điểm IELTS phải từ 0.0 đến 9.0 và Điểm tối thiểu phải nhỏ hơn Điểm tối đa.",
      };
    }

    // Kiểm tra chồng lấn
    if (data.minScore !== undefined || data.maxScore !== undefined) {
      const overlapCheck = await checkScoreOverlap(min, max, id);
      if (overlapCheck.overlap && overlapCheck.conflictingLevel) {
        return {
          success: false,
          error: `Khoảng điểm [${min} - ${max}] bị chồng lấn với trình độ '${overlapCheck.conflictingLevel.name}' [${overlapCheck.conflictingLevel.minScore} - ${overlapCheck.conflictingLevel.maxScore}]!`,
        };
      }
    }

    const updated = await prisma.ieltsLevel.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        minScore: min,
        maxScore: max,
        description: data.description !== undefined ? data.description.trim() : undefined,
        targetClassCount:
          data.targetClassCount !== undefined
            ? Math.max(1, Math.floor(Number(data.targetClassCount)))
            : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });

    safeRevalidate("/settings");
    safeRevalidate("/users");
    return { success: true, level: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật trình độ IELTS!" };
  }
}

/**
 * Cập nhật Cấu hình phân lớp IELTS (Số lớp phân bổ của từng trình độ)
 */
export async function updateIeltsClassAllocationAction(id: string, targetClassCount: number) {
  try {
    const count = Math.floor(Number(targetClassCount));
    if (isNaN(count) || count < 1) {
      return {
        success: false,
        error: "Số lớp phân bổ phải là số nguyên dương lớn hơn hoặc bằng 1!",
      };
    }

    const updated = await prisma.ieltsLevel.update({
      where: { id },
      data: { targetClassCount: count },
    });

    safeRevalidate("/settings");
    return { success: true, level: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật cấu hình số lớp!" };
  }
}

/**
 * Xóa trình độ IELTS (Ràng buộc: Không xóa nếu có học sinh hoặc lớp học liên kết)
 */
export async function deleteIeltsLevelAction(id: string) {
  try {
    const studentCount = await prisma.userProfile.count({
      where: { ieltsLevelId: id },
    });
    if (studentCount > 0) {
      return {
        success: false,
        error: `Không thể xóa trình độ này vì đang có ${studentCount} học sinh được gắn kết! Bạn có thể tắt trạng thái hoạt động thay vì xóa.`,
      };
    }

    const classCount = await prisma.class.count({
      where: { ieltsLevelId: id },
    });
    if (classCount > 0) {
      return {
        success: false,
        error: `Không thể xóa trình độ này vì đang có ${classCount} lớp học liên kết!`,
      };
    }

    await prisma.ieltsLevel.delete({ where: { id } });

    safeRevalidate("/settings");
    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa trình độ IELTS!" };
  }
}
