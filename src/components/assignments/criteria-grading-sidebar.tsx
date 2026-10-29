"use client";

import React from "react";
import { Minus, Plus, Pin, Loader2, CheckCircle2, Save } from "lucide-react";
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
}: CriteriaGradingSidebarProps) {
  const currentScoresArr = criteriaDefs.map((d) => criteriaScores[d.code] ?? null);
  const sectionBand = calculateCriteriaBand(currentScoresArr);

  return (
    <aside className="bg-white border-l border-slate-200 h-full overflow-y-auto p-4 sm:p-5 flex flex-col justify-between">
      <div className="space-y-3.5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Chấm theo 4 tiêu chí {skillLabel}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Kéo thanh hoặc bấm − / + (bước 0.5). Có thể ghi nhận xét riêng cho từng tiêu chí.
          </p>
        </div>

        {/* Bộ chuyển câu/Task nếu bài thi có nhiều câu (VD: Task 1 & Task 2) */}
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

        {/* Danh sách 4 thẻ tiêu chí (.crit) */}
        <div className="space-y-3">
          {criteriaDefs.map((crit) => {
            const val = criteriaScores[crit.code];
            const comment = criteriaComments[crit.code] || "";
            const colorCfg = CRITERION_COLOR_MAP[crit.code] || CRITERION_COLOR_MAP.TA_TR;
            const annCount = (annotations || []).filter(
              (a) => a.criterion === crit.code || (crit.code === "TA_TR" && a.criterion === "TA")
            ).length;

            const stepScore = (delta: number) => {
              const base = typeof val === "number" ? val : 5.0;
              const clamped = Math.max(0, Math.min(9, Math.round((base + delta) * 2) / 2));
              onChangeCriterionScore(crit.code, clamped);
            };

            return (
              <div
                key={crit.code}
                className={`border border-slate-200 border-t-4 ${colorCfg.borderTopClass} rounded-2xl p-3.5 bg-white space-y-2 shadow-2xs`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <b className="text-[13px] font-bold text-slate-900 block">
                      {crit.label} ({crit.shortLabel})
                    </b>
                    <small className="text-[11px] text-slate-500 block leading-snug">
                      {crit.viDescription}
                    </small>
                  </div>
                  <div
                    style={{ color: val == null ? "#cbd5e1" : colorCfg.hex }}
                    className="text-2xl font-extrabold font-mono min-w-[50px] text-right leading-none pt-0.5"
                  >
                    {val == null ? "—" : val.toFixed(1)}
                  </div>
                </div>

                {/* Bộ điều khiển điểm: Nút - / Thanh kéo / Nút + */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => stepScore(-0.5)}
                    className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shrink-0"
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
                    className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shrink-0"
                    title="Tăng 0.5 Band"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Ô nhận xét riêng cho tiêu chí này */}
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => onChangeCriterionComment(crit.code, e.target.value)}
                  placeholder={`Nhận xét cho tiêu chí ${crit.shortLabel}…`}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EA580C] resize-y"
                />

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Pin className="size-3 text-slate-400 shrink-0" />
                  <span>{annCount} ghi chú trong bài gắn với tiêu chí này</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Khung Band tổng & Nhận xét chung (.overall) */}
        <div className="border-2 border-[#EA580C] rounded-2xl p-3.5 bg-[#FFF1EB] space-y-2">
          <div className="flex items-center justify-between">
            <b className="text-xs font-bold text-slate-900">Band tổng của phần này</b>
            <span className="text-2xl font-black font-mono text-[#EA580C]">
              {sectionBand !== null ? sectionBand.toFixed(1) : "—"}
            </span>
          </div>
          <textarea
            rows={3}
            value={overallFeedback}
            onChange={(e) => onChangeOverallFeedback(e.target.value)}
            placeholder="Nhận xét chung cho học sinh (điểm mạnh, ưu tiên cải thiện, lời khuyên ôn luyện)…"
            className="w-full p-2.5 text-xs rounded-xl border border-orange-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EA580C] resize-y"
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
          title={hasIncompleteCriteria ? "Cần chấm đủ 4 tiêu chí cho mọi phần thi (BR-07)" : ""}
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
