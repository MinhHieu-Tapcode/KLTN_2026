"use client";

import React from "react";
import { FileText } from "lucide-react";

export interface FormFieldItem {
  questionNumber: number;
  label: string;
  placeholder?: string;
}

interface ListeningFormViewProps {
  formTitle?: string;
  instruction?: string;
  fields: FormFieldItem[];
  answers: Record<number, string>;
  onAnswerChange: (qNum: number, value: string) => void;
  disabled?: boolean;
}

export function ListeningFormView({
  formTitle = "Hotel Reservation Form",
  instruction = "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
  fields = [
    { questionNumber: 1, label: "Name" },
    { questionNumber: 2, label: "Phone number" },
    { questionNumber: 3, label: "Arrival date" },
    { questionNumber: 4, label: "Room type" },
    { questionNumber: 5, label: "Special request" },
  ],
  answers,
  onAnswerChange,
  disabled = false,
}: ListeningFormViewProps) {
  return (
    <div className="space-y-3 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs font-sans">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider">
            2.2 Form / Note Completion
          </span>
          <span className="text-xs font-extrabold text-slate-800">{formTitle}</span>
        </div>
      </div>

      {instruction && (
        <p className="text-xs text-slate-600 italic bg-slate-50/80 p-2 rounded-lg border-l-2 border-[#EA580C]">
          {instruction}
        </p>
      )}

      {/* Khung Biểu mẫu (Form card) */}
      <div className="space-y-2.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
        {fields.map((field) => {
          const val = answers[field.questionNumber] || "";

          return (
            <div
              key={field.questionNumber}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 py-1.5 border-b border-slate-200/60 last:border-b-0"
            >
              <div className="text-xs font-semibold text-slate-700 sm:w-1/3">
                <span>{field.label}:</span>
              </div>

              <div className="flex items-center gap-2 sm:w-2/3">
                <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                  ({field.questionNumber})
                </span>
                <input
                  type="text"
                  disabled={disabled}
                  value={val}
                  onChange={(e) => onAnswerChange(field.questionNumber, e.target.value)}
                  placeholder={field.placeholder || "Điền câu trả lời..."}
                  className="h-8 text-xs font-semibold px-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#EA580C] focus:border-[#EA580C] w-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
