"use client";

import React, { useState } from "react";
import { CheckCircle2, Crop, ImageIcon, ImageOff, Layers, Loader2 } from "lucide-react";
import { ParsedExamResult } from "@/lib/exam-parser/types";
import { getIeltsSubtypeLabel } from "@/lib/ielts-report-config";
import { FigureBox, cropFigureAndUpload } from "@/lib/exam-parser/pdf-crop-client";
import {
  ParsedGroupInfo,
  applyImageToGroup,
  convertGroupToImageMode,
  listParsedGroups,
} from "@/lib/exam-parser/parsed-groups";
import { FigureCropAdjuster } from "./figure-crop-adjuster";
import { AutoCropStatus } from "./hooks/use-auto-figure-crop";

/**
 * Bảng trạng thái từng nhóm câu của phần thi đang xem (sau khi bóc tách):
 * xanh = đã dựng giao diện tương tác, vàng = dạng ảnh đề gốc, đỏ = bắt buộc có ảnh mà chưa có.
 * Cho GV chỉnh vùng cắt ảnh và chuyển một nhóm sang dạng ảnh khi cấu trúc AI dựng sai.
 */

type ShowAlert = (title: string, desc: string, type?: "success" | "error" | "warning" | "info") => void;

export interface ParsedGroupSummaryProps {
  parsedEbookData: ParsedExamResult;
  setParsedEbookData: (updater: (prev: any) => any) => void;
  activeSectionId: string;
  pdfFile: File | null;
  autoCropStatus: AutoCropStatus;
  isLocked: boolean;
  showAlert: ShowAlert;
}

function groupState(g: ParsedGroupInfo): { label: string; className: string; icon: React.ReactNode } {
  if (g.needsImage && !g.imageUrl) {
    return { label: "Thiếu ảnh", className: "bg-rose-50 text-rose-700 border-rose-200", icon: <ImageOff className="size-3" /> };
  }
  if (g.renderMode === "IMAGE") {
    return { label: "Ảnh đề gốc + ô đáp án", className: "bg-amber-50 text-amber-800 border-amber-200", icon: <ImageIcon className="size-3" /> };
  }
  return {
    label: g.hasStructure ? "Giao diện tương tác" : "Đã dựng câu hỏi",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="size-3" />,
  };
}

export function ParsedGroupSummary({
  parsedEbookData,
  setParsedEbookData,
  activeSectionId,
  pdfFile,
  autoCropStatus,
  isLocked,
  showAlert,
}: ParsedGroupSummaryProps) {
  const [adjusting, setAdjusting] = useState<ParsedGroupInfo | null>(null);
  const groups = listParsedGroups(parsedEbookData, activeSectionId);
  const info = parsedEbookData.engineInfo;
  const canCrop = Boolean(pdfFile && pdfFile.name.toLowerCase().endsWith(".pdf"));

  if (groups.length === 0 && !info) return null;

  const handleCropConfirm = async (page: number, box: FigureBox) => {
    if (!adjusting || !pdfFile) return;
    try {
      const res = await cropFigureAndUpload(pdfFile, page, box, `${adjusting.sectionKey || "de"}_${adjusting.title}`);
      setParsedEbookData((prev) => (prev ? applyImageToGroup(prev, adjusting.sectionKey, adjusting.numbers, res.url, { page, box }) : prev));
      showAlert(
        "Đã cập nhật ảnh",
        res.persisted
          ? `Đã gắn ảnh mới cho ${adjusting.title}.`
          : `Đã gắn ảnh cho ${adjusting.title} nhưng máy chủ chưa lưu được tệp (ảnh tạm, mất khi tải lại trang).`,
        res.persisted ? "success" : "warning"
      );
    } catch {
      showAlert("Không cắt được ảnh", "Không cắt được vùng đã chọn. Vui lòng thử lại hoặc tải ảnh thủ công.", "error");
    }
  };

  const handleToImageMode = (g: ParsedGroupInfo) => {
    setParsedEbookData((prev) => (prev ? convertGroupToImageMode(prev, g.sectionKey, g.numbers) : prev));
    // Mở công cụ cắt ngay tại trang của nhóm để GV khoanh vùng bảng/sơ đồ
    if (canCrop) setAdjusting({ ...g, renderMode: "IMAGE", needsImage: true });
    else showAlert("Đã chuyển sang dạng ảnh", `Hãy tải ảnh đề gốc cho ${g.title} bằng nút tải ảnh ở từng câu.`, "info");
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Layers className="size-4 text-[#EA580C]" /> Các nhóm câu của phần đang xem ({groups.length})
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {autoCropStatus.running && (
            <span className="flex items-center gap-1 text-[#EA580C] font-semibold">
              <Loader2 className="size-3 animate-spin" /> Đang tự cắt ảnh đề gốc {autoCropStatus.done}/{autoCropStatus.total}
            </span>
          )}
          {info && (
            <span>
              {info.engine === "claude"
                ? `Đọc bằng ${info.model}${info.escalated ? " (đã nâng model)" : ""} · ${Math.round((info.durationMs || 0) / 1000)} giây`
                : "Đọc bằng bộ bóc tách cũ"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        {groups.map((g) => {
          const st = groupState(g);
          return (
            <div key={g.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs">
              <span className="font-bold text-slate-800 min-w-[110px]">{g.title}</span>
              <span className="text-slate-500">{g.ieltsQuestionType ? getIeltsSubtypeLabel(g.ieltsQuestionType) : `${g.numbers.length} câu`}</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.className}`}>
                {st.icon} {st.label}
              </span>
              <div className="ml-auto flex gap-1.5">
                {canCrop && (g.needsImage || g.renderMode === "IMAGE") && (
                  <button
                    type="button"
                    onClick={() => setAdjusting(g)}
                    className="inline-flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#EA580C] hover:bg-orange-100"
                  >
                    <Crop className="size-3" /> Chỉnh vùng ảnh
                  </button>
                )}
                {!isLocked && !g.isWriting && g.renderMode !== "IMAGE" && (g.hasStructure || g.needsImage) && (
                  <button
                    type="button"
                    onClick={() => handleToImageMode(g)}
                    title="Dùng khi bảng/sơ đồ AI dựng sai: học viên làm bài trên ảnh đề gốc"
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Dùng ảnh đề gốc
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!canCrop && groups.some((g) => g.needsImage && !g.imageUrl) && (
        <p className="text-[11px] text-slate-500">
          Muốn tự cắt ảnh, hãy tải lại tệp PDF đề (bản nháp không lưu tệp PDF); hoặc tải ảnh thủ công ở từng câu.
        </p>
      )}

      {adjusting && pdfFile && (
        <FigureCropAdjuster
          open={Boolean(adjusting)}
          onOpenChange={(o) => !o && setAdjusting(null)}
          pdfFile={pdfFile}
          groupTitle={adjusting.title}
          initialPage={adjusting.figurePage || 1}
          initialBox={adjusting.figureBox}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
