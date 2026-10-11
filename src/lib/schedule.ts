/**
 * Tiện ích chuẩn hóa, bóc tách và kiểm tra xung đột lịch học (Schedule Conflict Checker)
 * Hỗ trợ các định dạng tiếng Việt:
 * - "Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00"
 * - "Thứ 3, Thứ 5, Thứ 7 • 17:30 - 19:30"
 * - "Thứ 2, Thứ 6 • 19:30 - 21:30"
 * - "Thứ 7, Chủ nhật • 08:00 - 10:00"
 * - "T2, T4, T6 • 18:00 - 20:00"
 */

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

  const days: number[] = [];
  // Thứ 2 hoặc T2
  if (lower.includes("thứ 2") || lower.includes("thu 2") || lower.includes("thứ hai") || /\bt2\b/i.test(lower)) {
    days.push(2);
  }
  // Thứ 3 hoặc T3
  if (lower.includes("thứ 3") || lower.includes("thu 3") || lower.includes("thứ ba") || /\bt3\b/i.test(lower)) {
    days.push(3);
  }
  // Thứ 4 hoặc T4
  if (lower.includes("thứ 4") || lower.includes("thu 4") || lower.includes("thứ tư") || /\bt4\b/i.test(lower)) {
    days.push(4);
  }
  // Thứ 5 hoặc T5
  if (lower.includes("thứ 5") || lower.includes("thu 5") || lower.includes("thứ năm") || /\bt5\b/i.test(lower)) {
    days.push(5);
  }
  // Thứ 6 hoặc T6
  if (lower.includes("thứ 6") || lower.includes("thu 6") || lower.includes("thứ sáu") || /\bt6\b/i.test(lower)) {
    days.push(6);
  }
  // Thứ 7 hoặc T7
  if (lower.includes("thứ 7") || lower.includes("thu 7") || lower.includes("thứ bảy") || /\bt7\b/i.test(lower)) {
    days.push(7);
  }
  // Chủ nhật hoặc CN
  if (lower.includes("chủ nhật") || lower.includes("chu nhat") || /\bcn\b/i.test(lower)) {
    days.push(8);
  }

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

  const s1 = parseSchedule(sched1Str);
  const s2 = parseSchedule(sched2Str);
  if (!s1 || !s2) return false;

  // 2. Kiểm tra ngày trong tuần
  if (s1.days.length > 0 && s2.days.length > 0) {
    const commonDays = s1.days.filter((d) => s2.days.includes(d));
    if (commonDays.length === 0) {
      return false; // Không học cùng ngày trong tuần
    }

    // Có ngày học trùng nhau! Kiểm tra khung giờ:
    if (
      s1.startTimeMinutes !== null &&
      s1.endTimeMinutes !== null &&
      s2.startTimeMinutes !== null &&
      s2.endTimeMinutes !== null
    ) {
      const overlapStart = Math.max(s1.startTimeMinutes, s2.startTimeMinutes);
      const overlapEnd = Math.min(s1.endTimeMinutes, s2.endTimeMinutes);
      return overlapStart < overlapEnd;
    }

    // Nếu 1 trong 2 không ghi rõ giờ nhưng học cùng thứ trong tuần: coi như trùng
    return true;
  }

  return false;
}
