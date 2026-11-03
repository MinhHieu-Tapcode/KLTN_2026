"use client";

import React from "react";
import { BookOpen, FileText, ClipboardCheck, Check } from "lucide-react";

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
    icon: React.ReactNode;
  }> = [
    {
      type: "SUPPLEMENTARY",
      title: "Tài liệu học tập / Bài giảng",
      subtitle: "PDF, Word, Excel, Slide, Hình ảnh (PNG/JPG), Audio...",
      icon: <FileText className="size-4 text-[#EA580C]" />,
    },
    {
      type: "COURSEBOOK",
      title: "Giáo trình / Sách giáo khoa",
      subtitle: "Sách giáo trình chính khóa (có thể đính kèm các file nghe)",
      icon: <BookOpen className="size-4 text-[#EA580C]" />,
    },
    {
      type: "PRACTICE_TEST",
      title: "Bộ đề luyện tập / Đáp án",
      subtitle: "Đề luyện tập PDF/Word kèm file nghe hoặc đáp án",
      icon: <ClipboardCheck className="size-4 text-[#EA580C]" />,
    },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-800 block">
        1. Chọn loại học liệu <span className="text-rose-500">*</span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const isSelected = value === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onChange(opt.type)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? "border-[#EA580C] bg-orange-50/50 shadow-sm ring-1 ring-[#EA580C]/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    {opt.icon}
                    <span>{opt.title}</span>
                  </div>
                  {isSelected && (
                    <span className="size-4 rounded-full bg-[#EA580C] text-white grid place-items-center shrink-0">
                      <Check className="size-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{opt.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
