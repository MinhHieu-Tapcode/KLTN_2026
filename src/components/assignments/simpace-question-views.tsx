"use client";

import React, { useState } from "react";
import { Flag, Maximize2, Navigation, X, ZoomIn, ZoomOut } from "lucide-react";
import { cleanPromptRedundantNumbers } from "@/lib/exam-parser/clean-prompt";

export interface QuestionGroupCluster {
  id: string;
  clusterType: "VISUAL_MAP_DIAGRAM" | "MATCHING_GROUP" | "FORM_COMPLETION" | "SINGLE";
  title: string;
  instruction: string;
  imageUrl?: string | null;
  questions: any[];
}

/**
 * 1. KHỐI BẢN ĐỒ / SƠ ĐỒ / HÌNH ẢNH NHÓM CÂU HỎI (MAP / DIAGRAM / VISUAL TABLE)
 * Thiết kế chuẩn theo mẫu SIMPACE: Cột trái Hình ảnh (có Zoom Lightbox) - Cột phải Ô nhập/chọn đáp án
 */
export function SimpaceVisualGroupCard({
  cluster,
  skill,
  studentAnswers,
  setStudentAnswers,
  flaggedQuestions,
  activeQuestionNumber,
  onToggleFlag,
  onFocusQuestion,
}: {
  cluster: QuestionGroupCluster;
  skill: string;
  studentAnswers: Record<string, any>;
  setStudentAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  flaggedQuestions: Set<number>;
  activeQuestionNumber: number;
  onToggleFlag: (qNum: number) => void;
  onFocusQuestion: (qNum: number) => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const isDiagram = cluster.title.toLowerCase().includes("diagram");

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
      {/* Header chuẩn SIMPACE */}
      <div className="space-y-1 border-b border-slate-100 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">
            {skill === "LISTENING" ? "Listening" : "Reading"}
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-400">
            Câu {cluster.questions[0]?.questionNumber}
            {cluster.questions.length > 1
              ? ` – ${cluster.questions[cluster.questions.length - 1]?.questionNumber}`
              : ""}
          </span>
        </div>
        <h3 className="text-sm font-extrabold text-slate-900 pt-1">{cluster.title}</h3>
        <p className="text-xs text-slate-600">{cluster.instruction}</p>
      </div>

      {/* Bố cục 2 cột: Trái (Ảnh Bản đồ / Sơ đồ) - Phải (Các ô điền đáp án) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        <div className="md:col-span-7 relative rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden flex items-center justify-center min-h-[260px] p-2 group">
          {cluster.imageUrl ? (
            <>
              <img
                src={cluster.imageUrl}
                alt={cluster.title}
                onClick={() => setLightboxOpen(true)}
                className="w-full h-auto max-h-[380px] object-contain rounded-xl cursor-zoom-in transition"
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-xs transition"
              >
                <Maximize2 className="size-3.5 text-orange-400" />
                <span>Phóng to hình ảnh</span>
              </button>
            </>
          ) : (
            /* Bản đồ minh họa mặc định khi xem demo chưa gắn ảnh */
            <div className="w-full h-[270px] rounded-xl bg-gradient-to-br from-emerald-50/80 via-sky-50/60 to-amber-50/60 relative border border-slate-200/80 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  <Navigation className="size-3.5 text-[#EA580C]" /> North
                </span>
                <span className="px-2 py-0.5 rounded bg-white/80 text-slate-500 text-[10px]">
                  {isDiagram ? "Diagram Preview" : "Campus / Park Map"}
                </span>
              </div>
              <div className="my-auto mx-auto w-40 h-24 rounded-full bg-sky-200/70 border-2 border-sky-300 flex items-center justify-center font-bold text-xs text-sky-900 shadow-inner">
                Central Lake
              </div>
              {[
                { label: "A", top: "22%", left: "22%" },
                { label: "B", top: "24%", left: "74%" },
                { label: "C", top: "70%", left: "26%" },
                { label: "D", top: "72%", left: "72%" },
              ].map((pin) => (
                <div
                  key={pin.label}
                  style={{ top: pin.top, left: pin.left }}
                  className="absolute size-7 rounded-full bg-[#EA580C] text-white font-extrabold text-xs flex items-center justify-center shadow-md ring-2 ring-white"
                >
                  {pin.label}
                </div>
              ))}
              <div className="text-center text-[10px] text-slate-500">
                Quan sát vị trí trên hình và nhập/chọn đáp án bên phải
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: Danh sách ô trả lời */}
        <div className="md:col-span-5 space-y-2.5">
          {cluster.questions.map((q: any, idx: number) => {
            const qNum = Number(q.questionNumber) || idx + 1;
            const answerKey = q.id || `q_${qNum}`;
            const val = studentAnswers[answerKey] ?? studentAnswers[qNum] ?? "";
            const isCurrent = activeQuestionNumber === qNum;
            const isFlagged = flaggedQuestions.has(qNum);
            const cleanedLabel = cleanPromptRedundantNumbers(q.prompt || "", qNum)
              .replace(/_{2,}/g, "")
              .trim();

            return (
              <div
                key={q.id || qNum}
                id={`q-card-${qNum}`}
                onClick={() => onFocusQuestion(qNum)}
                className={`p-3 rounded-xl border transition ${
                  isCurrent
                    ? "border-[#EA580C] bg-orange-50/40 ring-2 ring-[#EA580C]/15"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    <span className="text-[#EA580C] font-mono mr-1.5">{qNum}.</span>
                    {cleanedLabel || `Vị trí số ${qNum}`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlag(qNum);
                    }}
                    className={`p-1 rounded ${
                      isFlagged ? "text-amber-600 bg-amber-50" : "text-slate-300 hover:text-slate-600"
                    }`}
                    title="Gắn cờ"
                  >
                    <Flag className={`size-3 ${isFlagged ? "fill-amber-500" : ""}`} />
                  </button>
                </div>

                {q.options && q.options.length > 0 ? (
                  <select
                    value={val}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setStudentAnswers((prev) => ({
                        ...prev,
                        [answerKey]: nextVal,
                        [qNum]: nextVal,
                      }));
                      onFocusQuestion(qNum);
                    }}
                    className="w-full h-8.5 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#EA580C]"
                  >
                    <option value="">Select letter / answer...</option>
                    {q.options.map((opt: any) => (
                      <option key={opt.optionLabel} value={opt.optionLabel}>
                        {opt.optionLabel} {opt.content ? `— ${opt.content}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setStudentAnswers((prev) => ({
                        ...prev,
                        [answerKey]: nextVal,
                        [qNum]: nextVal,
                      }));
                      onFocusQuestion(qNum);
                    }}
                    placeholder="Enter answer..."
                    className="w-full h-8.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Phóng to Ảnh Bản đồ / Sơ đồ */}
      {lightboxOpen && cluster.imageUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-full mb-3 shadow-lg"
          >
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="p-1 hover:text-orange-400"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="text-xs font-mono font-bold w-12 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
              className="p-1 hover:text-orange-400"
            >
              <ZoomIn className="size-4" />
            </button>
            <div className="w-px h-4 bg-slate-600 mx-1" />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="p-1 hover:text-rose-400"
            >
              <X className="size-4" />
            </button>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-6xl max-h-[82vh] overflow-auto bg-white rounded-2xl p-4 shadow-2xl"
          >
            <img
              src={cluster.imageUrl}
              alt={cluster.title}
              style={{ width: `${zoomLevel}%` }}
              className="mx-auto h-auto max-w-none rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 2. KHỐI MATCHING HEADINGS / MATCHING FEATURES CHUẨN GIAO DIỆN SIMPACE
 * Cột trái: Paragraph A, B, C + Dropdown chọn | Cột phải: Khung cam nhạt List of Headings (i, ii, iii...)
 */
export function SimpaceMatchingGroupCard({
  cluster,
  skill,
  studentAnswers,
  setStudentAnswers,
  activeQuestionNumber,
  onFocusQuestion,
}: {
  cluster: QuestionGroupCluster;
  skill: string;
  studentAnswers: Record<string, any>;
  setStudentAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  activeQuestionNumber: number;
  onFocusQuestion: (qNum: number) => void;
}) {
  // Gom danh sách Headings / Options từ câu đầu tiên có options hoặc tạo danh sách mặc định
  const rawOptions: Array<{ optionLabel: string; content: string }> =
    cluster.questions.find((q) => q.options && q.options.length > 0)?.options || [
      { optionLabel: "i", content: "The history and origin of the topic" },
      { optionLabel: "ii", content: "Economic benefits and new opportunities" },
      { optionLabel: "iii", content: "Environmental challenges ahead" },
      { optionLabel: "iv", content: "Long-term solutions and future plans" },
      { optionLabel: "v", content: "The role of local communities" },
    ];

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
      <div className="space-y-1 border-b border-slate-100 pb-3">
        <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">
          {skill === "LISTENING" ? "Listening" : "Reading"}
        </span>
        <h3 className="text-sm font-extrabold text-slate-900 pt-1">{cluster.title}</h3>
        <p className="text-xs text-slate-600">{cluster.instruction}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Cột trái: Các đoạn Paragraph / Mục cần nối */}
        <div className="md:col-span-7 space-y-2.5">
          {cluster.questions.map((q: any, idx: number) => {
            const qNum = Number(q.questionNumber) || idx + 1;
            const answerKey = q.id || `q_${qNum}`;
            const val = studentAnswers[answerKey] ?? studentAnswers[qNum] ?? "";
            const isCurrent = activeQuestionNumber === qNum;

            return (
              <div
                key={q.id || qNum}
                id={`q-card-${qNum}`}
                onClick={() => onFocusQuestion(qNum)}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                  isCurrent
                    ? "border-[#EA580C] bg-orange-50/40 ring-2 ring-[#EA580C]/15"
                    : "border-slate-200 bg-slate-50/50 hover:bg-white"
                }`}
              >
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span className="size-6 rounded-md bg-white border border-slate-200 text-[#EA580C] font-mono text-[11px] flex items-center justify-center shrink-0">
                    {qNum}
                  </span>
                  <span>
                    {cleanPromptRedundantNumbers(q.prompt || `Paragraph ${String.fromCharCode(65 + idx)}`, qNum)}
                  </span>
                </div>

                <select
                  value={val}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setStudentAnswers((prev) => ({
                      ...prev,
                      [answerKey]: nextVal,
                      [qNum]: nextVal,
                    }));
                    onFocusQuestion(qNum);
                  }}
                  className="h-8.5 px-3 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#EA580C] min-w-[155px]"
                >
                  <option value="">Select heading...</option>
                  {rawOptions.map((opt) => (
                    <option key={opt.optionLabel} value={opt.optionLabel}>
                      {opt.optionLabel}. {opt.content}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* Cột phải: Hộp List of Headings nền cam nhạt chuẩn ảnh mẫu */}
        <div className="md:col-span-5 p-4 rounded-2xl bg-[#FFF7ED] border border-orange-200/80 space-y-2.5">
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide border-b border-orange-200/60 pb-2">
            List of Headings / Options
          </h4>
          <div className="space-y-2">
            {rawOptions.map((opt) => (
              <div key={opt.optionLabel} className="flex items-start gap-2 text-xs text-slate-800 leading-relaxed">
                <span className="font-mono font-extrabold text-[#EA580C] min-w-[20px]">
                  {opt.optionLabel}.
                </span>
                <span className="font-medium">{opt.content}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. KHỐI BIỂU MẪU BOOKING FORM / NOTE COMPLETION CHUẨN GIAO DIỆN SIMPACE
 */
export function SimpaceBookingFormCard({
  cluster,
  skill,
  studentAnswers,
  setStudentAnswers,
  activeQuestionNumber,
  onFocusQuestion,
}: {
  cluster: QuestionGroupCluster;
  skill: string;
  studentAnswers: Record<string, any>;
  setStudentAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  activeQuestionNumber: number;
  onFocusQuestion: (qNum: number) => void;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
      <div className="space-y-1">
        <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">
          {skill === "LISTENING" ? "Listening" : "Reading"}
        </span>
        <h3 className="text-sm font-extrabold text-slate-900 pt-1">{cluster.title}</h3>
        <p className="text-xs text-slate-600">{cluster.instruction}</p>
      </div>

      {cluster.imageUrl && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 flex justify-center">
          <img
            src={cluster.imageUrl}
            alt={cluster.title}
            className="max-h-72 w-auto object-contain rounded-lg"
          />
        </div>
      )}

      {/* Khung bảng BOOKING FORM chuẩn mẫu */}
      <div className="rounded-xl border border-slate-300 overflow-hidden bg-white">
        <div className="bg-slate-100 border-b border-slate-300 py-2.5 px-4 text-center font-extrabold text-xs uppercase tracking-wider text-slate-800">
          {cluster.questions[0]?.groupTitle || "BOOKING / INFORMATION FORM"}
        </div>
        <div className="divide-y divide-slate-200">
          {cluster.questions.map((q: any, idx: number) => {
            const qNum = Number(q.questionNumber) || idx + 1;
            const answerKey = q.id || `q_${qNum}`;
            const val = studentAnswers[answerKey] ?? studentAnswers[qNum] ?? "";
            const isCurrent = activeQuestionNumber === qNum;
            const labelPart = cleanPromptRedundantNumbers(q.prompt || "", qNum)
              .replace(/_{2,}|\.{3,}/g, "")
              .replace(/:\s*$/, "")
              .trim();

            return (
              <div
                key={q.id || qNum}
                id={`q-card-${qNum}`}
                onClick={() => onFocusQuestion(qNum)}
                className={`p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                  isCurrent ? "bg-orange-50/50" : "hover:bg-slate-50/70"
                }`}
              >
                <span className="text-xs font-bold text-slate-800 sm:w-2/5">
                  {labelPart || `Field (${qNum})`}:
                </span>
                <div className="flex items-center gap-2 sm:w-3/5">
                  <span className="text-xs font-mono font-bold text-[#EA580C] shrink-0">
                    ({qNum})
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setStudentAnswers((prev) => ({
                        ...prev,
                        [answerKey]: nextVal,
                        [qNum]: nextVal,
                      }));
                      onFocusQuestion(qNum);
                    }}
                    placeholder="Enter answer..."
                    className="w-full h-8.5 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
