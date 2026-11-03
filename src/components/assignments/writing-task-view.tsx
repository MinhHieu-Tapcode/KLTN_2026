"use client";

import React, { useState } from "react";
import { Maximize2, X, CheckCircle2, List, Send, Save } from "lucide-react";

interface WritingTaskViewProps {
  taskType: "TASK_1" | "TASK_2";
  prompt: string;
  chartImageUrl?: string | null;
  chartTitle?: string;
  value?: string;
  onChange: (content: string) => void;
  timeLimitMinutes?: number;
  minWords?: number;
  disabled?: boolean;
  onSubmitExam?: () => void;
}

export function WritingTaskView({
  taskType,
  prompt,
  chartImageUrl,
  chartTitle = "Biểu đồ / Sơ đồ đề bài (Task 1 Illustration)",
  value = "",
  onChange,
  minWords = taskType === "TASK_1" ? 150 : 250,
  disabled = false,
  onSubmitExam,
}: WritingTaskViewProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  const cleanWords = value.trim().split(/\s+/).filter(Boolean);
  const wordCount = value.trim().length > 0 ? cleanWords.length : 0;
  const isTargetReached = wordCount >= minWords;

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header chuẩn SIMPACE */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">
            Writing
          </span>
          <h3 className="text-base font-extrabold text-slate-900 pt-0.5">
            {taskType === "TASK_1" ? "Task 1: Academic Report" : "Task 2: Academic Essay"}
          </h3>
        </div>

        <div className="text-xs font-bold font-mono px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
          Word count:{" "}
          <span className={isTargetReached ? "text-emerald-600" : "text-[#EA580C]"}>
            {wordCount}
          </span>{" "}
          / {minWords}
        </div>
      </div>

      {/* Bố cục 2 cột chuẩn thiết kế SIMPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cột trái (5/12): Đề bài & Hình ảnh Biểu đồ / Sơ đồ */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-slate-800 leading-relaxed space-y-2">
            <p className="font-bold text-slate-900">
              {taskType === "TASK_1"
                ? "You should spend about 20 minutes on this task."
                : "You should spend about 40 minutes on this task."}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">
              {prompt ||
                (taskType === "TASK_1"
                  ? "The chart below shows the number of students who chose different modes of transport to school in 2010 and 2020.\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant."
                  : "Some people believe that governments should spend more money on public transport, while others think it is better to invest in roads.\nDiscuss both views and give your own opinion.")}
            </p>
          </div>

          {taskType === "TASK_1" && (
            <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-white p-3 shadow-2xs">
              {chartImageUrl ? (
                <>
                  <img
                    src={chartImageUrl}
                    alt={chartTitle}
                    onClick={() => setIsImageModalOpen(true)}
                    className="w-full h-auto max-h-[320px] object-contain mx-auto cursor-zoom-in rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="mt-2 ml-auto px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Maximize2 className="size-3 text-orange-400" />
                    <span>Phóng to biểu đồ</span>
                  </button>
                </>
              ) : (
                /* Biểu đồ cột minh họa chuẩn thiết kế SIMPACE khi đề mẫu chưa đính kèm file ảnh */
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>Modes of Transport (%)</span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-xs bg-[#EA580C]" /> 2010
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-2.5 rounded-xs bg-orange-300" /> 2020
                      </span>
                    </div>
                  </div>
                  <div className="h-44 border-l border-b border-slate-300 flex items-end justify-around px-4 pt-4 pb-1 gap-3">
                    {[
                      { label: "Car", h1: "75%", h2: "68%" },
                      { label: "Bus", h1: "52%", h2: "42%" },
                      { label: "Bicycle", h1: "64%", h2: "50%" },
                      { label: "Walk", h1: "50%", h2: "35%" },
                    ].map((bar) => (
                      <div key={bar.label} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                        <div className="flex items-end gap-1 w-full justify-center h-full">
                          <div style={{ height: bar.h1 }} className="w-3.5 bg-[#EA580C] rounded-t" />
                          <div style={{ height: bar.h2 }} className="w-3.5 bg-orange-300 rounded-t" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cột phải (7/12): Khung soạn thảo Essay có thanh định dạng chuẩn ảnh thiết kế */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between px-3.5 py-2 rounded-t-2xl bg-slate-50 border border-b-0 border-slate-200 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded hover:bg-slate-200 cursor-pointer font-serif">B</span>
              <span className="px-2 py-0.5 rounded hover:bg-slate-200 cursor-pointer italic font-serif">I</span>
              <span className="px-2 py-0.5 rounded hover:bg-slate-200 cursor-pointer underline font-serif">U</span>
              <span className="w-px h-3.5 bg-slate-300 mx-0.5" />
              <List className="size-3.5 text-slate-500" />
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Tối thiểu {minWords} từ
            </span>
          </div>

          <textarea
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your answer here..."
            rows={15}
            className="w-full p-4 text-sm leading-relaxed rounded-b-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] resize-y min-h-[300px]"
          />

          <div className="flex items-center justify-between text-xs pt-2 px-1">
            <div className="flex items-center gap-2">
              <span
                className={`font-bold ${
                  isTargetReached ? "text-emerald-700" : "text-slate-600"
                }`}
              >
                Word count: {wordCount} / {minWords}
              </span>
              {isTargetReached && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <CheckCircle2 className="size-3" /> Đạt số từ tối thiểu
                </span>
              )}
            </div>
          </div>

          {/* Nút Lưu nháp (Save Draft) chuẩn thiết kế SIMPACE */}
          <div className="flex items-center justify-end gap-2.5 pt-3 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setDraftSavedToast(true);
                setTimeout(() => setDraftSavedToast(false), 2500);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Save className="size-3.5 text-slate-500" />
              <span>{draftSavedToast ? "✓ Đã lưu nháp" : "Lưu nháp (Save Draft)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox phóng to biểu đồ */}
      {isImageModalOpen && chartImageUrl && (
        <div
          onClick={() => setIsImageModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl max-w-5xl w-full p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
              <h4 className="font-bold text-sm text-slate-900">{chartTitle}</h4>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[82vh] overflow-auto flex items-center justify-center">
              <img src={chartImageUrl} alt={chartTitle} className="max-w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
