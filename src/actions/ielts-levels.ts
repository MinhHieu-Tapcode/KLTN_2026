"use server";

import { prisma, isDbAlive } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

const globalIeltsStore = globalThis as unknown as {
  demoLevels?: any[];
};

if (!globalIeltsStore.demoLevels) {
  globalIeltsStore.demoLevels = [
    {
      id: "lvl-basic",
      code: "BASIC",
      name: "Cơ bản",
      minScore: 0.0,
      maxScore: 4.5,
      targetClassCount: 1,
      sortOrder: 1,
      isActive: true,
      description: "Trình độ IELTS đầu vào từ 0.0 đến 4.5",
      _count: { students: 0, classes: 1 },
    },
    {
      id: "lvl-medium",
      code: "MEDIUM",
      name: "Trung bình",
      minScore: 4.5,
      maxScore: 6.5,
      targetClassCount: 2,
      sortOrder: 2,
      isActive: true,
      description: "Trình độ IELTS đầu vào từ 4.5 đến 6.5",
      _count: { students: 0, classes: 2 },
    },
    {
      id: "lvl-advanced",
      code: "ADVANCED",
      name: "Nâng cao",
      minScore: 6.5,
      maxScore: 9.0,
      targetClassCount: 3,
      sortOrder: 3,
      isActive: true,
      description: "Trình độ IELTS đầu vào từ 6.5 đến 9.0",
      _count: { students: 0, classes: 3 },
    },
  ];
}

/**
 * Lấy danh sách tất cả các trình độ IELTS, sắp xếp theo điểm tối thiểu
 */
export async function getIeltsLevelsAction() {
  if (!(await isDbAlive())) {
    const active = (globalIeltsStore.demoLevels || []).filter((l) => l.isActive);
    return { success: true, levels: active };
  }
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
  } catch {
    const active = (globalIeltsStore.demoLevels || []).filter((l) => l.isActive);
    return { success: true, levels: active };
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

    let levels: any[] = [];
    if (await isDbAlive()) {
      try {
        levels = await prisma.ieltsLevel.findMany({
          where: { isActive: true },
          orderBy: { minScore: "asc" },
        });
      } catch {
        levels = (globalIeltsStore.demoLevels || []).filter((l) => l.isActive);
      }
    } else {
      levels = (globalIeltsStore.demoLevels || []).filter((l) => l.isActive);
    }

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
  let existingLevels: any[] = [];
  if (await isDbAlive()) {
    try {
      existingLevels = await prisma.ieltsLevel.findMany({
        where: {
          isActive: true,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });
    } catch {
      existingLevels = (globalIeltsStore.demoLevels || []).filter(
        (l) => l.isActive && (!excludeId || l.id !== excludeId)
      );
    }
  } else {
    existingLevels = (globalIeltsStore.demoLevels || []).filter(
      (l) => l.isActive && (!excludeId || l.id !== excludeId)
    );
  }

  for (const lvl of existingLevels) {
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

    let code = data.code?.trim().toUpperCase();
    if (!code) {
      code = data.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toUpperCase();
      if (!code) code = `LEVEL_${Date.now()}`;
    }

    if (await isDbAlive()) {
      try {
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
      } catch (dbErr) {
        console.warn("DB offline khi tạo IELTS Level, lưu vào fallback store:", dbErr);
      }
    }

    // Fallback In-memory
    const newDemoLevel = {
      id: `lvl-${Date.now()}`,
      code,
      name: data.name.trim(),
      minScore: min,
      maxScore: max,
      description: data.description?.trim() || "",
      targetClassCount: Math.max(1, Number(data.targetClassCount) || 1),
      sortOrder: (globalIeltsStore.demoLevels?.length || 0) + 1,
      isActive: true,
      _count: { students: 0, classes: 0 },
    };

    if (!globalIeltsStore.demoLevels) globalIeltsStore.demoLevels = [];
    globalIeltsStore.demoLevels.push(newDemoLevel);

    safeRevalidate("/settings");
    safeRevalidate("/users");
    return { success: true, level: newDemoLevel };
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
    const existingFromDemo = (globalIeltsStore.demoLevels || []).find((l) => l.id === id);

    let existing: any = existingFromDemo;
    if (await isDbAlive()) {
      try {
        existing = await prisma.ieltsLevel.findUnique({ where: { id } });
      } catch {
        existing = existingFromDemo;
      }
    }

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

    if (data.minScore !== undefined || data.maxScore !== undefined) {
      const overlapCheck = await checkScoreOverlap(min, max, id);
      if (overlapCheck.overlap && overlapCheck.conflictingLevel) {
        return {
          success: false,
          error: `Khoảng điểm [${min} - ${max}] bị chồng lấn với trình độ '${overlapCheck.conflictingLevel.name}' [${overlapCheck.conflictingLevel.minScore} - ${overlapCheck.conflictingLevel.maxScore}]!`,
        };
      }
    }

    if (await isDbAlive()) {
      try {
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
      } catch (dbErr) {
        console.warn("DB update error, falling back to memory:", dbErr);
      }
    }

    // In-memory fallback
    if (existingFromDemo) {
      if (data.name !== undefined) existingFromDemo.name = data.name.trim();
      if (min !== undefined) existingFromDemo.minScore = min;
      if (max !== undefined) existingFromDemo.maxScore = max;
      if (data.description !== undefined) existingFromDemo.description = data.description.trim();
      if (data.targetClassCount !== undefined)
        existingFromDemo.targetClassCount = Math.max(1, Math.floor(Number(data.targetClassCount)));
      if (data.isActive !== undefined) existingFromDemo.isActive = data.isActive;
    }

    safeRevalidate("/settings");
    safeRevalidate("/users");
    return { success: true, level: existingFromDemo || { id, ...data } };
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

    if (await isDbAlive()) {
      try {
        const updated = await prisma.ieltsLevel.update({
          where: { id },
          data: { targetClassCount: count },
        });

        safeRevalidate("/settings");
        return { success: true, level: updated };
      } catch {}
    }

    const demo = (globalIeltsStore.demoLevels || []).find((l) => l.id === id);
    if (demo) demo.targetClassCount = count;

    safeRevalidate("/settings");
    return { success: true, level: demo };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật cấu hình số lớp!" };
  }
}

/**
 * Xóa trình độ IELTS (Ràng buộc: Không xóa nếu có học sinh hoặc lớp học liên kết)
 */
export async function deleteIeltsLevelAction(id: string) {
  try {
    if (await isDbAlive()) {
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
      } catch (dbErr) {
        console.warn("DB delete error, falling back to memory:", dbErr);
      }
    }

    if (globalIeltsStore.demoLevels) {
      globalIeltsStore.demoLevels = globalIeltsStore.demoLevels.filter((l) => l.id !== id);
    }

    safeRevalidate("/settings");
    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa trình độ IELTS!" };
  }
}
