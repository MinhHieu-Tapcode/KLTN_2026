"use client";

import React from "react";
import { FlowchartGroup, FlowchartBox } from "@/lib/exam-parser/types";
import { ArrowDown, ArrowRight, GitFork, Info } from "lucide-react";

interface FlowchartViewProps {
  flowchart: FlowchartGroup;
  answers: Record<string | number, string>;
  onAnswerChange?: (questionNumber: number, value: string) => void;
  activeQuestionNumber?: number;
  onSelectQuestion?: (questionNumber: number) => void;
  isReadOnly?: boolean;
  isTeacherKeyMode?: boolean;
}

/**
 * Render dòng text chứa ô điền từ inline (18) [________] trực tiếp trong khối hộp
 */
function renderInlineTemplate(
  template: string,
  qNums: number[],
  answers: Record<string | number, string>,
  onAnswerChange?: (qNum: number, val: string) => void,
  activeQuestionNumber?: number,
  onSelectQuestion?: (qNum: number) => void,
  isReadOnly?: boolean
) {
  const lines = template.split("\n");
  let qCounter = 0;

  return (
    <div className="space-y-1.5 text-xs text-slate-800 font-sans">
      {lines.map((line, lIdx) => {
        const parts = line.split(/_{3,}|\(\d+\)\s*_{2,}/);
        if (parts.length <= 1) {
          return (
            <div key={lIdx} className="leading-relaxed">
              {line}
            </div>
          );
        }

        const elements: React.ReactNode[] = [];
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
          }
          if (i < parts.length - 1) {
            const currentQ = qNums[qCounter] || qNums[0] || 1;
            qCounter++;
            const currentVal = answers[currentQ] || answers[`q_${currentQ}`] || "";
            const isActive = activeQuestionNumber === currentQ;

            elements.push(
              <span key={`input-${i}`} className="inline-flex items-center mx-1 align-baseline">
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={currentVal}
                  onFocus={() => onSelectQuestion?.(currentQ)}
                  onChange={(e) => onAnswerChange?.(currentQ, e.target.value)}
                  placeholder={`(${currentQ})`}
                  className={`w-28 h-6 text-xs text-center font-bold px-2 rounded-md border transition-all outline-none ${
                    isActive
                      ? "border-[#EA580C] bg-orange-50 text-[#EA580C] ring-2 ring-[#EA580C]/20 shadow-xs"
                      : currentVal
                      ? "border-emerald-500 bg-emerald-50/50 text-emerald-900"
                      : "border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                  }`}
                />
              </span>
            );
          }
        }

        return (
          <div key={lIdx} className="leading-loose">
            {elements}
          </div>
        );
      })}
    </div>
  );
}

export function FlowchartView({
  flowchart,
  answers,
  onAnswerChange,
  activeQuestionNumber,
  onSelectQuestion,
  isReadOnly = false,
}: FlowchartViewProps) {
  if (!flowchart || !flowchart.boxes || flowchart.boxes.length === 0) {
    return null;
  }

  const boxes = flowchart.boxes;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* 1. Header Form 1.4 Flow-chart Completion */}
      <div className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider">
            1.4 Flow-chart Completion
          </span>
          <span className="text-xs font-bold text-slate-800">{flowchart.title}</span>
        </div>
        {flowchart.instruction && (
          <p className="text-xs text-slate-500 italic leading-relaxed pt-0.5">
            {flowchart.instruction}
          </p>
        )}
      </div>

      {/* 2. SƠ ĐỒ DÒNG CHẢY KHỐI HỘP THỰC SỰ KÈM MŨI TÊN (FLOWCHART LAYOUT) */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
        {/* Tầng 1: Khối Bắt đầu & 2 Bước đầu nối mũi tên ngang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          {/* Hộp 1 */}
          <div className="relative p-3 rounded-xl border border-slate-300 bg-white shadow-2xs text-center">
            {renderInlineTemplate(
              boxes[0]?.textTemplate || "",
              boxes[0]?.questionNumbers || [18],
              answers,
              onAnswerChange,
              activeQuestionNumber,
              onSelectQuestion,
              isReadOnly
            )}
          </div>

          {/* Hộp 2 */}
          <div className="relative p-3 rounded-xl border border-slate-300 bg-white shadow-2xs text-center">
            {renderInlineTemplate(
              boxes[1]?.textTemplate || "",
              boxes[1]?.questionNumbers || [19],
              answers,
              onAnswerChange,
              activeQuestionNumber,
              onSelectQuestion,
              isReadOnly
            )}
          </div>
        </div>

        {/* Mũi tên chỉ xuống tầng tiếp theo */}
        <div className="flex justify-around text-slate-400 py-0.5">
          <ArrowDown className="size-4 animate-bounce" />
          <ArrowDown className="size-4 animate-bounce" />
        </div>

        {/* Tầng 2: Khối trung tâm (Chỉ dẫn tĩnh) & Bước tiếp theo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          {/* Hộp 3: Chỉ dẫn tĩnh (Static Box) */}
          <div className="p-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 text-center flex items-center justify-center gap-2">
            <Info className="size-3.5 text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-blue-900 italic">
              {boxes[2]?.textTemplate || "playing with language for a long time"}
            </span>
          </div>

          {/* Hộp 4 */}
          <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-2xs text-center">
            {renderInlineTemplate(
              boxes[3]?.textTemplate || "",
              boxes[3]?.questionNumbers || [20],
              answers,
              onAnswerChange,
              activeQuestionNumber,
              onSelectQuestion,
              isReadOnly
            )}
          </div>
        </div>

        {/* Mũi tên chỉ xuống tầng 3 */}
        <div className="flex justify-around text-slate-400 py-0.5">
          <ArrowDown className="size-4" />
          <ArrowDown className="size-4" />
        </div>

        {/* Tầng 3: Các bước cuối */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
          {/* Hộp 5: Nhiều ô trống (21 & 22) */}
          <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-2xs text-left">
            {renderInlineTemplate(
              boxes[4]?.textTemplate || "",
              boxes[4]?.questionNumbers || [21, 22],
              answers,
              onAnswerChange,
              activeQuestionNumber,
              onSelectQuestion,
              isReadOnly
            )}
          </div>

          {/* Hộp 6: Bước cuối cùng (23) */}
          <div className="p-3 rounded-xl border border-slate-300 bg-white shadow-2xs text-center flex items-center justify-center">
            {renderInlineTemplate(
              boxes[5]?.textTemplate || "",
              boxes[5]?.questionNumbers || [23],
              answers,
              onAnswerChange,
              activeQuestionNumber,
              onSelectQuestion,
              isReadOnly
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
