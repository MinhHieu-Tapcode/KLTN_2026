"use client";

import React, { useState } from "react";
import {
  percentToCambridgeBand,
} from "@/lib/ielts-report-config";
import { getTabSwitchSeverity } from "@/services/report-metrics.helper";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Clock,
  Headphones,
  HelpCircle,
  Inbox,
  Mic,
  PenTool,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

/**
 * Quy đổi điểm chuẩn hóa 0-100 sang thang IELTS Band chuẩn Cambridge Academic
 */
export function percentToBand(
  pct: number | null | undefined,
  skill?: string
): number | null {
  return percentToCambridgeBand(pct, skill);
}

/**
 * Định dạng hiển thị điểm Band IELTS trực quan cho người dùng cuối
 */
export function formatBandLabel(
  pctOrBand: number | null | undefined,
  options?: { isBandAlready?: boolean; suffix?: string }
): string {
  if (pctOrBand === null || pctOrBand === undefined || !Number.isFinite(pctOrBand)) {
    return "Chưa có điểm";
  }
  const band = options?.isBandAlready ? pctOrBand : percentToCambridgeBand(pctOrBand);
  if (band === null) return "Chưa có điểm";
  return `Band ${band.toFixed(1)}${options?.suffix || ""}`;
}

/**
 * Badge hiển thị thời lượng làm bài theo Phương án A (CSS đẹp, trung thực)
 */
export function ExamDurationOptionABadge() {
  return (
    <span
      title="Hệ thống ghi nhận thời điểm nộp bài. Thời lượng làm bài thực tế chưa được thu thập riêng."
      className="rp-badge"
      data-tone="empty"
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span>Chưa ghi nhận</span>
    </span>
  );
}

/**
 * Badge hiển thị số lần chuyển tab / rời màn hình làm bài rõ ràng
 */
export function TabSwitchBadge({ count }: { count: number }) {
  const meta = getTabSwitchSeverity(count);
  const dataTone = count >= 3 ? "bad" : count > 0 ? "watch" : "good";
  return (
    <span className="rp-badge" data-tone={dataTone}>
      {count >= 3 && <ShieldAlert className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}

/**
 * Tính mức thay đổi điểm (Delta Band) giữa đầu kỳ/lần trước và hiện tại
 */
export function computeBandDeltaFromSeries(
  values: Array<number | null | undefined>,
  isBandAlready = false
): number | null {
  const valid = values
    .map((v) => (isBandAlready ? v : percentToCambridgeBand(v)))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length < 2) return null;
  const prev = valid[valid.length - 2];
  const curr = valid[valid.length - 1];
  return Number((curr - prev).toFixed(1));
}

export function ScoreDeltaBadge({
  delta,
  unit = "Band",
  comparisonLabel = "so kỳ trước",
}: {
  delta: number | null | undefined;
  unit?: string;
  comparisonLabel?: string;
}) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) {
    return (
      <span className="rp-badge" data-tone="empty">
        Mới cập nhật
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span
        title={`Tăng ${delta.toFixed(1)} ${unit} so với kỳ trước`}
        className="rp-badge"
        data-tone="good"
      >
        <ArrowUpRight className="h-3 w-3" />
        <span>+{delta.toFixed(1)} {unit}</span>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span
        title={`Giảm ${Math.abs(delta).toFixed(1)} ${unit} so với kỳ trước`}
        className="rp-badge"
        data-tone="bad"
      >
        <ArrowDownRight className="h-3 w-3" />
        <span>{delta.toFixed(1)} {unit}</span>
      </span>
    );
  }
  return (
    <span
      title="Điểm số ổn định so với kỳ trước"
      className="rp-badge"
      data-tone="brand"
    >
      <ArrowRight className="h-3 w-3" />
      <span>Ổn định (0.0)</span>
    </span>
  );
}

export type ReportKpiTone =
  | "good"
  | "watch"
  | "bad"
  | "brand"
  | "empty"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "slate";

/**
 * Ánh xạ tone cũ sang data-tone chuẩn (5 giá trị: good, watch, bad, brand, empty)
 */
function mapToneToDataTone(
  tone?: ReportKpiTone
): "good" | "watch" | "bad" | "brand" | "empty" {
  switch (tone) {
    case "good":
    case "emerald":
      return "good";
    case "watch":
    case "amber":
      return "watch";
    case "bad":
    case "rose":
      return "bad";
    case "brand":
    case "indigo":
      return "brand";
    case "empty":
    case "slate":
    case "sky":
    default:
      return "empty";
  }
}

export function ReportKpiCard({
  label,
  value,
  subtext,
  tone = "brand",
  badge,
  deltaBand,
  tooltip,
  actionLabel,
  onActionClick,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: ReportKpiTone;
  badge?: string;
  deltaBand?: number | null;
  tooltip?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}) {
  const dataTone = mapToneToDataTone(tone);
  const isBadOrGood = dataTone === "bad" || (dataTone === "good" && Boolean(badge));

  return (
    <div
      onClick={onActionClick}
      className={`rp-kpi ${onActionClick ? "cursor-pointer" : ""}`}
      data-tone={dataTone}
      data-emphasis={isBadOrGood ? "true" : undefined}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="rp-label">{label}</span>
            {tooltip && (
              <span
                title={tooltip}
                className="text-[var(--rp-ink-3)] hover:text-[var(--rp-ink)] cursor-help"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          {deltaBand !== undefined ? (
            <ScoreDeltaBadge delta={deltaBand} />
          ) : badge ? (
            <span className="rp-badge" data-tone="brand">
              {badge}
            </span>
          ) : null}
        </div>

        <div className="rp-kpi-value mt-1.5">{value}</div>

        {subtext && <p className="rp-sub mt-1">{subtext}</p>}
      </div>

      {onActionClick && (
        <button
          type="button"
          className="rp-kpi-more"
          onClick={(e) => {
            e.stopPropagation();
            onActionClick();
          }}
        >
          <span>{actionLabel || "Xem chi tiết"}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
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
      ? `conic-gradient(#059669 0% ${stop1}%, #D97706 ${stop1}% ${stop2}%, #E11D48 ${stop2}% 100%)`
      : `conic-gradient(#E2E8F0 0% 100%)`;

  return (
    <div className="rp-card rp-card--pad">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="rp-title">{title}</h3>
          {subtitle && <p className="rp-sub mt-0.5">{subtitle}</p>}
        </div>
        <span className="rp-badge" data-tone="brand">
          Tổng: {total} lượt bài
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full border border-[var(--rp-line)] shadow-sm"
          style={{ background: gradient }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <span className="rp-num text-xl text-[var(--rp-ink)]">{subPct}%</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--rp-good)]">
              Hoàn thành
            </span>
          </div>
        </div>
        <div className="rp-dim-group flex-1 space-y-2 text-xs w-full">
          <div className="rp-dim-item flex items-center justify-between rounded-xl border border-[var(--rp-good-line)] bg-[var(--rp-good-soft)] px-3.5 py-2">
            <span className="flex items-center gap-2 font-semibold text-[var(--rp-ink)]">
              <span className="h-2 w-2 rounded-full bg-[var(--rp-good)]" />
              Đã nộp bài
            </span>
            <span className="rp-num font-extrabold text-[var(--rp-good)]">
              {submitted} bài ({subPct}%)
            </span>
          </div>
          <div className="rp-dim-item flex items-center justify-between rounded-xl border border-[var(--rp-watch-line)] bg-[var(--rp-watch-soft)] px-3.5 py-2">
            <span className="flex items-center gap-2 font-semibold text-[var(--rp-ink)]">
              <span className="h-2 w-2 rounded-full bg-[var(--rp-watch)]" />
              Đang mở (Còn hạn nộp)
            </span>
            <span className="rp-num font-extrabold text-[var(--rp-watch)]">
              {pendingNotDue} bài ({pendPct}%)
            </span>
          </div>
          <div className="rp-dim-item flex items-center justify-between rounded-xl border border-[var(--rp-bad-line)] bg-[var(--rp-bad-soft)] px-3.5 py-2">
            <span className="flex items-center gap-2 font-semibold text-[var(--rp-ink)]">
              <span className="h-2 w-2 rounded-full bg-[var(--rp-bad)]" />
              Quá hạn chưa nộp
            </span>
            <span className="rp-num font-extrabold text-[var(--rp-bad)]">
              {overdue} bài ({overPct}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Biểu đồ Năng lực 4 Kỹ năng IELTS đồng nhất cho cả 3 cấp (Trường, Lớp, Cá nhân)
 */
export function ReportFourSkillsCard({
  title = "Năng lực theo 4 Kỹ năng IELTS (Thang Band 0.0 – 9.0)",
  subtitle = "So sánh điểm Band trung bình giữa 4 kỹ năng Nghe · Đọc · Viết · Nói",
  skills,
}: {
  title?: string;
  subtitle?: string;
  skills: Array<{
    skill: string;
    label: string;
    averagePercent: number | null;
    displayBand?: number | null;
    completedCount: number;
  }>;
}) {
  const getSkillMeta = (sk: string) => {
    const norm = sk.toUpperCase();
    if (norm === "LISTENING") {
      return {
        icon: <Headphones className="h-4 w-4 text-sky-600" />,
        barClass: "bg-sky-600",
        pillClass: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }
    if (norm === "WRITING") {
      return {
        icon: <PenTool className="h-4 w-4 text-[var(--rp-good)]" />,
        barClass: "bg-[var(--rp-good)]",
        pillClass: "bg-[var(--rp-good-soft)] text-[var(--rp-good)] border-[var(--rp-good-line)]",
      };
    }
    if (norm === "SPEAKING") {
      return {
        icon: <Mic className="h-4 w-4 text-violet-600" />,
        barClass: "bg-violet-600",
        pillClass: "bg-violet-50 text-violet-700 border-violet-200",
      };
    }
    return {
      icon: <BookOpen className="h-4 w-4 text-[var(--rp-brand)]" />,
      barClass: "bg-[var(--rp-brand)]",
      pillClass: "bg-[var(--rp-brand-soft)] text-[var(--rp-brand-strong)] border-[var(--rp-brand-line)]",
    };
  };

  return (
    <div className="rp-card rp-card--pad">
      <div className="mb-4">
        <h3 className="rp-title">{title}</h3>
        {subtitle && <p className="rp-sub mt-0.5">{subtitle}</p>}
      </div>

      <div className="rp-dim-group space-y-3">
        {skills.map((sk) => {
          const meta = getSkillMeta(sk.skill);
          const band =
            sk.displayBand !== undefined && sk.displayBand !== null
              ? sk.displayBand
              : percentToBand(sk.averagePercent);
          const widthPct = band !== null ? Math.min(100, Math.max(6, (band / 9) * 100)) : 0;

          return (
            <div
              key={sk.skill}
              className="rp-dim-item rounded-xl border border-[var(--rp-line)] bg-[var(--rp-canvas)] p-3 space-y-2 transition-all"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg border ${meta.pillClass}`}>
                    {meta.icon}
                  </span>
                  <div>
                    <b className="text-[var(--rp-ink)] text-xs font-bold">{sk.label}</b>
                    <span className="block text-[11px] text-[var(--rp-ink-2)]">
                      {sk.completedCount > 0
                        ? `Đã chấm ${sk.completedCount} bài/lượt`
                        : "Chưa có bài chấm"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="rp-num text-sm text-[var(--rp-ink)]">
                    {band !== null ? `Band ${band.toFixed(1)}` : "—"}
                  </span>
                  <span className="block text-[10px] font-semibold text-[var(--rp-ink-3)]">
                    Thang 9.0
                  </span>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--rp-line)]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${meta.barClass}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReportHorizontalBars({
  title,
  subtitle,
  items,
  onItemClick,
  displayMode = "band",
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
    deltaBand?: number | null;
  }>;
  onItemClick?: (id: string) => void;
  displayMode?: "band" | "accuracy";
}) {
  return (
    <div className="rp-card rp-card--pad">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="rp-title">{title}</h3>
          {subtitle && <p className="rp-sub mt-0.5">{subtitle}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10.5px] font-semibold text-[var(--rp-ink-2)] shrink-0">
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-full bg-[var(--rp-good)] inline-block" /> Tốt
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-full bg-[var(--rp-brand)] inline-block" /> Khá
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-full bg-[var(--rp-watch)] inline-block" /> Lưu ý
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2 w-2 rounded-full bg-[var(--rp-bad)] inline-block" /> Cần hỗ trợ
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--rp-ink-3)]">Chưa có dữ liệu biểu đồ</p>
      ) : (
        <div className="rp-dim-group space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {items.map((item) => {
            const pct = item.percent ?? 0;
            const band = percentToBand(item.percent);
            const barColor =
              item.percent === null
                ? "bg-[var(--rp-line)]"
                : pct < 50
                ? "bg-[var(--rp-bad)]"
                : pct < 65
                ? "bg-[var(--rp-watch)]"
                : pct < 80
                ? "bg-[var(--rp-brand)]"
                : "bg-[var(--rp-good)]";

            const autoRightLabel =
              item.rightText ||
              (item.percent === null
                ? "Chưa có điểm"
                : displayMode === "band" && band !== null
                ? `Band ${band.toFixed(1)} / 9.0`
                : `Đúng ${item.percent}%`);

            return (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item.id)}
                className={`rp-dim-item rounded-xl border border-[var(--rp-line)] bg-[var(--rp-canvas)] p-2.5 transition ${
                  onItemClick
                    ? "cursor-pointer hover:border-[var(--rp-brand-line)] hover:bg-[var(--rp-brand-soft)]"
                    : ""
                }`}
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-[var(--rp-ink)]">
                    <span
                      className={
                        onItemClick
                          ? "hover:text-[var(--rp-brand)]"
                          : ""
                      }
                    >
                      {item.label}
                    </span>
                    {item.badgeText && (
                      <span className="rounded-md bg-white border border-[var(--rp-line)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--rp-ink-2)]">
                        {item.badgeText}
                      </span>
                    )}
                    {item.isLowData && (
                      <span className="rp-badge" data-tone="watch">
                        <AlertTriangle className="h-3 w-3" />
                        Ít dữ liệu (&lt; 10 câu)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.deltaBand !== undefined && item.deltaBand !== null && (
                      <ScoreDeltaBadge delta={item.deltaBand} />
                    )}
                    <span className="rp-num text-xs text-[var(--rp-ink)]">
                      {autoRightLabel}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--rp-line)]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
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

/**
 * Biểu đồ Miền (SVG Area Chart) thể hiện xu hướng Điểm số Band (0.0 – 9.0)
 */
export function ReportTrendLineChart({
  title,
  subtitle,
  points,
  valueUnit = "band",
}: {
  title: string;
  subtitle?: string;
  points: Array<{
    label: string;
    value: number;
    subLabel?: string;
    rawScoreText?: string;
  }>;
  valueUnit?: "band" | "raw";
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const normalizedPoints = points.map((p, idx) => {
    const bandVal = valueUnit === "raw" ? (p.value ?? 0) : (percentToBand(p.value) ?? 0);
    const prevPt = idx > 0 ? points[idx - 1] : null;
    const prevBand =
      prevPt !== null
        ? valueUnit === "raw"
          ? (prevPt.value ?? 0)
          : (percentToBand(prevPt.value) ?? 0)
        : null;
    const delta = prevBand !== null ? Number((bandVal - prevBand).toFixed(1)) : null;

    return {
      label: p.label,
      subLabel: p.subLabel,
      rawPct: p.value,
      bandVal,
      delta,
      rawScoreText: p.rawScoreText,
    };
  });

  const latestPoint = normalizedPoints[normalizedPoints.length - 1] || null;
  const firstPoint = normalizedPoints[0] || null;
  const totalPeriodDelta =
    latestPoint && firstPoint && normalizedPoints.length > 1
      ? Number((latestPoint.bandVal - firstPoint.bandVal).toFixed(1))
      : null;

  const svgW = 560;
  const svgH = 200;
  const padL = 38;
  const padR = 24;
  const padT = 26;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const coords = normalizedPoints.map((pt, idx) => {
    const x =
      normalizedPoints.length === 1
        ? padL + plotW / 2
        : padL + (idx / (normalizedPoints.length - 1)) * plotW;
    const clampedBand = Math.max(0, Math.min(9, pt.bandVal));
    const y = padT + plotH - (clampedBand / 9) * plotH;
    return { x, y, pt, idx };
  });

  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) {
      return `M ${padL} ${pts[0].y} L ${svgW - padR} ${pts[0].y}`;
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpy1 = p0.y;
      const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
      const cpy2 = p1.y;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(coords);
  const baselineY = padT + plotH;
  const areaPath =
    coords.length === 0
      ? ""
      : coords.length === 1
      ? `M ${padL} ${coords[0].y} L ${svgW - padR} ${coords[0].y} L ${svgW - padR} ${baselineY} L ${padL} ${baselineY} Z`
      : `${linePath} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

  const gridBands = [3.0, 5.0, 7.0, 9.0];

  return (
    <div className="rp-card rp-card--pad">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="rp-title flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[var(--rp-brand)]" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="rp-sub mt-0.5">{subtitle}</p>}
        </div>

        {latestPoint && (
          <div className="flex items-center gap-2">
            <span className="rp-badge" data-tone="brand">
              Hiện tại: Band {latestPoint.bandVal.toFixed(1)}
            </span>
            <ScoreDeltaBadge delta={totalPeriodDelta} />
          </div>
        )}
      </div>

      {normalizedPoints.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-xs text-[var(--rp-ink-3)]">
          Chưa có bài chấm điểm trong kỳ để vẽ biểu đồ miền xu hướng
        </div>
      ) : (
        <div className="mt-3 relative">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-52 overflow-visible select-none"
          >
            <defs>
              <linearGradient id="simpaceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {gridBands.map((b) => {
              const gy = padT + plotH - (b / 9) * plotH;
              return (
                <g key={b}>
                  <line
                    x1={padL}
                    y1={gy}
                    x2={svgW - padR}
                    y2={gy}
                    stroke="#E2E8F0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={gy + 3}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono font-bold"
                  >
                    {b.toFixed(1)}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="url(#simpaceAreaGrad)" />

            <path
              d={linePath}
              fill="none"
              stroke="var(--rp-brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {coords.map(({ x, y, pt, idx }) => {
              const isHovered = hoveredIdx === idx;
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <line
                      x1={x}
                      y1={padT}
                      x2={x}
                      y2={baselineY}
                      stroke="var(--rp-brand)"
                      strokeDasharray="2 2"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 4.5}
                    className="fill-white stroke-[var(--rp-brand)] transition-all"
                    strokeWidth={isHovered ? 3 : 2}
                  />
                  <text
                    x={x}
                    y={y - 8}
                    textAnchor="middle"
                    className="fill-slate-900 text-[11px] font-mono font-extrabold"
                  >
                    {pt.bandVal.toFixed(1)}
                  </text>
                  <text
                    x={x}
                    y={svgH - 8}
                    textAnchor="middle"
                    className="fill-slate-600 text-[10.5px] font-semibold"
                  >
                    {pt.label.length > 14 ? `${pt.label.slice(0, 12)}…` : pt.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {hoveredIdx !== null && normalizedPoints[hoveredIdx] && (
            <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2 text-xs text-white shadow-lg">
              <div>
                <b className="text-orange-300">
                  {normalizedPoints[hoveredIdx].subLabel ||
                    normalizedPoints[hoveredIdx].label}
                </b>
                {normalizedPoints[hoveredIdx].rawScoreText && (
                  <span className="ml-2 text-slate-300">
                    ({normalizedPoints[hoveredIdx].rawScoreText})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono font-bold">
                <span>Band {normalizedPoints[hoveredIdx].bandVal.toFixed(1)} / 9.0</span>
                {normalizedPoints[hoveredIdx].delta !== null && (
                  <span
                    className={
                      normalizedPoints[hoveredIdx].delta! >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    (
                    {normalizedPoints[hoveredIdx].delta! > 0
                      ? `+${normalizedPoints[hoveredIdx].delta!.toFixed(1)}`
                      : normalizedPoints[hoveredIdx].delta!.toFixed(1)}{" "}
                    Band)
                  </span>
                )}
              </div>
            </div>
          )}
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
    <div className="rp-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--rp-brand-soft)] text-[var(--rp-brand)]">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="rp-title mt-2">{title}</h3>
      <p className="rp-sub max-w-md">{description}</p>
      {onResetPeriod && (
        <button
          type="button"
          onClick={onResetPeriod}
          className="rp-ctl rp-ctl--primary mt-4"
        >
          <span>Xem toàn bộ thời gian khóa học</span>
        </button>
      )}
    </div>
  );
}
