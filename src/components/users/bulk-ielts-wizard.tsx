"use client";

import React, { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Plus, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { calculateIeltsOverall, isValidIeltsBandScore } from "@/lib/ielts-calc";
import {
  BulkAllocationSuggestion,
  InvalidStudentRow,
  ValidatedStudentRow,
  generateBulkClassSuggestionAction,
  parseAndValidateBulkStudentsAction,
} from "@/actions/bulk-allocation";
import { BulkAllocationPreview } from "./bulk-allocation-preview";

export interface BulkIeltsWizardProps {
  excelStep: "upload" | "suggestion";
  setExcelStep: (step: "upload" | "suggestion") => void;
  schools: any[];
  users?: any[];
  ieltsLevels?: any[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onAddSchoolShortcut?: () => void;
  onCommittedSuccess: (summaryPayload: any) => void;
}

export function BulkIeltsWizard({
  excelStep,
  setExcelStep,
  schools,
  users = [],
  ieltsLevels = [],
  isFullscreen = false,
  onToggleFullscreen,
  onAddSchoolShortcut,
  onCommittedSuccess,
}: BulkIeltsWizardProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || "");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [analyzingExcel, setAnalyzingExcel] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [allocationSuggestion, setAllocationSuggestion] = useState<BulkAllocationSuggestion | null>(null);
  const [invalidRowsList, setInvalidRowsList] = useState<InvalidStudentRow[]>([]);
  const [actionNotification, setActionNotification] = useState<string>("");

  useEffect(() => {
    if (!selectedSchoolId && schools.length > 0) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  const handleDownloadSample = () => {
    const sampleData = [
      {
        STT: 1,
        "Họ và tên": "Nguyễn Văn An",
        Email: "an.nguyen@gmail.com",
        "Số điện thoại": "0987654321",
        "Ngày sinh": "15/08/2008",
        "Giới tính": "Nam",
        "Điểm đầu vào": 5.5,
      },
      {
        STT: 2,
        "Họ và tên": "Trần Thị Mai",
        Email: "mai.tran@gmail.com",
        "Số điện thoại": "0912345678",
        "Ngày sinh": "20/11/2008",
        "Giới tính": "Nữ",
        "Điểm đầu vào": 7.0,
      },
      {
        STT: 3,
        "Họ và tên": "Lê Hoàng Long",
        Email: "long.le@gmail.com",
        "Số điện thoại": "0901234567",
        "Ngày sinh": "10/05/2008",
        "Giới tính": "Nam",
        "Điểm đầu vào": 3.5,
      },
      {
        STT: 4,
        "Họ và tên": "Phạm Quỳnh Anh",
        Email: "quynhanh.pham@gmail.com",
        "Số điện thoại": "0934567890",
        "Ngày sinh": "12/03/2008",
        "Giới tính": "Nữ",
        "Điểm đầu vào": 5.0,
      },
      {
        STT: 5,
        "Họ và tên": "Hoàng Đức Minh",
        Email: "ducminh.hoang@gmail.com",
        "Số điện thoại": "0945678901",
        "Ngày sinh": "25/09/2008",
        "Giới tính": "Nam",
        "Điểm đầu vào": 6.5,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Vien_IELTS");
    XLSX.writeFile(wb, "SIMPACE_Mau_Import_Hoc_Vien_IELTS.xlsx");
  };

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setExcelFile(selected);
    setExcelError("");
    setAllocationSuggestion(null);
    setInvalidRowsList([]);
    setActionNotification("");
    setAnalyzingExcel(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      let res: any;

      try {
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        res = await parseAndValidateBulkStudentsAction(base64);
      } catch (networkErr: any) {
        console.warn("[handleExcelChange] Server Action call failed, using client fallback:", networkErr);
      }

      if (!res || !res.success) {
        try {
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rawRows.length < 2) {
            setExcelError("Tệp Excel rỗng hoặc không có dòng dữ liệu hợp lệ!");
            return;
          }

          const header = rawRows[0].map((h: any) => (h ? String(h).trim().toLowerCase() : ""));
          const colFullName = header.findIndex(
            (h: string) => h.includes("họ và tên") || h.includes("họ tên") || h === "name" || h === "fullname"
          );
          const colEmail = header.findIndex((h: string) => h.includes("email") || h.includes("thư điện tử"));
          const colPhone = header.findIndex(
            (h: string) => h.includes("số điện thoại") || h.includes("sđt") || h.includes("phone")
          );
          const colDob = header.findIndex(
            (h: string) => h.includes("ngày sinh") || h.includes("dob") || h.includes("birth")
          );
          const colGender = header.findIndex((h: string) => h.includes("giới tính") || h.includes("gender"));
          const colScore = header.findIndex(
            (h: string) =>
              h.includes("điểm ielts") ||
              h.includes("điểm đầu vào") ||
              h.includes("ielts") ||
              h.includes("score") ||
              h.includes("band")
          );

          if (colFullName === -1 || colEmail === -1 || colScore === -1) {
            setExcelError("Tệp tải lên thiếu các cột bắt buộc: 'Họ và tên', 'Email', 'Điểm đầu vào'!");
            return;
          }

          const activeLevels =
            ieltsLevels && ieltsLevels.length > 0
              ? ieltsLevels
              : [
                  { id: "lvl-basic", code: "BASIC", name: "Cơ bản", minScore: 3.5, maxScore: 4.5, targetClassCount: 1 },
                  { id: "lvl-medium", code: "MEDIUM", name: "Trung bình", minScore: 4.5, maxScore: 6.5, targetClassCount: 2 },
                  { id: "lvl-advanced", code: "ADVANCED", name: "Nâng cao", minScore: 6.5, maxScore: 9.0, targetClassCount: 3 },
                ];

          const existingEmailSet = new Set((users || []).map((u: any) => u.email?.toLowerCase()));
          const validRows: ValidatedStudentRow[] = [];
          const invalidRows: InvalidStudentRow[] = [];
          const seenEmailsInFile = new Set<string>();

          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || row.every((c: any) => c === null || c === undefined || String(c).trim() === "")) {
              continue;
            }

            const rowNumber = i + 1;
            const fullName = row[colFullName] ? String(row[colFullName]).trim() : "";
            const rawEmail = row[colEmail] ? String(row[colEmail]).trim().toLowerCase() : "";
            const rawPhone = colPhone !== -1 && row[colPhone] ? String(row[colPhone]).trim() : "";
            const rawDob = colDob !== -1 && row[colDob] ? String(row[colDob]).trim() : "";
            const rawGender = colGender !== -1 && row[colGender] ? String(row[colGender]).trim().toLowerCase() : "";
            const rawScoreVal = row[colScore];

            if (!fullName) {
              invalidRows.push({ rowNumber, email: rawEmail, rawScore: rawScoreVal, errorReason: "Họ và tên không được để trống" });
              continue;
            }
            if (!rawEmail) {
              invalidRows.push({ rowNumber, fullName, rawScore: rawScoreVal, errorReason: "Email không được để trống" });
              continue;
            }
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(rawEmail)) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Email không đúng định dạng chuẩn RFC 5322" });
              continue;
            }
            if (seenEmailsInFile.has(rawEmail)) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Email bị trùng lặp trong tệp" });
              continue;
            }
            seenEmailsInFile.add(rawEmail);

            if (existingEmailSet.has(rawEmail)) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Email đã tồn tại trong hệ thống" });
              continue;
            }

            const score = Number(String(rawScoreVal).replace(",", "."));
            if (rawScoreVal === null || rawScoreVal === undefined || isNaN(score) || score < 0 || score > 9.0) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Điểm đầu vào phải là số từ 0.0 đến 9.0" });
              continue;
            }

            let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
            if (rawGender.includes("nữ") || rawGender === "female" || rawGender === "f") gender = "FEMALE";
            else if (rawGender.includes("khác") || rawGender === "other") gender = "OTHER";

            if (score < 3.5) {
              validRows.push({
                rowNumber,
                fullName,
                email: rawEmail,
                phoneNumber: rawPhone || undefined,
                dateOfBirth: rawDob || undefined,
                gender,
                ieltsScore: score,
                isBelowCutoff: true,
                status: "DUOI_DIEM_SAN",
                issueReason: "Điểm Overall dưới điểm sàn tuyển sinh (< 3.5)",
                levelId: "lvl-below-cutoff",
                levelCode: "BELOW_CUTOFF",
                levelName: "Dưới điểm sàn",
              });
              continue;
            }

            const matchedLevel =
              activeLevels.find((lvl: any, idx: number) => {
                if (idx === activeLevels.length - 1) return score >= lvl.minScore && score <= lvl.maxScore;
                return score >= lvl.minScore && score < lvl.maxScore;
              }) ||
              activeLevels.find((lvl: any) => score >= lvl.minScore && score <= lvl.maxScore);

            if (!matchedLevel) {
              invalidRows.push({
                rowNumber,
                fullName,
                email: rawEmail,
                rawScore: score,
                errorReason: `Điểm đầu vào (${score}) không khớp với bất kỳ khoảng trình độ nào đã cấu hình`,
              });
              continue;
            }

            validRows.push({
              rowNumber,
              fullName,
              email: rawEmail,
              phoneNumber: rawPhone || undefined,
              dateOfBirth: rawDob || undefined,
              gender,
              ieltsScore: score,
              levelId: matchedLevel.id,
              levelCode: matchedLevel.code,
              levelName: matchedLevel.name,
            });
          }

          res = { success: true, validRows, invalidRows };
        } catch (clientParseErr: any) {
          setExcelError("Không thể đọc tệp: " + (clientParseErr.message || String(clientParseErr)));
          return;
        }
      }

      setInvalidRowsList(res.invalidRows || []);

      if (!res.validRows || res.validRows.length === 0) {
        setExcelError("Không tìm thấy dòng học sinh hợp lệ nào để phân lớp! Vui lòng kiểm tra danh sách lỗi bên dưới.");
        return;
      }

      let sugRes: any = null;
      try {
        sugRes = await generateBulkClassSuggestionAction(res.validRows, selectedSchoolId);
      } catch (sugErr) {
        console.warn("[handleExcelChange] Server suggestion failed, using client fallback:", sugErr);
      }

      if (!sugRes || !sugRes.success || !sugRes.suggestion) {
        const schoolObj = schools.find((s) => s.id === selectedSchoolId);
        const schoolCode = schoolObj ? schoolObj.code.replace(/[^a-zA-Z0-9]/g, "") : "TD";
        const admissibleRows = res.validRows.filter((s: any) => !s.isBelowCutoff && s.ieltsScore >= 3.5);
        const belowCutoffRows = res.validRows.filter((s: any) => s.isBelowCutoff || s.ieltsScore < 3.5);

        const studentsByLevel: Record<string, any[]> = {};
        for (const s of admissibleRows) {
          if (!studentsByLevel[s.levelId]) studentsByLevel[s.levelId] = [];
          studentsByLevel[s.levelId].push(s);
        }
        const levelPlans: any[] = [];
        let totalClasses = 0;
        let totalAllocatedStudents = 0;
        for (const lvlId in studentsByLevel) {
          const stList = studentsByLevel[lvlId];
          const first = stList[0];
          const assignedClasses: any[] = [
            {
              tempId: `temp_${first.levelCode}_1_${Date.now()}`,
              levelId: first.levelId,
              levelCode: first.levelCode,
              levelName: first.levelName,
              classIndex: 1,
              code: `IELTS_${first.levelCode}_${schoolCode}_01`,
              name: `IELTS ${first.levelName} - Lớp 01`,
              capacity: Math.max(30, stList.length + 5),
              students: stList,
            },
          ];
          totalClasses += 1;
          totalAllocatedStudents += stList.length;
          levelPlans.push({
            levelId: first.levelId,
            levelCode: first.levelCode,
            levelName: first.levelName,
            studentCount: stList.length,
            classCount: 1,
            classes: assignedClasses,
          });
        }
        sugRes = {
          success: true,
          suggestion: {
            summary: {
              totalRows: res.validRows.length,
              totalValid: res.validRows.length,
              totalInvalid: res.invalidRows?.length || 0,
              totalLevels: levelPlans.length,
              totalClasses,
              totalAllocatedStudents,
            },
            levelPlans,
            invalidRows: res.invalidRows || [],
          },
        };
      }

      setAllocationSuggestion(sugRes.suggestion);
      setExcelStep("suggestion");
    } catch (err: any) {
      setExcelError("Không thể đọc tệp: " + (err.message || String(err)));
    } finally {
      setAnalyzingExcel(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {actionNotification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center justify-between">
          <span>{actionNotification}</span>
          <button
            type="button"
            onClick={() => setActionNotification("")}
            className="text-emerald-600 hover:text-emerald-900 ml-2"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {excelError && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200 flex items-center justify-between">
          <span>{excelError}</span>
          <button type="button" onClick={() => setExcelError("")} className="text-red-500 hover:text-red-800 ml-2">
            <X className="size-4" />
          </button>
        </div>
      )}

      {excelStep === "upload" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-[#0F172A] block mb-1.5">
                Trường học đối tác áp dụng *
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="field text-xs flex-1"
                >
                  {schools.length === 0 && <option value="">-- Chưa có trường học nào --</option>}
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                {onAddSchoolShortcut && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddSchoolShortcut}
                    title="Tạo trường học mới (Điều hướng đến trang Quản lý trường học)"
                    className="h-9 px-2.5 text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 shrink-0 font-medium"
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm trường
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                Các lớp học IELTS được đề xuất sẽ thuộc về trường đối tác này.
              </p>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">File mẫu Excel chuẩn SIMPACE</h4>
                <p className="text-[11px] text-[#64748B]">
                  Gồm các cột: Họ và tên, Email, Điểm Nghe, Điểm Đọc, Điểm Viết, Điểm Nói, SĐT, Ngày sinh, Giới tính (Overall tự tính).
                </p>
              </div>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  className="text-xs border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C] h-8 w-full sm:w-auto"
                >
                  <Download className="size-3.5 mr-1.5 text-[#EA580C]" /> Tải file mẫu (.xlsx)
                </Button>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#EA580C] rounded-2xl p-6 text-center transition bg-[#F8FAFC]">
            <FileSpreadsheet className="size-10 mx-auto text-[#EA580C] mb-2" />
            <p className="text-sm font-semibold text-[#0F172A]">
              {excelFile ? excelFile.name : "Kéo thả file Excel học viên vào đây hoặc duyệt file"}
            </p>
            <p className="text-xs text-[#94A3B8] mt-1">Hỗ trợ định dạng .xlsx, .xls hoặc .csv</p>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelChange}
              className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FFF1EB] file:text-[#EA580C] hover:file:bg-[#FFE5D6] cursor-pointer"
            />
          </div>

          {analyzingExcel && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#EA580C] font-medium">
              <Loader2 className="size-5 animate-spin" /> Đang kiểm tra dữ liệu và tự động đề xuất phân lớp...
            </div>
          )}

          {invalidRowsList.length > 0 && !allocationSuggestion && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-rose-700">
                  Phát hiện {invalidRowsList.length} dòng không hợp lệ:
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto text-xs text-rose-600 space-y-1">
                {invalidRowsList.map((err, idx) => (
                  <div key={idx} className="border-b border-rose-100 pb-1">
                    • Dòng {err.rowNumber}: {err.fullName || "Chưa có tên"} ({err.email || "Không có email"}) — Điểm:{" "}
                    {err.rawScore ?? "Trống"} — <i>{err.errorReason}</i>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {excelStep === "suggestion" && allocationSuggestion && (
        <BulkAllocationPreview
          excelFileName={excelFile?.name || "import_ielts.xlsx"}
          selectedSchoolId={selectedSchoolId}
          schools={schools}
          allocationSuggestion={allocationSuggestion}
          invalidRowsList={invalidRowsList}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          onUpdateSuggestion={setAllocationSuggestion}
          onNotify={setActionNotification}
          onError={setExcelError}
          onResetUpload={() => {
            setExcelStep("upload");
            setAllocationSuggestion(null);
            setExcelFile(null);
          }}
          onBackToStep1={() => setExcelStep("upload")}
          onCommittedSuccess={onCommittedSuccess}
        />
      )}
    </div>
  );
}
