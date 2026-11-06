import { randomInt } from "crypto";

/**
 * Chống dò OTP (brute-force) và spam yêu cầu OTP.
 * LƯU Ý TRUNG THỰC: bộ đếm nằm trong bộ nhớ của tiến trình Node. Trên môi trường serverless (Vercel)
 * mỗi instance có bộ đếm riêng nên đây chỉ là lớp giảm thiểu, không phải giới hạn tuyệt đối.
 * Muốn giới hạn tuyệt đối cần lưu bộ đếm vào CSDL/Redis (cần thêm cột/bảng nên chưa làm).
 */
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

type Entry = { count: number; firstAt: number };
const g = globalThis as unknown as {
  __otpFailures?: Map<string, Entry>;
  __otpRequests?: Map<string, number>;
};
const failures = (g.__otpFailures ||= new Map<string, Entry>());
const requests = (g.__otpRequests ||= new Map<string, number>());

/** OTP 6 chữ số sinh bằng CSPRNG (thay cho Math.random). */
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export function isOtpLocked(key: string): boolean {
  const e = failures.get(key);
  if (!e) return false;
  if (Date.now() - e.firstAt > LOCK_WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return e.count >= MAX_FAILED_ATTEMPTS;
}

export function recordOtpFailure(key: string): void {
  const now = Date.now();
  const e = failures.get(key);
  if (!e || now - e.firstAt > LOCK_WINDOW_MS) {
    failures.set(key, { count: 1, firstAt: now });
  } else {
    e.count += 1;
  }
}

export function clearOtpFailures(key: string): void {
  failures.delete(key);
}

/** Trả true nếu được phép yêu cầu OTP mới (mỗi khóa tối đa 1 lần / 60 giây). */
export function allowOtpRequest(key: string): boolean {
  const now = Date.now();
  const last = requests.get(key);
  if (last && now - last < REQUEST_COOLDOWN_MS) return false;
  requests.set(key, now);
  return true;
}

export const OTP_LOCKED_MESSAGE = "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút!";
export const OTP_COOLDOWN_MESSAGE = "Vui lòng đợi 1 phút trước khi yêu cầu mã OTP mới!";
