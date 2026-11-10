"use client";

import React from "react";
import { Trash2 } from "lucide-react";

export interface EditableOption {
  optionLabel: string;
  content: string;
  isCorrect: boolean;
}

export interface EditableQuestion {
  id?: string;
  questionNumber?: number;
  prompt: string;
  passageText: string | null;
  type: string;
  ieltsQuestionType: string | null;
  groupTitle: string | null;
  points: number;
  correctAnswer: string | null;
  explanation: string | null;
  answerCount: number;
  options: EditableOption[];
}

interface Props {
  index: number;
  question: EditableQuestion;
  onChange: (next: EditableQuestion) => void;
  onRemove: () => void;
}

const NO_ANSWER_TYPES = ["ESSAY", "SPEAKING_RECORD"];

/** Một thẻ chỉnh sửa câu hỏi trong form sửa bài tập. */
export function AssignmentEditQuestionCard({ index, question: q, onChange, onRemove }: Props) {
  const locked = q.answerCount > 0;
  const hasOptions = q.options.length > 0;
  const set = (patch: Partial<EditableQuestion>) => onChange({ ...q, ...patch });
  const setOption = (i: number, patch: Partial<EditableOption>) =>
    set({ options: q.options.map((o, k) => (k === i ? { ...o, ...patch } : o)) });

  const toggleCorrect = (i: number, checked: boolean) => {
    const single = q.type !== "MULTIPLE_SELECT";
    const options = q.options.map((o, k) =>
      k === i ? { ...o, isCorrect: checked } : single && checked ? { ...o, isCorrect: false } : o
    );
    const correctAnswer = options
      .filter((o) => o.isCorrect)
      .map((o) => o.optionLabel)
      .join(", ");
    set({ options, correctAnswer: correctAnswer || null });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">
          Câu {q.questionNumber ?? `mới (#${index + 1})`}
          <span className="ml-2 font-mono text-[10px] text-slate-400">{q.type}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={locked}
          title={locked ? `Đã có ${q.answerCount} bài làm, không thể xóa câu này` : "Xóa câu hỏi"}
          className="size-8 grid place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {locked && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
          Đã có {q.answerCount} bài làm cho câu này. Bạn vẫn sửa được nội dung, nhưng không xóa được câu.
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">Đề bài</span>
        <textarea
          value={q.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          rows={2}
          className="field w-full text-sm"
        />
      </label>

      {q.passageText !== null && q.passageText !== "" && (
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-600">Đoạn văn / ngữ cảnh</span>
          <textarea
            value={q.passageText}
            onChange={(e) => set({ passageText: e.target.value })}
            rows={3}
            className="field w-full text-sm"
          />
        </label>
      )}

      {hasOptions && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-600">Các đáp án (tích chọn đáp án đúng)</span>
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={o.isCorrect}
                onChange={(e) => toggleCorrect(i, e.target.checked)}
                className="size-4 accent-[#EA580C]"
              />
              <span className="w-6 text-xs font-bold text-slate-500">{o.optionLabel}</span>
              <input
                value={o.content}
                onChange={(e) => setOption(i, { content: e.target.value })}
                className="field flex-1 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {!hasOptions && !NO_ANSWER_TYPES.includes(q.type) && (
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-600">Đáp án đúng</span>
            <input
              value={q.correctAnswer ?? ""}
              onChange={(e) => set({ correctAnswer: e.target.value })}
              className="field w-full text-sm"
            />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-600">Điểm</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={Number.isNaN(q.points) ? "" : q.points}
            onChange={(e) => set({ points: e.target.value === "" ? NaN : Number(e.target.value) })}
            className="field w-full text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-600">Giải thích</span>
        <textarea
          value={q.explanation ?? ""}
          onChange={(e) => set({ explanation: e.target.value })}
          rows={2}
          className="field w-full text-sm"
        />
      </label>
    </div>
  );
}
