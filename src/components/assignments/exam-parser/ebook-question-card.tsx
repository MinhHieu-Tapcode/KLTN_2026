"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultipleChoiceEditor } from "@/components/assignments/multiple-choice-editor";

export interface EbookQuestionCardProps {
  question: any;
  isSelected: boolean;
  isQuestionsFinalized: boolean;
  onToggleSelection: (qNum: number) => void;
  onUpdateField: (qNum: number, field: string, value: any) => void;
  onDeleteQuestion: (qNum: number) => void;
}

export function EbookQuestionCard({
  question: q,
  isSelected,
  isQuestionsFinalized,
  onToggleSelection,
  onUpdateField,
  onDeleteQuestion,
}: EbookQuestionCardProps) {
  return (
    <div
      className={`p-3 rounded-xl border transition space-y-2 text-xs ${
        isSelected
          ? "border-slate-200 bg-slate-50/70"
          : "border-dashed border-slate-300 bg-slate-100/60 opacity-60"
      }`}
    >
      {/* Thanh tiêu đề câu hỏi: Checkbox chọn câu, Số câu, Loại câu, Điểm số, Nút xóa */}
      <div className="flex items-center justify-between font-bold text-slate-800">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSelected}
              disabled={isQuestionsFinalized}
              onChange={() => onToggleSelection(q.questionNumber)}
              className="size-4 rounded accent-[#EA580C] cursor-pointer"
            />
            <span
              className={`text-[11px] font-bold ${
                isSelected ? "text-slate-900" : "text-slate-400 line-through"
              }`}
            >
              {isSelected ? "Dùng câu này" : "Bỏ qua"}
            </span>
          </label>

          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[#EA580C]">
            Câu {q.questionNumber}
          </span>
          <select
            value={q.type}
            disabled={isQuestionsFinalized}
            onChange={(e) => onUpdateField(q.questionNumber, "type", e.target.value)}
            className="h-6 text-[11px] rounded border border-slate-200 bg-white font-normal px-1 text-slate-700"
          >
            <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
            <option value="TRUE_FALSE_NG">True / False / NG</option>
            <option value="FILL_IN_BLANK">Điền từ (Blank)</option>
            <option value="ESSAY">Tự luận Viết</option>
            <option value="SPEAKING_RECORD">Ghi âm Nói</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="10"
              value={q.points || 1.0}
              onChange={(e) =>
                onUpdateField(q.questionNumber, "points", Number(e.target.value))
              }
              className="w-12 h-6 text-center text-xs border border-emerald-300 rounded bg-emerald-50 text-emerald-800 font-bold"
            />
            <span className="text-[10px] text-slate-500 font-normal">đ</span>
          </div>

          <button
            type="button"
            onClick={() => onDeleteQuestion(q.questionNumber)}
            className="size-6 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 grid place-items-center transition"
            title="Xóa câu hỏi này"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Prompt câu hỏi */}
      <div className="space-y-1">
        <Label className="text-[10px] font-semibold text-slate-500">
          Đề bài câu hỏi:
        </Label>
        <Input
          value={q.prompt || ""}
          onChange={(e) =>
            onUpdateField(q.questionNumber, "prompt", e.target.value)
          }
          className="h-7 text-xs bg-white"
          placeholder="Nhập nội dung câu hỏi..."
        />
      </div>

      {/* Ô đáp án chuẩn theo từng dạng */}
      {q.type === "MULTIPLE_CHOICE" && (
        <MultipleChoiceEditor
          questionNumber={q.questionNumber}
          options={q.options}
          correctAnswer={q.correctAnswer}
          onChangeOptions={(newOpts) => {
            onUpdateField(q.questionNumber, "options", newOpts);
          }}
          onChangeCorrectAnswer={(newAns) => {
            onUpdateField(q.questionNumber, "correctAnswer", newAns);
          }}
        />
      )}

      {q.type === "TRUE_FALSE_NG" && (
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-semibold text-slate-500">
            Chọn đáp án đúng chuẩn IELTS:
          </span>
          <div className="flex items-center gap-1.5">
            {(q.options?.some((o: any) => o.content === "YES") ||
            /YES\s*\/\s*NO/i.test(q.prompt || "")
              ? ["YES", "NO", "NOT GIVEN"]
              : ["TRUE", "FALSE", "NOT GIVEN"]
            ).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() =>
                  onUpdateField(q.questionNumber, "correctAnswer", val)
                }
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                  q.correctAnswer === val
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {q.type === "FILL_IN_BLANK" && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500">
              Từ/Cụm từ đáp án chuẩn (Placeholder):
            </span>
            <span className="text-[9px] text-slate-400">
              Tự động điền từ file Excel
            </span>
          </div>
          <Input
            value={q.correctAnswer || ""}
            onChange={(e) =>
              onUpdateField(q.questionNumber, "correctAnswer", e.target.value)
            }
            className="h-7 text-xs bg-white font-mono font-bold text-emerald-700"
            placeholder="Nhập từ đáp án chuẩn..."
          />
        </div>
      )}

      {(q.type === "ESSAY" || q.type === "SPEAKING_RECORD") && (
        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
          ℹ️ Dạng câu hỏi{" "}
          <b>{q.type === "ESSAY" ? "Tự luận Viết (Task 2)" : "Ghi âm Nói"}</b>: Giáo
          viên sẽ trực tiếp chấm tay theo 4 tiêu chí IELTS.
        </div>
      )}

      {/* Ô Lời giải thích */}
      <div className="space-y-0.5">
        <Label className="text-[10px] font-semibold text-slate-400">
          Giải thích chi tiết (Hiển thị sau khi nộp bài):
        </Label>
        <Input
          value={q.explanation || ""}
          onChange={(e) =>
            onUpdateField(q.questionNumber, "explanation", e.target.value)
          }
          className="h-6 text-[11px] bg-white text-slate-600"
          placeholder="Giải thích vì sao đáp án này đúng..."
        />
      </div>
    </div>
  );
}
