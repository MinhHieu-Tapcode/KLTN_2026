"use client";

import React from "react";
import { BookOpen, FileText, ClipboardCheck, Sparkles } from "lucide-react";

export type MaterialTypeOption = "COURSEBOOK" | "SUPPLEMENTARY" | "PRACTICE_TEST";

interface MaterialTypeSelectorProps {
  value: MaterialTypeOption;
  onChange: (val: MaterialTypeOption) => void;
}

export function MaterialTypeSelector({ value, onChange }: MaterialTypeSelectorProps) {
  const options: Array<{
    type: MaterialTypeOption;
    title: string;
    subtitle: string;
    badge?: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      type: "COURSEBOOK",
      title: "Sách giáo khoa / Giáo trình",
      subtitle: "Bao gồm sách PDF và file âm thanh Audio nghe",
      badge: "Kèm Audio bắt buộc",
      icon: <BookOpen className="size-4 text-purple-600" />,
      color: "border-purple-200 bg-purple-50/30 text-purple-900",
    },
    {
      type: "SUPPLEMENTARY",
      title: "Tài liệu bổ trợ / Slide",
      subtitle: "Slide bài giảng, handout, bảng từ vựng, PDF đọc",
      icon: <FileText className="size-4 text-sky-600" />,
      color: "border-sky-200 bg-sky-50/30 text-sky-900",
    },
    {
      type: "PRACTICE_TEST",
      title: "Bộ đề thi / Thực hành",
      subtitle: "Đề luyện thi thử IELTS, audio nghe và phiếu đáp án",
      badge: "Có thể kèm Audio",
      icon: <ClipboardCheck className="size-4 text-amber-600" />,
      color: "border-amber-200 bg-amber-50/30 text-amber-900",
    },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span>Phân loại học liệu</span>
          <span className="text-rose-500">*</span>
        </label>
        <span className="text-[11px] text-slate-400">Chọn đúng loại để hiển thị định dạng tải lên phù hợp</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onChange(opt.type)}
              className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                isSelected
                  ? "border-[#EA580C] bg-orange-50/50 shadow-sm ring-1 ring-[#EA580C]/30"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    {opt.icon}
                    <span>{opt.title}</span>
                  </div>
                  {opt.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        opt.type === "COURSEBOOK"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{opt.subtitle}</p>
              </div>

              {isSelected && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-[#EA580C] font-bold">
                  <Sparkles className="size-3" />
                  <span>Đã chọn</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
