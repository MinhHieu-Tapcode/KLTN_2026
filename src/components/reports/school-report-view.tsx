"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronUp,
  Filter,
  LineChart,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { MetricComparison, TabSwitchSummary } from "@/services/report-metrics.helper";
import {
  computeBandDeltaFromSeries,
  formatBandLabel,
  percentToBand,
  ReportDonut3Slice,
  ReportEmptyState,
  ReportHorizontalBars,
  ReportKpiCard,
  ReportTrendLineChart,
  ScoreDeltaBadge,
  TabSwitchBadge,
} from "./report-shared-widgets";

export interface SchoolReportData {
  schoolId: string;
  schoolCode: string;
  schoolName: string;
  periodKey: string;
  periodLabel: string;
  kpis: {
    totalClasses: number;
    totalStudents: number;
    schoolAveragePercent: number | null;
    schoolAverageBand?: number | null;
    completionRatePercent: number;
    flaggedSubmissionsCount: number;
    pendingGradingCount: number;
    totalTabSwitches?: number;
    avgTabSwitches?: number;
  };
  tabSwitchSummary?: TabSwitchSummary;
  comparison?: MetricComparison;
  donut: {
    submitted: number;
    pendingNotDue: number;
    overdue: number;
    total: number;
  };
  weeklyTrend: Array<{ label: string; averagePercent: number }>;
  classRows: Array<{
    classId: string;
    classCode: string;
    className: string;
    studentCount: number;
    assignmentCount: number;
    averagePercent: number | null;
    completionRatePercent: number;
    supportNeededCount: number;
    tabSwitchesCount?: number;
    flaggedCount?: number;
    avgTabSwitches?: number;
    supportStudents: Array<{
      studentId: string;
      fullName: string;
      username: string;
      averagePercent: number | null;
      reasons: string[];
    }>;
  }>;
  insights: string[];
}

export function SchoolReportView({
  report,
  hasData,
  onSelectClass,
  onSelectStudent,
  onResetPeriod,
}: {
  report: SchoolReportData;
  hasData: boolean;
  onSelectClass: (classId: string) => void;
  onSelectStudent: (classId: string, studentId: string) => void;
  onResetPeriod: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"CLASSES" | "ANALYTICS" | "DISCIPLINE">("CLASSES");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classSearch, setClassSearch] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"ALL" | "SUPPORT" | "TAB_SWITCH">("ALL");

  if (!hasData) {
    return <ReportEmptyState onResetPeriod={onResetPeriod} />;
  }

  const schoolBand =
    report.kpis.schoolAverageBand !== undefined
      ? report.kpis.schoolAverageBand
      : percentToBand(report.kpis.schoolAveragePercent);

  const trendDeltaBand =
    report.comparison?.deltaBand !== null && report.comparison?.deltaBand !== undefined
      ? report.comparison.deltaBand
      : computeBandDeltaFromSeries(report.weeklyTrend.map((w) => w.averagePercent));

  const totalSupportNeeded = report.classRows.reduce((s, c) => s + c.supportNeededCount, 0);

  // Tổng hợp chuyển tab toàn trường
  const totalSchoolTabSwitches =
    report.kpis.totalTabSwitches ??
    report.tabSwitchSummary?.totalSwitches ??
    report.classRows.reduce((s, c) => s + (c.tabSwitchesCount || 0), 0);

  const totalFlaggedSubmissions =
    report.tabSwitchSummary?.flaggedCount ?? report.kpis.flaggedSubmissionsCount;

  // Lọc danh sách lớp theo ô tìm kiếm và chip bộ lọc nhanh
  const filteredClassRows = useMemo(() => {
    let result = report.classRows;
    if (filterMode === "SUPPORT") {
      result = result.filter((c) => c.supportNeededCount > 0);
    } else if (filterMode === "TAB_SWITCH") {
      result = result.filter((c) => (c.tabSwitchesCount || 0) > 0);
    }

    if (!classSearch.trim()) return result;
    const q = classSearch.toLowerCase().trim();
    return result.filter(
      (c) =>
        c.className.toLowerCase().includes(q) || c.classCode.toLowerCase().includes(q)
    );
  }, [report.classRows, classSearch, filterMode]);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("rp-target-highlight");
      setTimeout(() => el.classList.remove("rp-target-highlight"), 1500);
    }
  };

  const handleNavigateTo = (targetTab: "CLASSES" | "ANALYTICS" | "DISCIPLINE", elementId: string) => {
    setActiveTab(targetTab);
    setTimeout(() => {
      scrollToId(elementId);
    }, 120);
  };

  return (
    <div className="space-y-5">
      {/* =========================================================================
          TẦNG 1: TỔNG QUAN CHỈ SỐ CỐT LÕI (HERO KPIS) - RÕ CHỮ, MAPPING THÔNG MINH
          ========================================================================= */}
      <div className="rp-kpi-grid">
        {/* KPI 1: ĐIỂM TRUNG BÌNH */}
        <ReportKpiCard
          label="Điểm trung bình toàn trường"
          value={schoolBand !== null ? `Band ${schoolBand.toFixed(1)}` : "Chưa có điểm"}
          subtext={`Thang Cambridge Academic • ${report.kpis.totalClasses} lớp hoạt động`}
          tone="brand"
          deltaBand={trendDeltaBand}
          tooltip="Quy đổi theo chuẩn thang điểm Cambridge IELTS Academic từ điểm số trung bình của các lớp có bài chấm"
          actionLabel="Xem biểu đồ xu hướng"
          onActionClick={() => handleNavigateTo("ANALYTICS", "school-trend-section")}
        />

        {/* KPI 2: TIẾN ĐỘ HOÀN THÀNH */}
        <ReportKpiCard
          label="Tiến độ hoàn thành bài tập"
          value={`${report.kpis.completionRatePercent}%`}
          subtext={`Đã nộp ${report.donut.submitted}/${report.donut.total} lượt • Chờ chấm: ${report.kpis.pendingGradingCount}`}
          tone="good"
          badge={
            report.comparison?.deltaCompletionRate !== null &&
            report.comparison?.deltaCompletionRate !== undefined
              ? `${report.comparison.deltaCompletionRate > 0 ? "+" : ""}${report.comparison.deltaCompletionRate}% kỳ trước`
              : undefined
          }
          tooltip="Tỷ lệ lượt bài đã nộp trên tổng số lượt bài đã mở trong kỳ được chọn"
          actionLabel="Xem cơ cấu nộp bài"
          onActionClick={() => handleNavigateTo("ANALYTICS", "school-donut-section")}
        />

        {/* KPI 3: HÀNH VI LÀM BÀI & RỜI MÀN HÌNH */}
        <ReportKpiCard
          label="Hành vi làm bài & Rời màn hình"
          value={`${totalSchoolTabSwitches} lần`}
          subtext={
            totalFlaggedSubmissions > 0
              ? `${totalFlaggedSubmissions} bài vượt ngưỡng • TB ${(totalSchoolTabSwitches / Math.max(1, report.donut.submitted)).toFixed(1)} lần/bài`
              : `TB ${(totalSchoolTabSwitches / Math.max(1, report.donut.submitted)).toFixed(1)} lần/bài • Phòng thi nghiêm túc`
          }
          tone={totalFlaggedSubmissions > 0 ? "bad" : totalSchoolTabSwitches > 0 ? "watch" : "good"}
          tooltip="Số lần học sinh chuyển tab hoặc thu nhỏ trình duyệt khi làm bài thi (qua API visibilitychange). Phân định rõ số lần đếm thực và số bài chạm ngưỡng giới hạn."
          actionLabel="Xem kỷ luật phòng thi"
          onActionClick={() => handleNavigateTo("DISCIPLINE", "school-discipline-section")}
        />

        {/* KPI 4: CẢNH BÁO HỌC TẬP & QUÁ HẠN */}
        <ReportKpiCard
          label="Cảnh báo học tập & Quá hạn"
          value={`${totalSupportNeeded} HV cần hỗ trợ`}
          subtext={`Quá hạn: ${report.donut.overdue} bài • Từ ${report.classRows.filter((c) => c.supportNeededCount > 0).length} lớp`}
          tone={totalSupportNeeded > 0 || report.donut.overdue > 0 ? "bad" : "empty"}
          tooltip="Học sinh thuộc diện cần hỗ trợ khi ĐTB < 50%, có từ 2 bài quá hạn chưa nộp hoặc điểm số giảm liên tiếp qua 3 bài gần nhất"
          actionLabel="Xem các lớp cần hỗ trợ"
          onActionClick={() => {
            setFilterMode("SUPPORT");
            handleNavigateTo("CLASSES", "school-classes-table");
          }}
        />
      </div>

      {/* =========================================================================
          TẦNG 2: THANH CHUYỂN TAB GÓC NHÌN (PROGRESSIVE DISCLOSURE) - GỌN GÀNG, THOÁNG MẮT
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("CLASSES")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "CLASSES"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Building2 className="h-4 w-4" strokeWidth={1.75} />
            <span>Bảng tổng hợp lớp học ({report.classRows.length})</span>
            {totalSupportNeeded > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ml-1">
                {totalSupportNeeded} cần hỗ trợ
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ANALYTICS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "ANALYTICS"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <LineChart className="h-4 w-4" strokeWidth={1.75} />
            <span>Phân tích xu hướng &amp; So sánh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DISCIPLINE")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "DISCIPLINE"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
            <span>Kỷ luật làm bài &amp; Chuyển tab</span>
            {totalFlaggedSubmissions > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ml-1">
                {totalFlaggedSubmissions}
              </span>
            )}
          </button>
        </div>

        <span className="px-3 text-xs text-slate-500">
          Trường: <strong className="text-slate-800 font-bold">{report.schoolName}</strong>
        </span>
      </div>

      {/* =========================================================================
          TẦNG 3: NỘI DUNG THEO TAB CHỌN (KHÔNG CHỒNG CHÉO THÔNG TIN)
          ========================================================================= */}
      {activeTab === "CLASSES" && (
        <div
          id="school-classes-table"
          className="rp-card overflow-hidden"
        >
          <div className="border-b border-[var(--rp-border)] p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="rp-title">
                Bảng tổng hợp kết quả theo Lớp học ({report.schoolName})
              </h3>
              <p className="rp-sub mt-0.5">
                Nhấn vào tên lớp hoặc nút "Xem lớp" để chuyển sang Báo cáo chi tiết của Lớp đó
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bộ lọc nhanh (Filter Chips) */}
              <div className="flex items-center gap-1 rounded-[var(--rp-radius-md)] bg-[var(--rp-surface-muted)] p-1 text-xs border border-[var(--rp-border)]">
                <button
                  type="button"
                  onClick={() => setFilterMode("ALL")}
                  aria-pressed={filterMode === "ALL"}
                  className="rp-chip"
                >
                  Tất cả ({report.classRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("SUPPORT")}
                  aria-pressed={filterMode === "SUPPORT"}
                  className="rp-chip"
                >
                  ⚠️ Cần hỗ trợ ({report.classRows.filter((c) => c.supportNeededCount > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("TAB_SWITCH")}
                  aria-pressed={filterMode === "TAB_SWITCH"}
                  className="rp-chip"
                >
                  🚨 Có chuyển tab ({report.classRows.filter((c) => (c.tabSwitchesCount || 0) > 0).length})
                </button>
              </div>

              {/* Ô tìm kiếm lớp */}
              <div className="relative w-56 max-w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--rp-text-muted)]" />
                <input
                  type="text"
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Tìm mã hoặc tên lớp..."
                  className="w-full rounded-[var(--rp-radius-md)] border border-[var(--rp-border)] bg-[var(--rp-surface-muted)] py-1.5 pl-8 pr-3 text-xs font-semibold text-[var(--rp-text)] placeholder-[var(--rp-text-muted)] focus:border-[var(--rp-brand)] focus:bg-[var(--rp-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--rp-ring)]"
                />
              </div>
            </div>
          </div>

          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="text-left">Lớp học</th>
                  <th className="text-center">Tiến độ &amp; Bài giao</th>
                  <th className="text-center">Sĩ số</th>
                  <th className="text-center">ĐTB Cambridge</th>
                  <th className="text-center">So với TB Trường</th>
                  <th className="text-center">Rời màn hình</th>
                  <th className="text-center">Cần hỗ trợ</th>
                  <th className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-[var(--rp-text-muted)]">
                      Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredClassRows.map((cls) => {
                    const isExpanded = expandedClassId === cls.classId;
                    const clsBand = percentToBand(cls.averagePercent);
                    const diffFromSchool =
                      clsBand !== null && schoolBand !== null
                        ? Number((clsBand - schoolBand).toFixed(1))
                        : null;

                    return (
                      <React.Fragment key={cls.classId}>
                        <tr className="transition group">
                          <td className="font-bold text-[var(--rp-text)]">
                            <button
                              type="button"
                              onClick={() => onSelectClass(cls.classId)}
                              className="text-left group-hover:text-[var(--rp-brand)] group-hover:underline flex items-center gap-1.5"
                            >
                              <span>{cls.classCode} — {cls.className}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[var(--rp-brand)]" />
                            </button>
                          </td>
                          <td className="text-center text-[var(--rp-text)] font-medium">
                            {cls.assignmentCount} bài •{" "}
                            <b className="text-[var(--rp-good)]">{cls.completionRatePercent}%</b>
                          </td>
                          <td className="text-center font-bold text-[var(--rp-text)]">
                            {cls.studentCount} HV
                          </td>
                          <td className="text-center">
                            <span className="font-bold font-mono text-sm text-[var(--rp-brand)]">
                              {clsBand !== null ? `Band ${clsBand.toFixed(1)}` : "—"}
                            </span>
                          </td>
                          <td className="text-center">
                            <ScoreDeltaBadge delta={diffFromSchool} />
                          </td>
                          <td className="text-center">
                            <TabSwitchBadge count={cls.tabSwitchesCount || 0} />
                          </td>
                          <td className="text-center">
                            {cls.supportNeededCount > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedClassId(isExpanded ? null : cls.classId)
                                }
                                className="rp-badge inline-flex items-center gap-1 cursor-pointer"
                                data-tone="bad"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>{cls.supportNeededCount} HV cần hỗ trợ</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            ) : (
                              <span className="rp-badge" data-tone="good">
                                Ổn định
                              </span>
                            )}
                          </td>
                          <td className="text-right">
                            <button
                              type="button"
                              onClick={() => onSelectClass(cls.classId)}
                              className="rp-ctl inline-flex items-center gap-1 text-xs font-bold text-[var(--rp-brand)]"
                            >
                              <span>Xem lớp</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>

                        {/* Hàng mở rộng danh sách học sinh cần hỗ trợ */}
                        {isExpanded && cls.supportStudents.length > 0 && (
                          <tr className="bg-[var(--rp-bad-surface)] border-y border-[var(--rp-bad-border)]">
                            <td colSpan={8} className="px-6 py-3.5">
                              <div className="text-[11px] font-bold text-[var(--rp-bad)] mb-2.5 flex items-center gap-1.5 uppercase">
                                <Users className="h-3.5 w-3.5" />
                                <span>Danh sách học sinh cần hỗ trợ tại lớp {cls.classCode}:</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {cls.supportStudents.map((st) => (
                                  <div
                                    key={st.studentId}
                                    className="flex items-center justify-between rounded-[var(--rp-radius-md)] border border-[var(--rp-bad-border)] bg-[var(--rp-surface)] p-3 text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-[var(--rp-text)]">
                                        {st.fullName}{" "}
                                        <span className="text-[var(--rp-brand)] font-mono font-bold">
                                          ({formatBandLabel(st.averagePercent)})
                                        </span>
                                      </div>
                                      <div className="text-[11px] font-semibold text-[var(--rp-bad)] mt-0.5">
                                        Lý do: {st.reasons.join(" • ")}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => onSelectStudent(cls.classId, st.studentId)}
                                      className="rp-ctl text-[var(--rp-brand)] font-bold text-xs shrink-0"
                                    >
                                      Chi tiết HV →
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ANALYTICS" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div id="school-trend-section">
              <ReportTrendLineChart
                title="Xu hướng Điểm số trung bình toàn trường (Band 0.0 – 9.0)"
                subtitle={`Biến động điểm Band chuẩn Cambridge qua các mốc thời gian (${report.periodLabel})`}
                points={report.weeklyTrend.map((w) => ({
                  label: w.label,
                  value: w.averagePercent,
                }))}
              />
            </div>

            <div id="school-donut-section">
              <ReportDonut3Slice
                title="Cơ cấu nộp và hoàn thành bài tập toàn trường"
                subtitle="Tương quan giữa bài Đã nộp, Đang mở (còn hạn) và Quá hạn chưa nộp"
                submitted={report.donut.submitted}
                pendingNotDue={report.donut.pendingNotDue}
                overdue={report.donut.overdue}
              />
            </div>
          </div>

          <div id="school-comparison-section">
            <ReportHorizontalBars
              title="So sánh Điểm số trung bình giữa các lớp (Band 0.0 – 9.0)"
              subtitle="Nhấn vào tên một lớp để đi sâu (drill-down) vào Báo cáo chi tiết của Lớp đó"
              displayMode="band"
              items={report.classRows.map((c) => {
                const clsBand = percentToBand(c.averagePercent);
                const delta =
                  clsBand !== null && schoolBand !== null
                    ? Number((clsBand - schoolBand).toFixed(1))
                    : null;
                return {
                  id: c.classId,
                  label: `${c.classCode} — ${c.className}`,
                  percent: c.averagePercent,
                  badgeText: `${c.studentCount} HV`,
                  deltaBand: delta,
                };
              })}
              onItemClick={onSelectClass}
            />
          </div>
        </div>
      )}

      {activeTab === "DISCIPLINE" && (
        <div className="space-y-5">
          {/* Biểu đồ giám sát kỷ luật chuyển tab giữa các lớp */}
          <div id="school-discipline-section" className="rp-card rp-card--pad">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="rp-title flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-[var(--rp-brand)]" />
                  <span>Kỷ luật phòng thi &amp; Lượt rời màn hình theo lớp</span>
                </h3>
                <p className="rp-sub mt-0.5">
                  Thống kê số lần học sinh chuyển tab làm bài (Click vào cột lớp để xem chi tiết)
                </p>
              </div>
              <span className="rp-badge" data-tone="brand">
                {totalSchoolTabSwitches} lần toàn trường
              </span>
            </div>

            <div className="mt-4 flex h-48 items-end gap-3 border-b border-l border-[var(--rp-border)] px-3 pb-2 pt-4">
              {report.classRows.map((c) => {
                const sw = c.tabSwitchesCount || 0;
                const maxSw = Math.max(
                  5,
                  ...report.classRows.map((r) => r.tabSwitchesCount || 0)
                );
                const hPct = Math.max(14, Math.round((sw / maxSw) * 100));
                const isHigh = (c.flaggedCount || 0) > 0 || sw >= 3;

                return (
                  <div
                    key={c.classId}
                    onClick={() => onSelectClass(c.classId)}
                    title={`Lớp ${c.className}: ${sw} lần rời màn hình. Nhấn để xem báo cáo lớp`}
                    className="flex flex-1 cursor-pointer flex-col items-center justify-end gap-1.5 h-full group"
                  >
                    <span
                      className={`text-[11px] font-bold transition ${
                        isHigh ? "text-[var(--rp-bad)]" : "text-[var(--rp-text)] group-hover:text-[var(--rp-brand)]"
                      }`}
                    >
                      {sw} lần
                    </span>
                    <div
                      className={`w-full max-w-[46px] rounded-t-[var(--rp-radius-sm)] transition-all group-hover:opacity-90 ${
                        isHigh
                          ? "bg-[var(--rp-bad)]"
                          : "bg-[var(--rp-brand)]"
                      }`}
                      style={{ height: `${hPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-3 px-3">
              {report.classRows.map((c) => (
                <div
                  key={c.classId}
                  onClick={() => onSelectClass(c.classId)}
                  className="flex-1 truncate text-center text-[11px] font-semibold text-[var(--rp-text)] hover:text-[var(--rp-brand)] cursor-pointer"
                >
                  {c.classCode}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
