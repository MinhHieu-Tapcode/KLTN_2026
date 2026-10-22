"use client";

import React from "react";
import { SummaryCompletionGroup } from "@/lib/exam-parser/types";
import { FileText, KeyRound } from "lucide-react";

interface SummaryCompletionViewProps {
  group: SummaryCompletionGroup;
  answers: Record<string | number, string>;
  onAnswerChange?: (questionNumber: number, value: string) => void;
  activeQuestionNumber?: number;
  onSelectQuestion?: (questionNumber: number) => void;
  isReadOnly?: boolean;
  isTeacherKeyMode?: boolean;
}

export function SummaryCompletionView({
  group,
  answers,
  onAnswerChange,
  activeQuestionNumber,
  onSelectQuestion,
  isReadOnly = false,
  isTeacherKeyMode = false,
}: SummaryCompletionViewProps) {
  if (!group || !group.summaryText) {
    return null;
  }

  // Tách đoạn văn bản theo các chỗ trống (1) _______ hoặc [1] _______ hoặc _______
  const renderInlineSummary = () => {
    const raw = group.summaryText;
    const tokenRegex = /(\(\s*\d{1,3}\s*\)\s*_{2,}|\b\d{1,3}\s*_{2,}|_{3,})/g;
    const parts = raw.split(tokenRegex);

    let detectedIndex = 0;

    return parts.map((part, pIdx) => {
      if (!part) return null;

      // Kiểm tra xem part có phải là ô điền từ không
      const isBlank = /_{2,}/.test(part);
      if (!isBlank) {
        return (
          <span key={pIdx} className="leading-loose text-slate-800 font-medium">
            {part}
          </span>
        );
      }

      // Xác định số câu hỏi tương ứng
      const matchNum = part.match(/\d{1,3}/);
      const qNum = matchNum
        ? parseInt(matchNum[0], 10)
        : group.questionNumbers?.[detectedIndex] || detectedIndex + 1;

      detectedIndex++;

      const currentVal = answers[qNum] || answers[`q_${qNum}`] || "";
      const isActive = activeQuestionNumber === qNum;

      return (
        <span
          key={pIdx}
          onClick={() => onSelectQuestion?.(qNum)}
          className="inline-flex items-center gap-1.5 align-middle mx-1.5 my-1"
        >
          {/* Badge số câu hỏi */}
          <span
            className={`inline-flex items-center justify-center size-5.5 rounded-full text-[10px] font-bold font-mono shrink-0 shadow-2xs select-none ${
              isActive ? "bg-[#EA580C] text-white ring-2 ring-[#EA580C]/20" : "bg-slate-800 text-white"
            }`}
          >
            {qNum}
          </span>

          {/* Ô gõ đáp án inline */}
          <input
            type="text"
            disabled={isReadOnly}
            value={currentVal}
            onChange={(e) => onAnswerChange?.(qNum, e.target.value)}
            placeholder={isTeacherKeyMode ? "Đáp án..." : "Điền từ..."}
            className={`w-28 sm:w-36 h-7.5 px-2.5 text-xs rounded-lg border font-medium text-center transition-all bg-white focus:outline-none ${
              isTeacherKeyMode
                ? "border-emerald-300 bg-emerald-50/60 text-emerald-950 font-semibold focus:ring-1 focus:ring-emerald-500"
                : isActive
                ? "border-[#EA580C] ring-2 ring-[#EA580C]/20 text-slate-900 shadow-2xs"
                : "border-slate-300 text-slate-800 hover:border-slate-400"
            }`}
          />

          {isTeacherKeyMode && (
            <span title="Đáp án chuẩn của giáo viên">
              <KeyRound className="size-3 text-emerald-600 shrink-0" />
            </span>
          )}
        </span>
      );
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden mb-5">
      {/* Header Khối Summary Completion */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 px-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-[#EA580C] flex items-center justify-center text-white shrink-0 shadow-xs">
            <FileText className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight text-white uppercase">
              {group.title || "Summary Completion"}
            </h4>
            <div className="text-[11px] text-slate-300">
              {group.instruction ||
                "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer."}
            </div>
          </div>
        </div>

        {group.questionNumbers && group.questionNumbers.length > 0 && (
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-orange-400">
            Câu {Math.min(...group.questionNumbers)} - {Math.max(...group.questionNumbers)}
          </span>
        )}
      </div>

      {/* Nội dung đoạn tóm tắt chứa các ô điền từ inline */}
      <div className="p-4 sm:p-5 bg-slate-50/40 text-xs sm:text-sm leading-loose text-justify font-sans">
        {renderInlineSummary()}
      </div>
    </div>
  );
}
