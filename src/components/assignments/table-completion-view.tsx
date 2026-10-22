"use client";

import React from "react";
import { TableCompletionGroup, TableCompletionCell } from "@/lib/exam-parser/types";
import { cleanPromptRedundantNumbers } from "@/lib/exam-parser/clean-prompt";
import { Table, KeyRound, Info } from "lucide-react";

interface TableCompletionViewProps {
  table: TableCompletionGroup;
  answers: Record<string | number, string>;
  onAnswerChange?: (questionNumber: number, value: string) => void;
  activeQuestionNumber?: number;
  onSelectQuestion?: (questionNumber: number) => void;
  isReadOnly?: boolean;
  isTeacherKeyMode?: boolean;
}

export function TableCompletionView({
  table,
  answers,
  onAnswerChange,
  activeQuestionNumber,
  onSelectQuestion,
  isReadOnly = false,
  isTeacherKeyMode = false,
}: TableCompletionViewProps) {
  if (!table || !table.rows || table.rows.length === 0) {
    return null;
  }

  // Phân tích một ô trong bảng để xác định xem có câu hỏi điền từ hay không
  const parseCellData = (
    cell: string | TableCompletionCell
  ): { text: string; qNum?: number } => {
    if (typeof cell === "object" && cell !== null) {
      return {
        text: cell.text || "",
        qNum: cell.questionNumber,
      };
    }

    const rawText = String(cell || "").trim();
    // Thử trích xuất số câu hỏi trong dấu ngoặc (5) hoặc [5] hoặc số xuất hiện trong table.questionNumbers
    const matchParen = rawText.match(/[\(\[]\s*(\d{1,3})\s*[\)\]]/);
    if (matchParen) {
      const num = parseInt(matchParen[1], 10);
      if (!table.questionNumbers || table.questionNumbers.includes(num)) {
        return { text: rawText, qNum: num };
      }
    }

    // Nếu không có ngoặc, tìm số nào trong danh sách questionNumbers xuất hiện trong ô
    if (table.questionNumbers && table.questionNumbers.length > 0) {
      for (const num of table.questionNumbers) {
        const regex = new RegExp(`\\b${num}\\b`);
        if (regex.test(rawText)) {
          return { text: rawText, qNum: num };
        }
      }
    }

    return { text: rawText };
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden mb-5">
      {/* Thanh tiêu đề bảng */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 px-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-[#EA580C] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Table className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight text-white uppercase">
              {table.title || "Table Completion"}
            </h4>
            <div className="text-[11px] text-slate-300">
              {table.instruction ||
                "Complete the table. Choose NO MORE THAN TWO WORDS from the passage for each answer."}
            </div>
          </div>
        </div>

        {table.questionNumbers && table.questionNumbers.length > 0 && (
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-orange-400">
            Câu {Math.min(...table.questionNumbers)} - {Math.max(...table.questionNumbers)}
          </span>
        )}
      </div>

      {/* Nội dung bảng chuẩn thi */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {table.headers && table.headers.length > 0 && (
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200">
                {table.headers.map((head, hIdx) => (
                  <th
                    key={hIdx}
                    className="p-3 px-4 text-xs font-bold text-slate-800 uppercase tracking-wide border-r border-slate-200 last:border-r-0"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody className="divide-y divide-slate-200">
            {table.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
              >
                {row.map((cell, cIdx) => {
                  const { text, qNum } = parseCellData(cell);
                  const isQuestion = qNum !== undefined && qNum > 0;
                  const isActive = isQuestion && activeQuestionNumber === qNum;
                  const currentAnswer = isQuestion
                    ? answers[qNum] || answers[`q_${qNum}`] || ""
                    : "";

                  const displayPrompt = isQuestion
                    ? cleanPromptRedundantNumbers(text, qNum)
                    : text;

                  return (
                    <td
                      key={cIdx}
                      className={`p-3 px-4 text-xs align-top border-r border-slate-200 last:border-r-0 transition-colors ${
                        isActive
                          ? "bg-orange-50/70 ring-1 ring-[#EA580C]/40 inset-ring"
                          : ""
                      }`}
                    >
                      {!isQuestion ? (
                        <span className="font-medium text-slate-700 leading-relaxed">
                          {displayPrompt}
                        </span>
                      ) : (
                        <div
                          onClick={() => isQuestion && onSelectQuestion?.(qNum)}
                          className="space-y-2 cursor-pointer"
                        >
                          {/* Câu văn gợi ý trong ô */}
                          {displayPrompt && displayPrompt !== "_______" && (
                            <div className="text-slate-800 font-medium leading-relaxed">
                              {displayPrompt}
                            </div>
                          )}

                          {/* Ô điền từ tương tác */}
                          <div className="flex items-center gap-2 pt-1">
                            <span
                              className={`flex items-center justify-center size-5.5 rounded-full text-[10px] font-bold shrink-0 shadow-2xs ${
                                isActive
                                  ? "bg-[#EA580C] text-white"
                                  : "bg-slate-800 text-white"
                              }`}
                            >
                              {qNum}
                            </span>

                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={currentAnswer}
                              onChange={(e) =>
                                onAnswerChange?.(qNum, e.target.value)
                              }
                              placeholder={
                                isTeacherKeyMode
                                  ? "Nhập đáp án chuẩn..."
                                  : "Điền câu trả lời..."
                              }
                              className={`flex-1 h-8 px-2.5 text-xs rounded-lg border transition-all focus:outline-none ${
                                isTeacherKeyMode
                                  ? "border-emerald-300 bg-emerald-50/40 focus:ring-1 focus:ring-emerald-500 font-semibold text-emerald-900"
                                  : isActive
                                  ? "border-[#EA580C] bg-white ring-1 ring-[#EA580C]/30"
                                  : "border-slate-300 bg-white hover:border-slate-400"
                              }`}
                            />

                            {isTeacherKeyMode && (
                              <span title="Đáp án chuẩn của giáo viên">
                                <KeyRound className="size-3.5 text-emerald-600 shrink-0" />
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
