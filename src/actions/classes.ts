"use server";

import { prisma, isDbAlive } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isSchoolManager, isStudent, isTeacherOrTA } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { ClassStatus, StaffClassRole } from "@prisma/client";
import { areSchedulesConflicting } from "@/lib/schedule";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

const globalClassesStore = globalThis as unknown as {
  demoClasses?: any[];
};

if (!globalClassesStore.demoClasses) {
  globalClassesStore.demoClasses = [
    {
      id: "demo-class-1",
      code: "IELTS_TD_01",
      name: "IELTS Bứt Phá - 10A1",
      program: "IELTS",
      level: "5.5 - 6.5",
      capacity: 30,
      status: "ACTIVE",
      description: "Thứ 2, 4, 6 (18:00 - 20:00)",
      school: { name: "THPT Trương Định", id: "demo-school-1" },
      schoolId: "demo-school-1",
      isActive: true,
      assignments: [
        {
          id: "as-1",
          userId: "teacher-1",
          roleInClass: "TEACHER",
          staff: { username: "teacher1", email: "gv.nguyenvan@simpace.vn", profile: { fullName: "ThS. Nguyễn Văn A" } },
        },
      ],
      enrollments: [
        {
          id: "en-1",
          studentId: "st-1",
          status: "STUDYING",
          student: { username: "HV001", email: "hv001@simpace.vn", profile: { fullName: "Trần Thị Lan", entryIeltsScore: 5.5 } },
        },
        {
          id: "en-2",
          studentId: "st-2",
          status: "STUDYING",
          student: { username: "HV002", email: "hv002@simpace.vn", profile: { fullName: "Lê Hoàng Long", entryIeltsScore: 6.0 } },
        },
      ],
      _count: { enrollments: 2 },
    },
    {
      id: "demo-class-2",
      code: "IELTS_KL_02",
      name: "IELTS Nền Tảng - 11B2",
      program: "IELTS",
      level: "4.0 - 5.0",
      capacity: 25,
      status: "UPCOMING",
      description: "Thứ 3, 5, 7 (19:30 - 21:30)",
      school: { name: "THPT Kim Liên", id: "demo-school-2" },
      schoolId: "demo-school-2",
      isActive: true,
      assignments: [],
      enrollments: [],
      _count: { enrollments: 0 },
    },
  ];
}

// Sinh mã lớp học tự động (BUG_07) theo cấu trúc: [Chương trình]_[Mã trường]_[STT 2 số] (VD: IELTS_TD_01)
export async function generateClassCode(
  schoolId: string,
  program: string = "IELTS"
): Promise<string> {
  if (!(await isDbAlive())) {
    return "IELTS_SIM_01";
  }
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
  if (!(await isDbAlive())) {
    return (globalClassesStore.demoClasses || []) as any;
  }
  const session = await getSession();
  const whereClause: any = {};

  if (activeState === "ACTIVE") {
    whereClause.isActive = true;
  } else if (activeState === "INACTIVE") {
    whereClause.isActive = false;
  }

  // Quản nhiệm CHỈ ĐƯỢC XEM lớp thuộc trường mình phụ trách (BUG_03)
  if (isSchoolManager(session)) {
    whereClause.school = { managerId: session.userId };
  } else if (isTeacherOrTA(session)) {
    whereClause.assignments = { some: { userId: session.userId } };
  } else if (isStudent(session)) {
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

  try {
    return await prisma.class.findMany({
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
  } catch (err: any) {
    console.warn("[getClassesAction] DB offline fallback:", err?.message);
    return [
      {
        id: "demo-class-1",
        code: "IELTS_TD_01",
        name: "IELTS Bứt Phá - 10A1",
        program: "IELTS",
        level: "5.5 - 6.5",
        capacity: 30,
        status: "ACTIVE",
        description: "Thứ 2, 4, 6 (18:00 - 20:00)",
        school: { name: "THPT Trương Định", id: "demo-school-1" },
        schoolId: "demo-school-1",
        isActive: true,
        assignments: [
          {
            id: "as-1",
            userId: "teacher-1",
            roleInClass: "TEACHER",
            staff: { username: "teacher1", email: "gv.nguyenvan@simpace.vn", profile: { fullName: "ThS. Nguyễn Văn A" } },
          },
        ],
        enrollments: [
          {
            id: "en-1",
            studentId: "st-1",
            status: "STUDYING",
            student: { username: "HV001", email: "hv001@simpace.vn", profile: { fullName: "Trần Thị Lan", entryIeltsScore: 5.5 } },
          },
          {
            id: "en-2",
            studentId: "st-2",
            status: "STUDYING",
            student: { username: "HV002", email: "hv002@simpace.vn", profile: { fullName: "Lê Hoàng Long", entryIeltsScore: 6.0 } },
          },
        ],
        _count: { enrollments: 2 },
      },
      {
        id: "demo-class-2",
        code: "IELTS_KL_02",
        name: "IELTS Nền Tảng - 11B2",
        program: "IELTS",
        level: "4.0 - 5.0",
        capacity: 25,
        status: "UPCOMING",
        description: "Thứ 3, 5, 7 (19:30 - 21:30)",
        school: { name: "THPT Kim Liên", id: "demo-school-2" },
        schoolId: "demo-school-2",
        isActive: true,
        assignments: [],
        enrollments: [],
        _count: { enrollments: 0 },
      },
    ] as any;
  }
}

export async function getClassDetailAction(id: string) {
  if (!(await isDbAlive())) {
    const found = (globalClassesStore.demoClasses || []).find((c) => c.id === id);
    if (found) return found as any;
    return (globalClassesStore.demoClasses || [])[0] as any;
  }
  try {
    return await prisma.class.findUnique({
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
  } catch (err: any) {
    console.warn("[getClassDetailAction] DB offline fallback:", err?.message);
    return {
      id,
      code: "IELTS_TD_01",
      name: "IELTS Bứt Phá - 10A1",
      program: "IELTS",
      level: "5.5 - 6.5",
      capacity: 30,
      status: "ACTIVE",
      description: "Thứ 2, 4, 6 (18:00 - 20:00)",
      school: { name: "THPT Trương Định", id: "demo-school-1" },
      schoolId: "demo-school-1",
      isActive: true,
      assignments: [
        {
          id: "as-1",
          userId: "teacher-1",
          roleInClass: "TEACHER",
          staff: { username: "teacher1", email: "gv.nguyenvan@simpace.vn", profile: { fullName: "ThS. Nguyễn Văn A" } },
        },
      ],
      enrollments: [
        {
          id: "en-1",
          studentId: "st-1",
          status: "STUDYING",
          student: { username: "HV001", email: "hv001@simpace.vn", profile: { fullName: "Trần Thị Lan", entryIeltsScore: 5.5 } },
        },
        {
          id: "en-2",
          studentId: "st-2",
          status: "STUDYING",
          student: { username: "HV002", email: "hv002@simpace.vn", profile: { fullName: "Lê Hoàng Long", entryIeltsScore: 6.0 } },
        },
      ],
    } as any;
  }
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

    // Kiểm tra trùng lịch giảng dạy của Giáo viên & Trợ giảng
    if (data.schedule) {
      const allStaffToAssign = [
        ...teachersToAssign.map((id) => ({ id, role: "TEACHER" })),
        ...tasToAssign.map((id) => ({ id, role: "TEACHING_ASSISTANT" })),
      ];

      for (const item of allStaffToAssign) {
        const existingAssignments = await prisma.classAssignment.findMany({
          where: {
            userId: item.id,
            class: { isActive: true },
          },
          include: {
            class: { include: { school: true } },
            staff: { include: { profile: true } },
          },
        });

        for (const ass of existingAssignments) {
          if (ass.class.description) {
            const isConflict = areSchedulesConflicting(
              data.schedule,
              ass.class.description,
              {
                start: data.startDate ? new Date(data.startDate) : null,
                end: data.endDate ? new Date(data.endDate) : null,
              },
              { start: ass.class.startDate, end: ass.class.endDate }
            );

            if (isConflict) {
              const staffName = ass.staff?.profile?.fullName || ass.staff?.username || "Nhân sự";
              const roleName = item.role === "TEACHER" ? "Giáo viên" : "Trợ giảng";
              return {
                success: false,
                error: `Xung đột lịch học: ${roleName} "${staffName}" đã có lịch tại lớp "${ass.class.name}" (${ass.class.description}) thuộc trường "${ass.class.school.name}", bị trùng với khung giờ lớp này (${data.schedule})!`,
              };
            }
          }
        }
      }

      // Kiểm tra trùng lịch của Quản nhiệm trường này với các trường khác mà Quản nhiệm đang phụ trách
      const targetSchool = await prisma.school.findUnique({
        where: { id: data.schoolId },
        include: { manager: { include: { profile: true } } },
      });
      if (targetSchool?.managerId) {
        const otherManagedSchools = await prisma.school.findMany({
          where: {
            managerId: targetSchool.managerId,
            id: { not: data.schoolId },
            isActive: true,
          },
          include: {
            classes: {
              where: { isActive: true },
              select: { id: true, name: true, code: true, description: true, startDate: true, endDate: true },
            },
          },
        });

        for (const otherSch of otherManagedSchools) {
          for (const otherCls of otherSch.classes) {
            if (otherCls.description) {
              const isConflict = areSchedulesConflicting(
                data.schedule,
                otherCls.description,
                {
                  start: data.startDate ? new Date(data.startDate) : null,
                  end: data.endDate ? new Date(data.endDate) : null,
                },
                { start: otherCls.startDate, end: otherCls.endDate }
              );
              if (isConflict) {
                const managerName =
                  targetSchool.manager?.profile?.fullName || targetSchool.manager?.username || "Quản nhiệm";
                return {
                  success: false,
                  error: `Xung đột lịch quản nhiệm: Quản nhiệm "${managerName}" của trường này đang quản lý trường "${otherSch.name}" có lớp "${otherCls.name}" (${otherCls.description}) trùng khung giờ với lớp mới (${data.schedule})! Một quản nhiệm không thể phụ trách 2 trường có lịch học trùng nhau.`,
                };
              }
            }
          }
        }
      }
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

    const currentClass = await prisma.class.findUnique({
      where: { id },
      include: {
        school: {
          include: { manager: { include: { profile: true } } },
        },
        assignments: true,
      },
    });

    if (!currentClass) {
      return { success: false, error: "Không tìm thấy lớp học!" };
    }

    const newSchedule = data.schedule !== undefined ? data.schedule : currentClass.description;
    const newStartDate =
      data.startDate !== undefined
        ? data.startDate
          ? new Date(data.startDate)
          : null
        : currentClass.startDate;
    const newEndDate =
      data.endDate !== undefined
        ? data.endDate
          ? new Date(data.endDate)
          : null
        : currentClass.endDate;

    const teacherIdsToCheck =
      data.teacherIds !== undefined
        ? data.teacherIds.filter(Boolean)
        : data.teacherId !== undefined
        ? data.teacherId
          ? [data.teacherId]
          : []
        : currentClass.assignments.filter((a) => a.roleInClass === "TEACHER").map((a) => a.userId);

    const taIdsToCheck =
      data.taIds !== undefined
        ? data.taIds.filter(Boolean)
        : data.taId !== undefined
        ? data.taId
          ? [data.taId]
          : []
        : currentClass.assignments
            .filter((a) => a.roleInClass === "TEACHING_ASSISTANT")
            .map((a) => a.userId);

    // Kiểm tra trùng lịch của Giáo viên & Trợ giảng với các lớp khác
    if (newSchedule) {
      const allStaff = [
        ...teacherIdsToCheck.map((tid) => ({ id: tid, role: "TEACHER" })),
        ...taIdsToCheck.map((taId) => ({ id: taId, role: "TEACHING_ASSISTANT" })),
      ];

      for (const item of allStaff) {
        const otherAssignments = await prisma.classAssignment.findMany({
          where: {
            userId: item.id,
            classId: { not: id },
            class: { isActive: true },
          },
          include: {
            class: { include: { school: true } },
            staff: { include: { profile: true } },
          },
        });

        for (const ass of otherAssignments) {
          if (ass.class.description) {
            const isConflict = areSchedulesConflicting(
              newSchedule,
              ass.class.description,
              { start: newStartDate, end: newEndDate },
              { start: ass.class.startDate, end: ass.class.endDate }
            );

            if (isConflict) {
              const staffName = ass.staff?.profile?.fullName || ass.staff?.username || "Nhân sự";
              const roleName = item.role === "TEACHER" ? "Giáo viên" : "Trợ giảng";
              return {
                success: false,
                error: `Xung đột lịch học: ${roleName} "${staffName}" đã có lịch tại lớp "${ass.class.name}" (${ass.class.description}) thuộc trường "${ass.class.school.name}", bị trùng với khung giờ lớp này (${newSchedule})!`,
              };
            }
          }
        }
      }

      // Kiểm tra trùng lịch của Quản nhiệm trường với các trường khác
      if (currentClass.school?.managerId) {
        const otherManagedSchools = await prisma.school.findMany({
          where: {
            managerId: currentClass.school.managerId,
            id: { not: currentClass.schoolId },
            isActive: true,
          },
          include: {
            classes: {
              where: { isActive: true },
              select: { id: true, name: true, code: true, description: true, startDate: true, endDate: true },
            },
          },
        });

        for (const otherSch of otherManagedSchools) {
          for (const otherCls of otherSch.classes) {
            if (otherCls.description) {
              const isConflict = areSchedulesConflicting(
                newSchedule,
                otherCls.description,
                { start: newStartDate, end: newEndDate },
                { start: otherCls.startDate, end: otherCls.endDate }
              );
              if (isConflict) {
                const managerName =
                  currentClass.school.manager?.profile?.fullName ||
                  currentClass.school.manager?.username ||
                  "Quản nhiệm";
                return {
                  success: false,
                  error: `Xung đột lịch quản nhiệm: Quản nhiệm "${managerName}" đang quản lý trường "${otherSch.name}" có lớp "${otherCls.name}" (${otherCls.description}) trùng khung giờ với lớp này (${newSchedule})! Một quản nhiệm không thể phụ trách 2 trường có lịch học trùng nhau.`,
                };
              }
            }
          }
        }
      }
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
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { school: true },
    });
    if (!cls || !cls.isActive) {
      return { success: false, error: "Lớp học không tồn tại hoặc đã ngừng hoạt động!" };
    }

    // Kiểm tra trùng lịch giảng dạy của nhân sự với các lớp khác
    if (cls.description) {
      const otherAssignments = await prisma.classAssignment.findMany({
        where: {
          userId,
          classId: { not: classId },
          class: { isActive: true },
        },
        include: {
          class: { include: { school: true } },
          staff: { include: { profile: true } },
        },
      });

      for (const ass of otherAssignments) {
        if (ass.class.description) {
          const isConflict = areSchedulesConflicting(
            cls.description,
            ass.class.description,
            { start: cls.startDate, end: cls.endDate },
            { start: ass.class.startDate, end: ass.class.endDate }
          );
          if (isConflict) {
            const roleName = roleInClass === "TEACHER" ? "Giáo viên" : "Trợ giảng";
            const staffName = ass.staff?.profile?.fullName || ass.staff?.username || "Nhân sự";
            return {
              success: false,
              error: `Xung đột lịch học: ${roleName} "${staffName}" đã có lịch tại lớp "${ass.class.name}" (${ass.class.description}) thuộc trường "${ass.class.school.name}", bị trùng với lớp này (${cls.description})!`,
            };
          }
        }
      }
    }

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
  if (!(await isDbAlive())) {
    const cls = (globalClassesStore.demoClasses || []).find((c) => c.id === classId);
    if (cls) {
      if (!cls.enrollments.some((e: any) => e.studentId === studentId)) {
        cls.enrollments.push({
          id: `en-${Date.now()}`,
          studentId,
          status: "STUDYING",
          student: {
            username: `HV_${studentId}`,
            email: `${studentId}@simpace.vn`,
            profile: { fullName: `Học viên mới (${studentId})`, entryIeltsScore: 6.0 },
          },
        });
        cls._count = { enrollments: cls.enrollments.length };
      }
    }
    safeRevalidate("/classes");
    return { success: true };
  }
  try {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        school: true,
        _count: { select: { enrollments: true } },
      },
    });
    if (!cls || !cls.isActive) {
      return { success: false, error: "Lớp học không tồn tại hoặc đã ngừng hoạt động!" };
    }
    if (cls._count.enrollments >= cls.capacity) {
      return { success: false, error: `Lớp học đã đạt sĩ số tối đa (${cls.capacity} học viên)!` };
    }

    // Kiểm tra trùng lịch học của Học sinh với các lớp đang theo học
    if (cls.description) {
      const otherEnrollments = await prisma.classEnrollment.findMany({
        where: {
          studentId,
          classId: { not: classId },
          class: { isActive: true },
        },
        include: {
          class: { include: { school: true } },
          student: { include: { profile: true } },
        },
      });

      for (const enr of otherEnrollments) {
        if (enr.class.description) {
          const isConflict = areSchedulesConflicting(
            cls.description,
            enr.class.description,
            { start: cls.startDate, end: cls.endDate },
            { start: enr.class.startDate, end: enr.class.endDate }
          );
          if (isConflict) {
            const studentName = enr.student?.profile?.fullName || enr.student?.username || "Học viên";
            return {
              success: false,
              error: `Xung đột lịch học: Học viên "${studentName}" đã đăng ký học tại lớp "${enr.class.name}" (${enr.class.description}) thuộc trường "${enr.class.school.name}", bị trùng khung giờ với lớp này (${cls.description})!`,
            };
          }
        }
      }
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
  if (!(await isDbAlive())) {
    const cls = (globalClassesStore.demoClasses || []).find((c) => c.id === classId);
    if (cls) {
      cls.enrollments = (cls.enrollments || []).filter((e: any) => e.studentId !== studentId);
      cls._count = { enrollments: cls.enrollments.length };
    }
    safeRevalidate("/classes");
    return { success: true };
  }
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
  if (!(await isDbAlive())) {
    return {
      success: true,
      students: [
        {
          id: "st-demo-3",
          username: "HV003",
          email: "hv003@simpace.vn",
          profile: { fullName: "Vũ Minh Anh", entryIeltsScore: 5.5, phone: "0912345678" },
          classEnrollments: [],
        },
        {
          id: "st-demo-4",
          username: "HV004",
          email: "hv004@simpace.vn",
          profile: { fullName: "Đặng Gia Huy", entryIeltsScore: 6.5, phone: "0987654321" },
          classEnrollments: [],
        },
      ],
    };
  }
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
  if (!(await isDbAlive())) {
    const curCls = (globalClassesStore.demoClasses || []).find((c) => c.id === currentClassId);
    const tgtCls = (globalClassesStore.demoClasses || []).find((c) => c.id === targetClassId);
    if (curCls && tgtCls) {
      const studentEnr = (curCls.enrollments || []).find((e: any) => e.studentId === studentId);
      if (studentEnr) {
        curCls.enrollments = curCls.enrollments.filter((e: any) => e.studentId !== studentId);
        curCls._count = { enrollments: curCls.enrollments.length };
        tgtCls.enrollments = tgtCls.enrollments || [];
        tgtCls.enrollments.push(studentEnr);
        tgtCls._count = { enrollments: tgtCls.enrollments.length };
      }
    }
    safeRevalidate("/classes");
    safeRevalidate("/schools");
    return {
      success: true,
      message: "Đã chuyển học viên sang lớp mới thành công!",
    };
  }
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

    // Kiểm tra trùng lịch học của Học sinh khi sang targetClass (với các lớp khác ngoài currentClassId)
    if (targetClass.description) {
      const otherEnrollments = await prisma.classEnrollment.findMany({
        where: {
          studentId,
          classId: { notIn: [currentClassId, targetClassId] },
          class: { isActive: true },
        },
        include: {
          class: { include: { school: true } },
          student: { include: { profile: true } },
        },
      });

      for (const enr of otherEnrollments) {
        if (enr.class.description) {
          const isConflict = areSchedulesConflicting(
            targetClass.description,
            enr.class.description,
            { start: targetClass.startDate, end: targetClass.endDate },
            { start: enr.class.startDate, end: enr.class.endDate }
          );
          if (isConflict) {
            const studentName = enr.student?.profile?.fullName || enr.student?.username || "Học viên";
            return {
              success: false,
              error: `Xung đột lịch học: Học viên "${studentName}" đã có lớp "${enr.class.name}" (${enr.class.description}) thuộc trường "${enr.class.school.name}", bị trùng khung giờ với lớp chuyển đến (${targetClass.description})!`,
            };
          }
        }
      }
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
  if (!(await isDbAlive())) {
    return {
      success: true,
      school: {
        id: schoolId || "demo-school-1",
        name: "THPT Trương Định",
        classes: (globalClassesStore.demoClasses || []).map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          capacity: c.capacity,
          enrollments: c.enrollments || [],
        })),
      },
    };
  }
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
  if (!(await isDbAlive())) {
    return {
      success: true,
      schoolName: "THPT Trương Định",
      schoolId: "demo-school-1",
      students: [
        {
          id: "st-demo-3",
          username: "HV003",
          email: "hv003@simpace.vn",
          profile: { fullName: "Vũ Minh Anh", entryIeltsScore: 5.5, phone: "0912345678" },
          classEnrollments: [{ class: { name: "IELTS Cơ bản - 10A2", schoolId: "demo-school-1" } }],
        },
        {
          id: "st-demo-4",
          username: "HV004",
          email: "hv004@simpace.vn",
          profile: { fullName: "Đặng Gia Huy", entryIeltsScore: 6.5, phone: "0987654321" },
          classEnrollments: [{ class: { name: "IELTS Cơ bản - 10A2", schoolId: "demo-school-1" } }],
        },
      ],
    };
  }
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


