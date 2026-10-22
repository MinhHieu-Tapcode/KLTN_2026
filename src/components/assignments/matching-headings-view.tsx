"use client";

import React from "react";
import { MatchingHeadingsGroup } from "@/lib/exam-parser/types";
import { ListOrdered, KeyRound, Check } from "lucide-react";

interface MatchingHeadingsViewProps {
  group: MatchingHeadingsGroup;
  answers: Record<string | number, string>;
  onAnswerChange?: (questionNumber: number, value: string) => void;
  activeQuestionNumber?: number;
  onSelectQuestion?: (questionNumber: number) => void;
  isReadOnly?: boolean;
  isTeacherKeyMode?: boolean;
}

export function MatchingHeadingsView({
  group,
  answers,
  onAnswerChange,
  activeQuestionNumber,
  onSelectQuestion,
  isReadOnly = false,
  isTeacherKeyMode = false,
}: MatchingHeadingsViewProps) {
  if (!group || !group.headings || group.headings.length === 0) {
    return null;
  }

  // Tập hợp các heading đã được chọn để cảnh báo không chọn trùng
  const usedHeadings = new Set(
    group.items.map((it) => {
      const qNum = it.questionNumber;
      return answers[qNum] || answers[`q_${qNum}`] || "";
    }).filter(Boolean)
  );

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden mb-5">
      {/* 1. Header Khối Matching Headings */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 px-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-[#EA580C] flex items-center justify-center text-white shrink-0 shadow-xs">
            <ListOrdered className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight text-white uppercase">
              {group.title || "Matching Headings"}
            </h4>
            <div className="text-[11px] text-slate-300">
              {group.instruction ||
                "Choose the correct heading for each section from the list of headings below."}
            </div>
          </div>
        </div>

        {group.questionNumbers && group.questionNumbers.length > 0 && (
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-orange-400">
            Câu {Math.min(...group.questionNumbers)} - {Math.max(...group.questionNumbers)}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Hộp List of Headings (Màu vàng/cam hổ phách nhạt chuẩn Form 1.2 SIMPACE) */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-2.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900 border-b border-amber-200/60 pb-1.5 flex items-center justify-between">
            <span>List of Headings</span>
            <span className="text-[10px] font-semibold text-amber-700 lowercase font-sans">
              ({group.headings.length} tiêu đề)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {group.headings.map((h) => {
              const isUsed = usedHeadings.has(h.romanNumeral.toLowerCase()) || usedHeadings.has(h.romanNumeral.toUpperCase());
              return (
                <div
                  key={h.id || h.romanNumeral}
                  className={`flex items-start gap-2 py-1 px-1.5 rounded transition ${
                    isUsed ? "text-slate-400 opacity-60 line-through" : "text-slate-800 font-medium"
                  }`}
                >
                  <span className="font-mono font-bold text-amber-900 shrink-0 min-w-[24px]">
                    {h.romanNumeral}.
                  </span>
                  <span className="leading-relaxed">{h.text}</span>
                  {isUsed && (
                    <span title="Đã được gán">
                      <Check className="size-3 text-emerald-600 shrink-0 ml-auto mt-0.5" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Danh sách các đoạn văn Paragraph A, B, C... kèm Dropdown chọn */}
        <div className="space-y-2.5 pt-1">
          {group.items.map((it) => {
            const qNum = it.questionNumber;
            const currentVal = answers[qNum] || answers[`q_${qNum}`] || "";
            const isActive = activeQuestionNumber === qNum;

            return (
              <div
                key={qNum}
                onClick={() => onSelectQuestion?.(qNum)}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer ${
                  isActive
                    ? "bg-orange-50/80 border-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-xs"
                    : "bg-slate-50/60 border-slate-200/80 hover:border-slate-300"
                }`}
              >
                {/* Nhãn đoạn văn: Paragraph A (Câu 14) */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`flex items-center justify-center size-6 rounded-md text-[11px] font-bold font-mono shrink-0 shadow-2xs ${
                      isActive ? "bg-[#EA580C] text-white" : "bg-slate-900 text-white"
                    }`}
                  >
                    {qNum}
                  </span>
                  <span className="font-bold text-xs text-slate-800">
                    {it.paragraphLabel || `Paragraph ${String.fromCharCode(65 + qNum - 1)}`}
                  </span>
                  {isTeacherKeyMode && (
                    <span title="Đáp án chuẩn của giáo viên">
                      <KeyRound className="size-3.5 text-emerald-600 shrink-0 ml-1" />
                    </span>
                  )}
                </div>

                {/* Dropdown Selector */}
                <div className="flex-1 sm:max-w-md">
                  <select
                    disabled={isReadOnly}
                    value={currentVal}
                    onChange={(e) => onAnswerChange?.(qNum, e.target.value)}
                    className={`w-full h-8.5 px-3 text-xs rounded-lg border font-medium transition-all bg-white focus:outline-none ${
                      isTeacherKeyMode
                        ? "border-emerald-300 bg-emerald-50/50 text-emerald-950 font-semibold focus:ring-1 focus:ring-emerald-500"
                        : isActive
                        ? "border-[#EA580C] ring-1 ring-[#EA580C]/30 text-slate-900"
                        : "border-slate-300 text-slate-800 hover:border-slate-400"
                    }`}
                  >
                    <option value="">-- Choose a heading... --</option>
                    {group.headings.map((h) => {
                      const isUsedElsewhere =
                        usedHeadings.has(h.romanNumeral.toLowerCase()) &&
                        currentVal.toLowerCase() !== h.romanNumeral.toLowerCase();

                      return (
                        <option
                          key={h.romanNumeral}
                          value={h.romanNumeral}
                          className={isUsedElsewhere ? "text-slate-400" : "text-slate-900"}
                        >
                          {h.romanNumeral}. {h.text} {isUsedElsewhere ? " (Đã chọn ở đoạn khác)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
