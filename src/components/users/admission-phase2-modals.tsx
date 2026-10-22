"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  UserCheck,
  XCircle,
  Upload,
  ShieldAlert,
} from "lucide-react";
import * as XLSX from "xlsx";

interface ExceptionOverrideModalProps {
  open: boolean;
  onClose: () => void;
  candidate: any;
  availableLevels: any[];
  onConfirmOverride: (candidateId: string, action: "OVERRIDE" | "ASSIGN_CLOSEST" | "REJECT", reason: string, targetLevelId?: string) => void;
}

export function ExceptionOverrideModal({
  open,
  onClose,
  candidate,
  availableLevels,
  onConfirmOverride,
}: ExceptionOverrideModalProps) {
  const [action, setAction] = useState<"OVERRIDE" | "ASSIGN_CLOSEST" | "REJECT">("OVERRIDE");
  const [reason, setReason] = useState("");
  const [targetLevelId, setTargetLevelId] = useState(availableLevels[0]?.id || "");
  const [errorMsg, setErrorMsg] = useState("");

  if (!candidate) return null;

  const handleConfirm = () => {
    setErrorMsg("");
    if (action === "OVERRIDE" && !reason.trim()) {
      setErrorMsg("Vui lòng nhập lý do duyệt ngoại lệ (bắt buộc)!");
      return;
    }
    onConfirmOverride(candidate.id || candidate.email, action, reason.trim(), targetLevelId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="size-5 text-[#EA580C]" /> Xử lý ngoại lệ hồ sơ thí sinh
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {candidate.fullName} ({candidate.email}) — Điểm Overall: <b>{candidate.ieltsScore ?? candidate.scoreOverall ?? "---"}</b>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="size-4 text-amber-600" />
              Lý do bất thường:
            </p>
            <p className="mt-1 text-amber-800">{candidate.issueReason || candidate.errorReason || "Dưới điểm sàn tuyển sinh"}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Chọn hành động xử lý:</label>
            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  checked={action === "OVERRIDE"}
                  onChange={() => setAction("OVERRIDE")}
                  className="mt-0.5 text-[#EA580C] focus:ring-[#EA580C]"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Duyệt ngoại lệ (Đặc cách nhận học)</span>
                  <span className="text-[11px] text-slate-500">Cho phép học sinh tiếp tục tham gia phân lớp dù có điểm dưới sàn.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  checked={action === "ASSIGN_CLOSEST"}
                  onChange={() => setAction("ASSIGN_CLOSEST")}
                  className="mt-0.5 text-[#EA580C] focus:ring-[#EA580C]"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Xếp vào trình độ thấp nhất / gần nhất</span>
                  <span className="text-[11px] text-slate-500">Gán học sinh vào trình độ Cơ bản để củng cố kiến thức nền tảng.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  checked={action === "REJECT"}
                  onChange={() => setAction("REJECT")}
                  className="mt-0.5 text-[#EA580C] focus:ring-[#EA580C]"
                />
                <div>
                  <span className="font-bold text-rose-700 block">Loại bỏ hồ sơ</span>
                  <span className="text-[11px] text-slate-500">Đánh dấu không nhận học, không xếp lớp và không cấp tài khoản.</span>
                </div>
              </label>
            </div>
          </div>

          {action === "OVERRIDE" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Lý do duyệt ngoại lệ <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Theo đề xuất của giáo viên phụ trách trường THPT Trương Định..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] min-h-[70px]"
              />
            </div>
          )}

          {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-xs">
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="h-9 px-4 text-xs font-semibold bg-[#EA580C] hover:bg-orange-700 text-white"
          >
            Lưu quyết định
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SchoolFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onApplyFeedback: (feedbackRows: Array<{ identifier: string; confirmedStatus: string }>) => void;
  allCandidates: any[];
}

export function SchoolFeedbackModal({
  open,
  onClose,
  onApplyFeedback,
  allCandidates,
}: SchoolFeedbackModalProps) {
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedbackFile(file);
    setErrorMsg("");
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

      if (rawRows.length === 0) {
        setErrorMsg("Tệp rỗng hoặc không có dữ liệu!");
        return;
      }

      const parsedFeedback = rawRows.map((r: any) => {
        const getVal = (...keys: string[]) => {
          for (const k of keys) {
            const match = Object.keys(r).find((rk) => rk.trim().toLowerCase().includes(k.toLowerCase()));
            if (match && r[match] !== undefined) return String(r[match]).trim();
          }
          return "";
        };

        const identifier = getVal("email", "số điện thoại", "sđt", "phone", "họ và tên", "họ tên");
        const confirmedStatus = getVal("xác nhận học", "xác nhận", "trạng thái", "học / hủy", "status");
        return { identifier, confirmedStatus };
      });

      onApplyFeedback(parsedFeedback);
      onClose();
    } catch (err: any) {
      setErrorMsg("Lỗi khi đọc file: " + (err.message || String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateAllConfirm = () => {
    // Giả lập trường xác nhận học 90%, 10% hủy
    const simulated = allCandidates.map((c, idx) => ({
      identifier: c.email || c.fullName,
      confirmedStatus: idx % 10 === 0 ? "Hủy" : "Học",
    }));
    onApplyFeedback(simulated);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-xl">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="size-5 text-[#EA580C]" /> Nạp file phản hồi xác nhận học (Pha 2)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Nạp danh sách học sinh mà trường THPT gửi lại kèm trạng thái "Học" hoặc "Hủy".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="border-2 border-dashed border-slate-200 hover:border-[#EA580C] rounded-2xl p-5 text-center bg-slate-50 transition">
            <FileSpreadsheet className="size-8 mx-auto text-[#EA580C] mb-1.5" />
            <p className="text-xs font-semibold text-slate-800">
              {feedbackFile ? feedbackFile.name : "Chọn file Excel phản hồi từ trường"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tệp có cột Email/SĐT và cột "Xác nhận học (Học/Hủy)"</p>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="mt-3 block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-[#EA580C] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">Hoặc mô phỏng nhanh để kiểm thử:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulateAllConfirm}
              className="text-xs border-orange-200 text-[#EA580C] hover:bg-orange-50 h-8"
            >
              Mô phỏng trường xác nhận
            </Button>
          </div>

          {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-xs">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
