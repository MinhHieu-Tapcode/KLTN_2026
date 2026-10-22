import React from "react";
import { ExamInvariantsReport } from "@/services/ielts-invariants.service";
import { CheckCircle2, AlertTriangle, AlertCircle, Layers, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface InvariantsBannerProps {
  report?: ExamInvariantsReport | null;
}

export function InvariantsBanner({ report }: InvariantsBannerProps) {
  if (!report) return null;

  const {
    isValid,
    totalQuestions,
    expectedTotal,
    isSequential,
    missingNumbers,
    duplicateNumbers,
    sectionsBreakdown,
    errors,
    warnings,
  } = report;

  return (
    <div className="space-y-2">
      {/* Thẻ trạng thái tổng thể */}
      <div
        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
          isValid
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            : "bg-rose-50/80 border-rose-200 text-rose-900"
        }`}
      >
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="size-4 text-rose-600 shrink-0" />
          )}
          <div>
            <span className="font-bold">
              {isValid
                ? "Bộ đề đạt chuẩn bất biến IELTS (Computer-Delivered Invariants): "
                : "Cảnh báo bất biến bộ đề: "}
            </span>
            <span>
              {isValid
                ? `Đã bóc tách đủ ${totalQuestions} câu hỏi liên tục, không trùng lặp, sẵn sàng làm bài.`
                : errors.join(". ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[11px] font-bold ${
              isSequential
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-rose-100 text-rose-800 border-rose-300"
            }`}
          >
            {isSequential ? "Thứ tự 1 → N liên tục" : "Bị gián đoạn thứ tự"}
          </Badge>
          <Badge
            variant="outline"
            className="bg-white/80 text-slate-800 border-slate-300 text-[11px] font-bold"
          >
            Tổng số: {totalQuestions}/{expectedTotal} câu
          </Badge>
        </div>
      </div>

      {/* Cảnh báo thiếu câu hoặc trùng câu nếu có */}
      {missingNumbers.length > 0 && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
          <span>
            <b>Thiếu các câu hỏi: </b> Câu {missingNumbers.join(", ")}. Vui lòng kiểm tra lại văn bản đề gốc.
          </span>
        </div>
      )}

      {duplicateNumbers.length > 0 && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
          <AlertCircle className="size-3.5 text-rose-600 shrink-0" />
          <span>
            <b>Trùng lặp số câu hỏi: </b> Câu {duplicateNumbers.join(", ")}.
          </span>
        </div>
      )}

      {/* Báo cáo phân bổ Section / Passage */}
      {sectionsBreakdown && sectionsBreakdown.length > 0 && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1.5">
            <Layers className="size-3.5 text-[#EA580C]" />
            <span>Phân bổ theo từng Phần thi (Sections / Passages):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sectionsBreakdown.map((sec, idx) => (
              <div
                key={sec.sectionKey || idx}
                className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-0.5"
              >
                <div className="font-semibold text-slate-900 truncate" title={sec.title}>
                  {sec.title}
                </div>
                <div className="text-[11px] text-slate-500">
                  Phạm vi: <b className="text-slate-700">{sec.questionRange}</b> ({sec.questionCount} câu)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
