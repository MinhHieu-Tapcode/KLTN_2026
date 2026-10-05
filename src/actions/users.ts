"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { RoleCode, Gender } from "@prisma/client";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export async function getUsersAction(roleFilter: string = "Tất cả") {
  const whereClause: any = { isActive: true };

  const roleMap: Record<string, RoleCode> = {
    "Quản trị viên": "ADMIN",
    "Quản nhiệm": "SCHOOL_MANAGER",
    "Giáo viên": "TEACHER",
    "Trợ giảng": "TEACHING_ASSISTANT",
    "Học sinh": "STUDENT",
  };

  if (roleFilter !== "Tất cả" && roleMap[roleFilter]) {
    whereClause.role = { code: roleMap[roleFilter] };
  }

  return prisma.user.findMany({
    where: whereClause,
    include: {
      role: true,
      profile: true,
      managedSchools: true,
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

import { sendAccountCreatedEmail } from "@/lib/mail";

export async function createUserAction(data: {
  fullName: string;
  email: string;
  roleCode: RoleCode;
  phoneNumber?: string;
  classId?: string;
}) {
  try {
    const cleanEmail = data.email.trim().toLowerCase();
    const role = await prisma.role.findUnique({
      where: { code: data.roleCode },
    });

    if (!role) {
      return { success: false, error: `Vai trò ${data.roleCode} không hợp lệ!` };
    }

    const defaultPassword = "Simpace@2026";
    const passwordHash = await hashPassword(defaultPassword);
    const username = cleanEmail.split("@")[0];

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

      // Tài khoản đã từng bị xóa -> Tái kích hoạt và cập nhật thông tin mới
      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          username,
          passwordHash,
          roleId: role.id,
          isActive: true,
          mustChangePassword: true,
          profile: {
            upsert: {
              create: {
                fullName: data.fullName.trim(),
                phoneNumber: data.phoneNumber || null,
              },
              update: {
                fullName: data.fullName.trim(),
                phoneNumber: data.phoneNumber || null,
              },
            },
          },
        },
        include: { profile: true, role: true },
      });

      // Nếu là Học sinh và có chọn lớp học
      if (data.classId && data.roleCode === "STUDENT") {
        await prisma.classEnrollment.upsert({
          where: {
            classId_studentId: {
              classId: data.classId,
              studentId: updatedUser.id,
            },
          },
          create: {
            classId: data.classId,
            studentId: updatedUser.id,
            status: "STUDYING",
          },
          update: {
            status: "STUDYING",
          },
        });
      }

      // Gửi email thông báo cấp lại / tái kích hoạt tài khoản
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
        user: updatedUser,
        tempPassword: defaultPassword,
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
          },
        },
      },
      include: { profile: true, role: true },
    });

    // Nếu là Học sinh và có chọn lớp học
    if (data.classId && data.roleCode === "STUDENT") {
      await prisma.classEnrollment.create({
        data: {
          classId: data.classId,
          studentId: newUser.id,
          status: "STUDYING",
        },
      });
    }

    // Gửi email thông báo cấp tài khoản mới
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

export async function updateUserAction(
  id: string,
  data: {
    fullName?: string;
    email?: string;
    username?: string;
    phoneNumber?: string;
    roleCode?: RoleCode;
    newPassword?: string;
  }
) {
  try {
    const updateUserData: any = {};

    // 1. Kiểm tra và cập nhật email
    if (data.email && data.email.trim()) {
      const cleanEmail = data.email.trim().toLowerCase();
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

    // 2. Kiểm tra và cập nhật username
    if (data.username && data.username.trim()) {
      const cleanUsername = data.username.trim().toLowerCase();
      const existingNameUser = await prisma.user.findFirst({
        where: { username: cleanUsername, id: { not: id } },
      });
      if (existingNameUser) {
        return {
          success: false,
          error: `Tên đăng nhập '${cleanUsername}' đã được sử dụng bởi tài khoản khác!`,
        };
      }
      updateUserData.username = cleanUsername;
    }

    // 3. Cập nhật vai trò
    if (data.roleCode) {
      const role = await prisma.role.findUnique({ where: { code: data.roleCode } });
      if (role) updateUserData.roleId = role.id;
    }

    // 4. Đặt lại mật khẩu mới nếu có nhập
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
              phoneNumber: data.phoneNumber,
            },
            update: {
              fullName: data.fullName,
              phoneNumber: data.phoneNumber,
            },
          },
        },
      },
    });

    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật người dùng!" };
  }
}

export async function deleteUserAction(id: string) {
  try {
    // Thử xóa sạch các liên kết phụ thuộc trước
    await prisma.classAssignment.deleteMany({ where: { userId: id } });
    await prisma.classEnrollment.deleteMany({ where: { studentId: id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: id } });
    await prisma.school.updateMany({ where: { managerId: id }, data: { managerId: null } });
    await prisma.userProfile.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    // Nếu có ràng buộc lịch sử (VD: ImportLog), chuyển sang xóa mềm
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    safeRevalidate("/users");
    return { success: true };
  }
}

export async function deleteMultipleUsersAction(ids: string[]) {
  try {
    await prisma.classAssignment.deleteMany({ where: { userId: { in: ids } } });
    await prisma.classEnrollment.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.school.updateMany({ where: { managerId: { in: ids } }, data: { managerId: null } });
    await prisma.userProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });

    safeRevalidate("/users");
    return { success: true };
  } catch (error: any) {
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });
    safeRevalidate("/users");
    return { success: true };
  }
}

// Cập nhật hồ sơ cá nhân (My Profile)
export async function updateProfileAction(
  userId: string,
  data: {
    fullName: string;
    username?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    avatarUrl?: string;
  }
) {
  try {
    if (data.username && data.username.trim()) {
      const cleanUsername = data.username.trim().toLowerCase();
      const existingUser = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });
      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: `Tên đăng nhập '${cleanUsername}' đã được sử dụng bởi tài khoản khác!`,
        };
      }

      await prisma.user.update({
        where: { id: userId },
        data: { username: cleanUsername },
      });
    }

    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: data.fullName.trim(),
        phoneNumber: data.phoneNumber || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        avatarUrl: data.avatarUrl || null,
      },
      update: {
        fullName: data.fullName.trim(),
        phoneNumber: data.phoneNumber || null,
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

      if (!emailRegex.test(email)) {
        errorRows.push({ stt, fullName, email, classCode, reason: "Email sai định dạng" });
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

export async function commitImportUsersAction(validRows: any[], fileName: string) {
  try {
    const studentRole = await prisma.role.findUnique({ where: { code: "STUDENT" } });
    if (!studentRole) throw new Error("Chưa có vai trò STUDENT trong hệ thống!");

    const adminUser = await prisma.user.findFirst({ where: { role: { code: "ADMIN" } } });
    const importedById = adminUser ? adminUser.id : (await prisma.user.findFirst())?.id || "";

    const defaultPassword = "Simpace@2026";
    const passwordHash = await hashPassword(defaultPassword);

    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        const username = row.email.split("@")[0];
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
