"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

// Hàm sinh mã trường học tự động (BUG_06) - VD: THPT Trương Định -> SCH_TD
export async function generateSchoolCode(schoolName: string): Promise<string> {
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
  const session = await getSession();
  const whereClause: any = {};

  if (statusFilter === "ACTIVE") {
    whereClause.isActive = true;
  } else if (statusFilter === "INACTIVE") {
    whereClause.isActive = false;
  }

  // Quản nhiệm CHỈ ĐƯỢC XEM trường mình phụ trách (BUG_02)
  if (session?.role === "SCHOOL_MANAGER") {
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

  return prisma.school.findMany({
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
}

// Lấy chi tiết trường học và danh sách lớp trực thuộc (BUG_13)
export async function getSchoolDetailAction(schoolId: string) {
  return prisma.school.findUnique({
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
}

export async function getSchoolManagersAction() {
  return prisma.user.findMany({
    where: {
      role: { code: "SCHOOL_MANAGER" },
      isActive: true,
    },
    include: { profile: true },
    orderBy: { username: "asc" },
  });
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

    safeRevalidate("/schools");
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

    safeRevalidate("/schools");
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

    safeRevalidate("/schools");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa các trường đã chọn!" };
  }
}
