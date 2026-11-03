/**
 * Tiện ích chuẩn hóa, bóc tách và kiểm tra xung đột lịch học (Schedule Conflict Checker)
 * Hỗ trợ các định dạng tiếng Việt:
 * - "Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00"
 * - "Thứ 3, Thứ 5, Thứ 7 • 17:30 - 19:30"
 * - "Thứ 2, Thứ 6 • 19:30 - 21:30"
 * - "Thứ 7, Chủ nhật • 08:00 - 10:00"
 * - "T2, T4, T6 • 18:00 - 20:00"
 */

export const DAY_LABEL_TO_NUMBER: Record<string, number> = {
  "Thứ 2": 2,
  "Thứ 3": 3,
  "Thứ 4": 4,
  "Thứ 5": 5,
  "Thứ 6": 6,
  "Thứ 7": 7,
  "Chủ nhật": 8,
};

export const NUMBER_TO_DAY_LABEL: Record<number, string> = {
  2: "Thứ 2",
  3: "Thứ 3",
  4: "Thứ 4",
  5: "Thứ 5",
  6: "Thứ 6",
  7: "Thứ 7",
  8: "Chủ nhật",
};

export interface ParsedSchedule {
  days: number[]; // 2: Thứ 2, 3: Thứ 3, ..., 7: Thứ 7, 8: Chủ nhật
  startTimeMinutes: number | null; // Phút trong ngày (ví dụ 18:00 = 1080)
  endTimeMinutes: number | null;   // Phút trong ngày (ví dụ 20:00 = 1200)
  raw: string;
}

export function parseSchedule(scheduleStr?: string | null): ParsedSchedule | null {
  if (!scheduleStr || !scheduleStr.trim()) return null;
  const raw = scheduleStr.trim();
  const lower = raw.toLowerCase();

  const daySet = new Set<number>();
  // Thứ 2 hoặc T2
  if (lower.includes("thứ 2") || lower.includes("thu 2") || lower.includes("thứ hai") || /\bt2\b/i.test(lower)) {
    daySet.add(2);
  }
  // Thứ 3 hoặc T3
  if (lower.includes("thứ 3") || lower.includes("thu 3") || lower.includes("thứ ba") || /\bt3\b/i.test(lower)) {
    daySet.add(3);
  }
  // Thứ 4 hoặc T4
  if (lower.includes("thứ 4") || lower.includes("thu 4") || lower.includes("thứ tư") || /\bt4\b/i.test(lower)) {
    daySet.add(4);
  }
  // Thứ 5 hoặc T5
  if (lower.includes("thứ 5") || lower.includes("thu 5") || lower.includes("thứ năm") || /\bt5\b/i.test(lower)) {
    daySet.add(5);
  }
  // Thứ 6 hoặc T6
  if (lower.includes("thứ 6") || lower.includes("thu 6") || lower.includes("thứ sáu") || /\bt6\b/i.test(lower)) {
    daySet.add(6);
  }
  // Thứ 7 hoặc T7
  if (lower.includes("thứ 7") || lower.includes("thu 7") || lower.includes("thứ bảy") || /\bt7\b/i.test(lower)) {
    daySet.add(7);
  }
  // Chủ nhật hoặc CN
  if (lower.includes("chủ nhật") || lower.includes("chu nhat") || /\bcn\b/i.test(lower)) {
    daySet.add(8);
  }

  // Bóc tách cú pháp viết tắt nhóm thứ: "Thứ 2, 4, 6", "Thứ 3, 5, 7", "T2, 4, 6", "Thứ 2,4,6", "Thứ 2 - 4 - 6"
  const groupRegex = /(?:thứ|thu|t)\s*([2-7](?:\s*[,&/-]\s*[2-7])+)/gi;
  let groupMatch: RegExpExecArray | null;
  while ((groupMatch = groupRegex.exec(lower)) !== null) {
    const digits = groupMatch[0].match(/[2-7]/g);
    if (digits) {
      for (const d of digits) {
        daySet.add(parseInt(d, 10));
      }
    }
  }

  const days = Array.from(daySet).sort((a, b) => a - b);

  let startTimeMinutes: number | null = null;
  let endTimeMinutes: number | null = null;

  // Regex tìm giờ: HH:MM hoặc HHhMM hoặc HH:MM - HH:MM
  const timeRegex = /(\d{1,2})[:h](\d{2})?\s*[-–—tođến]+\s*(\d{1,2})[:h](\d{2})?/i;
  const match = lower.match(timeRegex);
  if (match) {
    const startH = parseInt(match[1], 10);
    const startM = match[2] ? parseInt(match[2], 10) : 0;
    const endH = parseInt(match[3], 10);
    const endM = match[4] ? parseInt(match[4], 10) : 0;
    startTimeMinutes = startH * 60 + startM;
    endTimeMinutes = endH * 60 + endM;
  }

  return {
    days,
    startTimeMinutes,
    endTimeMinutes,
    raw,
  };
}

/**
 * Kiểm tra xem 2 lớp học có bị xung đột thời gian (trùng lịch) hay không
 */
export function areSchedulesConflicting(
  sched1Str?: string | null,
  sched2Str?: string | null,
  dateRange1?: { start?: Date | null; end?: Date | null },
  dateRange2?: { start?: Date | null; end?: Date | null }
): boolean {
  if (!sched1Str || !sched2Str) return false;

  // 1. Kiểm tra ngày khai giảng / bế giảng (nếu cả 2 đều có ngày bắt đầu và kết thúc)
  if (dateRange1?.start && dateRange1?.end && dateRange2?.start && dateRange2?.end) {
    const s1 = new Date(dateRange1.start).getTime();
    const e1 = new Date(dateRange1.end).getTime();
    const s2 = new Date(dateRange2.start).getTime();
    const e2 = new Date(dateRange2.end).getTime();
    if (e1 < s2 || e2 < s1) {
      return false; // Hai khóa học diễn ra ở 2 giai đoạn không giao nhau
    }
  }

  const slots1 = parseScheduleSlots(sched1Str);
  const slots2 = parseScheduleSlots(sched2Str);
  if (slots1.length === 0 || slots2.length === 0) return false;

  // 2. Hai lớp trùng nếu có ít nhất 1 buổi cùng thứ và giao nhau về giờ
  for (const a of slots1) {
    for (const b of slots2) {
      if (a.day !== b.day) continue;
      if (
        a.startMinutes !== null &&
        a.endMinutes !== null &&
        b.startMinutes !== null &&
        b.endMinutes !== null
      ) {
        if (Math.max(a.startMinutes, b.startMinutes) < Math.min(a.endMinutes, b.endMinutes)) {
          return true;
        }
      } else {
        // Cùng thứ nhưng 1 bên không ghi rõ giờ: coi như trùng (giữ quy tắc cũ)
        return true;
      }
    }
  }
  return false;
}

export interface ScheduleSlot {
  day: number; // 2..8 (8 = Chủ nhật)
  startMinutes: number | null;
  endMinutes: number | null;
}

/**
 * Tách chuỗi lịch học thành từng buổi (thứ + giờ).
 * - Định dạng mới (nhiều buổi, giờ khác nhau): "Thứ 2 • 18:00 - 20:00; Thứ 4 • 19:00 - 21:00"
 * - Định dạng cũ (không có dấu ';'): "Thứ 2, Thứ 4 • 18:00 - 20:00" -> mỗi thứ dùng chung 1 khung giờ
 */
export function parseScheduleSlots(scheduleStr?: string | null): ScheduleSlot[] {
  if (!scheduleStr || !scheduleStr.trim()) return [];
  const slots: ScheduleSlot[] = [];
  for (const group of scheduleStr.split(";")) {
    const parsed = parseSchedule(group);
    if (!parsed) continue;
    for (const day of parsed.days) {
      slots.push({
        day,
        startMinutes: parsed.startTimeMinutes,
        endMinutes: parsed.endTimeMinutes,
      });
    }
  }
  return slots;
}

/**
 * Kiểm tra hợp lệ chuỗi lịch học trước khi lưu lớp.
 * Trả về thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ (chuỗi rỗng cũng hợp lệ để giữ hành vi cũ).
 */
export function validateScheduleString(scheduleStr?: string | null): string | null {
  if (!scheduleStr || !scheduleStr.trim()) return null;
  const slots = parseScheduleSlots(scheduleStr);
  for (const slot of slots) {
    if (slot.startMinutes !== null && slot.endMinutes !== null && slot.endMinutes <= slot.startMinutes) {
      return "Giờ kết thúc của mỗi buổi học phải sau giờ bắt đầu!";
    }
  }
  const seen = new Set<string>();
  for (const slot of slots) {
    for (const other of slots) {
      if (slot === other || slot.day !== other.day) continue;
      if (
        slot.startMinutes !== null &&
        slot.endMinutes !== null &&
        other.startMinutes !== null &&
        other.endMinutes !== null &&
        Math.max(slot.startMinutes, other.startMinutes) < Math.min(slot.endMinutes, other.endMinutes)
      ) {
        const key = `${slot.day}`;
        if (!seen.has(key)) return "Các buổi học trong cùng một ngày không được trùng giờ nhau!";
      }
    }
  }
  return null;
}

/**
 * Kiểm tra xem một lớp học có lịch diễn ra vào một ngày cụ thể trong tuần hay không.
 * Hỗ trợ cả tên thứ ("Thứ 2", "Thứ 4", ...) và số thứ (2..8).
 */
export function isClassScheduledOnDay(
  scheduleStr?: string | null,
  dayNameOrNumber?: string | number
): boolean {
  if (!scheduleStr) return false;
  const targetDayNum =
    typeof dayNameOrNumber === "number"
      ? dayNameOrNumber
      : DAY_LABEL_TO_NUMBER[dayNameOrNumber || ""];

  const slots = parseScheduleSlots(scheduleStr);
  if (slots.length > 0 && targetDayNum) {
    return slots.some((s) => s.day === targetDayNum);
  }

  if (typeof dayNameOrNumber === "string") {
    return scheduleStr.toLowerCase().includes(dayNameOrNumber.toLowerCase());
  }
  return false;
}
