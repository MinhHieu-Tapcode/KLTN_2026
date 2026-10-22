"use client";

import React from "react";

export interface MultipleChoiceOption {
  id?: string;
  optionLabel: string;
  content: string;
  isCorrect?: boolean;
}

interface MultipleChoiceEditorProps {
  questionNumber: number;
  options?: MultipleChoiceOption[];
  correctAnswer?: string;
  onChangeOptions: (newOptions: MultipleChoiceOption[]) => void;
  onChangeCorrectAnswer: (label: string) => void;
  disabled?: boolean;
}

const DEFAULT_LABELS = ["A", "B", "C", "D"];

export function MultipleChoiceEditor({
  questionNumber,
  options = [],
  correctAnswer = "A",
  onChangeOptions,
  onChangeCorrectAnswer,
  disabled = false,
}: MultipleChoiceEditorProps) {
  // Chuẩn hóa danh sách 4 lựa chọn A, B, C, D
  const normalizedOptions: MultipleChoiceOption[] = DEFAULT_LABELS.map((lbl, idx) => {
    const existing = options && options[idx] ? options[idx] : null;
    return {
      id: existing?.id,
      optionLabel: lbl,
      content: existing?.content || "",
      isCorrect: existing?.isCorrect || false,
    };
  });

  const activeAnswer = (correctAnswer || "A").trim().toUpperCase();

  const handleSelectCorrect = (label: string) => {
    if (disabled) return;
    const targetLabel = label.toUpperCase();
    onChangeCorrectAnswer(targetLabel);

    const updated = normalizedOptions.map((opt) => ({
      ...opt,
      isCorrect: opt.optionLabel.toUpperCase() === targetLabel,
    }));
    onChangeOptions(updated);
  };

  const handleContentChange = (idx: number, newContent: string) => {
    if (disabled) return;
    const updated = [...normalizedOptions];
    updated[idx] = {
      ...updated[idx],
      content: newContent,
    };
    onChangeOptions(updated);
  };

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
        <span>Các lựa chọn (Click nút tròn để đặt đáp án đúng):</span>
        <span className="text-emerald-700 font-bold font-mono">
          Đáp án đúng: {activeAnswer}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {normalizedOptions.map((opt, idx) => {
          const isSelected = activeAnswer === opt.optionLabel.toUpperCase();

          return (
            <div
              key={opt.optionLabel}
              onClick={() => handleSelectCorrect(opt.optionLabel)}
              className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                isSelected
                  ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-800 ring-1 ring-emerald-400/30"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="font-bold shrink-0 min-w-[16px] text-slate-900">
                {opt.optionLabel}.
              </span>

              <input
                type="text"
                disabled={disabled}
                value={opt.content}
                onChange={(e) => handleContentChange(idx, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={`Nhập phương án ${opt.optionLabel}...`}
                className="h-5 text-[11px] bg-transparent border-0 focus:ring-0 p-0 flex-1 min-w-0 text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
              />

              <input
                type="radio"
                name={`mcq-choice-${questionNumber}`}
                value={opt.optionLabel}
                checked={isSelected}
                onChange={() => handleSelectCorrect(opt.optionLabel)}
                onClick={(e) => e.stopPropagation()}
                title={`Chọn ${opt.optionLabel} làm đáp án đúng`}
                className="size-3.5 accent-emerald-600 shrink-0 cursor-pointer"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
