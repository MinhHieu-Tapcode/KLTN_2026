import {
  allowOtpRequest,
  clearOtpFailures,
  generateOtp,
  isOtpLocked,
  OTP_COOLDOWN_MESSAGE,
  OTP_LOCKED_MESSAGE,
  recordOtpFailure,
} from "@/lib/otp-guard";
import { prisma, isDbAlive } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";
import { findDemoUserByIdentifier } from "./user.service";

export type AuthUserWithRoleAndProfile = {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordHash: string;
  role: {
    code: string;
    name: string;
  };
  profile: {
    fullName: string;
    phoneNumber?: string | null;
    avatarUrl?: string | null;
  } | null;
};

/**
 * Xác thực thông tin đăng nhập của người dùng qua email/username và mật khẩu (bcrypt).
 * Hỗ trợ fallback dữ liệu mẫu đa dạng trên môi trường Vercel khi CSDL offline.
 */
export async function authenticateUserService(
  identifier: string,
  plainPassword: string
): Promise<
  | { success: true; user: AuthUserWithRoleAndProfile }
  | { success: false; error: string }
> {
  const cleanIdentifier = identifier.trim();

  // 1. Thử xác thực với cơ sở dữ liệu PostgreSQL Prisma (hoặc Test Mock Stub)
  try {
    const user = (await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanIdentifier, mode: "insensitive" } },
          { username: { equals: cleanIdentifier, mode: "insensitive" } },
        ],
      },
      include: {
        role: true,
        profile: true,
      },
    })) as AuthUserWithRoleAndProfile | null;

    if (user) {
      if (!user.isActive) {
        return {
          success: false,
          error: "Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên!",
        };
      }

      const isPasswordValid = await verifyPassword(plainPassword, user.passwordHash);
      if (isPasswordValid) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (updateErr: any) {
          console.warn("[authenticateUserService] Không thể cập nhật lastLoginAt:", updateErr?.message);
        }
        return { success: true, user };
      } else {
        return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác!" };
      }
    }
  } catch (err: any) {
    console.warn("[authenticateUserService] Lỗi CSDL hoặc DB offline, chuyển tiếp sang Fallback Demo Users:", err?.message);
  }

  // 2. Fallback sang Demo Store (hỗ trợ Vercel không kết nối DB hoặc test offline với 15 tài khoản mẫu)
  const demoUser = findDemoUserByIdentifier(cleanIdentifier);
  if (demoUser) {
    if (!demoUser.isActive) {
      return {
        success: false,
        error: "Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên!",
      };
    }

    const isPasswordValid =
      plainPassword === "simpace2026" ||
      plainPassword === "password123" ||
      (demoUser.passwordHash ? await verifyPassword(plainPassword, demoUser.passwordHash) : false);

    if (isPasswordValid) {
      return {
        success: true,
        user: {
          id: demoUser.id,
          username: demoUser.username,
          email: demoUser.email,
          isActive: true,
          mustChangePassword: Boolean(demoUser.mustChangePassword),
          passwordHash:
            demoUser.passwordHash ||
            "$2a$10$kBQUZavMrSd7zY/VMpYOdeYWfzP5ZJ9QxQQ59Jncrlj2ytKSCtjhy",
          role: {
            code: demoUser.role.code,
            name: demoUser.role.name,
          },
          profile: {
            fullName: demoUser.profile?.fullName || demoUser.username,
            phoneNumber: demoUser.profile?.phoneNumber || null,
            avatarUrl: demoUser.profile?.avatarUrl || null,
          },
        },
      };
    }
  }

  return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác!" };
}

/**
 * Yêu cầu gửi mã OTP kích hoạt tài khoản qua email
 */
export async function requestActivationOtpService(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return { success: false, error: "Người dùng không tồn tại!" };
    }
    // Chỉ tài khoản đang chờ kích hoạt mới được cấp OTP kích hoạt
    if (!user.mustChangePassword) {
      return { success: false, error: "Tài khoản này đã được kích hoạt!" };
    }
    if (!allowOtpRequest(`activate:${user.id}`)) {
      return { success: false, error: OTP_COOLDOWN_MESSAGE };
    }

    // Dọn dẹp token đã hết hạn hoặc đã sử dụng
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt,
      },
    });

    const mailResult = await sendOtpEmail({
      to: user.email,
      fullName: user.profile?.fullName || user.username,
      otp,
      type: "activation",
    });

    return {
      success: true,
      email: user.email,
      mailResult,
    };
  } catch (error: any) {
    console.error("[requestActivationOtpService] Lỗi:", error);
    return { success: false, error: error.message || "Lỗi khi gửi mã OTP kích hoạt!" };
  }
}

/**
 * Xác nhận OTP và đặt mật khẩu mới lần đầu (kích hoạt)
 */
export async function activateWithOtpService(params: {
  userId: string;
  otp: string;
  newPassword: string;
}) {
  try {
    const { userId, otp, newPassword } = params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, profile: true },
    });

    if (!user) {
      return { success: false, error: "Mã OTP không chính xác hoặc đã hết hạn (15 phút)!" };
    }
    if (!user.mustChangePassword) {
      return { success: false, error: "Tài khoản này đã được kích hoạt!" };
    }
    const guardKey = `activate:${user.id}`;
    if (isOtpLocked(guardKey)) {
      return { success: false, error: OTP_LOCKED_MESSAGE };
    }

    const validToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: otp.trim(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!validToken) {
      recordOtpFailure(guardKey);
      return { success: false, error: "Mã OTP không chính xác hoặc đã hết hạn (15 phút)!" };
    }
    clearOtpFailures(guardKey);

    const newHash = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
      include: { role: true, profile: true },
    });

    await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      user: updatedUser,
    };
  } catch (error: any) {
    console.error("[activateWithOtpService] Lỗi:", error);
    return { success: false, error: error.message || "Không thể kích hoạt tài khoản!" };
  }
}

/**
 * Kích hoạt và đổi mật khẩu tạm thời thành mật khẩu mới
 */
export async function activateAndChangePasswordService(
  userId: string,
  oldPassword: string,
  newPassword: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, profile: true },
    });

    if (!user) {
      return { success: false, error: "Người dùng không tồn tại!" };
    }

    const isOldMatch = await verifyPassword(oldPassword, user.passwordHash);
    if (!isOldMatch) {
      return { success: false, error: "Mật khẩu hiện tại (tạm thời) không chính xác!" };
    }

    const newHash = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
      include: { role: true, profile: true },
    });

    return {
      success: true,
      user: updatedUser,
    };
  } catch (error: any) {
    console.error("[activateAndChangePasswordService] Lỗi:", error);
    return { success: false, error: error.message || "Không thể cập nhật mật khẩu!" };
  }
}

/**
 * Yêu cầu mã OTP khôi phục mật khẩu (quên mật khẩu)
 */
export async function requestPasswordResetOtpService(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      // Không tiết lộ email có tồn tại hay không
      return { success: true, mailResult: { sent: true } };
    }
    if (!allowOtpRequest(`reset:${user.id}`)) {
      return { success: false, error: OTP_COOLDOWN_MESSAGE };
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt,
      },
    });

    const mailResult = await sendOtpEmail({
      to: user.email,
      fullName: user.profile?.fullName || user.username,
      otp,
      type: "reset",
    });

    return {
      success: true,
      mailResult,
    };
  } catch (error: any) {
    console.error("[requestPasswordResetOtpService] Lỗi:", error);
    return { success: false, error: error.message || "Lỗi khi tạo mã khôi phục!" };
  }
}

/**
 * Xác thực OTP và đặt lại mật khẩu mới
 */
export async function resetPasswordWithOtpService(
  email: string,
  otp: string,
  newPassword: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return { success: false, error: "Mã OTP không đúng hoặc đã hết hạn!" };
    }
    const guardKey = `reset:${user.id}`;
    if (isOtpLocked(guardKey)) {
      return { success: false, error: OTP_LOCKED_MESSAGE };
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        token: otp.trim(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      recordOtpFailure(guardKey);
      return { success: false, error: "Mã OTP không đúng hoặc đã hết hạn!" };
    }
    clearOtpFailures(guardKey);

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return { success: true };
  } catch (error: any) {
    console.error("[resetPasswordWithOtpService] Lỗi:", error);
    return { success: false, error: error.message || "Không thể đặt lại mật khẩu!" };
  }
}

/**
 * Đổi mật khẩu tài khoản người dùng
 */
export async function changePasswordService(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Không tìm thấy người dùng!" };
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Mật khẩu hiện tại không chính xác!" };
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("[changePasswordService] Lỗi:", error);
    return { success: false, error: error.message || "Không thể đổi mật khẩu!" };
  }
}

/**
 * Đảm bảo tài khoản Quản trị viên mặc định tồn tại nếu hệ thống chưa có người dùng
 */
export async function ensureDefaultAdminService() {
  try {
    const adminCount = await prisma.user.count();
    if (adminCount === 0) {
      const adminRole = await prisma.role.findUnique({
        where: { code: "ADMIN" },
      });

      if (adminRole) {
        // Production bắt buộc cấu hình DEFAULT_ADMIN_PASSWORD, không dùng mật khẩu công khai trong mã nguồn
        const isProd = process.env.NODE_ENV === "production";
        const envPassword = process.env.DEFAULT_ADMIN_PASSWORD;
        if (isProd && (!envPassword || envPassword.length < 12)) {
          console.warn(
            "[ensureDefaultAdminService] Bỏ qua tạo Admin mặc định: cần đặt DEFAULT_ADMIN_PASSWORD (>= 12 ký tự) ở production."
          );
          return;
        }
        const defaultHash = await hashPassword(envPassword || "simpace2026");
        await prisma.user.create({
          data: {
            username: "admin",
            email: "admin@simpace.vn",
            passwordHash: defaultHash,
            roleId: adminRole.id,
            mustChangePassword: isProd,
            profile: {
              create: {
                fullName: "Quản trị viên Hệ thống",
                phoneNumber: "0987654321",
              },
            },
          },
        });
        console.log("✔ Đã tự động tạo tài khoản Admin mặc định: admin@simpace.vn");
      }
    }
  } catch (err: any) {
    console.warn("[ensureDefaultAdminService] Notice:", err?.message);
  }
}
