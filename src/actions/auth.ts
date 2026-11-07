"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "@/lib/auth";
import { checkAuth, checkRole, ROLE_GROUPS } from "@/lib/permissions";
import {
  authenticateUserService,
  requestActivationOtpService,
  activateWithOtpService,
  activateAndChangePasswordService,
  requestPasswordResetOtpService,
  resetPasswordWithOtpService,
  changePasswordService,
  ensureDefaultAdminService,
} from "@/services/auth.service";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Vui lòng nhập đầy đủ thông tin đăng nhập!"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu!"),
});

const activateWithOtpSchema = z
  .object({
    userId: z.string().min(1, "Mã người dùng không hợp lệ!"),
    otp: z.string().trim().min(1, "Vui lòng nhập mã OTP!"),
    newPassword: z.string().min(6, "Mật khẩu mới phải có tối thiểu 6 ký tự!"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu!"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu không khớp!",
    path: ["confirmPassword"],
  });

const activateAndChangePasswordSchema = z
  .object({
    userId: z.string().min(1, "Mã người dùng không hợp lệ!"),
    oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại!"),
    newPassword: z.string().min(6, "Mật khẩu mới phải có tối thiểu 6 ký tự!"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu!"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu mới và xác nhận mật khẩu không khớp!",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z.object({
  userId: z.string().min(1, "Mã người dùng không hợp lệ!"),
  currentPassword: z.string().min(1, "Vui lòng nhập đầy đủ mật khẩu hiện tại!"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có tối thiểu 6 ký tự!"),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ!" };
  }

  const { identifier, password } = parsed.data;
  const result = await authenticateUserService(identifier, password);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const user = result.user;

  if (user.mustChangePassword) {
    return {
      success: true,
      mustChangePassword: true,
      userId: user.id,
      username: user.username,
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
      userId: user.id,
      username: user.username,
      fullName: user.profile?.fullName || user.username,
      email: user.email,
      role: user.role.code,
    },
  };
}

export async function requestActivationOtpAction(userId: string) {
  if (!userId) {
    return { success: false, error: "Mã người dùng không hợp lệ!" };
  }
  return await requestActivationOtpService(userId);
}

export async function activateWithOtpAction(params: {
  userId: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const parsed = activateWithOtpSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ!" };
  }

  const result = await activateWithOtpService({
    userId: parsed.data.userId,
    otp: parsed.data.otp,
    newPassword: parsed.data.newPassword,
  });

  if (!result.success || !result.user) {
    return { success: false, error: result.error || "Không thể kích hoạt tài khoản!" };
  }

  const user = result.user;
  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role.code,
    fullName: user.profile?.fullName || user.username,
    mustChangePassword: false,
  });

  await setSessionCookie(token);
  safeRevalidate("/");

  return {
    success: true,
    user: {
      id: user.id,
      userId: user.id,
      username: user.username,
      fullName: user.profile?.fullName || user.username,
      email: user.email,
      role: user.role.code,
    },
  };
}

export async function activateAndChangePasswordAction(formData: FormData) {
  const parsed = activateAndChangePasswordSchema.safeParse({
    userId: formData.get("userId"),
    oldPassword: formData.get("oldPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ!" };
  }

  const result = await activateAndChangePasswordService(
    parsed.data.userId,
    parsed.data.oldPassword,
    parsed.data.newPassword
  );

  if (!result.success || !result.user) {
    return { success: false, error: result.error || "Không thể kích hoạt tài khoản!" };
  }

  const user = result.user;
  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role.code,
    fullName: user.profile?.fullName || user.username,
    mustChangePassword: false,
  });

  await setSessionCookie(token);
  safeRevalidate("/");

  return { success: true };
}

export async function requestPasswordResetOtpAction(email: string) {
  if (!email || !email.trim()) {
    return { success: false, error: "Vui lòng nhập email!" };
  }
  return await requestPasswordResetOtpService(email);
}

export async function resetPasswordWithOtpAction(
  email: string,
  otp: string,
  newPassword: string
) {
  if (!email || !otp || !newPassword) {
    return { success: false, error: "Vui lòng nhập đầy đủ email, mã OTP và mật khẩu mới!" };
  }
  if (newPassword.length < 6) {
    return { success: false, error: "Mật khẩu mới phải có tối thiểu 6 ký tự!" };
  }
  return await resetPasswordWithOtpService(email, otp, newPassword);
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
  const session = await getSession();
  const auth = checkAuth(session, "Vui lòng đăng nhập để đổi mật khẩu!");
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  // Phân quyền: Chỉ được đổi mật khẩu của chính mình trừ khi là Quản trị viên (ADMIN)
  if (auth.session.userId !== userId && auth.session.role !== "ADMIN") {
    return { success: false, error: "Bạn không có quyền đổi mật khẩu của tài khoản khác!" };
  }

  const parsed = changePasswordSchema.safeParse({ userId, currentPassword, newPassword });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Dữ liệu không hợp lệ!" };
  }

  return await changePasswordService(
    parsed.data.userId,
    parsed.data.currentPassword,
    parsed.data.newPassword
  );
}

export async function ensureDefaultAdminAction(): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  const auth = checkRole(
    session,
    ROLE_GROUPS.ADMIN_ONLY,
    "Chỉ Quản trị viên hệ thống mới có quyền thực hiện thao tác này!"
  );
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }
  await ensureDefaultAdminService();
  return { success: true };
}
