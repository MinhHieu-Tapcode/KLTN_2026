import { randomInt } from "crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";
const SPECIAL = "@#$%";

/** Mật khẩu tạm ngẫu nhiên (CSPRNG), thay cho mật khẩu mặc định cố định "Simpace@2026". Dài 12 ký tự. */
export function generateTempPassword(): string {
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SPECIAL)];
  const all = UPPER + LOWER + DIGIT;
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
