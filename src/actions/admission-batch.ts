"use server";

import * as XLSX from "xlsx";
import { getSession } from "@/lib/auth";
import { checkAuth, isAdmin, isSchoolManager } from "@/lib/permissions";
import { prisma, isDbAlive } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  CandidateRawRow,
  ProcessedCandidate,
  processPhase1Candidates,
  matchSchoolFeedbackRows,
} from "@/services/admission-batch.service";
import {
  ClassAllocationPlan,
  buildBalancedClassPlans,
  commitAdmissionAllocationService,
} from "@/services/admission-allocation.service";
import { IeltsLevelRule } from "@/lib/ielts-calc";

function safeRevalidate(path: string = "/") {
  try {
    revalidatePath(path);
  } catch {}
}

const DEFAULT_IELTS_LEVELS: IeltsLevelRule[] = [
  { id: "lvl-basic", code: "BASIC", name: "Cơ bản (Band 3.5 - 4.5)", minScore: 3.5, maxScore: 4.5 },
  { id: "lvl-medium", code: "MEDIUM", name: "Trung bình (Band 4.5 - 6.5)", minScore: 4.5, maxScore: 6.5 },
  { id: "lvl-advanced", code: "ADVANCED", name: "Nâng cao (Band 6.5 - 9.0)", minScore: 6.5, maxScore: 9.0 },
];

async function getLevels(): Promise<IeltsLevelRule[]> {
  if (await isDbAlive()) {
    try {
      const dbLevels = await prisma.ieltsLevel.findMany({
        where: { isActive: true },
        orderBy: { minScore: "asc" },
      });
      if (dbLevels.length > 0) return dbLevels;
    } catch {}
  }
  return DEFAULT_IELTS_LEVELS;
}

/**
 * 1. Phân tích tệp Excel Pha 1: Điểm 4 kỹ năng & Tự tính Overall
 */
export async function parsePhase1AdmissionExcelAction(
  fileBase64: string,
  minAdmissionScore: number = 3.5
) {
  try {
    const auth = checkAuth(await getSession(), "Vui lòng đăng nhập!");
    if (!auth.ok) return { success: false, error: auth.error };

    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rawData || rawData.length === 0) {
      return { success: false, error: "Tệp Excel không chứa dữ liệu hoặc rỗng!" };
    }

    const rows: CandidateRawRow[] = rawData.map((row: any, idx: number) => {
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          const match = Object.keys(row).find((rk) =>
            rk.trim().toLowerCase().includes(k.toLowerCase())
          );
          if (match && row[match] !== undefined && row[match] !== "") {
            return row[match];
          }
        }
        return undefined;
      };

      return {
        rowNumber: idx + 2,
        fullName: getVal("họ và tên", "họ tên", "full name", "name", "thí sinh") || "",
        email: getVal("email", "hòm thư", "mail") || "",
        phoneNumber: getVal("số điện thoại", "sđt", "phone", "tel")?.toString() || "",
        dateOfBirth: getVal("ngày sinh", "dob", "birth")?.toString() || "",
        gender: getVal("giới tính", "gender") || undefined,
        scoreListening: getVal("nghe", "listening", "lis", "l"),
        scoreReading: getVal("đọc", "reading", "read", "r"),
        scoreWriting: getVal("viết", "writing", "writ", "w"),
        scoreSpeaking: getVal("nói", "speaking", "speak", "s"),
      };
    });

    const levels = await getLevels();
    const result = processPhase1Candidates(rows, levels, minAdmissionScore);

    return {
      success: true,
      ...result,
      levels,
    };
  } catch (err: any) {
    console.error("[parsePhase1AdmissionExcelAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể phân tích tệp Excel!" };
  }
}

/**
 * 2. Xuất file Excel bảng điểm Pha 1 gửi nhà trường
 */
export async function exportPhase1ExcelAction(candidates: ProcessedCandidate[], schoolName?: string) {
  try {
    const dataForExport = candidates.map((c, idx) => ({
      "STT": idx + 1,
      "Họ và tên": c.fullName,
      "Email": c.email,
      "Số điện thoại": c.phoneNumber || "",
      "Ngày sinh": c.dateOfBirth || "",
      "Điểm Nghe": c.scoreListening ?? "",
      "Điểm Đọc": c.scoreReading ?? "",
      "Điểm Viết": c.scoreWriting ?? "",
      "Điểm Nói": c.scoreSpeaking ?? "",
      "Điểm Overall (IELTS)": c.scoreOverall ?? "",
      "Trình độ đề xuất": c.suggestedLevelName || "",
      "Trạng thái":
        c.status === "DUOI_DIEM_SAN"
          ? "Dưới điểm sàn"
          : c.status === "CAN_XU_LY"
          ? "Cần xử lý"
          : "Đủ điều kiện",
      "Lý do ghi chú": c.issueReason || "",
      "Xác nhận học (Học / Hủy)": "", // Cột để trường điền
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ket_qua_IELTS_Gui_Truong");

    const buffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
    return {
      success: true,
      fileBase64: buffer,
      fileName: `SIMPACE_Bang_diem_IELTS_${schoolName ? schoolName.replace(/\s+/g, "_") : "THPT"}_Pha1.xlsx`,
    };
  } catch (err: any) {
    console.error("[exportPhase1ExcelAction] Lỗi:", err);
    return { success: false, error: "Không thể xuất file Excel!" };
  }
}

/**
 * 3. Phân tích tệp Excel phản hồi từ trường THPT (Pha 2)
 */
export async function parsePhase2FeedbackExcelAction(
  fileBase64: string,
  existingCandidates: ProcessedCandidate[]
) {
  try {
    const auth = checkAuth(await getSession(), "Vui lòng đăng nhập!");
    if (!auth.ok) return { success: false, error: auth.error };

    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

    const feedbackRows = rawData.map((row: any) => {
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          const match = Object.keys(row).find((rk) =>
            rk.trim().toLowerCase().includes(k.toLowerCase())
          );
          if (match && row[match] !== undefined) return row[match].toString().trim();
        }
        return "";
      };

      const identifier = getVal("email", "số điện thoại", "sđt", "phone", "mã", "họ và tên", "họ tên");
      const confirmedStatus = getVal("xác nhận học", "xác nhận", "trạng thái", "học / hủy", "status");

      return { identifier, confirmedStatus };
    });

    const result = matchSchoolFeedbackRows(existingCandidates, feedbackRows);
    return { success: true, ...result };
  } catch (err: any) {
    console.error("[parsePhase2FeedbackExcelAction] Lỗi:", err);
    return { success: false, error: err.message || "Không thể nạp file phản hồi!" };
  }
}

/**
 * 4. Chạy thuật toán phân lớp Pha 2 (Balanced Class Allocation)
 */
export async function generatePhase2AllocationPlanAction(
  candidates: ProcessedCandidate[],
  schoolCode: string = "SCH",
  minClassSize: number = 12,
  maxClassSize: number = 25
) {
  try {
    const levels = await getLevels();
    const plans = buildBalancedClassPlans(candidates, levels, schoolCode, minClassSize, maxClassSize);
    return { success: true, plans };
  } catch (err: any) {
    console.error("[generatePhase2AllocationPlanAction] Lỗi:", err);
    return { success: false, error: err.message || "Phân lớp thất bại!" };
  }
}

/**
 * 5. Chốt phân lớp & Cấp tài khoản Pha 2 (Commit Phase 2)
 */
export async function commitAdmissionBatchAction(
  schoolId: string,
  batchId: string,
  plans: ClassAllocationPlan[]
) {
  try {
    const session = await getSession();
    const auth = checkAuth(session, "Vui lòng đăng nhập!");
    if (!auth.ok) return { success: false, error: auth.error };

    const res = await commitAdmissionAllocationService(
      schoolId,
      batchId,
      plans,
      session?.userId || "SYSTEM"
    );

    if (res.success) {
      safeRevalidate("/classes");
      safeRevalidate("/users");
    }

    return res;
  } catch (err: any) {
    console.error("[commitAdmissionBatchAction] Lỗi:", err);
    return { success: false, error: err.message || "Chốt phân lớp thất bại!" };
  }
}
