"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSchoolsAction() {
  return prisma.school.findMany({
    where: { isActive: true },
    include: {
      manager: {
        include: { profile: true },
      },
      _count: {
        select: { classes: { where: { isActive: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
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

export async function createSchoolAction(data: {
  code: string;
  name: string;
  type?: "THCS" | "THPT" | "UNIVERSITY" | "OTHER";
  managerId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
}) {
  try {
    const existing = await prisma.school.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });

    if (existing) {
      return { success: false, error: `Mã trường '${data.code}' đã tồn tại!` };
    }

    const school = await prisma.school.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        type: data.type || "THPT",
        managerId: data.managerId || null,
        address: data.address || null,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
      },
      include: {
        manager: { include: { profile: true } },
      },
    });

    revalidatePath("/schools");
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
    await prisma.school.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        type: data.type,
        managerId: data.managerId || null,
        address: data.address,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
      },
    });

    revalidatePath("/schools");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật trường học!" };
  }
}

export async function deleteSchoolAction(id: string) {
  try {
    await prisma.school.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/schools");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa trường học!" };
  }
}

// Xóa hàng loạt trường học (Soft delete)
export async function deleteMultipleSchoolsAction(ids: string[]) {
  try {
    await prisma.school.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    revalidatePath("/schools");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa các trường đã chọn!" };
  }
}
