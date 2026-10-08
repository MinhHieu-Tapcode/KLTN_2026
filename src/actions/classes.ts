"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ClassStatus, StaffClassRole } from "@prisma/client";

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
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const schoolAcronym = school?.code.replace(/^SCH_/, "") || "SIM";
  const cleanProgram = (program || "IELTS").toUpperCase();

  const count = await prisma.class.count({
    where: { schoolId, program: cleanProgram as any },
  });

  let nextNum = count + 1;
  let candidate = `${cleanProgram}_${schoolAcronym}_${nextNum.toString().padStart(2, "0")}`;

  while (await prisma.class.findUnique({ where: { code: candidate } })) {
    nextNum++;
    candidate = `${cleanProgram}_${schoolAcronym}_${nextNum.toString().padStart(2, "0")}`;
  }

  return candidate;
}

// Lấy mã lớp học tiếp theo cho Client xem trước (Preview)
export async function getNextClassCodeAction(schoolId: string, program: string) {
  if (!schoolId) return { success: false, code: "" };
  const code = await generateClassCode(schoolId, program);
  return { success: true, code };
}

// Lấy danh sách lớp học có phân quyền phạm vi Quản nhiệm & Lọc xóa mềm (BUG_03, BUG_10)
export async function getClassesAction(
  statusFilter: string = "ALL",
  searchKeyword: string = "",
  activeState: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  const session = await getSession();
  const whereClause: any = {};

  if (activeState === "ACTIVE") {
    whereClause.isActive = true;
  } else if (activeState === "INACTIVE") {
    whereClause.isActive = false;
  }

  // Quản nhiệm CHỈ ĐƯỢC XEM lớp thuộc trường mình phụ trách (BUG_03)
  if (session?.role === "SCHOOL_MANAGER") {
    whereClause.school = { managerId: session.userId };
  } else if (session?.role === "TEACHER" || session?.role === "TEACHING_ASSISTANT") {
    whereClause.assignments = { some: { userId: session.userId } };
  } else if (session?.role === "STUDENT") {
    whereClause.enrollments = { some: { studentId: session.userId } };
  }

  if (statusFilter !== "ALL") {
    whereClause.status = statusFilter as ClassStatus;
  }

  // Tìm kiếm tự động .trim() (BUG_10)
  if (searchKeyword && searchKeyword.trim()) {
    const clean = searchKeyword.trim();
    whereClause.OR = [
      { name: { contains: clean, mode: "insensitive" } },
      { code: { contains: clean, mode: "insensitive" } },
      { school: { name: { contains: clean, mode: "insensitive" } } },
    ];
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
      enrollments: {
        include: {
          student: { include: { profile: true } },
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
  try {
    const cleanName = data.name.trim();
    if (!cleanName || !data.schoolId) {
      return { success: false, error: "Vui lòng nhập tên lớp và chọn trường học!" };
    }

    const teachersToAssign = (data.teacherIds || (data.teacherId ? [data.teacherId] : [])).filter(Boolean);
    if (teachersToAssign.length === 0) {
      return { success: false, error: "Lớp học bắt buộc phải có ít nhất 1 Giáo viên giảng dạy!" };
    }

    const tasToAssign = (data.taIds || (data.taId ? [data.taId] : [])).filter(Boolean);
    if (tasToAssign.length === 0) {
      return { success: false, error: "Lớp học bắt buộc phải có ít nhất 1 Trợ giảng (TA) phụ trách!" };
    }

    // Tự sinh mã lớp học nếu chưa có (BUG_07)
    let code = data.code?.trim().toUpperCase();
    if (!code) {
      code = await generateClassCode(data.schoolId, data.program || "IELTS");
    }

    const existing = await prisma.class.findUnique({
      where: { code },
    });

    if (existing) {
      return { success: false, error: `Mã lớp '${code}' đã tồn tại!` };
    }

    const newClass = await prisma.class.create({
      data: {
        code,
        name: cleanName,
        schoolId: data.schoolId,
        program: data.program || "IELTS",
        level: data.level || null,
        capacity: data.capacity || 30,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        description: data.schedule || null,
        status: "ACTIVE",
        isActive: true,
      },
    });

    // Phân công giáo viên
    for (const tid of teachersToAssign) {
      if (!tid) continue;
      await prisma.classAssignment.create({
        data: {
          classId: newClass.id,
          userId: tid,
          roleInClass: "TEACHER",
        },
      });
    }

    // Phân công trợ giảng
    for (const taId of tasToAssign) {
      if (!taId) continue;
      await prisma.classAssignment.create({
        data: {
          classId: newClass.id,
          userId: taId,
          roleInClass: "TEACHING_ASSISTANT",
        },
      });
    }

    safeRevalidate("/classes");
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
    teacherIds?: string[];
    taIds?: string[];
    startDate?: string;
    endDate?: string;
    schedule?: string;
  }
) {
  try {
    if (data.teacherIds !== undefined && data.teacherIds.filter(Boolean).length === 0) {
      return { success: false, error: "Lớp học bắt buộc phải có ít nhất 1 Giáo viên giảng dạy!" };
    }
    if (data.taIds !== undefined && data.taIds.filter(Boolean).length === 0) {
      return { success: false, error: "Lớp học bắt buộc phải có ít nhất 1 Trợ giảng (TA) phụ trách!" };
    }
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

    // Cập nhật phân công giáo viên
    if (data.teacherIds !== undefined || data.teacherId !== undefined) {
      await prisma.classAssignment.deleteMany({
        where: { classId: id, roleInClass: "TEACHER" },
      });
      const tList = data.teacherIds || (data.teacherId ? [data.teacherId] : []);
      for (const tid of tList) {
        if (!tid) continue;
        await prisma.classAssignment.create({
          data: { classId: id, userId: tid, roleInClass: "TEACHER" },
        });
      }
    }

    // Cập nhật phân công trợ giảng
    if (data.taIds !== undefined || data.taId !== undefined) {
      await prisma.classAssignment.deleteMany({
        where: { classId: id, roleInClass: "TEACHING_ASSISTANT" },
      });
      const taList = data.taIds || (data.taId ? [data.taId] : []);
      for (const taId of taList) {
        if (!taId) continue;
        await prisma.classAssignment.create({
          data: { classId: id, userId: taId, roleInClass: "TEACHING_ASSISTANT" },
        });
      }
    }

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật lớp học!" };
  }
}

// Xóa mềm lớp học (isActive: false)
export async function deleteClassAction(id: string) {
  try {
    await prisma.class.update({
      where: { id },
      data: { isActive: false },
    });

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa lớp học!" };
  }
}

// Khôi phục lớp học đã xóa mềm
export async function restoreClassAction(id: string) {
  try {
    await prisma.class.update({
      where: { id },
      data: { isActive: true },
    });

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể khôi phục lớp học!" };
  }
}

export async function deleteMultipleClassesAction(ids: string[]) {
  try {
    await prisma.class.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa các lớp đã chọn!" };
  }
}

export async function assignStaffToClassAction(
  classId: string,
  userId: string,
  roleInClass: StaffClassRole
) {
  try {
    await prisma.classAssignment.upsert({
      where: {
        classId_userId: { classId, userId },
      },
      create: { classId, userId, roleInClass },
      update: { roleInClass },
    });

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể gán nhân sự vào lớp!" };
  }
}

export async function removeStaffFromClassAction(classId: string, userId: string) {
  try {
    await prisma.classAssignment.delete({
      where: {
        classId_userId: { classId, userId },
      },
    });

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể hủy phân công nhân sự!" };
  }
}
