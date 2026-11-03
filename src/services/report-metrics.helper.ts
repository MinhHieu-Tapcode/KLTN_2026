import { percentToCambridgeBand } from "@/lib/ielts-report-config";

export interface TabSwitchSummary {
  totalSwitches: number;
  avgSwitchesPerSubmission: number;
  flaggedCount: number; // isCheatingFlagged === true (vượt ngưỡng chuyển tab)
  timeExpiredCount: number; // autoSubmittedReason === "TIME_EXPIRED"
  submissionsWithSwitchesCount: number;
  switchRatePercent: number;
}

export function computeTabSwitchSummary(
  submissions: Array<{
    tabSwitchCount?: number | null;
    isCheatingFlagged?: boolean | null;
    autoSubmittedReason?: string | null;
    status?: string | null;
  }>
): TabSwitchSummary {
  const validSubs = submissions.filter(
    (s) => s.status === "SUBMITTED" || s.status === "GRADED"
  );
  const totalCount = validSubs.length;

  let totalSwitches = 0;
  let flaggedCount = 0;
  let timeExpiredCount = 0;
  let subsWithSwitches = 0;

  for (const s of validSubs) {
    const sw = s.tabSwitchCount || 0;
    totalSwitches += sw;
    if (sw > 0) subsWithSwitches++;
    if (s.isCheatingFlagged) flaggedCount++;
    if (s.autoSubmittedReason === "TIME_EXPIRED") timeExpiredCount++;
  }

  const avgSwitchesPerSubmission =
    totalCount > 0 ? Number((totalSwitches / totalCount).toFixed(1)) : 0;
  const switchRatePercent =
    totalCount > 0 ? Number(((subsWithSwitches / totalCount) * 100).toFixed(1)) : 0;

  return {
    totalSwitches,
    avgSwitchesPerSubmission,
    flaggedCount,
    timeExpiredCount,
    submissionsWithSwitchesCount: subsWithSwitches,
    switchRatePercent,
  };
}

export interface MetricComparison {
  deltaBand: number | null;
  deltaCompletionRate: number | null;
  deltaTabSwitches: number | null;
  hasPrevious: boolean;
  previousPeriodLabel?: string;
  previousBand?: number | null;
  previousCompletionRate?: number | null;
  previousTabSwitches?: number | null;
}

export function computeMetricComparison(params: {
  currentBand: number | null;
  previousBand: number | null;
  currentCompletionRate: number;
  previousCompletionRate: number | null;
  currentTabSwitches: number;
  previousTabSwitches: number | null;
  hasPreviousPeriod: boolean;
  previousPeriodLabel?: string;
}): MetricComparison {
  if (!params.hasPreviousPeriod) {
    return {
      deltaBand: null,
      deltaCompletionRate: null,
      deltaTabSwitches: null,
      hasPrevious: false,
    };
  }

  const deltaBand =
    params.currentBand !== null && params.previousBand !== null
      ? Number((params.currentBand - params.previousBand).toFixed(1))
      : null;

  const deltaCompletionRate =
    params.previousCompletionRate !== null
      ? Number((params.currentCompletionRate - params.previousCompletionRate).toFixed(1))
      : null;

  const deltaTabSwitches =
    params.previousTabSwitches !== null
      ? params.currentTabSwitches - params.previousTabSwitches
      : null;

  return {
    deltaBand,
    deltaCompletionRate,
    deltaTabSwitches,
    hasPrevious: true,
    previousPeriodLabel: params.previousPeriodLabel,
    previousBand: params.previousBand,
    previousCompletionRate: params.previousCompletionRate,
    previousTabSwitches: params.previousTabSwitches,
  };
}

/**
 * Phân loại mức độ chuyển tab trực quan để hiển thị UI
 */
export function getTabSwitchSeverity(count: number): {
  tone: "emerald" | "amber" | "rose";
  label: string;
  badgeClass: string;
} {
  if (count <= 0) {
    return {
      tone: "emerald",
      label: "0 lần (Tập trung)",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (count <= 2) {
    return {
      tone: "amber",
      label: `${count} lần rời MH (Lưu ý)`,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  return {
    tone: "rose",
    label: `${count} lần rời MH (Vượt ngưỡng)`,
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold",
  };
}

/**
 * Phân loại bài tập/bài làm thành kỳ hiện tại và kỳ liền trước
 */
export function partitionAssignmentsByPeriod<
  T extends { startDate?: Date | null; createdAt?: Date | null }
>(
  items: T[],
  currentRange: { fromDate: Date | null; toDate: Date },
  prevRange: { fromDate: Date | null; toDate: Date | null; hasPreviousPeriod: boolean }
) {
  const currentItems: T[] = [];
  const prevItems: T[] = [];

  for (const item of items) {
    const d = item.startDate
      ? new Date(item.startDate)
      : item.createdAt
      ? new Date(item.createdAt)
      : new Date();

    if (prevRange.hasPreviousPeriod && prevRange.fromDate && prevRange.toDate) {
      if (d >= prevRange.fromDate && d < prevRange.toDate) {
        prevItems.push(item);
      }
    }
    if (!currentRange.fromDate || (d >= currentRange.fromDate && d <= currentRange.toDate)) {
      currentItems.push(item);
    }
  }

  return { currentItems, prevItems };
}


