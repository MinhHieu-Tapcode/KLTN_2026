/**
 * Bộ thư viện tiện ích tính toán điểm IELTS chuẩn quốc tế
 * Dành riêng cho quy trình tuyển sinh 2 pha của SIMPACE LMS
 */

export interface IeltsLevelRule {
  id: string;
  code: string;
  name: string;
  minScore: number;
  maxScore: number;
  targetClassCount?: number;
}

/**
 * Kiểm tra điểm kỹ năng đơn lẻ có hợp lệ theo thang điểm IELTS (0 - 9.0, bội số của 0.5)
 */
export function isValidIeltsBandScore(score: any): boolean {
  const num = Number(score);
  if (isNaN(num)) return false;
  if (num < 0 || num > 9.0) return false;
  // Phải là bội số của 0.5 (0, 0.5, 1.0, 1.5, ... 9.0)
  return Math.abs((num * 2) - Math.round(num * 2)) < 0.001;
}

/**
 * Tính điểm Overall từ 4 kỹ năng (Nghe, Đọc, Viết, Nói) theo chuẩn IELTS quốc tế:
 * - Trung bình cộng 4 kỹ năng: (L + R + W + S) / 4
 * - Làm tròn đến 0.5 gần nhất:
 *   + Phần lẻ < .125: làm tròn xuống .0 (VD: 6.1 -> 6.0)
 *   + Phần lẻ >= .125 và < .25: làm tròn lên .5 (theo chuẩn IELTS x.25 lên .5)
 *   + Phần lẻ >= .25 và < .625: làm tròn lên .5 (VD: 6.25 -> 6.5, 6.375 -> 6.5)
 *   + Phần lẻ >= .625 và < .75: làm tròn lên 1.0 (theo chuẩn IELTS x.75 lên .0 tiếp theo)
 *   + Phần lẻ >= .75: làm tròn lên số nguyên tiếp theo (VD: 6.75 -> 7.0)
 * Công thức toán học chuẩn: Math.round(avg * 2) / 2
 */
export function calculateIeltsOverall(
  listening: number,
  reading: number,
  writing: number,
  speaking: number
): number {
  const avg = (listening + reading + writing + speaking) / 4;
  return Math.round(avg * 2) / 2;
}

/**
 * Tự động tra cứu và gắn Trình độ IELTS phù hợp từ điểm Overall
 */
export function matchIeltsLevel(
  overall: number,
  levels: IeltsLevelRule[]
): IeltsLevelRule | null {
  if (!levels || levels.length === 0) return null;

  // Sắp xếp các level tăng dần theo minScore
  const sorted = [...levels].sort((a, b) => a.minScore - b.minScore);

  // 1. Khớp chính xác trong khoảng [minScore, maxScore]
  const exactMatch = sorted.find(
    (lvl) => overall >= lvl.minScore && overall <= lvl.maxScore
  );
  if (exactMatch) return exactMatch;

  // 2. Nếu điểm cao hơn max của tất cả level -> lấy level cao nhất
  const highest = sorted[sorted.length - 1];
  if (overall > highest.maxScore) return highest;

  // 3. Nếu điểm thấp hơn min của tất cả level -> trả về null (dưới sàn / out trình độ)
  const lowest = sorted[0];
  if (overall < lowest.minScore) return null;

  return null;
}

/**
 * Kiểm tra học sinh có đạt Điểm sàn (Min Admission Score) hay không
 */
export function checkMeetsAdmissionScore(
  overall: number,
  minAdmissionScore: number = 3.5
): boolean {
  return overall >= minAdmissionScore;
}

/**
 * Định dạng hiển thị điểm IELTS luôn có đuôi .0 hoặc .5 (VD: 6.0, 6.5)
 */
export function formatIeltsScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return "---";
  return (Math.round(score * 2) / 2).toFixed(1);
}
