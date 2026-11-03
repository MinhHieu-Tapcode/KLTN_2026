"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  Filter,
  LineChart,
  MessageSquareText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import { MetricComparison, TabSwitchSummary } from "@/services/report-metrics.helper";
import { ReportCommentDTO } from "@/services/report-comment.service";
import { ClassOperationsData, ClassOperationsTab } from "./class-operations-tab";
import { ReportCommentEditorCard } from "./report-comment-section";
import {
  computeBandDeltaFromSeries,
  formatBandLabel,
  percentToBand,
  ReportDonut3Slice,
  ReportEmptyState,
  ReportFourSkillsCard,
  ReportHorizontalBars,
  ReportKpiCard,
  ReportTrendLineChart,
  ScoreDeltaBadge,
  TabSwitchBadge,
} from "./report-shared-widgets";

export interface ClassReportData {
  classId: string;
  classCode: string;
  className: string;
  schoolId: string;
  schoolName: string;
  periodKey: ReportPeriodKey;
  periodLabel: string;
  kpis: {
    studentCount: number;
    classAveragePercent: number | null;
    classAverageBand?: number | null;
    assignedCount: number;
    completionRatePercent: number;
    totalTabSwitches?: number;
    avgTabSwitchesPerSubmission?: number;
    flaggedCount?: number;
  };
  tabSwitchSummary?: TabSwitchSummary;
  comparison?: MetricComparison;
  donut: {
    submitted: number;
    pendingNotDue: number;
    overdue: number;
    total: number;
  };
  assignmentAverages: Array<{
    assignmentId: string;
    title: string;
    skill: string;
    averagePercent: number | null;
    submittedCount: number;
  }>;
  weeklyTrend: Array<{ label: string; averagePercent: number }>;
  questionTypeAccuracy: Array<{
    code: string;
    label: string;
    skill: string;
    correctCount: number;
    totalCount: number;
    accuracyPercent: number;
    isLowData: boolean;
  }>;
  studentRows: Array<{
    studentId: string;
    username: string;
    fullName: string;
    email: string;
    submittedCount: number;
    assignedCount: number;
    overdueCount: number;
    pendingGradingCount: number;
    averagePercent: number | null;
    completionRatePercent: number;
    needsSupport: boolean;
    supportReasons: string[];
    tabSwitchesCount?: number;
    flaggedCount?: number;
    avgTabSwitches?: number;
  }>;
  classComment: ReportCommentDTO | null;
  operations: ClassOperationsData;
}

export function ClassReportView({
  report,
  hasData,
  userRole,
  onSelectStudent,
  onResetPeriod,
}: {
  report: ClassReportData;
  hasData: boolean;
  userRole: string;
  onSelectStudent: (studentId: string) => void;
  onResetPeriod: () => void;
}) {
  type ClassTabMode = "STUDENTS" | "SKILLS" | "TRENDS" | "OPERATIONS" | "COMMENTS";
  const [activeTab, setActiveTab] = useState<ClassTabMode>("STUDENTS");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"ALL" | "SUPPORT" | "TAB_SWITCH" | "OVERDUE">("ALL");

  const classBand =
    report.kpis.classAverageBand !== undefined
      ? report.kpis.classAverageBand
      : percentToBand(report.kpis.classAveragePercent);

  const trendDeltaBand =
    report.comparison?.deltaBand !== null && report.comparison?.deltaBand !== undefined
      ? report.comparison.deltaBand
      : computeBandDeltaFromSeries(report.weeklyTrend.map((w) => w.averagePercent));

  const supportNeededCount = report.studentRows.filter((s) => s.needsSupport).length;

  const totalClassTabSwitches =
    report.kpis.totalTabSwitches ??
    report.tabSwitchSummary?.totalSwitches ??
    report.studentRows.reduce((s, st) => s + (st.tabSwitchesCount || 0), 0);

  const flaggedTabCount =
    report.kpis.flaggedCount ??
    report.tabSwitchSummary?.flaggedCount ??
    report.operations.flaggedCount;

  const avgTabSwitches =
    report.kpis.avgTabSwitchesPerSubmission ??
    report.tabSwitchSummary?.avgSwitchesPerSubmission ??
    report.operations.avgTabSwitches;

  // Tổng hợp năng lực 4 Kỹ năng của cả lớp từ danh sách bài tập đã chấm
  const classFourSkills = useMemo(
    () =>
      (["LISTENING", "READING", "WRITING", "SPEAKING"] as const).map((sk) => {
        const matched = report.assignmentAverages.filter(
          (a) => a.skill?.toUpperCase() === sk && a.averagePercent !== null
        );
        const avgPct =
          matched.length > 0
            ? Number(
                (
                  matched.reduce((sum, a) => sum + (a.averagePercent ?? 0), 0) /
                  matched.length
                ).toFixed(1)
              )
            : null;
        return {
          skill: sk.toLowerCase(),
          label: sk.charAt(0) + sk.slice(1).toLowerCase(),
          averagePercent: avgPct,
          displayBand: percentToBand(avgPct, sk),
          completedCount: matched.length,
        };
      }),
    [report.assignmentAverages]
  );

  // Lọc danh sách học sinh theo ô tìm kiếm và chip bộ lọc nhanh
  const filteredStudentRows = useMemo(() => {
    let result = report.studentRows;
    if (filterMode === "SUPPORT") {
      result = result.filter((s) => s.needsSupport);
    } else if (filterMode === "TAB_SWITCH") {
      result = result.filter((s) => (s.tabSwitchesCount || 0) > 0);
    } else if (filterMode === "OVERDUE") {
      result = result.filter((s) => s.overdueCount > 0);
    }

    if (!studentSearch.trim()) return result;
    const q = studentSearch.toLowerCase().trim();
    return result.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) || s.username.toLowerCase().includes(q)
    );
  }, [report.studentRows, studentSearch, filterMode]);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("rp-target-highlight");
      setTimeout(() => el.classList.remove("rp-target-highlight"), 1500);
    }
  };

  const handleNavigateTo = (targetTab: ClassTabMode, elementId: string) => {
    setActiveTab(targetTab);
    setTimeout(() => {
      scrollToId(elementId);
    }, 120);
  };

  if (!hasData) {
    return <ReportEmptyState onResetPeriod={onResetPeriod} />;
  }

  return (
    <div className="space-y-5">
      {/* =========================================================================
          TẦNG 1: BỘ 4 THẺ CHỈ SỐ CỐT LÕI (HERO KPIS) - LUÔN HIỆN Ở TRÊN CÙNG
          ========================================================================= */}
      <div className="rp-kpi-grid">
        {/* KPI 1: ĐIỂM TRUNG BÌNH */}
        <ReportKpiCard
          label="Điểm trung bình của lớp"
          value={classBand !== null ? `Band ${classBand.toFixed(1)}` : "Chưa có điểm"}
          subtext={`Thang Cambridge Academic • ${report.kpis.studentCount} học sinh`}
          tone="brand"
          deltaBand={trendDeltaBand}
          tooltip="Điểm IELTS Band trung bình quy đổi theo chuẩn Cambridge Academic của các học sinh trong lớp"
          actionLabel="Xem biểu đồ xu hướng"
          onActionClick={() => handleNavigateTo("TRENDS", "class-trend-section")}
        />

        {/* KPI 2: TIẾN ĐỘ HOÀN THÀNH */}
        <ReportKpiCard
          label="Tiến độ hoàn thành bài tập"
          value={`${report.kpis.completionRatePercent}%`}
          subtext={`Đã nộp ${report.donut.submitted}/${report.donut.total} lượt • Chờ chấm: ${report.operations.pendingGradingCount}`}
          tone="good"
          badge={
            report.comparison?.deltaCompletionRate !== null &&
            report.comparison?.deltaCompletionRate !== undefined
              ? `${report.comparison.deltaCompletionRate > 0 ? "+" : ""}${report.comparison.deltaCompletionRate}% kỳ trước`
              : undefined
          }
          tooltip="Tỷ lệ lượt bài đã nộp trên tổng số lượt bài đã giao cho lớp trong kỳ"
          actionLabel="Xem cơ cấu nộp bài"
          onActionClick={() => handleNavigateTo("TRENDS", "class-donut-section")}
        />

        {/* KPI 3: HÀNH VI LÀM BÀI & RỜI MÀN HÌNH */}
        <ReportKpiCard
          label="Hành vi làm bài & Rời màn hình"
          value={`${totalClassTabSwitches} lần`}
          subtext={
            flaggedTabCount > 0
              ? `${flaggedTabCount} bài vượt ngưỡng • TB ${avgTabSwitches} lần/bài`
              : `TB ${avgTabSwitches} lần/bài • Phòng thi nghiêm túc`
          }
          tone={flaggedTabCount > 0 ? "bad" : totalClassTabSwitches > 0 ? "watch" : "good"}
          tooltip="Tổng số lần học sinh trong lớp rời tab hoặc thu nhỏ trình duyệt khi làm bài"
          actionLabel="Xem nhật ký giám sát"
          onActionClick={() => setActiveTab("OPERATIONS")}
        />

        {/* KPI 4: CẢNH BÁO HỌC TẬP & QUÁ HẠN */}
        <ReportKpiCard
          label="Cảnh báo học tập & Quá hạn"
          value={`${supportNeededCount} HV cần hỗ trợ`}
          subtext={`Quá hạn: ${report.donut.overdue} lượt • Cờ giám sát: ${flaggedTabCount}`}
          tone={supportNeededCount > 0 || report.donut.overdue > 0 ? "bad" : "empty"}
          tooltip="Học sinh có ĐTB < 50%, có từ 2 bài quá hạn hoặc điểm giảm liên tiếp 3 bài gần nhất"
          actionLabel="Xem danh sách cần hỗ trợ"
          onActionClick={() => {
            setFilterMode("SUPPORT");
            handleNavigateTo("STUDENTS", "class-students-table");
          }}
        />
      </div>

      {/* =========================================================================
          TẦNG 2: THANH CHUYỂN TAB GÓC NHÌN (PROGRESSIVE DISCLOSURE CHO CẤP LỚP)
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("STUDENTS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "STUDENTS"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="h-4 w-4" strokeWidth={1.75} />
            <span>Danh sách học sinh ({report.studentRows.length})</span>
            {supportNeededCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ml-1">
                {supportNeededCount} cần hỗ trợ
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SKILLS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "SKILLS"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Target className="h-4 w-4" strokeWidth={1.75} />
            <span>Năng lực 4 Kỹ năng &amp; Bài tập</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TRENDS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "TRENDS"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <LineChart className="h-4 w-4" strokeWidth={1.75} />
            <span>Xu hướng &amp; Cơ cấu bài nộp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OPERATIONS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "OPERATIONS"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            <span>Vận hành &amp; Giám sát</span>
            {flaggedTabCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ml-1">
                {flaggedTabCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMMENTS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "COMMENTS"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <MessageSquareText className="h-4 w-4" strokeWidth={1.75} />
            <span>Nhận xét lớp</span>
          </button>
        </div>

        <span className="px-3 text-xs text-slate-500">
          Lớp: <strong className="text-slate-800 font-bold">{report.classCode}</strong> — {report.schoolName}
        </span>
      </div>

      {/* =========================================================================
          TẦNG 3: NỘI DUNG THEO TAB CHỌN (GỌN GÀNG, CHỈ XEM NỘI DUNG CẦN THIẾT)
          ========================================================================= */}
      {activeTab === "STUDENTS" && (
        <div
          id="class-students-table"
          className="rp-card overflow-hidden"
        >
          <div className="border-b border-[var(--rp-border)] p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="rp-title">
                Bảng tổng hợp kết quả từng Học sinh ({report.classCode})
              </h3>
              <p className="rp-sub mt-0.5">
                Nhấn vào tên học sinh hoặc nút "Báo cáo HV" để xem chi tiết kết quả cá nhân
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
                  Tất cả ({report.studentRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("SUPPORT")}
                  aria-pressed={filterMode === "SUPPORT"}
                  className="rp-chip"
                >
                  ⚠️ Cần hỗ trợ ({report.studentRows.filter((s) => s.needsSupport).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("TAB_SWITCH")}
                  aria-pressed={filterMode === "TAB_SWITCH"}
                  className="rp-chip"
                >
                  🚨 Chuyển tab ({report.studentRows.filter((s) => (s.tabSwitchesCount || 0) > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("OVERDUE")}
                  aria-pressed={filterMode === "OVERDUE"}
                  className="rp-chip"
                >
                  ⏳ Quá hạn ({report.studentRows.filter((s) => s.overdueCount > 0).length})
                </button>
              </div>

              {/* Ô tìm kiếm học sinh */}
              <div className="relative w-56 max-w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--rp-text-muted)]" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Tìm theo tên học sinh..."
                  className="w-full rounded-[var(--rp-radius-md)] border border-[var(--rp-border)] bg-[var(--rp-surface-muted)] py-1.5 pl-8 pr-3 text-xs font-semibold text-[var(--rp-text)] placeholder-[var(--rp-text-muted)] focus:border-[var(--rp-brand)] focus:bg-[var(--rp-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--rp-ring)]"
                />
              </div>
            </div>
          </div>

          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="text-left">Học sinh</th>
                  <th className="text-center">Tiến độ nộp</th>
                  <th className="text-center">Quá hạn &amp; Chờ chấm</th>
                  <th className="text-center">ĐTB Cambridge</th>
                  <th className="text-center">So với TB Lớp</th>
                  <th className="text-center">Rời màn hình</th>
                  <th className="text-left">Trạng thái học tập</th>
                  <th className="text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-[var(--rp-text-muted)]">
                      Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredStudentRows.map((st) => {
                    const stBand = percentToBand(st.averagePercent);
                    const diffFromClass =
                      stBand !== null && classBand !== null
                        ? Number((stBand - classBand).toFixed(1))
                        : null;

                    return (
                      <tr key={st.studentId} className="transition group">
                        <td className="font-bold text-[var(--rp-text)]">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(st.studentId)}
                            className="group-hover:text-[var(--rp-brand)] group-hover:underline text-left flex items-center gap-1.5"
                          >
                            <span>{st.fullName}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-[var(--rp-brand)]" />
                          </button>
                          <span className="block text-[11px] font-normal text-[var(--rp-text-muted)]">
                            {st.username}
                          </span>
                        </td>
                        <td className="text-center font-medium text-[var(--rp-text)]">
                          {st.submittedCount}/{st.assignedCount} bài (
                          <b className="text-[var(--rp-good)]">{st.completionRatePercent}%</b>)
                        </td>
                        <td className="text-center">
                          <span
                            className={`font-bold ${
                              st.overdueCount > 0 ? "text-[var(--rp-bad)]" : "text-[var(--rp-text-muted)]"
                            }`}
                          >
                            {st.overdueCount} quá hạn
                          </span>
                          <span className="mx-1.5 text-[var(--rp-border)]">•</span>
                          <span
                            className={`font-semibold ${
                              st.pendingGradingCount > 0 ? "text-[var(--rp-watch)]" : "text-[var(--rp-text-muted)]"
                            }`}
                          >
                            {st.pendingGradingCount} chờ chấm
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="font-bold font-mono text-sm text-[var(--rp-brand)]">
                            {stBand !== null ? `Band ${stBand.toFixed(1)}` : "—"}
                          </span>
                        </td>
                        <td className="text-center">
                          <ScoreDeltaBadge delta={diffFromClass} />
                        </td>
                        <td className="text-center">
                          <TabSwitchBadge count={st.tabSwitchesCount || 0} />
                        </td>
                        <td>
                          {st.needsSupport ? (
                            <span className="rp-badge" data-tone="bad">
                              ⚠️ {st.supportReasons.join(" • ")}
                            </span>
                          ) : (
                            <span className="rp-badge" data-tone="good">
                              Ổn định
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => onSelectStudent(st.studentId)}
                            className="rp-ctl inline-flex items-center gap-1 text-xs font-bold text-[var(--rp-brand)]"
                          >
                            <span>Báo cáo HV</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "SKILLS" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* NĂNG LỰC 4 KỸ NĂNG CỦA LỚP */}
            <ReportFourSkillsCard
              title="Năng lực 4 Kỹ năng IELTS của lớp (Thang Band 0.0 – 9.0)"
              subtitle="Điểm Band chuẩn Cambridge theo từng kỹ năng Nghe · Đọc · Viết · Nói"
              skills={classFourSkills}
            />

            {/* ĐTB THEO TỪNG BÀI TẬP */}
            <ReportHorizontalBars
              title="Điểm số trung bình theo từng Bài tập (Band 0.0 – 9.0)"
              subtitle="Giúp giáo viên nhận diện bài tập nào cả lớp làm tốt hoặc gặp khó khăn"
              displayMode="band"
              items={report.assignmentAverages.map((a) => {
                const b = percentToBand(a.averagePercent, a.skill);
                return {
                  id: a.assignmentId,
                  label: a.title,
                  percent: a.averagePercent,
                  badgeText: a.skill.toUpperCase(),
                  rightText:
                    b !== null
                      ? `Band ${b.toFixed(1)} (${a.submittedCount} HV nộp)`
                      : `Chờ chấm (${a.submittedCount} HV nộp)`,
                };
              })}
            />
          </div>

          {/* PHỔ ĐIỂM DẠNG CÂU HỎI IELTS CỦA CẢ LỚP */}
          {report.questionTypeAccuracy.length > 0 && (
            <ReportHorizontalBars
              title="Tỷ lệ trả lời đúng theo từng dạng câu hỏi IELTS của lớp"
              subtitle="Phát hiện dạng câu hỏi cả lớp đang yếu để giáo viên điều chỉnh trọng tâm ôn tập"
              displayMode="accuracy"
              items={report.questionTypeAccuracy.map((q) => ({
                id: q.code,
                label: q.label,
                percent: q.accuracyPercent,
                badgeText: q.skill.toUpperCase(),
                isLowData: q.isLowData,
                rightText: `Đúng ${q.correctCount}/${q.totalCount} câu (${q.accuracyPercent}%)`,
              }))}
            />
          )}
        </div>
      )}

      {activeTab === "TRENDS" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div id="class-trend-section">
              <ReportTrendLineChart
                title="Xu hướng Điểm số trung bình của lớp (Band 0.0 – 9.0)"
                subtitle={`Biến động điểm Band trung bình chuẩn Cambridge qua các tuần (${report.periodLabel})`}
                points={report.weeklyTrend.map((w) => ({
                  label: w.label,
                  value: w.averagePercent,
                }))}
              />
            </div>

            <div id="class-donut-section">
              <ReportDonut3Slice
                title="Cơ cấu hoàn thành bài tập của lớp"
                subtitle="Tương quan giữa Đã nộp, Đang mở (còn hạn) và Quá hạn chưa nộp"
                submitted={report.donut.submitted}
                pendingNotDue={report.donut.pendingNotDue}
                overdue={report.donut.overdue}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "OPERATIONS" && (
        <ClassOperationsTab
          operations={report.operations}
          userRole={userRole}
          onSelectStudent={onSelectStudent}
        />
      )}

      {activeTab === "COMMENTS" && (
        <ReportCommentEditorCard
          scope="CLASS"
          classId={report.classId}
          periodKey={report.periodKey}
          periodLabel={report.periodLabel}
          targetTitle={`${report.classCode} — ${report.className}`}
          initialComment={report.classComment}
        />
      )}
    </div>
  );
}
