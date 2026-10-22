"use client";

import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

interface ExcelAnswerImporterProps {
  isQuestionsFinalized: boolean;
  selectedQuestionNumbers: number[];
  onAnswersImported: (answersMap: Map<number, string>, fileName: string) => void;
  showAlert: (title: string, message: string, type?: "info" | "success" | "warning" | "error") => void;
  disabled?: boolean;
}

export function ExcelAnswerImporter({
  isQuestionsFinalized,
  selectedQuestionNumbers,
  onAnswersImported,
  showAlert,
  disabled = false,
}: ExcelAnswerImporterProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isQuestionsFinalized) {
      showAlert(
        "Chưa chốt danh sách câu hỏi",
        "Vui lòng tích chọn câu hỏi và bấm '🔒 Chốt danh sách câu hỏi sử dụng' trước khi nạp file Excel đáp án!",
        "warning"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      // Bắt buộc bọc Uint8Array để SheetJS luôn đọc được mọi file .xlsx / .xls
      const uint8 = new Uint8Array(buffer);
      const workbook = XLSX.read(uint8, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        showAlert("File Excel trống", "File Excel không chứa bất kỳ bảng tính nào!", "warning");
        return;
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rows || rows.length < 2) {
        showAlert("File Excel thiếu dữ liệu", "File Excel phải có ít nhất 2 dòng (dòng tiêu đề và dòng câu hỏi)!", "warning");
        return;
      }

      const answersMap = new Map<number, string>();

      // Duyệt qua từng dòng dữ liệu (tự động bỏ qua dòng tiêu đề)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        const colA = String(row[0] ?? "").trim();
        const colB = String(row[1] ?? "").trim();

        // Bỏ qua dòng tiêu đề nếu chứa chữ: Câu số, Câu, Question, No, STT...
        if (/^(câu\s*số|câu|question|no|stt|q\b)/i.test(colA)) {
          continue;
        }

        const qNum = parseInt(colA.replace(/\D/g, ""), 10);
        if (!isNaN(qNum) && qNum > 0 && colB.length > 0) {
          answersMap.set(qNum, colB);
        }
      }

      if (answersMap.size === 0) {
        showAlert(
          "Không tìm thấy đáp án hợp lệ",
          "Vui lòng đảm bảo Cột A là số thứ tự câu hỏi (ví dụ: 14, 15...) và Cột B là đáp án (ví dụ: 1, A, TRUE...)!",
          "warning"
        );
        return;
      }

      onAnswersImported(answersMap, file.name);
    } catch (err: any) {
      console.error("[ExcelAnswerImporter] Lỗi đọc file Excel:", err);
      showAlert(
        "Lỗi đọc file Excel",
        `Không thể đọc tệp "${file.name}". Lỗi: ${err.message || "Tệp không đúng định dạng .xlsx tiêu chuẩn"}`,
        "error"
      );
    } finally {
      // Reset input để có thể chọn lại file mới
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        id="excel-answer-file-input"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className="h-8 text-xs font-semibold rounded-xl border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 shadow-2xs gap-1.5"
      >
        <FileSpreadsheet className="size-3.5 text-emerald-700" />
        Nạp Đáp án Excel (2 Cột)
      </Button>
    </div>
  );
}
