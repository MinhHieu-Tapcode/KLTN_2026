import { prisma, isDbAlive } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";
import { isAdmin, isSchoolManager } from "@/lib/permissions";
import * as XLSX from "xlsx";
import { RoleCode, Gender, StaffClassRole } from "@prisma/client";
import { sendAccountCreatedEmail } from "@/lib/mail";

const globalUsersStore = globalThis as unknown as {
  demoUsers?: any[];
};

if (!globalUsersStore.demoUsers) {
  globalUsersStore.demoUsers = [
    {
      id: "admin-demo-id",
      username: "admin",
      email: "admin@simpace.vn",
      role: { code: "ADMIN", name: "Quản trị viên" },
      profile: { fullName: "Quản trị viên Hệ thống", phoneNumber: "0987654321" },
      isActive: true,
      classAssignments: [],
      classEnrollments: [],
      managedSchools: [],
    },
    {
      id: "demo-manager-1",
      username: "manager_quan",
      email: "manager@simpace.vn",
      role: { code: "SCHOOL_MANAGER", name: "Quản nhiệm trường học" },
      profile: { fullName: "ThS. Hoàng Văn Quản", phoneNumber: "0981234567" },
      isActive: true,
      classAssignments: [],
      classEnrollments: [],
      managedSchools: [
        { id: "demo-school-1", name: "THPT Trương Định", code: "SCH_TD" },
      ],
    },
    {
      id: "demo-staff-1",
      username: "teacher_huong",
      email: "teacher@simpace.vn",
      role: { code: "TEACHER", name: "Giáo viên giảng dạy" },
      profile: { fullName: "Cô Nguyễn Thu Hường", phoneNumber: "0912345678" },
      isActive: true,
      classAssignments: [
        {
          id: "as-1",
          classId: "demo-class-1",
          class: {
            id: "demo-class-1",
            code: "IELTS_TD_01",
            name: "IELTS Bứt Phá - 10A1",
            school: { id: "demo-school-1", name: "THPT Trương Định", code: "SCH_TD" },
          },
        },
      ],
      classEnrollments: [],
      managedSchools: [],
    },
    {
      id: "demo-student-1",
      username: "HV1001",
      email: "student@simpace.vn",
      role: { code: "STUDENT", name: "Học viên" },
      profile: {
        fullName: "Nguyễn Văn An",
        phoneNumber: "0934567890",
        entryIeltsScore: 6.0,
        ieltsLevel: { id: "lvl-medium", name: "Trung bình", code: "MEDIUM" },
      },
      isActive: true,
      classAssignments: [],
      classEnrollments: [
        {
          id: "en-0",
          classId: "demo-class-1",
          class: {
            id: "demo-class-1",
            code: "IELTS_TD_01",
            name: "IELTS Bứt Phá - 10A1",
            school: { id: "demo-school-1", name: "THPT Trương Định", code: "SCH_TD" },
          },
        },
      ],
      managedSchools: [],
    },
    {
      id: "st-1",
      username: "HV1002",
      email: "lan.tran@gmail.com",
      role: { code: "STUDENT", name: "Học viên" },
      profile: {
        fullName: "Trần Thị Lan",
        phoneNumber: "0912345671",
        entryIeltsScore: 5.5,
        ieltsLevel: { id: "lvl-medium", name: "Trung bình", code: "MEDIUM" },
      },
      isActive: true,
      classAssignments: [],
      classEnrollments: [
        {
          id: "en-1",
          classId: "demo-class-1",
          class: {
            id: "demo-class-1",
            code: "IELTS_TD_01",
            name: "IELTS Bứt Phá - 10A1",
            school: { id: "demo-school-1", name: "THPT Trương Định", code: "SCH_TD" },
          },
        },
      ],
      managedSchools: [],
    },
    {
      id: "st-2",
      username: "HV1003",
      email: "long.le@gmail.com",
      role: { code: "STUDENT", name: "Học viên" },
      profile: {
        fullName: "Lê Hoàng Long",
        phoneNumber: "0912345672",
        entryIeltsScore: 6.5,
        ieltsLevel: { id: "lvl-advanced", name: "Nâng cao", code: "ADVANCED" },
      },
      isActive: true,
      classAssignments: [],
      classEnrollments: [
        {
          id: "en-2",
          classId: "demo-class-2",
          class: {
            id: "demo-class-2",
            code: "IELTS_KL_02",
            name: "IELTS Nền Tảng - 11B2",
            school: { id: "demo-school-2", name: "THPT Kim Liên", code: "SCH_KL" },
          },
        },
      ],
      managedSchools: [],
    },
  ];
}

const RFC5322_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ROLE_PREFIX_MAP: Record<RoleCode, string> = {
  ADMIN: "AD",
  SCHOOL_MANAGER: "QN",
  TEACHER: "GV",
  TEACHING_ASSISTANT: "TG",
  STUDENT: "HV",
};

export async function generateUserCodeService(roleCode: RoleCode): Promise<string> {
  if (!(await isDbAlive())) {
    const prefix = ROLE_PREFIX_MAP[roleCode] || "ND";
    const store = globalUsersStore.demoUsers || [];
    const count = store.filter((u: any) => u.role?.code === roleCode).length;
    let nextNum = 1001 + count;
    let candidate = `${prefix}${nextNum}`;
    while (store.some((u: any) => u.username === candidate)) {
      nextNum++;
      candidate = `${prefix}${nextNum}`;
    }
    return candidate;
  }
  const prefix = ROLE_PREFIX_MAP[roleCode] || "ND";
  const count = await prisma.user.count({
    where: { role: { code: roleCode } },
  });
  let nextNum = 1001 + count;
  let candidate = `${prefix}${nextNum}`;

  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    nextNum++;
    candidate = `${prefix}${nextNum}`;
  }
  return candidate;
}

export async function getUsersService(
  session: SessionPayload | null,
  roleFilter: string = "Tất cả",
  searchKeyword: string = "",
  statusFilter: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  if (!(await isDbAlive())) {
    let list = (globalUsersStore.demoUsers || []) as any[];
    if (statusFilter === "ACTIVE") list = list.filter((u) => u.isActive);
    else if (statusFilter === "INACTIVE") list = list.filter((u) => !u.isActive);

    const roleMap: Record<string, RoleCode> = {
      "Quản trị viên": "ADMIN",
      "Quản nhiệm": "SCHOOL_MANAGER",
      "Giáo viên": "TEACHER",
      "Trợ giảng": "TEACHING_ASSISTANT",
      "Học sinh": "STUDENT",
    };
    if (roleFilter !== "Tất cả" && roleMap[roleFilter]) {
      const targetRole = roleMap[roleFilter];
      list = list.filter((u) => u.role?.code === targetRole);
    }

    if (searchKeyword && searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.profile?.fullName?.toLowerCase().includes(q) ||
          u.profile?.phoneNumber?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  const whereClause: any = {};

  if (statusFilter === "ACTIVE") {
    whereClause.isActive = true;
  } else if (statusFilter === "INACTIVE") {
    whereClause.isActive = false;
  }

  if (isSchoolManager(session)) {
    const managedSchools = await prisma.school.findMany({
      where: { managerId: session.userId, isActive: true },
      select: { id: true },
    });
    const schoolIds = managedSchools.map((s) => s.id);

    whereClause.role = {
      code: { in: ["TEACHER", "TEACHING_ASSISTANT", "STUDENT"] },
    };

    whereClause.OR = [
      {
        classAssignments: {
          some: { class: { schoolId: { in: schoolIds } } },
        },
      },
      {
        classEnrollments: {
          some: { class: { schoolId: { in: schoolIds } } },
        },
      },
    ];
  }

  const roleMap: Record<string, RoleCode> = {
    "Quản trị viên": "ADMIN",
    "Quản nhiệm": "SCHOOL_MANAGER",
    "Giáo viên": "TEACHER",
    "Trợ giảng": "TEACHING_ASSISTANT",
    "Học sinh": "STUDENT",
  };

  if (roleFilter !== "Tất cả" && roleMap[roleFilter]) {
    const targetRole = roleMap[roleFilter];
    if (
      session?.role === "SCHOOL_MANAGER" &&
      (targetRole === "ADMIN" || targetRole === "SCHOOL_MANAGER")
    ) {
      return [];
    }
    whereClause.role = { code: targetRole };
  }

  if (searchKeyword && searchKeyword.trim()) {
    const cleanSearch = searchKeyword.trim();
    const searchConditions = [
      { username: { contains: cleanSearch, mode: "insensitive" } },
      { email: { contains: cleanSearch, mode: "insensitive" } },
      {
        profile: {
          fullName: { contains: cleanSearch, mode: "insensitive" },
        },
      },
      {
        profile: {
          phoneNumber: { contains: cleanSearch, mode: "insensitive" },
        },
      },
    ];

    if (whereClause.OR) {
      whereClause.AND = [{ OR: whereClause.OR }, { OR: searchConditions }];
      delete whereClause.OR;
    } else {
      whereClause.OR = searchConditions;
    }
  }

  try {
    return await prisma.user.findMany({
      where: whereClause,
      include: {
        role: true,
        profile: {
          include: { ieltsLevel: true },
        },
        managedSchools: true,
        classAssignments: {
          include: { class: { include: { school: true } } },
        },
        classEnrollments: {
          include: { class: { include: { school: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err: any) {
    console.warn("[getUsersService] DB offline fallback:", err?.message);
    return [];
  }
}

export async function getTeachersService() {
  if (!(await isDbAlive())) {
    return [
      {
        id: "teacher-1",
        username: "teacher1",
        email: "gv.nguyenvan@simpace.vn",
        role: { code: "TEACHER", name: "Giáo viên giảng dạy" },
        profile: { fullName: "ThS. Nguyễn Văn A", phoneNumber: "0901234567" },
      },
    ] as any;
  }
  try {
    return await prisma.user.findMany({
      where: { role: { code: "TEACHER" }, isActive: true },
      include: { profile: true },
      orderBy: { username: "asc" },
    });
  } catch (err: any) {
    console.warn("[getTeachersService] DB offline fallback:", err?.message);
    return [
      {
        id: "teacher-1",
        username: "teacher1",
        email: "gv.nguyenvan@simpace.vn",
        role: { code: "TEACHER", name: "Giáo viên giảng dạy" },
        profile: { fullName: "ThS. Nguyễn Văn A", phoneNumber: "0901234567" },
      },
    ] as any;
  }
}

export async function getTAsService() {
  if (!(await isDbAlive())) {
    return [
      {
        id: "ta-1",
        username: "ta_mai",
        email: "ta.mai@simpace.vn",
        role: { code: "TEACHING_ASSISTANT", name: "Trợ giảng" },
        profile: { fullName: "Vũ Phương Mai", phoneNumber: "0907654321" },
      },
    ] as any;
  }
  try {
    return await prisma.user.findMany({
      where: { role: { code: "TEACHING_ASSISTANT" }, isActive: true },
      include: { profile: true },
      orderBy: { username: "asc" },
    });
  } catch (err: any) {
    console.warn("[getTAsService] DB offline fallback:", err?.message);
    return [
      {
        id: "ta-1",
        username: "ta_mai",
        email: "ta.mai@simpace.vn",
        role: { code: "TEACHING_ASSISTANT", name: "Trợ giảng" },
        profile: { fullName: "Vũ Phương Mai", phoneNumber: "0907654321" },
      },
    ] as any;
  }
}

async function handleAssignments(
  userId: string,
  roleCode: RoleCode,
  schoolIds?: string[],
  classIds?: string[]
) {
  if (roleCode === "SCHOOL_MANAGER" && schoolIds && schoolIds.length > 0) {
    await prisma.school.updateMany({
      where: { id: { in: schoolIds } },
      data: { managerId: userId },
    });
  }

  if (roleCode === "TEACHER" && classIds && classIds.length > 0) {
    for (const classId of classIds) {
      if (!classId) continue;
      await prisma.classAssignment.upsert({
        where: { classId_userId: { classId, userId } },
        create: { classId, userId, roleInClass: "TEACHER" },
        update: { roleInClass: "TEACHER" },
      });
    }
  }

  if (roleCode === "TEACHING_ASSISTANT" && classIds && classIds.length > 0) {
    for (const classId of classIds) {
      if (!classId) continue;
      await prisma.classAssignment.upsert({
        where: { classId_userId: { classId, userId } },
        create: { classId, userId, roleInClass: "TEACHING_ASSISTANT" },
        update: { roleInClass: "TEACHING_ASSISTANT" },
      });
    }
  }

  if (roleCode === "STUDENT" && classIds && classIds.length > 0) {
    for (const classId of classIds) {
      if (!classId) continue;
      await prisma.classEnrollment.upsert({
        where: { classId_studentId: { classId, studentId: userId } },
        create: { classId, studentId: userId, status: "STUDYING" },
        update: { status: "STUDYING" },
      });
    }
  }
}

export async function createUserService(data: {
  fullName: string;
  email: string;
  roleCode: RoleCode;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
  schoolIds?: string[];
  classIds?: string[];
  extraInfo?: any;
  entryIeltsScore?: number;
  ieltsLevelId?: string;
}): Promise<{ success: boolean; error?: string; user?: any; mailResult?: any }> {
  try {
    const cleanEmail = data.email.trim().toLowerCase();

    if (!RFC5322_EMAIL_REGEX.test(cleanEmail)) {
      return {
        success: false,
        error:
          "Email không đúng định dạng chuẩn! Vui lòng nhập đúng định dạng (Ví dụ: name@simpace.edu.vn)",
      };
    }

    if (
      data.roleCode === "SCHOOL_MANAGER" &&
      (!data.schoolIds || data.schoolIds.filter(Boolean).length === 0)
    ) {
      return {
        success: false,
        error:
          "Quản nhiệm bắt buộc phải được phân công ít nhất 1 trường học phụ trách!",
      };
    }
    if (
      data.roleCode === "TEACHER" &&
      (!data.classIds || data.classIds.filter(Boolean).length === 0)
    ) {
      return {
        success: false,
        error:
          "Giáo viên bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!",
      };
    }
    if (
      data.roleCode === "TEACHING_ASSISTANT" &&
      (!data.classIds || data.classIds.filter(Boolean).length === 0)
    ) {
      return {
        success: false,
        error:
          "Trợ giảng bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!",
      };
    }

    if (!(await isDbAlive())) {
      const globalStore = globalThis as any;
      if (!globalStore.demoUsers) globalStore.demoUsers = [];
      const roleMap: Record<string, string> = {
        ADMIN: "Quản trị viên",
        SCHOOL_MANAGER: "Quản nhiệm",
        TEACHER: "Giáo viên",
        TEACHING_ASSISTANT: "Trợ giảng",
        STUDENT: "Học sinh",
      };

      const existing = globalStore.demoUsers.find(
        (u: any) => u.email?.toLowerCase() === cleanEmail
      );
      if (existing && existing.isActive) {
        return {
          success: false,
          error: `Email '${data.email}' đã tồn tại và đang hoạt động trong hệ thống!`,
        };
      }

      const nextCount =
        globalStore.demoUsers.filter(
          (u: any) => u.role?.code === data.roleCode
        ).length + 1;
      const prefix = ROLE_PREFIX_MAP[data.roleCode] || "ND";
      let username = `${prefix}${(1000 + nextCount).toString()}`;
      while (globalStore.demoUsers.some((u: any) => u.username === username)) {
        username = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const demoClasses = globalStore.demoClasses || [];
      const assignedEnrollments: any[] = [];
      const assignedStaffClasses: any[] = [];
      if (data.classIds && data.classIds.length > 0) {
        for (const cId of data.classIds) {
          const cls = demoClasses.find((c: any) => c.id === cId);
          if (cls) {
            if (data.roleCode === "STUDENT") {
              assignedEnrollments.push({
                id: `en-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                classId: cls.id,
                class: {
                  id: cls.id,
                  name: cls.name,
                  code: cls.code,
                  school: cls.school || { name: "Trường đối tác" },
                },
              });
            } else {
              assignedStaffClasses.push({
                id: `as-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                classId: cls.id,
                class: {
                  id: cls.id,
                  name: cls.name,
                  code: cls.code,
                  school: cls.school || { name: "Trường đối tác" },
                },
              });
            }
          }
        }
      }

      const demoSchools = globalStore.demoSchools || [];
      const managedSchools: any[] = [];
      if (data.schoolIds && data.schoolIds.length > 0) {
        for (const sId of data.schoolIds) {
          const sch = demoSchools.find((s: any) => s.id === sId);
          if (sch) managedSchools.push(sch);
        }
      }

      const newUser: any = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        username,
        email: cleanEmail,
        role: {
          code: data.roleCode,
          name: roleMap[data.roleCode] || data.roleCode,
        },
        isActive: true,
        profile: {
          fullName: data.fullName.trim(),
          phoneNumber: data.phoneNumber || null,
          address: data.roleCode === "STUDENT" ? null : data.address || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          entryIeltsScore:
            data.entryIeltsScore !== undefined
              ? Number(data.entryIeltsScore)
              : null,
          ieltsLevelId: data.ieltsLevelId || null,
        },
        classAssignments: assignedStaffClasses,
        classEnrollments: assignedEnrollments,
        managedSchools,
      };

      globalStore.demoUsers.unshift(newUser);

      return {
        success: true,
        user: newUser,
        mailResult: { sent: true },
      };
    }

    const role = await prisma.role.findUnique({
      where: { code: data.roleCode },
    });

    if (!role) {
      return {
        success: false,
        error: `Vai trò ${data.roleCode} không hợp lệ!`,
      };
    }

    const defaultPassword = "Simpace@2026";
    const passwordHash = await hashPassword(defaultPassword);

    const username = await generateUserCodeService(data.roleCode);

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (existing) {
      if (existing.isActive) {
        return {
          success: false,
          error: `Email '${data.email}' đã tồn tại và đang hoạt động trong hệ thống!`,
        };
      }

      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          username: existing.username.startsWith(
            ROLE_PREFIX_MAP[data.roleCode] || "ND"
          )
            ? existing.username
            : username,
          passwordHash,
          roleId: role.id,
          isActive: true,
          mustChangePassword: true,
          profile: {
            upsert: {
              create: {
                fullName: data.fullName.trim(),
                phoneNumber: data.phoneNumber || null,
                address:
                  data.roleCode === "STUDENT" ? null : data.address || null,
                dateOfBirth: data.dateOfBirth
                  ? new Date(data.dateOfBirth)
                  : null,
                gender: data.gender || null,
                extraInfo: data.extraInfo || null,
                entryIeltsScore:
                  data.entryIeltsScore !== undefined
                    ? Number(data.entryIeltsScore)
                    : null,
                ieltsLevelId: data.ieltsLevelId || null,
              },
              update: {
                fullName: data.fullName.trim(),
                phoneNumber: data.phoneNumber || null,
                address:
                  data.roleCode === "STUDENT" ? null : data.address || null,
                dateOfBirth: data.dateOfBirth
                  ? new Date(data.dateOfBirth)
                  : null,
                gender: data.gender || null,
                extraInfo: data.extraInfo || null,
                entryIeltsScore:
                  data.entryIeltsScore !== undefined
                    ? Number(data.entryIeltsScore)
                    : null,
                ieltsLevelId: data.ieltsLevelId || null,
              },
            },
          },
        },
        include: { profile: { include: { ieltsLevel: true } }, role: true },
      });

      await handleAssignments(
        updatedUser.id,
        data.roleCode,
        data.schoolIds,
        data.classIds
      );

      const mailResult = await sendAccountCreatedEmail({
        to: cleanEmail,
        fullName: data.fullName.trim(),
        username: updatedUser.username,
        tempPassword: defaultPassword,
        roleName: role.name,
      });

      return {
        success: true,
        user: updatedUser,
        mailResult,
      };
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        email: cleanEmail,
        passwordHash,
        roleId: role.id,
        mustChangePassword: true,
        profile: {
          create: {
            fullName: data.fullName.trim(),
            phoneNumber: data.phoneNumber || null,
            address: data.roleCode === "STUDENT" ? null : data.address || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            gender: data.gender || null,
            extraInfo: data.extraInfo || null,
            entryIeltsScore:
              data.entryIeltsScore !== undefined
                ? Number(data.entryIeltsScore)
                : null,
            ieltsLevelId: data.ieltsLevelId || null,
          },
        },
      },
      include: { profile: { include: { ieltsLevel: true } }, role: true },
    });

    await handleAssignments(
      newUser.id,
      data.roleCode,
      data.schoolIds,
      data.classIds
    );

    const mailResult = await sendAccountCreatedEmail({
      to: cleanEmail,
      fullName: data.fullName.trim(),
      username,
      tempPassword: defaultPassword,
      roleName: role.name,
    });

    return {
      success: true,
      user: newUser,
      mailResult,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể tạo người dùng!",
    };
  }
}

export async function updateUserService(
  id: string,
  data: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: Gender;
    roleCode?: RoleCode;
    newPassword?: string;
    schoolIds?: string[];
    classIds?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateUserData: any = {};

    if (data.email && data.email.trim()) {
      const cleanEmail = data.email.trim().toLowerCase();
      if (!RFC5322_EMAIL_REGEX.test(cleanEmail)) {
        return {
          success: false,
          error:
            "Email không đúng định dạng chuẩn có tên miền (VD: name@simpace.edu.vn)!",
        };
      }
      const existingEmailUser = await prisma.user.findFirst({
        where: { email: cleanEmail, id: { not: id } },
      });
      if (existingEmailUser) {
        return {
          success: false,
          error: `Email '${cleanEmail}' đã được sử dụng bởi người dùng khác!`,
        };
      }
      updateUserData.email = cleanEmail;
    }

    if (data.roleCode) {
      const role = await prisma.role.findUnique({
        where: { code: data.roleCode },
      });
      if (role) updateUserData.roleId = role.id;
    }

    if (data.newPassword && data.newPassword.trim()) {
      return {
        success: false,
        error:
          "Quy định bảo mật: Quản trị viên không được phép đổi mật khẩu của tài khoản khác! Người dùng phải tự đổi mật khẩu qua trang Cá nhân hoặc kích hoạt lại qua Email.",
      };
    }

    await prisma.user.update({
      where: { id },
      data: {
        ...updateUserData,
        profile: {
          upsert: {
            create: {
              fullName: data.fullName || "Người dùng",
              phoneNumber: data.phoneNumber || null,
              address: data.address || null,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
              gender: data.gender || null,
            },
            update: {
              fullName: data.fullName,
              phoneNumber: data.phoneNumber || null,
              address: data.address || null,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
              gender: data.gender || null,
            },
          },
        },
      },
    });

    if (data.schoolIds !== undefined) {
      await prisma.school.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });
      if (data.schoolIds.length > 0) {
        await prisma.school.updateMany({
          where: { id: { in: data.schoolIds } },
          data: { managerId: id },
        });
      }
    }

    if (data.classIds !== undefined && data.roleCode) {
      if (
        data.roleCode === "TEACHER" ||
        data.roleCode === "TEACHING_ASSISTANT"
      ) {
        await prisma.classAssignment.deleteMany({ where: { userId: id } });
        for (const classId of data.classIds) {
          if (!classId) continue;
          await prisma.classAssignment.create({
            data: {
              classId,
              userId: id,
              roleInClass: data.roleCode as StaffClassRole,
            },
          });
        }
      } else if (data.roleCode === "STUDENT") {
        await prisma.classEnrollment.deleteMany({ where: { studentId: id } });
        for (const classId of data.classIds) {
          if (!classId) continue;
          await prisma.classEnrollment.create({
            data: {
              classId,
              studentId: id,
              status: "STUDYING",
            },
          });
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể cập nhật người dùng!",
    };
  }
}

function softDeleteInMemoryUsers(ids: string[]) {
  const globalStore = globalThis as any;
  const idSet = new Set(ids);
  let modifiedCount = 0;

  if (Array.isArray(globalStore.demoUsers)) {
    for (const u of globalStore.demoUsers) {
      if (idSet.has(u.id) && u.isActive !== false) {
        u.isActive = false;
        modifiedCount++;
      }
    }
  }

  if (Array.isArray(globalStore.demoClasses)) {
    for (const cls of globalStore.demoClasses) {
      if (Array.isArray(cls.enrollments)) {
        const beforeLen = cls.enrollments.length;
        cls.enrollments = cls.enrollments.filter(
          (en: any) => !idSet.has(en.studentId)
        );
        if (cls.enrollments.length !== beforeLen) {
          cls._count = {
            ...(cls._count || {}),
            enrollments: cls.enrollments.length,
          };
        }
      }
      if (Array.isArray(cls.assignments)) {
        cls.assignments = cls.assignments.filter(
          (as: any) => !idSet.has(as.userId)
        );
      }
    }
  }

  return modifiedCount;
}

export async function deleteUserService(
  session: SessionPayload,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (session?.userId === id) {
      return {
        success: false,
        error: "Bạn không thể tự xóa tài khoản của chính mình!",
      };
    }

    const demoList = (globalUsersStore.demoUsers || []) as any[];
    const demoTarget = demoList.find((u: any) => u.id === id);
    if (demoTarget) {
      if (demoTarget.role?.code === "ADMIN" && !isAdmin(session)) {
        return {
          success: false,
          error: "Bạn không có quyền xóa tài khoản Quản trị viên!",
        };
      }
      if (
        demoTarget.role?.code === "SCHOOL_MANAGER" &&
        isSchoolManager(session)
      ) {
        return {
          success: false,
          error: "Quản nhiệm không có quyền xóa tài khoản Quản nhiệm khác!",
        };
      }
      softDeleteInMemoryUsers([id]);
    }

    if (!(await isDbAlive())) {
      if (!demoTarget) {
        return { success: false, error: "Tài khoản không tồn tại!" };
      }
      return { success: true };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: { select: { code: true } },
      },
    });

    if (!targetUser) {
      if (demoTarget) {
        return { success: true };
      }
      return { success: false, error: "Tài khoản không tồn tại!" };
    }

    if (targetUser.role?.code === "ADMIN" && !isAdmin(session)) {
      return {
        success: false,
        error: "Bạn không có quyền xóa tài khoản Quản trị viên!",
      };
    }
    if (
      targetUser.role?.code === "SCHOOL_MANAGER" &&
      isSchoolManager(session)
    ) {
      return {
        success: false,
        error: "Quản nhiệm không có quyền xóa tài khoản Quản nhiệm khác!",
      };
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể xóa người dùng!",
    };
  }
}

export async function restoreUserService(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể khôi phục tài khoản!",
    };
  }
}

export async function deleteMultipleUsersService(
  session: SessionPayload,
  ids: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const safeIds = ids.filter((id) => id !== session?.userId);
    if (safeIds.length === 0) {
      return { success: false, error: "Không có tài khoản hợp lệ để xóa!" };
    }

    const demoList = (globalUsersStore.demoUsers || []) as any[];
    const allowedDemoIds = demoList
      .filter((u: any) => {
        if (!safeIds.includes(u.id)) return false;
        if (u.role?.code === "ADMIN") return false;
        if (isSchoolManager(session) && u.role?.code === "SCHOOL_MANAGER")
          return false;
        return true;
      })
      .map((u: any) => u.id);

    if (allowedDemoIds.length > 0) {
      softDeleteInMemoryUsers(allowedDemoIds);
    }

    if (!(await isDbAlive())) {
      return { success: true };
    }

    const blockedRoles: RoleCode[] = isSchoolManager(session)
      ? ["ADMIN", "SCHOOL_MANAGER"]
      : ["ADMIN"];

    await prisma.user.updateMany({
      where: {
        id: { in: safeIds },
        role: { code: { notIn: blockedRoles } },
      },
      data: { isActive: false },
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể xóa các tài khoản đã chọn!",
    };
  }
}

export async function updateProfileService(
  userId: string,
  data: {
    fullName: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: Gender;
    avatarUrl?: string;
  }
): Promise<{ success: boolean; error?: string; cleanEmail?: string }> {
  try {
    let cleanEmail: string | undefined = undefined;

    if (data.email && data.email.trim()) {
      cleanEmail = data.email.trim().toLowerCase();
      if (!RFC5322_EMAIL_REGEX.test(cleanEmail)) {
        return {
          success: false,
          error:
            "Email không đúng định dạng chuẩn có tên miền (VD: name@simpace.edu.vn)!",
        };
      }

      const existingEmail = await prisma.user.findFirst({
        where: { email: cleanEmail, id: { not: userId } },
      });
      if (existingEmail) {
        return {
          success: false,
          error: `Email '${cleanEmail}' đã được sử dụng bởi một tài khoản khác trong hệ thống!`,
        };
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email: cleanEmail },
      });
    }

    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: data.fullName.trim(),
        phoneNumber: data.phoneNumber || null,
        address: data.address || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        avatarUrl: data.avatarUrl || null,
      },
      update: {
        fullName: data.fullName.trim(),
        phoneNumber: data.phoneNumber || null,
        address: data.address || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        avatarUrl: data.avatarUrl || null,
      },
    });

    return { success: true, cleanEmail };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Không thể cập nhật hồ sơ cá nhân!",
    };
  }
}

export async function parseAndValidateExcelService(fileBase64: string): Promise<{
  success: boolean;
  error?: string;
  totalRows?: number;
  validCount?: number;
  errorCount?: number;
  validRows?: any[];
  errorRows?: any[];
}> {
  try {
    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawRows.length < 2) {
      return {
        success: false,
        error: "File Excel rỗng hoặc không đúng định dạng!",
      };
    }

    const activeClasses = await prisma.class.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    });
    const classMap = new Map<string, string>();
    activeClasses.forEach((c) => classMap.set(c.code.trim().toUpperCase(), c.id));

    const existingUsers = await prisma.user.findMany({
      select: { email: true },
    });
    const existingEmails = new Set(
      existingUsers.map((u) => u.email.toLowerCase())
    );

    const validRows: any[] = [];
    const errorRows: any[] = [];
    const seenEmailsInFile = new Set<string>();

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0 || !row[1]) continue;

      const stt = row[0] || i;
      const fullName = (row[1] || "").toString().trim();
      const email = (row[2] || "").toString().trim().toLowerCase();
      const classCode = (row[3] || "").toString().trim().toUpperCase();
      const phoneNumber = (row[4] || "").toString().trim();
      const dateOfBirth = (row[5] || "").toString().trim();
      const gender = (row[6] || "").toString().trim();

      if (!email) {
        errorRows.push({
          stt,
          fullName,
          email: "—",
          classCode,
          reason: "Thiếu địa chỉ email",
        });
        continue;
      }

      if (!RFC5322_EMAIL_REGEX.test(email)) {
        errorRows.push({
          stt,
          fullName,
          email,
          classCode,
          reason: "Email sai định dạng (thiếu tên miền hợp lệ)",
        });
        continue;
      }

      if (seenEmailsInFile.has(email)) {
        errorRows.push({
          stt,
          fullName,
          email,
          classCode,
          reason: "Email bị trùng lặp trong file",
        });
        continue;
      }
      seenEmailsInFile.add(email);

      if (existingEmails.has(email)) {
        errorRows.push({
          stt,
          fullName,
          email,
          classCode,
          reason: "Email đã tồn tại trên hệ thống",
        });
        continue;
      }

      if (!classCode) {
        errorRows.push({
          stt,
          fullName,
          email,
          classCode: "—",
          reason: "Thiếu mã lớp học",
        });
        continue;
      }

      if (!classMap.has(classCode)) {
        errorRows.push({
          stt,
          fullName,
          email,
          classCode,
          reason: `Mã lớp '${classCode}' không tồn tại trên hệ thống`,
        });
        continue;
      }

      validRows.push({
        fullName,
        email,
        classCode,
        classId: classMap.get(classCode),
        phoneNumber,
        dateOfBirth,
        gender,
      });
    }

    return {
      success: true,
      totalRows: rawRows.length - 1,
      validCount: validRows.length,
      errorCount: errorRows.length,
      validRows,
      errorRows,
    };
  } catch (error: any) {
    return { success: false, error: "Lỗi đọc file Excel: " + error.message };
  }
}

export async function commitImportUsersService(
  validRows: any[],
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studentRole = await prisma.role.findUnique({
      where: { code: "STUDENT" },
    });
    if (!studentRole) throw new Error("Chưa có vai trò STUDENT trong hệ thống!");

    const adminUser = await prisma.user.findFirst({
      where: { role: { code: "ADMIN" } },
    });
    const importedById = adminUser
      ? adminUser.id
      : (await prisma.user.findFirst())?.id || "";

    const defaultPassword = "Simpace@2026";
    const passwordHash = await hashPassword(defaultPassword);

    let currentStudentCount = await prisma.user.count({
      where: { role: { code: "STUDENT" } },
    });

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        currentStudentCount++;
        let username = `HV${(1000 + currentStudentCount).toString()}`;
        while (await tx.user.findUnique({ where: { username } })) {
          currentStudentCount++;
          username = `HV${(1000 + currentStudentCount).toString()}`;
        }

        const user = await tx.user.create({
          data: {
            username,
            email: row.email,
            passwordHash,
            roleId: studentRole.id,
            mustChangePassword: true,
            profile: {
              create: {
                fullName: row.fullName,
                phoneNumber: row.phoneNumber || null,
              },
            },
          },
        });

        await tx.classEnrollment.create({
          data: {
            classId: row.classId,
            studentId: user.id,
            status: "STUDYING",
          },
        });
      }

      await tx.importLog.create({
        data: {
          importedById,
          fileName,
          totalRows: validRows.length,
          successCount: validRows.length,
          errorCount: 0,
        },
      });
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Lỗi khi lưu dữ liệu học viên!",
    };
  }
}
