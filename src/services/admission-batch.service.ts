import { prisma, isDbAlive } from "@/lib/prisma";
import {
  calculateIeltsOverall,
  isValidIeltsBandScore,
  matchIeltsLevel,
  checkMeetsAdmissionScore,
  IeltsLevelRule,
} from "@/lib/ielts-calc";

const globalAdmissionStore = globalThis as unknown as {
  demoAdmissionBatches?: any[];
  demoCandidates?: any[];
};

if (!globalAdmissionStore.demoAdmissionBatches) {
  globalAdmissionStore.demoAdmissionBatches = [];
}
if (!globalAdmissionStore.demoCandidates) {
  globalAdmissionStore.demoCandidates = [];
}

export interface CandidateRawRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  scoreListening?: any;
  scoreReading?: any;
  scoreWriting?: any;
  scoreSpeaking?: any;
}

export interface ProcessedCandidate {
  id: string;
  rowNumber: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  scoreListening: number | null;
  scoreReading: number | null;
  scoreWriting: number | null;
  scoreSpeaking: number | null;
  scoreOverall: number | null;
  suggestedLevelId: string | null;
  suggestedLevelName: string | null;
  actualLevelId: string | null;
  status: "CHO_XAC_NHAN" | "DONG_Y_HOC" | "TU_CHOI" | "DUOI_DIEM_SAN" | "CAN_XU_LY" | "NGOAI_LE";
  issueReason?: string;
  overrideReason?: string;
}

/**
 * Xử lý dữ liệu thô Pha 1: Tính Overall, phát hiện ca biên, gắn trạng thái
 */
export function processPhase1Candidates(
  rows: CandidateRawRow[],
  levels: IeltsLevelRule[],
  minAdmissionScore: number = 3.5
): {
  validCandidates: ProcessedCandidate[];
  attentionCandidates: ProcessedCandidate[];
  summary: {
    total: number;
    validCount: number;
    belowCutoffCount: number;
    issueCount: number;
  };
} {
  const emailSeen = new Map<string, number>();
  const phoneSeen = new Map<string, number>();

  rows.forEach((r) => {
    const cleanEmail = (r.email || "").trim().toLowerCase();
    const cleanPhone = (r.phoneNumber || "").trim();
    if (cleanEmail) emailSeen.set(cleanEmail, (emailSeen.get(cleanEmail) || 0) + 1);
    if (cleanPhone) phoneSeen.set(cleanPhone, (phoneSeen.get(cleanPhone) || 0) + 1);
  });

  const validCandidates: ProcessedCandidate[] = [];
  const attentionCandidates: ProcessedCandidate[] = [];

  rows.forEach((row, idx) => {
    const cleanName = (row.fullName || "").trim();
    const cleanEmail = (row.email || "").trim().toLowerCase();
    const cleanPhone = (row.phoneNumber || "").trim();

    const isLValid = isValidIeltsBandScore(row.scoreListening);
    const isRValid = isValidIeltsBandScore(row.scoreReading);
    const isWValid = isValidIeltsBandScore(row.scoreWriting);
    const isSValid = isValidIeltsBandScore(row.scoreSpeaking);

    const issues: string[] = [];

    if (!cleanName) issues.push("Thiếu họ tên");
    if (!cleanEmail || !cleanEmail.includes("@")) issues.push("Email không hợp lệ");
    if (cleanEmail && (emailSeen.get(cleanEmail) || 0) > 1) issues.push("Trùng email trong file");
    if (cleanPhone && (phoneSeen.get(cleanPhone) || 0) > 1) issues.push("Trùng SĐT trong file");

    if (!isLValid || !isRValid || !isWValid || !isSValid) {
      issues.push("Thiếu hoặc sai thang điểm 4 kỹ năng");
    }

    let overall: number | null = null;
    let matchedLevel: IeltsLevelRule | null = null;
    let meetsCutoff = false;

    if (isLValid && isRValid && isWValid && isSValid) {
      const l = Number(row.scoreListening);
      const r = Number(row.scoreReading);
      const w = Number(row.scoreWriting);
      const s = Number(row.scoreSpeaking);
      overall = calculateIeltsOverall(l, r, w, s);
      matchedLevel = matchIeltsLevel(overall, levels);
      meetsCutoff = checkMeetsAdmissionScore(overall, minAdmissionScore);
      if (!meetsCutoff) {
        issues.push(`Dưới điểm sàn (${overall} < ${minAdmissionScore})`);
      }
    }

    const processed: ProcessedCandidate = {
      id: `cand-${Date.now()}-${idx}`,
      rowNumber: row.rowNumber || idx + 1,
      fullName: cleanName,
      email: cleanEmail,
      phoneNumber: cleanPhone || undefined,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      scoreListening: isLValid ? Number(row.scoreListening) : null,
      scoreReading: isRValid ? Number(row.scoreReading) : null,
      scoreWriting: isWValid ? Number(row.scoreWriting) : null,
      scoreSpeaking: isSValid ? Number(row.scoreSpeaking) : null,
      scoreOverall: overall,
      suggestedLevelId: matchedLevel ? matchedLevel.id : null,
      suggestedLevelName: matchedLevel ? matchedLevel.name : null,
      actualLevelId: matchedLevel ? matchedLevel.id : null,
      status: "CHO_XAC_NHAN",
    };

    if (issues.length > 0) {
      if (issues.some((i) => i.startsWith("Dưới điểm sàn"))) {
        processed.status = "DUOI_DIEM_SAN";
      } else {
        processed.status = "CAN_XU_LY";
      }
      processed.issueReason = issues.join("; ");
      attentionCandidates.push(processed);
    } else {
      validCandidates.push(processed);
    }
  });

  return {
    validCandidates,
    attentionCandidates,
    summary: {
      total: rows.length,
      validCount: validCandidates.length,
      belowCutoffCount: attentionCandidates.filter((c) => c.status === "DUOI_DIEM_SAN").length,
      issueCount: attentionCandidates.filter((c) => c.status === "CAN_XU_LY").length,
    },
  };
}

/**
 * Xử lý file phản hồi từ trường THPT (Pha 2)
 * Khớp thí sinh theo Email hoặc SĐT, cập nhật trạng thái: DONG_Y_HOC / TU_CHOI
 */
export function matchSchoolFeedbackRows(
  existingCandidates: ProcessedCandidate[],
  feedbackRows: Array<{ identifier: string; confirmedStatus: string }>
): {
  updatedCandidates: ProcessedCandidate[];
  matchedCount: number;
  confirmedCount: number;
  rejectedCount: number;
  unconfirmedCount: number;
} {
  const feedbackMap = new Map<string, string>();
  feedbackRows.forEach((fb) => {
    const key = (fb.identifier || "").trim().toLowerCase();
    if (key) feedbackMap.set(key, fb.confirmedStatus);
  });

  let matchedCount = 0;
  let confirmedCount = 0;
  let rejectedCount = 0;
  let unconfirmedCount = 0;

  const updatedCandidates = existingCandidates.map((cand) => {
    const emailKey = cand.email.toLowerCase();
    const phoneKey = (cand.phoneNumber || "").toLowerCase();

    const rawDecision = feedbackMap.get(emailKey) || (phoneKey ? feedbackMap.get(phoneKey) : null);

    if (rawDecision) {
      matchedCount++;
      const norm = rawDecision.trim().toLowerCase();
      if (norm.includes("học") || norm.includes("đồng ý") || norm.includes("yes") || norm === "1") {
        confirmedCount++;
        return { ...cand, status: "DONG_Y_HOC" as const };
      } else if (norm.includes("hủy") || norm.includes("từ chối") || norm.includes("no") || norm === "0") {
        rejectedCount++;
        return { ...cand, status: "TU_CHOI" as const };
      }
    }

    if (cand.status === "CHO_XAC_NHAN") {
      unconfirmedCount++;
    }
    return cand;
  });

  return {
    updatedCandidates,
    matchedCount,
    confirmedCount,
    rejectedCount,
    unconfirmedCount,
  };
}
