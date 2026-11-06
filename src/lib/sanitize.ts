/**
 * Loại bỏ trường nhạy cảm trước khi trả dữ liệu về trình duyệt.
 * Prisma `include: { profile: true }` trên bảng User trả LUÔN cả `passwordHash`; server action serialize
 * toàn bộ kết quả xuống client nên băm mật khẩu của người khác nhìn thấy được trong tab Network.
 */
const SENSITIVE_KEYS = new Set(["passwordHash"]);

function isPlain(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function stripSensitive<T>(data: T): T {
  if (Array.isArray(data)) return data.map((x) => stripSensitive(x)) as unknown as T;
  if (isPlain(data)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = stripSensitive(v);
    }
    return out as T;
  }
  return data;
}

/**
 * Học viên chỉ được thấy tên + ảnh đại diện của bạn cùng lớp (không thấy email, số điện thoại, ngày sinh, địa chỉ).
 * Áp dụng cho danh sách ghi danh (`enrollments[].student`) trong dữ liệu lớp học.
 */
export function redactClassmatesForStudent<T>(data: T, viewerId: string): T {
  if (Array.isArray(data)) return data.map((x) => redactClassmatesForStudent(x, viewerId)) as unknown as T;
  if (!isPlain(data)) return data;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "enrollments" && Array.isArray(v)) {
      out[k] = v.map((en) => {
        if (!isPlain(en) || !isPlain(en.student) || en.student.id === viewerId || en.studentId === viewerId) return en;
        const st = en.student as Record<string, any>;
        return {
          ...en,
          student: {
            id: st.id,
            username: st.username,
            role: st.role,
            isActive: st.isActive,
            profile: st.profile ? { fullName: st.profile.fullName, avatarUrl: st.profile.avatarUrl } : null,
          },
        };
      });
    } else {
      out[k] = redactClassmatesForStudent(v, viewerId);
    }
  }
  return out as T;
}
