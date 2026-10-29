"use client";

import React from "react";
import { AlertTriangle, BarChart3, Inbox } from "lucide-react";

export function ReportKpiCard({
  label,
  value,
  subtext,
  tone = "indigo",
  badge,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "slate";
  badge?: string;
}) {
  const toneMap = {
    indigo: "border-indigo-100 bg-white text-indigo-600",
    emerald: "border-emerald-100 bg-white text-emerald-600",
    amber: "border-amber-100 bg-white text-amber-600",
    rose: "border-rose-100 bg-white text-rose-600",
    slate: "border-slate-200 bg-white text-slate-800",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {badge && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}

export function ReportDonut3Slice({
  title,
  subtitle,
  submitted,
  pendingNotDue,
  overdue,
}: {
  title: string;
  subtitle?: string;
  submitted: number;
  pendingNotDue: number;
  overdue: number;
}) {
  const total = submitted + pendingNotDue + overdue;
  const subPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const pendPct = total > 0 ? Math.round((pendingNotDue / total) * 100) : 0;
  const overPct = total > 0 ? Math.max(0, 100 - subPct - pendPct) : 0;

  const stop1 = subPct;
  const stop2 = subPct + pendPct;
  const gradient =
    total > 0
      ? `conic-gradient(#10B981 0% ${stop1}%, #F59E0B ${stop1}% ${stop2}%, #EF4444 ${stop2}% 100%)`
      : `conic-gradient(#E2E8F0 0% 100%)`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
          style={{ background: gradient }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <span className="text-xl font-bold text-slate-800">{subPct}%</span>
            <span className="text-[10px] font-medium text-slate-500">Hoàn thành</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 text-xs w-full">
          <div className="flex items-center justify-between rounded-lg bg-emerald-50/70 px-3 py-2">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Đã nộp
            </span>
            <span className="font-bold text-emerald-700">
              {submitted} ({subPct}%)
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-amber-50/70 px-3 py-2">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Chưa nộp (còn hạn)
            </span>
            <span className="font-bold text-amber-700">
              {pendingNotDue} ({pendPct}%)
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-rose-50/70 px-3 py-2">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Quá hạn (khóa nộp)
            </span>
            <span className="font-bold text-rose-700">
              {overdue} ({overPct}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportHorizontalBars({
  title,
  subtitle,
  items,
  onItemClick,
}: {
  title: string;
  subtitle?: string;
  items: Array<{
    id: string;
    label: string;
    percent: number | null;
    rightText?: string;
    isLowData?: boolean;
    badgeText?: string;
  }>;
  onItemClick?: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu biểu đồ</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((item) => {
            const pct = item.percent ?? 0;
            const barColor =
              item.percent === null
                ? "bg-slate-300"
                : pct < 50
                ? "bg-rose-500"
                : pct < 70
                ? "bg-amber-500"
                : "bg-indigo-600";
            return (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item.id)}
                className={`group rounded-lg p-2 transition ${
                  onItemClick ? "cursor-pointer hover:bg-slate-50" : ""
                }`}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <span className={onItemClick ? "group-hover:text-indigo-600 group-hover:underline" : ""}>
                      {item.label}
                    </span>
                    {item.badgeText && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {item.badgeText}
                      </span>
                    )}
                    {item.isLowData && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        Ít dữ liệu (&lt; 10 câu)
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-800">
                    {item.rightText || (item.percent !== null ? `${item.percent}%` : "Chưa có điểm")}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReportTrendLineChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle?: string;
  points: Array<{ label: string; value: number; subLabel?: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      {points.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-xs text-slate-400">
          Chưa đủ mốc thời gian đã chấm điểm để vẽ xu hướng
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex h-44 items-end gap-3 border-b border-l border-slate-200 px-3 pb-2 pt-4">
            {points.map((pt, idx) => {
              const heightPct = Math.min(100, Math.max(8, pt.value));
              return (
                <div key={idx} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-bold text-indigo-600">{pt.value}%</span>
                  <div
                    className="w-full max-w-[40px] rounded-t-md bg-indigo-500/90 hover:bg-indigo-600 transition-all"
                    style={{ height: `${heightPct}%` }}
                    title={pt.subLabel || `${pt.label}: ${pt.value}%`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 px-3">
            {points.map((pt, idx) => (
              <div key={idx} className="flex-1 text-center text-[11px] font-medium text-slate-600 truncate">
                {pt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportEmptyState({
  title = "Chưa có dữ liệu báo cáo trong khoảng thời gian này",
  description = "Lớp hoặc học sinh hiện chưa có bài tập nào được giao hoặc nộp trong khoảng thời gian đã chọn. Hãy thử đổi bộ lọc sang 'Toàn bộ thời gian'.",
  onResetPeriod,
}: {
  title?: string;
  description?: string;
  onResetPeriod?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Inbox className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">{description}</p>
      {onResetPeriod && (
        <button
          type="button"
          onClick={onResetPeriod}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <BarChart3 className="h-4 w-4" />
          Xem Toàn bộ thời gian
        </button>
      )}
    </div>
  );
}
