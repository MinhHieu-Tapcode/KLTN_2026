"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ClassStatus, StaffClassRole } from "@prisma/client";

export async function getClassesAction(statusFilter: string = "ALL") {
  const whereClause: any = { isActive: true };
  if (statusFilter !== "ALL") {
    whereClause.status = statusFilter as ClassStatus;
  }

  return prisma.class.findMany({
    where: whereClause,
    include: {
      school: true,
      assignments: {
        include: {
          staff: { include: { profile: true } },
        },
      },
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClassDetailAction(id: string) {
  return prisma.class.findUnique({
    where: { id },
    include: {
      school: true,
      assignments: {
        include: {
          staff: { include: { profile: true } },
        },
      },
      enrollments: {
        include: {
          student: { include: { profile: true } },
        },
        orderBy: { enrolledAt: "asc" },
      },
    },
  });
}

export async function createClassAction(data: {
  code: string;
  name: string;
  schoolId: string;
  program?: "IELTS" | "SAT" | "CAMBRIDGE" | "OTHER";
  level?: string;
  capacity?: number;
  teacherId?: string;
  taId?: string;
  startDate?: string;
  endDate?: string;
  schedule?: string;
}) {
  try {
    const existing = await prisma.class.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });

    if (existing) {
      return { success: false, error: `Mã lớp '${data.code}' đã tồn tại!` };
    }

    const newClass = await prisma.class.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        schoolId: data.schoolId,
        program: data.program || "IELTS",
        level: data.level || null,
        capacity: data.capacity || 30,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        description: data.schedule || null,
        status: "ACTIVE",
      },
    });

    if (data.teacherId) {
      await prisma.classAssignment.create({
        data: {
          classId: newClass.id,
          userId: data.teacherId,
          roleInClass: "TEACHER",
        },
      });
    }

    if (data.taId) {
      await prisma.classAssignment.create({
        data: {
          classId: newClass.id,
          userId: data.taId,
          roleInClass: "TEACHING_ASSISTANT",
        },
      });
    }

    revalidatePath("/classes");
    return { success: true, class: newClass };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo lớp học!" };
  }
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
    startDate?: string;
    endDate?: string;
    schedule?: string;
  }
) {
  try {
    const updateData: any = {
      name: data.name?.trim(),
      program: data.program,
      level: data.level,
      capacity: data.capacity,
      status: data.status,
    };

    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }
    if (data.schedule !== undefined) {
      updateData.description = data.schedule || null;
    }

    await prisma.class.update({
      where: { id },
      data: updateData,
    });

    // Cập nhật phân công giáo viên nếu có chọn
    if (data.teacherId) {
      await prisma.classAssignment.deleteMany({
        where: { classId: id, roleInClass: "TEACHER" },
      });
      await prisma.classAssignment.create({
        data: { classId: id, userId: data.teacherId, roleInClass: "TEACHER" },
      });
    }

    // Cập nhật phân công trợ giảng nếu có chọn
    if (data.taId) {
      await prisma.classAssignment.deleteMany({
        where: { classId: id, roleInClass: "TEACHING_ASSISTANT" },
      });
      await prisma.classAssignment.create({
        data: { classId: id, userId: data.taId, roleInClass: "TEACHING_ASSISTANT" },
      });
    }

    revalidatePath("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật lớp học!" };
  }
}

export async function deleteClassAction(id: string) {
  try {
    await prisma.class.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa lớp học!" };
  }
}

export async function deleteMultipleClassesAction(ids: string[]) {
  try {
    await prisma.class.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    revalidatePath("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa các lớp đã chọn!" };
  }
}

// Phân công hoặc Thay thế Giáo viên / Trợ giảng cho lớp
export async function assignStaffToClassAction(
  classId: string,
  userId: string,
  roleInClass: StaffClassRole
) {
  try {
    // Xóa phân công cũ của vai trò này (nếu có) để thay thế
    await prisma.classAssignment.deleteMany({
      where: { classId, roleInClass },
    });

    await prisma.classAssignment.create({
      data: {
        classId,
        userId,
        roleInClass,
      },
    });

    revalidatePath("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể phân công nhân sự!" };
  }
}

// Hủy phân công Giáo viên / Trợ giảng khỏi lớp
export async function removeStaffFromClassAction(classId: string, userId: string) {
  try {
    await prisma.classAssignment.deleteMany({
      where: { classId, userId },
    });

    revalidatePath("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể hủy phân công!" };
  }
}
