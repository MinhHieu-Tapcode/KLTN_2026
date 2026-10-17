"use server";

import { prisma, isDbAlive } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isSchoolManager } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { areSchedulesConflicting } from "@/lib/schedule";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

const DEMO_SCHOOLS = [
  { id: "demo-school-1", code: "SCH_TD", name: "THPT Trương Định", type: "THPT", address: "Hoàng Mai, Hà Nội", isActive: true, classes: [] },
  { id: "demo-school-2", code: "SCH_KL", name: "THPT Kim Liên", type: "THPT", address: "Đống Đa, Hà Nội", isActive: true, classes: [] },
];

// Hàm sinh mã trường học tự động (BUG_06) - VD: THPT Trương Định -> SCH_TD
export async function generateSchoolCode(schoolName: string): Promise<string> {
  if (!(await isDbAlive())) {
    return "SCH_DEMO_01";
  }
  let cleanName = schoolName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase();

  // Bỏ tiền tố trường học nếu có: "TRUONG THPT", "THPT", "THCS", "TRUONG THCS"
  cleanName = cleanName
    .replace(/^TRUONG\s+(THPT|THCS|DAI\s+HOC|CD|TIEU\s+HOC)\s+/, "")
    .replace(/^(THPT|THCS|DAI\s+HOC|CD|TIEU\s+HOC)\s+/, "");

  const words = cleanName
    .split(/[\s,.-]+/)
    .filter(Boolean);

  let acronym = words.map((w) => w[0]).join("");
  if (!acronym || acronym.length < 2) {
    acronym = words[0]?.slice(0, 3) || "SIM";
  }

  let candidate = `SCH_${acronym}`;
  let existing = await prisma.school.findUnique({ where: { code: candidate } });
  let idx = 1;

  while (existing) {
    candidate = `SCH_${acronym}_${idx.toString().padStart(2, "0")}`;
    existing = await prisma.school.findUnique({ where: { code: candidate } });
    idx++;
  }

  return candidate;
}

// Lấy mã trường học tiếp theo dự kiến cho Client Form
export async function getNextSchoolCodeAction(name: string) {
  if (!name || !name.trim()) return { success: true, code: "SCH_SIM" };
  const code = await generateSchoolCode(name.trim());
  return { success: true, code };
}

// Lấy danh sách trường học có phân quyền phạm vi Quản nhiệm & Lọc xóa mềm (BUG_02, BUG_09)
export async function getSchoolsAction(
  searchKeyword: string = "",
  statusFilter: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  if (!(await isDbAlive())) {
    return DEMO_SCHOOLS as any;
  }
  try {
    const session = await getSession();
    const whereClause: any = {};

    if (statusFilter === "ACTIVE") {
      whereClause.isActive = true;
    } else if (statusFilter === "INACTIVE") {
      whereClause.isActive = false;
    }

    // Quản nhiệm CHỈ ĐƯỢC XEM trường mình phụ trách (BUG_02)
    if (isSchoolManager(session)) {
      whereClause.managerId = session.userId;
    }

    // Tìm kiếm tự động .trim() (BUG_09)
    if (searchKeyword && searchKeyword.trim()) {
      const clean = searchKeyword.trim();
      whereClause.OR = [
        { name: { contains: clean, mode: "insensitive" } },
        { code: { contains: clean, mode: "insensitive" } },
        { address: { contains: clean, mode: "insensitive" } },
        { contactName: { contains: clean, mode: "insensitive" } },
      ];
    }

    return await prisma.school.findMany({
      where: whereClause,
      include: {
        manager: {
          include: { profile: true },
        },
        classes: {
          where: { isActive: true },
          include: {
            assignments: {
              include: { staff: { include: { profile: true } } },
            },
            _count: {
              select: { enrollments: true },
            },
          },
        },
        _count: {
          select: { classes: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err: any) {
    console.warn("[getSchoolsAction] DB offline fallback:", err?.message);
    return [
      { id: "demo-school-1", code: "SCH_TD", name: "THPT Trương Định", type: "THPT", address: "Hoàng Mai, Hà Nội", isActive: true, classes: [] },
      { id: "demo-school-2", code: "SCH_KL", name: "THPT Kim Liên", type: "THPT", address: "Đống Đa, Hà Nội", isActive: true, classes: [] },
    ] as any;
  }
}

// Lấy chi tiết trường học và danh sách lớp trực thuộc (BUG_13)
export async function getSchoolDetailAction(schoolId: string) {
  if (!(await isDbAlive())) {
    return null;
  }
  try {
    return await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        manager: {
          include: { profile: true },
        },
        classes: {
          where: { isActive: true },
          include: {
            assignments: {
              include: { staff: { include: { profile: true } } },
            },
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (err: any) {
    console.warn("[getSchoolDetailAction] DB offline fallback:", err?.message);
    return null;
  }
}

export async function getSchoolManagersAction() {
  if (!(await isDbAlive())) {
    return [];
  }
  try {
    return await prisma.user.findMany({
      where: {
        role: { code: "SCHOOL_MANAGER" },
        isActive: true,
      },
      include: {
        profile: true,
        managedSchools: {
          where: { isActive: true },
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { username: "asc" },
    });
  } catch (err: any) {
    console.warn("[getSchoolManagersAction] DB offline fallback:", err?.message);
    return [];
  }
}

// Tạo trường học mới - Bắt buộc Quản nhiệm, Đại diện BGH, SĐT và Địa chỉ
export async function createSchoolAction(data: {
  code?: string;
  name: string;
  type?: "THCS" | "THPT" | "UNIVERSITY" | "OTHER";
  managerId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
}) {
  try {
    const cleanName = data.name.trim();
    if (!cleanName) {
      return { success: false, error: "Tên trường học là bắt buộc!" };
    }
    if (!data.managerId) {
      return { success: false, error: "Trường học bắt buộc phải có Quản nhiệm phụ trách!" };
    }
    if (!data.contactName?.trim()) {
      return { success: false, error: "Vui lòng nhập tên Đại diện BGH / Giáo vụ liên hệ!" };
    }
    if (!data.contactPhone?.trim()) {
      return { success: false, error: "Vui lòng nhập Số điện thoại liên hệ BGH!" };
    }
    if (!data.address?.trim()) {
      return { success: false, error: "Vui lòng nhập Địa chỉ trường học!" };
    }

    // Tự sinh mã nếu không cung cấp
    let code = data.code?.trim().toUpperCase();
    if (!code) {
      code = await generateSchoolCode(cleanName);
    }

    const existing = await prisma.school.findUnique({
      where: { code },
    });

    if (existing) {
      return { success: false, error: `Mã trường '${code}' đã tồn tại!` };
    }

    const school = await prisma.school.create({
      data: {
        code,
        name: cleanName,
        type: data.type || "THPT",
        managerId: data.managerId || null,
        address: data.address?.trim() || null,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        isActive: true,
      },
      include: {
        manager: { include: { profile: true } },
      },
    });

    safeRevalidate("/schools");
    return { success: true, school };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo trường học!" };
  }
}

export async function updateSchoolAction(
  id: string,
  data: {
    name?: string;
    type?: "THCS" | "THPT" | "UNIVERSITY" | "OTHER";
    managerId?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
  }
) {
  try {
    if (data.name !== undefined && !data.name.trim()) {
      return { success: false, error: "Tên trường học không được để trống!" };
    }
    if (data.managerId !== undefined && !data.managerId) {
      return { success: false, error: "Trường học bắt buộc phải có Quản nhiệm phụ trách!" };
    }

    if (data.managerId) {
      const conflictCheck = await checkSchoolManagerScheduleConflictAction(id, data.managerId);
      if (conflictCheck.hasConflict) {
        return {
          success: false,
          error: conflictCheck.error || "Phát hiện xung đột lịch học giữa các trường mà quản nhiệm phụ trách!",
        };
      }
    }

    await prisma.school.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        type: data.type,
        managerId: data.managerId !== undefined ? data.managerId || null : undefined,
        address: data.address?.trim() || null,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
      },
    });

    safeRevalidate("/schools");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật trường học!" };
  }
}

// Xóa mềm trường học (isActive: false)
export async function deleteSchoolAction(id: string) {
  try {
    await prisma.school.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa trường học!" };
  }
}

// Khôi phục trường học đã xóa mềm
export async function restoreSchoolAction(id: string) {
  try {
    await prisma.school.update({
      where: { id },
      data: { isActive: true },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể khôi phục trường học!" };
  }
}

// Xóa hàng loạt trường học (Soft delete)
export async function deleteMultipleSchoolsAction(ids: string[]) {
  try {
    await prisma.school.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa các trường đã chọn!" };
  }
}

// Kiểm tra xung đột lịch học giữa các trường mà Quản nhiệm phụ trách
export async function checkSchoolManagerScheduleConflictAction(
  targetSchoolId: string,
  managerId: string
) {
  try {
    const [targetSchool, targetManager, otherSchools] = await Promise.all([
      prisma.school.findUnique({
        where: { id: targetSchoolId },
        include: {
          classes: {
            where: { isActive: true },
            select: { id: true, name: true, code: true, description: true, startDate: true, endDate: true },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: managerId },
        include: { profile: true },
      }),
      prisma.school.findMany({
        where: {
          managerId,
          id: { not: targetSchoolId },
          isActive: true,
        },
        include: {
          classes: {
            where: { isActive: true },
            select: { id: true, name: true, code: true, description: true, startDate: true, endDate: true },
          },
        },
      }),
    ]);

    if (!targetSchool) {
      return { success: false, error: "Không tìm thấy trường học!" };
    }

    const managerName = targetManager?.profile?.fullName || targetManager?.username || "Quản nhiệm";

    // Kiểm tra từng cặp lớp học giữa targetSchool và các otherSchools
    for (const targetCls of targetSchool.classes) {
      if (!targetCls.description) continue;

      for (const otherSch of otherSchools) {
        for (const otherCls of otherSch.classes) {
          if (!otherCls.description) continue;

          const isConflict = areSchedulesConflicting(
            targetCls.description,
            otherCls.description,
            { start: targetCls.startDate, end: targetCls.endDate },
            { start: otherCls.startDate, end: otherCls.endDate }
          );

          if (isConflict) {
            return {
              success: true,
              hasConflict: true,
              managerName,
              otherSchoolName: otherSch.name,
              targetSchoolName: targetSchool.name,
              targetClassName: targetCls.name,
              targetClassCode: targetCls.code,
              targetClassSchedule: targetCls.description,
              otherClassName: otherCls.name,
              otherClassCode: otherCls.code,
              otherClassSchedule: otherCls.description,
              error: `Xung đột lịch học: Trường "${targetSchool.name}" có lớp "${targetCls.name}" (${targetCls.description}) bị trùng khung giờ với lớp "${otherCls.name}" (${otherCls.description}) tại trường "${otherSch.name}" mà quản nhiệm "${managerName}" đang phụ trách! Không thể phân công quản nhiệm.`,
            };
          }
        }
      }
    }

    return {
      success: true,
      hasConflict: false,
      managerName,
      otherSchools: otherSchools.map((s) => ({ id: s.id, name: s.name, code: s.code })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi kiểm tra trùng lịch quản nhiệm!" };
  }
}

// Thay đổi quản nhiệm phụ trách trường: Hỗ trợ GHI ĐÈ hoặc HOÁN ĐỔI 2 QUẢN NHIỆM
export async function changeSchoolManagerAction(data: {
  schoolId: string;
  newManagerId: string;
  actionType: "ASSIGN" | "SWAP" | "OVERWRITE";
  swapWithSchoolId?: string;
}) {
  try {
    const { schoolId, newManagerId, actionType, swapWithSchoolId } = data;

    // 1. Kiểm tra xung đột lịch học của newManagerId với schoolId
    const conflictCheck = await checkSchoolManagerScheduleConflictAction(schoolId, newManagerId);
    if (conflictCheck.hasConflict) {
      return {
        success: false,
        error: conflictCheck.error || "Phát hiện xung đột lịch học giữa các trường mà quản nhiệm phụ trách!",
      };
    }

    const currentSchool = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { manager: true },
    });
    if (!currentSchool) {
      return { success: false, error: "Không tìm thấy trường học!" };
    }

    const oldManagerId = currentSchool.managerId;

    if (actionType === "SWAP") {
      if (!swapWithSchoolId) {
        return { success: false, error: "Vui lòng chọn trường học cần hoán đổi quản nhiệm!" };
      }

      // Kiểm tra xung đột lịch học cho oldManagerId khi sang swapWithSchoolId
      if (oldManagerId) {
        const oldManagerConflict = await checkSchoolManagerScheduleConflictAction(
          swapWithSchoolId,
          oldManagerId
        );
        if (oldManagerConflict.hasConflict) {
          return {
            success: false,
            error: `Không thể hoán đổi: ${oldManagerConflict.error}`,
          };
        }
      }

      await prisma.$transaction([
        prisma.school.update({
          where: { id: schoolId },
          data: { managerId: newManagerId },
        }),
        prisma.school.update({
          where: { id: swapWithSchoolId },
          data: { managerId: oldManagerId || null },
        }),
      ]);

      safeRevalidate("/schools");
      return { success: true, message: "Hoán đổi quản nhiệm giữa 2 trường thành công!" };
    } else {
      // OVERWRITE hoặc ASSIGN
      await prisma.school.update({
        where: { id: schoolId },
        data: { managerId: newManagerId },
      });

      safeRevalidate("/schools");
      return { success: true, message: "Cập nhật quản nhiệm phụ trách trường thành công!" };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể thay đổi quản nhiệm!" };
  }
}

