"use server";

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export async function loginAction(formData: FormData) {
  const identifier = formData.get("identifier")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!identifier || !password) {
    return { success: false, error: "Vui lòng nhập đầy đủ thông tin đăng nhập!" };
  }

  // Tìm người dùng theo Email HOẶC Username/Mã học viên
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { username: { equals: identifier, mode: "insensitive" } },
      ],
    },
    include: {
      role: true,
      profile: true,
    },
  });

  if (!user) {
    return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác!" };
  }

  if (!user.isActive) {
    return { success: false, error: "Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên!" };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác!" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  if (user.mustChangePassword) {
    return {
      success: true,
      mustChangePassword: true,
      userId: user.id,
      email: user.email,
      fullName: user.profile?.fullName || user.username,
      role: user.role.code,
    };
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role.code,
    fullName: user.profile?.fullName || user.username,
    mustChangePassword: false,
  });

  await setSessionCookie(token);

  return {
    success: true,
    mustChangePassword: false,
    role: user.role.code,
    user: {
      id: user.id,
      fullName: user.profile?.fullName || user.username,
      email: user.email,
      role: user.role.code,
    },
  };
}

// Luồng Kích hoạt tài khoản: Yêu cầu OTP gửi về email
export async function requestActivationOtpAction(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return { success: false, error: "Người dùng không tồn tại!" };
    }

    // Dọn dẹp token đã hết hạn hoặc đã sử dụng
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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
    return { success: false, error: error.message || "Lỗi khi gửi mã OTP kích hoạt!" };
  }
}

// Luồng Kích hoạt tài khoản: Xác nhận OTP + đổi mật khẩu mới + tự động đăng nhập vào trang chủ
export async function activateWithOtpAction(params: {
  userId: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  try {
    const { userId, otp, newPassword, confirmPassword } = params;

    if (!userId || !otp || !newPassword || !confirmPassword) {
      return { success: false, error: "Vui lòng nhập đầy đủ mã OTP và mật khẩu mới!" };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "Mật khẩu mới và xác nhận mật khẩu không khớp!" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, profile: true },
    });

    if (!user) {
      return { success: false, error: "Người dùng không tồn tại!" };
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
      return { success: false, error: "Mã OTP không chính xác hoặc đã hết hạn (15 phút)!" };
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

    await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });

    const token = await createSessionToken({
      userId: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role.code,
      fullName: updatedUser.profile?.fullName || updatedUser.username,
      mustChangePassword: false,
    });

    await setSessionCookie(token);
    safeRevalidate("/");

    return {
      success: true,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.profile?.fullName || updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role.code,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể kích hoạt tài khoản!" };
  }
}

export async function activateAndChangePasswordAction(formData: FormData) {
  const userId = formData.get("userId")?.toString();
  const oldPassword = formData.get("oldPassword")?.toString();
  const newPassword = formData.get("newPassword")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!userId || !oldPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "Vui lòng điền đầy đủ các trường thông tin!" };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Mật khẩu mới và xác nhận mật khẩu không khớp!" };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
  }

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

  const token = await createSessionToken({
    userId: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role.code,
    fullName: updatedUser.profile?.fullName || updatedUser.username,
    mustChangePassword: false,
  });

  await setSessionCookie(token);
  safeRevalidate("/");

  return { success: true };
}

// Luồng Quên mật khẩu: Yêu cầu OTP
export async function requestPasswordResetOtpAction(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      return { success: false, error: "Không tìm thấy tài khoản với email này!" };
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    // Vô hiệu hóa các OTP cũ
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
      demoOtp: otp, // Gửi về cho môi trường test để tiện trải nghiệm
      mailResult,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi tạo mã khôi phục!" };
  }
}

// Luồng Quên mật khẩu: Xác nhận OTP và đặt mật khẩu mới
export async function resetPasswordWithOtpAction(
  email: string,
  otp: string,
  newPassword: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return { success: false, error: "Người dùng không tồn tại!" };
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
      return { success: false, error: "Mã OTP không đúng hoặc đã hết hạn!" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
    }

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
    return { success: false, error: error.message || "Không thể đặt lại mật khẩu!" };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  safeRevalidate("/");
}

export async function changePasswordAction(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    if (!currentPassword || !newPassword) {
      return { success: false, error: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
    }

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
    return { success: false, error: error.message || "Không thể đổi mật khẩu!" };
  }
}

export async function ensureDefaultAdminAction() {
  const adminCount = await prisma.user.count();
  if (adminCount === 0) {
    const adminRole = await prisma.role.findUnique({
      where: { code: "ADMIN" },
    });

    if (adminRole) {
      const defaultHash = await hashPassword("simpace2026");
      await prisma.user.create({
        data: {
          username: "admin",
          email: "admin@simpace.vn",
          passwordHash: defaultHash,
          roleId: adminRole.id,
          mustChangePassword: false,
          profile: {
            create: {
              fullName: "Quản trị viên Hệ thống",
              phoneNumber: "0987654321",
            },
          },
        },
      });
      console.log("✔ Đã tự động tạo tài khoản Admin mặc định: admin@simpace.vn / simpace2026");
    }
  }
}
