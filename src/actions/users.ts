"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { RoleCode, Gender, StaffClassRole } from "@prisma/client";
import { sendAccountCreatedEmail } from "@/lib/mail";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

// Chuẩn Regex RFC 5322 kiểm tra email hợp lệ bắt buộc có TLD
const RFC5322_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const ROLE_PREFIX_MAP: Record<RoleCode, string> = {
  ADMIN: "AD",
  SCHOOL_MANAGER: "QN",
  TEACHER: "GV",
  TEACHING_ASSISTANT: "TG",
  STUDENT: "HV",
};

// Hàm sinh mã tài khoản tuần tự theo vai trò (HV1001, GV1001, TG1001, QN1001, AD1001)
export async function generateUserCode(roleCode: RoleCode): Promise<string> {
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

// Lấy mã người dùng tiếp theo dự kiến cho Client Form Preview
export async function getNextUserCodeAction(roleCode: RoleCode) {
  const code = await generateUserCode(roleCode);
  return { success: true, code };
}

// Lấy danh sách người dùng với cơ chế phân quyền chặt chẽ (Scoping) & Lọc trạng thái Xóa mềm
export async function getUsersAction(
  roleFilter: string = "Tất cả",
  searchKeyword: string = "",
  statusFilter: "ACTIVE" | "INACTIVE" | "ALL" = "ACTIVE"
) {
  const session = await getSession();
  const whereClause: any = {};

  // Lọc theo trạng thái xóa mềm
  if (statusFilter === "ACTIVE") {
    whereClause.isActive = true;
  } else if (statusFilter === "INACTIVE") {
    whereClause.isActive = false;
  }

  // 1. Kiểm soát phân quyền Quản nhiệm (Strict Scoping - BUG_01)
  if (session?.role === "SCHOOL_MANAGER") {
    const managedSchools = await prisma.school.findMany({
      where: { managerId: session.userId, isActive: true },
      select: { id: true },
    });
    const schoolIds = managedSchools.map((s) => s.id);

    // Quản nhiệm KHÔNG ĐƯỢC thấy Admin và Quản nhiệm khác
    whereClause.role = {
      code: { in: ["TEACHER", "TEACHING_ASSISTANT", "STUDENT"] },
    };

    // Chỉ thấy GV, TA phụ trách lớp hoặc Học sinh thuộc trường của mình
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

  // 2. Lọc theo vai trò (Role Filter)
  const roleMap: Record<string, RoleCode> = {
    "Quản trị viên": "ADMIN",
    "Quản nhiệm": "SCHOOL_MANAGER",
    "Giáo viên": "TEACHER",
    "Trợ giảng": "TEACHING_ASSISTANT",
    "Học sinh": "STUDENT",
  };

  if (roleFilter !== "Tất cả" && roleMap[roleFilter]) {
    const targetRole = roleMap[roleFilter];
    // Nếu là Quản nhiệm cố chọn Admin/Quản nhiệm thì chặn
    if (
      session?.role === "SCHOOL_MANAGER" &&
      (targetRole === "ADMIN" || targetRole === "SCHOOL_MANAGER")
    ) {
      return [];
    }
    whereClause.role = { code: targetRole };
  }

  // 3. Tìm kiếm từ khóa tự động .trim() (BUG_11)
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

  return prisma.user.findMany({
    where: whereClause,
    include: {
      role: true,
      profile: true,
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
}

export async function getTeachersAction() {
  return prisma.user.findMany({
    where: { role: { code: "TEACHER" }, isActive: true },
    include: { profile: true },
    orderBy: { username: "asc" },
  });
}

export async function getTAsAction() {
  return prisma.user.findMany({
    where: { role: { code: "TEACHING_ASSISTANT" }, isActive: true },
    include: { profile: true },
    orderBy: { username: "asc" },
  });
}

// Tạo người dùng mới với cơ chế Role-First, RFC5322 validation, sinh mã tuần tự & gán đa nhiệm (+)
export async function createUserAction(data: {
  fullName: string;
  email: string;
  roleCode: RoleCode;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
  schoolIds?: string[]; // Dành cho Quản nhiệm (1 QN quản lý nhiều trường)
  classIds?: string[]; // Dành cho GV, TA hoặc Học sinh (gán nhiều lớp)
  extraInfo?: any;
}) {
  try {
    const cleanEmail = data.email.trim().toLowerCase();

    // 1. Kiểm tra định dạng Email RFC 5322 (BUG_17)
    if (!RFC5322_EMAIL_REGEX.test(cleanEmail)) {
      return {
        success: false,
        error:
          "Email không đúng định dạng chuẩn! Vui lòng nhập đúng định dạng (Ví dụ: name@simpace.edu.vn)",
      };
    }

    const role = await prisma.role.findUnique({
      where: { code: data.roleCode },
    });

    if (!role) {
      return { success: false, error: `Vai trò ${data.roleCode} không hợp lệ!` };
    }

    const defaultPassword = "Simpace@2026";
    const passwordHash = await hashPassword(defaultPassword);

    // 2. Tự động sinh mã người dùng chuẩn (HV1001, GV1001...) (BUG_08)
    const username = await generateUserCode(data.roleCode);

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

      // Tái kích hoạt tài khoản đã xóa mềm
      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          username: existing.username.startsWith(ROLE_PREFIX_MAP[data.roleCode] || "ND")
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
                address: data.address || null,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                gender: data.gender || null,
                extraInfo: data.extraInfo || null,
              },
              update: {
                fullName: data.fullName.trim(),
                phoneNumber: data.phoneNumber || null,
                address: data.address || null,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                gender: data.gender || null,
                extraInfo: data.extraInfo || null,
              },
            },
          },
        },
        include: { profile: true, role: true },
      });

      // Gán đa nhiệm theo vai trò
      await handleAssignments(updatedUser.id, data.roleCode, data.schoolIds, data.classIds);

      // Gửi email thông báo
      const mailResult = await sendAccountCreatedEmail({
        to: cleanEmail,
        fullName: data.fullName.trim(),
        username: updatedUser.username,
        tempPassword: defaultPassword,
        roleName: role.name,
      });

      safeRevalidate("/users");
      return {
        success: true,
        user: updatedUser,
        tempPassword: defaultPassword,
        mailResult,
      };
    }

    // Tạo mới tài khoản
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
            address: data.address || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            gender: data.gender || null,
            extraInfo: data.extraInfo || null,
          },
        },
      },
      include: { profile: true, role: true },
    });

    // Xử lý gán đa nhiệm
    await handleAssignments(newUser.id, data.roleCode, data.schoolIds, data.classIds);

    // Gửi email thông báo
    const mailResult = await sendAccountCreatedEmail({
      to: cleanEmail,
      fullName: data.fullName.trim(),
      username,
      tempPassword: defaultPassword,
      roleName: role.name,
    });

    safeRevalidate("/users");
    return {
      success: true,
      user: newUser,
      tempPassword: defaultPassword,
      mailResult,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo người dùng!" };
  }
}

// Xử lý gán đa nhiệm cho Quản nhiệm (Trường) hoặc GV/TA/Học sinh (Lớp)
async function handleAssignments(
  userId: string,
  roleCode: RoleCode,
  schoolIds?: string[],
  classIds?: string[]
) {
  // 1. Quản nhiệm: gán các trường phụ trách
  if (roleCode === "SCHOOL_MANAGER" && schoolIds && schoolIds.length > 0) {
    await prisma.school.updateMany({
      where: { id: { in: schoolIds } },
      data: { managerId: userId },
    });
  }

  // 2. Giáo viên: gán các lớp giảng dạy
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

  // 3. Trợ giảng: gán các lớp trợ giảng
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

  // 4. Học sinh: ghi danh vào các lớp học
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

// Cập nhật thông tin người dùng
export async function updateUserAction(
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
) {
  try {
    const updateUserData: any = {};

    // 1. Kiểm tra và cập nhật email RFC 5322
    if (data.email && data.email.trim()) {
      const cleanEmail = data.email.trim().toLowerCase();
      if (!RFC5322_EMAIL_REGEX.test(cleanEmail)) {
        return {
          success: false,
          error: "Email không đúng định dạng chuẩn có tên miền (VD: name@simpace.edu.vn)!",
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

    // 2. Cập nhật vai trò
    if (data.roleCode) {
      const role = await prisma.role.findUnique({ where: { code: data.roleCode } });
      if (role) updateUserData.roleId = role.id;
    }

    // 3. Đặt lại mật khẩu mới nếu có
    if (data.newPassword && data.newPassword.trim()) {
      if (data.newPassword.trim().length < 6) {
        return {
          success: false,
          error: "Mật khẩu mới phải có tối thiểu 6 ký tự!",
        };
      }
      updateUserData.passwordHash = await hashPassword(data.newPassword.trim());
      updateUserData.mustChangePassword = false;
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

    // 4. Đồng bộ gán trường cho Quản nhiệm nếu có cập nhật
    if (data.schoolIds !== undefined) {
      // Bỏ gán các trường cũ của quản nhiệm này
      await prisma.school.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });
      // Gán các trường mới
      if (data.schoolIds.length > 0) {
        await prisma.school.updateMany({
          where: { id: { in: data.schoolIds } },
          data: { managerId: id },
        });
      }
    }

    // 5. Đồng bộ gán lớp cho GV / TA nếu có cập nhật
    if (data.classIds !== undefined && data.roleCode) {
      if (data.roleCode === "TEACHER" || data.roleCode === "TEACHING_ASSISTANT") {
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

    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật người dùng!" };
  }
}

// Xóa mềm người dùng (isActive: false) - Tuyệt đối bảo vệ dữ liệu lịch sử (BUG_05)
export async function deleteUserAction(id: string) {
  try {
    const session = await getSession();
    if (session?.userId === id) {
      return { success: false, error: "Bạn không thể tự xóa tài khoản của chính mình!" };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!targetUser) {
      return { success: false, error: "Tài khoản không tồn tại!" };
    }

    if (targetUser.role.code === "ADMIN" && session?.role !== "ADMIN") {
      return { success: false, error: "Bạn không có quyền xóa tài khoản Quản trị viên!" };
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa người dùng!" };
  }
}

// Khôi phục tài khoản người dùng đã xóa mềm
export async function restoreUserAction(id: string) {
  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể khôi phục tài khoản!" };
  }
}

// Xóa mềm hàng loạt
export async function deleteMultipleUsersAction(ids: string[]) {
  try {
    const session = await getSession();
    const safeIds = ids.filter((id) => id !== session?.userId);

    await prisma.user.updateMany({
      where: { id: { in: safeIds } },
      data: { isActive: false },
    });

    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa các tài khoản đã chọn!" };
  }
}

// Cập nhật hồ sơ cá nhân (Chỉ cho phép cập nhật thông tin profile cá nhân, KHÔNG cho sửa username) (BUG_12)
export async function updateProfileAction(
  userId: string,
  data: {
    fullName: string;
    phoneNumber?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: Gender;
    avatarUrl?: string;
  }
) {
  try {
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

    safeRevalidate("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật hồ sơ cá nhân!" };
  }
}

// Phân tích và kiểm tra tính hợp lệ của File Excel (Validation & Preview)
export async function parseAndValidateExcelAction(fileBase64: string) {
  try {
    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawRows.length < 2) {
      return { success: false, error: "File Excel rỗng hoặc không đúng định dạng!" };
    }

    const activeClasses = await prisma.class.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    });
    const classMap = new Map<string, string>();
    activeClasses.forEach((c) => classMap.set(c.code.trim().toUpperCase(), c.id));

    const existingUsers = await prisma.user.findMany({ select: { email: true } });
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

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
        errorRows.push({ stt, fullName, email: "—", classCode, reason: "Thiếu địa chỉ email" });
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
        errorRows.push({ stt, fullName, email, classCode, reason: "Email bị trùng lặp trong file" });
        continue;
      }
      seenEmailsInFile.add(email);

      if (existingEmails.has(email)) {
        errorRows.push({ stt, fullName, email, classCode, reason: "Email đã tồn tại trên hệ thống" });
        continue;
      }

      if (!classCode) {
        errorRows.push({ stt, fullName, email, classCode: "—", reason: "Thiếu mã lớp học" });
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

// Lưu hàng loạt học viên từ Excel với mã sinh tự động HV...
export async function commitImportUsersAction(validRows: any[], fileName: string) {
  try {
    const studentRole = await prisma.role.findUnique({ where: { code: "STUDENT" } });
    if (!studentRole) throw new Error("Chưa có vai trò STUDENT trong hệ thống!");

    const adminUser = await prisma.user.findFirst({ where: { role: { code: "ADMIN" } } });
    const importedById = adminUser ? adminUser.id : (await prisma.user.findFirst())?.id || "";

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

    revalidatePath("/users");
    revalidatePath("/classes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi lưu dữ liệu học viên!" };
  }
}
