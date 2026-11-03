"use client";

import React, { useState } from "react";
import {
  Minus,
  Plus,
  Pin,
  Loader2,
  CheckCircle2,
  Save,
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  calculateCriteriaBand,
  CRITERION_COLOR_MAP,
  IeltsCriterionConfig,
  InlineGradingAnnotation,
} from "@/lib/ielts-report-config";

export interface CriteriaGradingSidebarProps {
  skillLabel: string;
  questionsList: Array<{ id: string; label: string; isComplete: boolean }>;
  activeAnswerId: string;
  onSelectAnswerId: (id: string) => void;
  criteriaDefs: IeltsCriterionConfig[];
  criteriaScores: Record<string, number | null>;
  criteriaComments: Record<string, string>;
  onChangeCriterionScore: (code: string, nextScore: number) => void;
  onChangeCriterionComment: (code: string, comment: string) => void;
  annotations: InlineGradingAnnotation[];
  overallFeedback: string;
  onChangeOverallFeedback: (val: string) => void;
  hasIncompleteCriteria: boolean;
  isPending: boolean;
  onSaveDraft: () => void;
  onFinalizeGrading: () => void;
  activeCriterionFilter?: string | null;
  onChangeCriterionFilter?: (critCode: string | null) => void;
}

export function CriteriaGradingSidebar({
  skillLabel,
  questionsList,
  activeAnswerId,
  onSelectAnswerId,
  criteriaDefs,
  criteriaScores,
  criteriaComments,
  onChangeCriterionScore,
  onChangeCriterionComment,
  annotations,
  overallFeedback,
  onChangeOverallFeedback,
  hasIncompleteCriteria,
  isPending,
  onSaveDraft,
  onFinalizeGrading,
  activeCriterionFilter,
  onChangeCriterionFilter,
}: CriteriaGradingSidebarProps) {
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const currentScoresArr = criteriaDefs.map((d) => criteriaScores[d.code] ?? null);
  const sectionBand = calculateCriteriaBand(currentScoresArr);

  const toggleCommentBox = (code: string) => {
    setExpandedComments((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <aside className="bg-white border-l border-slate-200 h-full overflow-y-auto p-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* 1. BỘ CHUYỂN TASK / PART NẾU BÀI CÓ NHIỀU PHẦN */}
        {questionsList.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {questionsList.map((q) => {
              const isOn = q.id === activeAnswerId;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectAnswerId(q.id)}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    isOn
                      ? "bg-white text-[#EA580C] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{q.label}</span>
                  {q.isComplete && <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* 2. THẺ TỔNG QUAN BAND & 4 TIÊU CHÍ CHUẨN SIMPACE */}
        <div className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#EA580C] block">
                {skillLabel} Assessment
              </span>
              <b className="text-xs font-bold text-slate-900">Band tổng phần này</b>
            </div>
            <div className="px-3 py-1 rounded-xl bg-white border border-orange-200 shadow-2xs text-right">
              <span className="text-2xl font-black font-mono text-[#EA580C] leading-none">
                {sectionBand !== null ? sectionBand.toFixed(1) : "—"}
              </span>
              <span className="text-[10px] font-bold text-slate-400 ml-0.5">/9.0</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {criteriaDefs.map((crit) => {
              const val = criteriaScores[crit.code];
              const cfg = CRITERION_COLOR_MAP[crit.code] || CRITERION_COLOR_MAP.TA_TR;
              const isFilterOn = activeCriterionFilter === crit.code;
              return (
                <button
                  key={crit.code}
                  type="button"
                  onClick={() =>
                    onChangeCriterionFilter &&
                    onChangeCriterionFilter(isFilterOn ? null : crit.code)
                  }
                  className={`rounded-xl p-1.5 bg-white border text-center transition ${
                    isFilterOn
                      ? "border-[#EA580C] ring-2 ring-orange-300 shadow-2xs"
                      : "border-orange-200/70 hover:border-orange-300"
                  }`}
                  title={`Nhấn để lọc ghi chú của tiêu chí ${crit.shortLabel}`}
                >
                  <span
                    style={{ color: cfg.hex }}
                    className="block text-[10px] font-extrabold tracking-tight"
                  >
                    {crit.shortLabel}
                  </span>
                  <span className="block text-xs font-black font-mono text-slate-900">
                    {val != null ? val.toFixed(1) : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. DANH SÁCH 4 TIÊU CHÍ TỐI GIẢN */}
        <div className="space-y-2.5">
          {criteriaDefs.map((crit) => {
            const val = criteriaScores[crit.code];
            const comment = criteriaComments[crit.code] || "";
            const colorCfg = CRITERION_COLOR_MAP[crit.code] || CRITERION_COLOR_MAP.TA_TR;
            const annCount = (annotations || []).filter(
              (a) => a.criterion === crit.code || (crit.code === "TA_TR" && a.criterion === "TA")
            ).length;
            const isCommentOpen = Boolean(expandedComments[crit.code] || comment.trim());

            const stepScore = (delta: number) => {
              const base = typeof val === "number" ? val : 5.0;
              const clamped = Math.max(0, Math.min(9, Math.round((base + delta) * 2) / 2));
              onChangeCriterionScore(crit.code, clamped);
            };

            return (
              <div
                key={crit.code}
                className="border border-slate-200 rounded-2xl p-3 bg-white space-y-2 shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${colorCfg.badgeBgClass}`}
                      >
                        {crit.shortLabel}
                      </span>
                      <b className="text-xs font-bold text-slate-900 truncate">
                        {crit.label}
                      </b>
                    </div>
                    <small className="text-[11px] text-slate-500 block leading-snug mt-0.5">
                      {crit.viDescription}
                    </small>
                  </div>
                  <div
                    style={{ color: val == null ? "#94a3b8" : colorCfg.hex }}
                    className="text-xl font-black font-mono min-w-[44px] text-right leading-none pt-0.5"
                  >
                    {val == null ? "—" : val.toFixed(1)}
                  </div>
                </div>

                {/* Bộ điều khiển điểm: Nút - / Thanh kéo / Nút + */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => stepScore(-0.5)}
                    className="size-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition"
                    title="Giảm 0.5 Band"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={0.5}
                    value={val ?? 5.0}
                    onChange={(e) => onChangeCriterionScore(crit.code, Number(e.target.value))}
                    style={{ accentColor: colorCfg.hex }}
                    className="flex-1 h-1.5 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => stepScore(0.5)}
                    className="size-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition"
                    title="Tăng 0.5 Band"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Dòng chân thẻ: Số ghi chú + Nút mở nhận xét riêng */}
                <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeCriterionFilter &&
                      onChangeCriterionFilter(
                        activeCriterionFilter === crit.code ? null : crit.code
                      )
                    }
                    className={`flex items-center gap-1 font-medium transition ${
                      annCount > 0
                        ? "text-slate-700 hover:text-[#EA580C]"
                        : "text-slate-400"
                    }`}
                  >
                    <Pin className="size-3 shrink-0" />
                    <span>{annCount} ghi chú trên bài</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCommentBox(crit.code)}
                    className="text-[11px] font-bold text-[#EA580C] hover:underline flex items-center gap-1"
                  >
                    <MessageSquarePlus className="size-3" />
                    <span>{isCommentOpen ? "Thu gọn nhận xét" : "+ Nhận xét tiêu chí"}</span>
                    {isCommentOpen ? (
                      <ChevronUp className="size-3" />
                    ) : (
                      <ChevronDown className="size-3" />
                    )}
                  </button>
                </div>

                {/* Ô nhận xét riêng cho tiêu chí (chỉ mở khi cần hoặc đã có nội dung) */}
                {isCommentOpen && (
                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => onChangeCriterionComment(crit.code, e.target.value)}
                    placeholder={`Nhận xét chi tiết cho tiêu chí ${crit.shortLabel}…`}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-y"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 4. KHUNG NHẬN XÉT TỔNG QUÁT */}
        <div className="border border-slate-200 rounded-2xl p-3 bg-white space-y-1.5 shadow-2xs">
          <label className="text-xs font-bold text-slate-900 block">
            Nhận xét tổng quát & Lời khuyên ôn luyện
          </label>
          <textarea
            rows={3}
            value={overallFeedback}
            onChange={(e) => onChangeOverallFeedback(e.target.value)}
            placeholder="Điểm mạnh của bài làm, lỗi sai trọng tâm cần khắc phục..."
            className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#EA580C] resize-y"
          />
        </div>
      </div>

      {/* Footer cố định (.foot) */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 sticky bottom-0 bg-white">
        <button
          type="button"
          disabled={isPending}
          onClick={onSaveDraft}
          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Save className="size-3.5 text-slate-500" />
          <span>Lưu nháp</span>
        </button>
        <button
          type="button"
          disabled={isPending || hasIncompleteCriteria}
          onClick={onFinalizeGrading}
          title={hasIncompleteCriteria ? "Cần chấm đủ 4 tiêu chí cho mọi phần thi" : ""}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#EA580C] hover:bg-[#c2410c] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed shadow-xs"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          <span>Hoàn tất chấm</span>
        </button>
      </div>
    </aside>
  );
}
