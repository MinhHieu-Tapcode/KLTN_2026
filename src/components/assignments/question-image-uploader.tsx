"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  CopyCheck,
  Maximize2,
  X,
} from "lucide-react";
import { uploadMaterialFileClient } from "@/lib/upload-material-client";
import { detectQuestionMediaRequirement } from "@/lib/exam-parser/question-media-detector";

export interface QuestionImageUploaderProps {
  question: any;
  assignmentSkill?: string;
  totalQuestions?: number;
  onChangeImageUrl?: (imageUrl: string | null) => void;
  onImageChange?: (imageUrl: string | null) => void;
  onApplyImageToRange?: (fromQ: number, toQ: number, imageUrl: string) => void;
  onApplyToRange?: (fromQ: number, toQ: number, imageUrl: string) => void;
}

export function QuestionImageUploader({
  question: q,
  assignmentSkill,
  totalQuestions = 40,
  onChangeImageUrl,
  onImageChange,
  onApplyImageToRange,
  onApplyToRange,
}: QuestionImageUploaderProps) {
  const handleImageChange = onChangeImageUrl || onImageChange || (() => {});
  const handleApplyRange = onApplyImageToRange || onApplyToRange;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<number>(Number(q.questionNumber) || 1);
  const [rangeEnd, setRangeEnd] = useState<number>(
    Math.min(totalQuestions, (Number(q.questionNumber) || 1) + 4)
  );
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const req = detectQuestionMediaRequirement(q, assignmentSkill);
  const currentUrl = q.imageUrl || "";
  const shouldShowBox =
    req.level === "REQUIRED" ||
    req.level === "RECOMMENDED" ||
    Boolean(currentUrl) ||
    isExpanded;

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Vui lòng chỉ chọn tệp hình ảnh (.png, .jpg, .jpeg, .webp)!");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    const res = await uploadMaterialFileClient(file);
    setIsUploading(false);

    if (res.success && res.fileUrl) {
      handleImageChange(res.fileUrl);
    } else {
      setUploadError(res.error || "Tải ảnh lên thất bại, vui lòng thử lại!");
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          const ext = blob.type.split("/")[1] || "png";
          const pastedFile = new File(
            [blob],
            `question_${q.questionNumber || 1}_diagram.${ext}`,
            { type: blob.type }
          );
          await handleFileUpload(pastedFile);
          break;
        }
      }
    }
  };

  if (!shouldShowBox) {
    return (
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-[11px] font-semibold text-slate-500 hover:text-[#EA580C] flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-200 hover:border-orange-300 bg-white transition"
        >
          <ImageIcon className="size-3.5 text-[#EA580C]" />
          <span>+ Đính kèm ảnh Bản đồ / Biểu đồ / Sơ đồ / Bảng (hoặc dán Ctrl+V)</span>
        </button>
      </div>
    );
  }

  const isMissingRequired = req.level === "REQUIRED" && !currentUrl;
  const isRecommended = req.level === "RECOMMENDED" && !currentUrl;

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className={`p-3 rounded-xl border transition space-y-2.5 outline-none focus:ring-2 focus:ring-[#EA580C]/30 ${
        isMissingRequired
          ? "bg-rose-50/70 border-rose-300"
          : isRecommended
          ? "bg-amber-50/70 border-amber-300"
          : "bg-orange-50/40 border-orange-200/80"
      }`}
    >
      {/* Dòng cảnh báo / tiêu đề */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {isMissingRequired ? (
            <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
          ) : currentUrl ? (
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[11px] font-bold ${
                  isMissingRequired
                    ? "text-rose-800"
                    : currentUrl
                    ? "text-emerald-800"
                    : "text-amber-900"
                }`}
              >
                {isMissingRequired
                  ? `BẮT BUỘC CẦN ẢNH: ${req.categoryLabel}`
                  : currentUrl
                  ? `Đã gắn hình ảnh: ${req.categoryLabel}`
                  : `Gợi ý đính kèm ảnh: ${req.categoryLabel}`}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-600 leading-relaxed">{req.reason}</p>
          </div>
        </div>

        {req.level === "OPTIONAL" && !currentUrl && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
            title="Ẩn khung ảnh"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Khu vực Xem trước Ảnh hoặc Nút Tải/Dán Ảnh */}
      {currentUrl ? (
        <div className="space-y-2">
          <div className="relative rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center max-h-56 overflow-hidden group">
            <img
              src={currentUrl}
              alt={`Hình minh họa câu ${q.questionNumber}`}
              className="max-h-52 w-auto object-contain rounded-lg"
            />
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="px-2 py-1 text-[10px] font-semibold text-white hover:text-orange-300 flex items-center gap-1"
              >
                <Maximize2 className="size-3" /> Phóng to
              </button>
              <label className="px-2 py-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200 cursor-pointer flex items-center gap-1">
                <Upload className="size-3" /> Đổi ảnh
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => handleImageChange(null)}
                className="px-2 py-1 text-[10px] font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1"
              >
                <Trash2 className="size-3" /> Xóa
              </button>
            </div>
          </div>

          {/* Tùy chọn áp dụng chung ảnh Bản đồ / Bảng cho dải câu hỏi (VD: Câu 11 -> 15) */}
          {handleApplyRange && totalQuestions > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-[11px]">
              <span className="font-semibold text-slate-700">
                Dùng chung ảnh này cho nhóm câu hỏi:
              </span>
              <div className="flex items-center gap-1.5">
                <span>Từ câu</span>
                <input
                  type="number"
                  min={1}
                  max={totalQuestions}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className="w-12 h-6 text-center border border-slate-300 rounded font-bold"
                />
                <span>đến câu</span>
                <input
                  type="number"
                  min={rangeStart}
                  max={totalQuestions}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-12 h-6 text-center border border-slate-300 rounded font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleApplyRange(rangeStart, rangeEnd, currentUrl);
                    setAppliedSuccess(true);
                    setTimeout(() => setAppliedSuccess(false), 2500);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold flex items-center gap-1 transition"
                >
                  <CopyCheck className="size-3" />
                  {appliedSuccess ? "Đã gắn cho nhóm!" : "Áp dụng nhóm"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-white p-3 rounded-xl border border-dashed border-slate-300 hover:border-[#EA580C] transition">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <div className="size-8 rounded-lg bg-orange-50 text-[#EA580C] flex items-center justify-center shrink-0">
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageIcon className="size-4" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-[11px]">
                {isUploading
                  ? "Đang tải ảnh lên máy chủ..."
                  : "Bấm vào khung này và nhấn Ctrl + V để dán ảnh vừa chụp màn hình"}
              </p>
              <p className="text-[10px] text-slate-400">
                Hỗ trợ PNG, JPG, WEBP • Giữ nguyên độ nét gốc cho học viên phóng to
              </p>
            </div>
          </div>

          <label className="px-3 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-[11px] cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs transition">
            <Upload className="size-3.5" />
            <span>Chọn tệp ảnh...</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {uploadError && (
        <p className="text-[11px] font-semibold text-rose-600">{uploadError}</p>
      )}

      {/* Lightbox xem ảnh lớn */}
      {isLightboxOpen && currentUrl && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl overflow-auto"
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-3 right-3 size-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-rose-600 transition"
            >
              <X className="size-4" />
            </button>
            <img
              src={currentUrl}
              alt="Xem chi tiết hình ảnh đề thi"
              className="max-w-full h-auto mx-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
