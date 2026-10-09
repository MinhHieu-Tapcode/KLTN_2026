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

// Thêm học viên vào lớp học
export async function enrollStudentToClassAction(classId: string, studentId: string) {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!cls || !cls.isActive) {
      return { success: false, error: "Lớp học không tồn tại hoặc đã ngừng hoạt động!" };
    }
    if (cls._count.enrollments >= cls.capacity) {
      return { success: false, error: `Lớp học đã đạt sĩ số tối đa (${cls.capacity} học viên)!` };
    }

    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: { classId, studentId },
      },
      create: {
        classId,
        studentId,
        status: "STUDYING",
      },
      update: {
        status: "STUDYING",
      },
    });

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể thêm học viên vào lớp!" };
  }
}

// Rút học viên khỏi lớp học
export async function removeStudentFromClassAction(classId: string, studentId: string) {
  try {
    await prisma.classEnrollment.deleteMany({
      where: {
        classId,
        studentId,
      },
    });

    safeRevalidate("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể rút học viên khỏi lớp!" };
  }
}

// Lấy danh sách học viên khả dụng để thêm vào lớp (chưa ghi danh vào lớp này)
export async function getAvailableStudentsForClassAction(classId: string) {
  try {
    const students = await prisma.user.findMany({
      where: {
        role: { code: "STUDENT" },
        isActive: true,
        NOT: {
          classEnrollments: {
            some: { classId },
          },
        },
      },
      include: {
        profile: true,
        classEnrollments: {
          include: {
            class: {
              include: { school: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, students };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tải danh sách học viên!", students: [] };
  }
}

// Chuyển học viên giữa các lớp TRONG CÙNG MỘT TRƯỜNG (Bắt buộc cùng schoolId)
export async function transferStudentClassAction(
  currentClassId: string,
  targetClassId: string,
  studentId: string
) {
  try {
    if (!currentClassId || !targetClassId || !studentId) {
      return { success: false, error: "Thiếu thông tin chuyển lớp!" };
    }

    if (currentClassId === targetClassId) {
      return { success: false, error: "Lớp học chuyển đến phải khác lớp hiện tại!" };
    }

    const [currentClass, targetClass] = await Promise.all([
      prisma.class.findUnique({
        where: { id: currentClassId },
        include: { school: true },
      }),
      prisma.class.findUnique({
        where: { id: targetClassId },
        include: {
          school: true,
          _count: { select: { enrollments: true } },
        },
      }),
    ]);

    if (!currentClass || !currentClass.isActive) {
      return { success: false, error: "Lớp học hiện tại không tồn tại hoặc đã ngừng hoạt động!" };
    }
    if (!targetClass || !targetClass.isActive) {
      return { success: false, error: "Lớp học chuyển đến không tồn tại hoặc đã ngừng hoạt động!" };
    }

    // RÀNG BUỘC NGHIỆP VỤ BẮT BUỘC: CHỈ ĐƯỢC CHUYỂN GIỮA CÁC LỚP TRONG CÙNG 1 TRƯỜNG
    if (currentClass.schoolId !== targetClass.schoolId) {
      return {
        success: false,
        error: "Ràng buộc hệ thống: Chỉ được phép chuyển học sinh giữa các lớp trong cùng 1 trường học!",
      };
    }

    // Kiểm tra sĩ số lớp đích
    if (targetClass._count.enrollments >= targetClass.capacity) {
      return {
        success: false,
        error: `Lớp "${targetClass.name}" đã đạt sĩ số tối đa (${targetClass.capacity} học viên)! Vui lòng chọn lớp khác.`,
      };
    }

    // Thực hiện chuyển lớp an toàn bằng transaction
    await prisma.$transaction([
      prisma.classEnrollment.deleteMany({
        where: {
          classId: currentClassId,
          studentId,
        },
      }),
      prisma.classEnrollment.upsert({
        where: {
          classId_studentId: { classId: targetClassId, studentId },
        },
        create: {
          classId: targetClassId,
          studentId,
          status: "STUDYING",
        },
        update: {
          status: "STUDYING",
        },
      }),
    ]);

    safeRevalidate("/classes");
    safeRevalidate("/schools");
    return {
      success: true,
      message: `Đã chuyển học viên sang lớp "${targetClass.name}" (${targetClass.code}) thành công!`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể chuyển lớp cho học viên!",
    };
  }
}

// Lấy toàn bộ danh sách lớp học kèm danh sách học sinh của từng lớp theo trường
export async function getSchoolClassesWithStudentsAction(schoolId: string) {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        manager: {
          include: { profile: true },
        },
        classes: {
          where: { isActive: true },
          include: {
            school: true,
            assignments: {
              include: { staff: { include: { profile: true } } },
            },
            enrollments: {
              include: {
                student: {
                  include: {
                    profile: true,
                    classEnrollments: {
                      where: { class: { schoolId } },
                      include: { class: true },
                    },
                  },
                },
              },
              orderBy: { enrolledAt: "asc" },
            },
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!school) {
      return { success: false, error: "Không tìm thấy trường học!", school: null };
    }

    return { success: true, school };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tải danh sách lớp học của trường!", school: null };
  }
}

// Lấy danh sách học sinh cùng trường khả dụng để thêm / chuyển sang lớp này
export async function getEligibleSchoolStudentsForClassAction(classId: string) {
  try {
    const currentClass = await prisma.class.findUnique({
      where: { id: classId },
      include: { school: true },
    });

    if (!currentClass) {
      return { success: false, error: "Không tìm thấy lớp học!", students: [] };
    }

    // Chỉ lấy học sinh thuộc cùng trường (đang học ở lớp khác của trường này) và chưa có trong classId
    const students = await prisma.user.findMany({
      where: {
        role: { code: "STUDENT" },
        isActive: true,
        classEnrollments: {
          some: {
            class: {
              schoolId: currentClass.schoolId,
              isActive: true,
            },
          },
        },
        NOT: {
          classEnrollments: {
            some: { classId },
          },
        },
      },
      include: {
        profile: true,
        classEnrollments: {
          where: {
            class: { schoolId: currentClass.schoolId },
          },
          include: {
            class: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      schoolName: currentClass.school.name,
      schoolId: currentClass.schoolId,
      students,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể tải danh sách học sinh của trường!",
      students: [],
    };
  }
}


