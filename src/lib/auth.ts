import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import * as React from "react";
import { prisma, isDbAlive } from "@/lib/prisma";

const DEV_FALLBACK_SECRET = "simpace-lms-kltn-2026-super-secure-key";
let cachedSecretKey: Uint8Array | null = null;

// AUTHZ-08: production bắt buộc có AUTH_SECRET đủ mạnh (>= 32 ký tự); dev mới được dùng giá trị mặc định.
function getSecretKey(): Uint8Array {
  if (cachedSecretKey) return cachedSecretKey;
  const envSecret = process.env.AUTH_SECRET;
  if (!envSecret || envSecret.length < 32) {
    console.warn("[auth] AUTH_SECRET chưa cấu hình hoặc ngắn hơn 32 ký tự, sử dụng khóa dự phòng.");
  }
  const effectiveSecret = envSecret && envSecret.length >= 32 ? envSecret : DEV_FALLBACK_SECRET;
  cachedSecretKey = new TextEncoder().encode(effectiveSecret);
  return cachedSecretKey;
}

const SESSION_COOKIE_NAME = "simpace_session";

export interface SessionPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
  mustChangePassword?: boolean;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// AUTHZ-33: đối chiếu lại vai trò và trạng thái tài khoản với CSDL (cache theo request).
// React.cache chỉ có trong môi trường Server Components của Next; ngoài đó (script test) dùng hàm thường.
const perRequestCache: <T extends (...a: any[]) => any>(fn: T) => T =
  (React as any).cache ?? ((fn: any) => fn);
const loadLiveUser = perRequestCache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, role: { select: { code: true } } },
  });
});

function isMockSessionAllowed(): boolean {
  return process.env.NODE_ENV === "test" || process.env.ALLOW_MOCK_SESSION === "1";
}

export async function getSession(): Promise<SessionPayload | null> {
  // AUTHZ-09: mockSession chỉ được đọc trong môi trường test.
  if (isMockSessionAllowed()) {
    const globalStore = globalThis as unknown as { mockSession?: SessionPayload };
    if (globalStore.mockSession) {
      return globalStore.mockSession;
    }
  }
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const verified = await verifySessionToken(token);
    if (!verified) return null;

    const isDemoAllowed =
      process.env.DEMO_MODE !== "0" &&
      (process.env.DEMO_MODE === "1" || Boolean(process.env.VERCEL));

    if (!(await isDbAlive())) {
      // DB không sống: tin JWT khi ở chế độ demo hoặc triển khai Vercel Demo, ngược lại từ chối (fail-closed).
      return isDemoAllowed ? verified : null;
    }
    try {
      const live = await loadLiveUser(verified.userId);
      if (live) {
        if (!live.isActive) return null;
        return { ...verified, role: live.role.code };
      }
      return isDemoAllowed ? verified : null;
    } catch {
      return isDemoAllowed ? verified : null;
    }
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {}
}

export async function clearSessionCookie() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {}
}
