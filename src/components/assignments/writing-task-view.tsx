"use client";

import React, { useState, useEffect } from "react";
import { Clock, PenTool, Image as ImageIcon, Maximize2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

export function WritingTaskView({
  taskType,
  prompt,
  chartImageUrl,
  chartTitle = "Biểu đồ đề bài / Task Illustration",
  value = "",
  onChange,
  timeLimitMinutes = taskType === "TASK_1" ? 20 : 40,
  minWords = taskType === "TASK_1" ? 150 : 250,
  disabled = false,
}: WritingTaskViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Bộ đếm thời gian
  useEffect(() => {
    if (!isTimerRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsLeft]);

  // Đếm số từ thực tế (Word count)
  const cleanWords = value.trim().split(/\s+/).filter(Boolean);
  const wordCount = value.trim().length > 0 ? cleanWords.length : 0;
  const isTargetReached = wordCount >= minWords;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* 1. Header kỹ năng & loại Task */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider">
            {taskType === "TASK_1" ? "3.1 Writing Task 1 (Graph / Process)" : "3.2 Writing Task 2 (Essay)"}
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Yêu cầu tối thiểu: <strong>{minWords} từ</strong>
          </span>
        </div>

        {/* Đồng hồ đếm ngược */}
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
          <Clock className="size-3.5 text-[#EA580C]" />
          <span>{formattedTime}</span>
          <span className="text-[10px] text-slate-400 font-sans">({timeLimitMinutes} phút)</span>
        </div>
      </div>

      {/* 2. Bố cục nội dung */}
      <div className={`grid gap-4 ${taskType === "TASK_1" && chartImageUrl ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"}`}>
        {/* Cột trái: Đề bài & Biểu đồ (Task 1) */}
        {taskType === "TASK_1" && chartImageUrl ? (
          <div className="lg:col-span-5 space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-serif">
              <strong className="block text-slate-900 font-sans font-bold text-[13px] mb-1.5">
                Đề bài Task 1:
              </strong>
              {prompt || "The graph below shows the number of tourists visiting a country from 2010 to 2020. Summarise the information and make comparisons where relevant."}
            </div>

            {/* Khung ảnh biểu đồ */}
            <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs group">
              <img
                src={chartImageUrl}
                alt={chartTitle}
                className="w-full h-auto max-h-[320px] object-contain p-2"
              />
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md transition backdrop-blur-xs"
              >
                <Maximize2 className="size-3" />
                <span>Xem kích thước lớn</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-serif">
            <strong className="block text-slate-900 font-sans font-bold text-[13px] mb-1.5">
              {taskType === "TASK_1" ? "Đề bài Task 1:" : "Đề bài Task 2 (Nghị luận xã hội):"}
            </strong>
            {prompt || "Some people believe that governments should spend more money on public transport, while others think it is better to invest in roads. Discuss both views and give your own opinion."}
          </div>
        )}

        {/* Cột phải: Khung soạn thảo văn bản */}
        <div className={`${taskType === "TASK_1" && chartImageUrl ? "lg:col-span-7" : "col-span-1"} space-y-2`}>
          {/* Toolbar soạn thảo giả lập chuẩn thi */}
          <div className="flex items-center justify-between p-1.5 px-3 rounded-t-xl bg-slate-100 border border-b-0 border-slate-200 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="font-bold px-2 py-0.5 rounded hover:bg-slate-200 cursor-pointer">B</span>
              <span className="italic px-2 py-0.5 rounded hover:bg-slate-200 cursor-pointer">I</span>
              <span className="underline px-2 py-0.5 rounded hover:bg-slate-200 cursor-pointer">U</span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">IELTS Word Processor</span>
          </div>

          <textarea
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Bắt đầu viết bài của bạn tại đây..."
            rows={14}
            className="w-full p-4 text-xs sm:text-[13px] leading-relaxed rounded-b-xl border border-slate-200 bg-white font-serif text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 focus:border-[#EA580C] shadow-inner resize-y min-h-[280px]"
          />

          {/* Thanh trạng thái số từ */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-bold font-mono transition-colors ${
                  isTargetReached ? "text-emerald-700" : "text-[#EA580C]"
                }`}
              >
                Đã viết: {wordCount} / {minWords} từ
              </span>
              {isTargetReached && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <CheckCircle2 className="size-3" /> Đạt yêu cầu
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-400 italic">
              {wordCount < minWords ? `Còn thiếu ít nhất ${minWords - wordCount} từ` : "Đã hoàn thành độ dài quy định"}
            </span>
          </div>
        </div>
      </div>

      {/* Modal phóng to ảnh */}
      {isImageModalOpen && chartImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl max-w-4xl w-full p-4 shadow-2xl">
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
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center">
              <img src={chartImageUrl} alt={chartTitle} className="max-w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
