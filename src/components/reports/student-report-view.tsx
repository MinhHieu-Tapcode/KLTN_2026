"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  LineChart,
  ListChecks,
  MessageSquareText,
  Search,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import { MetricComparison, TabSwitchSummary } from "@/services/report-metrics.helper";
import { ReportCommentDTO } from "@/services/report-comment.service";
import { ReportCommentEditorCard, StudentReadOnlyCommentsView } from "./report-comment-section";
import { ReportSelectDropdown } from "./report-select-dropdown";
import {
  computeBandDeltaFromSeries,
  ExamDurationOptionABadge,
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
import { StudentQuestionTypeAnalysisData, StudentQuestionTypesTab } from "./student-question-types-tab";

export interface StudentReportData {
  studentInfo: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    classId: string | null;
    classCode: string | null;
    className: string;
  };
  periodKey: ReportPeriodKey;
  periodLabel: string;
  kpis: {
    averagePercent: number | null;
    averageBand?: number | null;
    submittedCount: number;
    assignedCount: number;
    completionRatePercent: number;
    overdueCount: number;
    pendingGradingCount: number;
    needsSupport: boolean;
    supportReasons: string[];
    totalTabSwitches?: number;
    flaggedCount?: number;
  };
  tabSwitchSummary?: TabSwitchSummary;
  comparison?: MetricComparison;
  fourSkillsComparison: Array<{
    skill: string;
    label: string;
    averagePercent: number | null;
    displayBand?: number | null;
    originalBandText: string;
    completedCount: number;
  }>;
  attemptTrendLine: Array<{ label: string; assignmentTitle: string; percent: number }>;
  submissionHistory: Array<{
    rowKey: string;
    assignmentId: string;
    assignmentTitle: string;
    className: string;
    skill: string;
    attemptNumber: number;
    isBestAttempt: boolean;
    status: "GRADED" | "SUBMITTED" | "PENDING_NOT_DUE" | "OVERDUE";
    percent?: number | null;
    scoreDisplay: string;
    percentDisplay: string;
    estimatedBandDisplay: string;
    tabSwitchCount?: number;
    isCheatingFlagged?: boolean;
    autoSubmittedReason?: string | null;
    submittedAt: string | null;
    dueDate: string | null;
  }>;
  questionTypeAnalysis: StudentQuestionTypeAnalysisData;
  comments: { classComment: ReportCommentDTO | null; studentComment: ReportCommentDTO | null };
}

export function StudentReportView({
  report,
  hasData,
  userRole,
  onResetPeriod,
}: {
  report: StudentReportData;
  hasData: boolean;
  userRole: string;
  onResetPeriod: () => void;
}) {
  type StudentTabMode = "HISTORY" | "SKILLS" | "PROGRESS" | "COMMENTS";
  const [activeTab, setActiveTab] = useState<StudentTabMode>("HISTORY");
  const [skillFilter, setSkillFilter] = useState<string>("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    "ALL" | "GRADED" | "SUBMITTED" | "TAB_SWITCH" | "OVERDUE"
  >("ALL");
  const [showDeepQuestionTypes, setShowDeepQuestionTypes] = useState<boolean>(false);

  const studentBand =
    report.kpis.averageBand !== undefined
      ? report.kpis.averageBand
      : percentToBand(report.kpis.averagePercent);

  const trendDeltaBand =
    report.comparison?.deltaBand !== null && report.comparison?.deltaBand !== undefined
      ? report.comparison.deltaBand
      : computeBandDeltaFromSeries(report.attemptTrendLine.map((pt) => pt.percent));

  const pendingNotDueCount = Math.max(
    0,
    report.kpis.assignedCount - report.kpis.submittedCount - report.kpis.overdueCount
  );

  const skillsWithScore = report.fourSkillsComparison.filter(
    (s): s is typeof s & { averagePercent: number } => s.averagePercent !== null
  );
  const strongestSkill =
    [...skillsWithScore].sort((a, b) => b.averagePercent - a.averagePercent)[0] || null;
  const weakestSkill =
    [...skillsWithScore].sort((a, b) => a.averagePercent - b.averagePercent)[0] || null;

  const totalStudentTabSwitches =
    report.kpis.totalTabSwitches ??
    report.tabSwitchSummary?.totalSwitches ??
    report.submissionHistory.reduce((s, h) => s + (h.tabSwitchCount || 0), 0);

  const flaggedTabCount =
    report.kpis.flaggedCount ??
    report.tabSwitchSummary?.flaggedCount ??
    report.submissionHistory.filter((h) => h.isCheatingFlagged).length;

  // Tổng hợp các dạng câu hỏi đã luyện tập
  const practicedQuestionTypes = useMemo(
    () =>
      [
        ...report.questionTypeAnalysis.reading.map((q) => ({ ...q, skillTag: "READING" })),
        ...report.questionTypeAnalysis.listening.map((q) => ({ ...q, skillTag: "LISTENING" })),
      ]
        .filter((q) => q.totalCount > 0)
        .sort((a, b) => (a.accuracyPercent ?? 0) - (b.accuracyPercent ?? 0)),
    [report.questionTypeAnalysis]
  );

  const renderStatusBadge = (status: string) => {
    if (status === "GRADED")
      return (
        <span className="rp-badge" data-tone="good">
          Đã chấm
        </span>
      );
    if (status === "SUBMITTED")
      return (
        <span className="rp-badge" data-tone="watch">
          ⏳ Chờ chấm
        </span>
      );
    if (status === "OVERDUE")
      return (
        <span className="rp-badge" data-tone="bad">
          Quá hạn
        </span>
      );
    return (
      <span className="rp-badge" data-tone="empty">
        Đang mở
      </span>
    );
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("rp-target-highlight");
      setTimeout(() => el.classList.remove("rp-target-highlight"), 1500);
    }
  };

  const handleNavigateTo = (targetTab: StudentTabMode, elementId: string) => {
    setActiveTab(targetTab);
    setTimeout(() => {
      scrollToId(elementId);
    }, 120);
  };

  // Lọc danh sách lịch sử bài làm
  const filteredHistory = useMemo(() => {
    return report.submissionHistory.filter((r) => {
      if (skillFilter !== "ALL" && r.skill.toLowerCase() !== skillFilter.toLowerCase()) {
        return false;
      }
      if (historyStatusFilter === "GRADED" && r.status !== "GRADED") return false;
      if (historyStatusFilter === "SUBMITTED" && r.status !== "SUBMITTED") return false;
      if (historyStatusFilter === "TAB_SWITCH" && (r.tabSwitchCount || 0) <= 0) return false;
      if (historyStatusFilter === "OVERDUE" && r.status !== "OVERDUE") return false;
      return true;
    });
  }, [report.submissionHistory, skillFilter, historyStatusFilter]);

  if (!hasData) {
    return <ReportEmptyState onResetPeriod={onResetPeriod} />;
  }

  return (
    <div className="space-y-5">
      {/* =========================================================================
          TẦNG 1: BỘ 4 THẺ CHỈ SỐ CỐT LÕI (HERO KPIS) - LUÔN HIỆN Ở TRÊN CÙNG
          ========================================================================= */}
      <div className="rp-kpi-grid">
        {/* KPI 1: ĐIỂM TRUNG BÌNH CÁ NHÂN */}
        <ReportKpiCard
          label="Điểm trung bình cá nhân"
          value={studentBand !== null ? `Band ${studentBand.toFixed(1)}` : "Chưa có điểm"}
          subtext="Quy đổi Cambridge Academic từ kết quả tốt nhất các bài đã chấm"
          tone="brand"
          deltaBand={trendDeltaBand}
          tooltip="Điểm IELTS Band trung bình quy đổi theo chuẩn Cambridge Academic của học sinh"
          actionLabel="Xem biểu đồ xu hướng"
          onActionClick={() => handleNavigateTo("PROGRESS", "student-trend-section")}
        />

        {/* KPI 2: TIẾN ĐỘ HOÀN THÀNH */}
        <ReportKpiCard
          label="Tiến độ hoàn thành bài tập"
          value={`${report.kpis.completionRatePercent}%`}
          subtext={`Đã nộp ${report.kpis.submittedCount}/${report.kpis.assignedCount} bài • Chờ chấm: ${report.kpis.pendingGradingCount}`}
          tone="good"
          badge={
            report.comparison?.deltaCompletionRate !== null &&
            report.comparison?.deltaCompletionRate !== undefined
              ? `${report.comparison.deltaCompletionRate > 0 ? "+" : ""}${report.comparison.deltaCompletionRate}% kỳ trước`
              : undefined
          }
          tooltip="Tỷ lệ số bài tập đã nộp trên tổng số bài tập được giao cho học sinh trong kỳ"
          actionLabel="Xem cơ cấu bài nộp"
          onActionClick={() => handleNavigateTo("PROGRESS", "student-donut-section")}
        />

        {/* KPI 3: HÀNH VI LÀM BÀI & RỜI MÀN HÌNH */}
        <ReportKpiCard
          label="Hành vi làm bài & Rời màn hình"
          value={`${totalStudentTabSwitches} lần`}
          subtext={
            flaggedTabCount > 0
              ? `${flaggedTabCount} bài vượt ngưỡng • Cần chú ý tập trung`
              : `Phòng thi nghiêm túc • Tập trung tốt`
          }
          tone={flaggedTabCount > 0 ? "bad" : totalStudentTabSwitches > 0 ? "watch" : "good"}
          tooltip="Tổng số lần học sinh rời tab hoặc thu nhỏ trình duyệt khi thực hiện các bài thi trong kỳ"
          actionLabel="Xem nhật ký bài làm"
          onActionClick={() => {
            setHistoryStatusFilter("TAB_SWITCH");
            handleNavigateTo("HISTORY", "student-history-table");
          }}
        />

        {/* KPI 4: CẢNH BÁO HỌC TẬP & QUÁ HẠN */}
        <ReportKpiCard
          label="Cảnh báo học tập & Quá hạn"
          value={report.kpis.needsSupport ? "Cần hỗ trợ" : "Học tập ổn định"}
          subtext={
            report.kpis.needsSupport
              ? `Lưu ý: ${report.kpis.supportReasons.join("; ")}`
              : `Quá hạn: ${report.kpis.overdueCount} bài • Tiến độ học tập tốt`
          }
          tone={report.kpis.needsSupport || report.kpis.overdueCount > 0 ? "bad" : "empty"}
          tooltip="Tình trạng học tập dựa trên ĐTB, số bài quá hạn và biến động điểm số qua các bài gần nhất"
          actionLabel="Xem bài cần chú ý"
          onActionClick={() => {
            if (report.kpis.overdueCount > 0) {
              setHistoryStatusFilter("OVERDUE");
            }
            handleNavigateTo("HISTORY", "student-history-table");
          }}
        />
      </div>

      {/* =========================================================================
          TẦNG 2: THANH CHUYỂN TAB GÓC NHÌN (PROGRESSIVE DISCLOSURE CHO HỌC SINH)
          ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("HISTORY")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "HISTORY"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ListChecks className="h-4 w-4" strokeWidth={1.75} />
            <span>Lịch sử bài làm ({report.submissionHistory.length})</span>
            {report.kpis.overdueCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ml-1">
                {report.kpis.overdueCount} quá hạn
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
            <span>Năng lực 4 Kỹ năng &amp; Dạng câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PROGRESS")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs transition-all ${
              activeTab === "PROGRESS"
                ? "bg-[#EA580C] text-white font-bold shadow-sm"
                : "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <LineChart className="h-4 w-4" strokeWidth={1.75} />
            <span>Xu hướng &amp; Cơ cấu bài nộp</span>
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
            <span>Nhận xét của Giáo viên</span>
            {Boolean(
              (report.comments.studentComment && !report.comments.studentComment.isReadByStudent) ||
              (report.comments.classComment && !report.comments.classComment.isReadByStudent)
            ) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 border border-orange-200 px-2 py-0.5 text-[10.5px] font-bold text-[#EA580C] ml-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                Mới
              </span>
            )}
          </button>
        </div>

        <span className="px-3 text-xs text-slate-500">
          Học sinh: <strong className="text-slate-800 font-bold">{report.studentInfo.fullName}</strong> ({report.studentInfo.className || "IELTS"})
        </span>
      </div>

      {/* =========================================================================
          TẦNG 3: NỘI DUNG THEO TAB CHỌN (GỌN GÀNG, THOÁNG MẮT, ĐỦ NỘI DUNG)
          ========================================================================= */}
      {activeTab === "HISTORY" && (
        <div
          id="student-history-table"
          className="rp-card overflow-hidden"
        >
          <div className="border-b border-[var(--rp-border)] p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="rp-title">
                Bảng tổng hợp lịch sử bài làm &amp; kỷ luật phòng thi
              </h3>
              <p className="rp-sub mt-0.5">
                Hiển thị điểm số gốc, điểm quy đổi Cambridge, số lần rời màn hình và thời lượng làm bài
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bộ lọc nhanh theo trạng thái */}
              <div className="flex items-center gap-1 rounded-[var(--rp-radius-md)] bg-[var(--rp-surface-muted)] p-1 text-xs border border-[var(--rp-border)]">
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter("ALL")}
                  aria-pressed={historyStatusFilter === "ALL"}
                  className="rp-chip"
                >
                  Tất cả ({report.submissionHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter("TAB_SWITCH")}
                  aria-pressed={historyStatusFilter === "TAB_SWITCH"}
                  className="rp-chip"
                >
                  🚨 Có chuyển tab ({report.submissionHistory.filter((h) => (h.tabSwitchCount || 0) > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter("OVERDUE")}
                  aria-pressed={historyStatusFilter === "OVERDUE"}
                  className="rp-chip"
                >
                  ⏳ Quá hạn ({report.submissionHistory.filter((h) => h.status === "OVERDUE").length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter("GRADED")}
                  aria-pressed={historyStatusFilter === "GRADED"}
                  className="rp-chip"
                >
                  Đã chấm ({report.submissionHistory.filter((h) => h.status === "GRADED").length})
                </button>
              </div>

              {/* Bộ lọc theo kỹ năng tùy biến mềm mại */}
              <ReportSelectDropdown
                value={skillFilter}
                onChange={setSkillFilter}
                options={[
                  { value: "ALL", label: "Tất cả 4 kỹ năng" },
                  { value: "reading", label: "Reading (Đọc)" },
                  { value: "listening", label: "Listening (Nghe)" },
                  { value: "writing", label: "Writing (Viết)" },
                  { value: "speaking", label: "Speaking (Nói)" },
                ]}
                align="end"
              />
            </div>
          </div>

          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="text-left">Bài tập &amp; Lớp</th>
                  <th className="text-center">Kỹ năng &amp; Lượt nộp</th>
                  <th className="text-center">Kết quả gốc</th>
                  <th className="text-center">Cambridge Band</th>
                  <th className="text-center">Rời màn hình</th>
                  <th className="text-center">Thời lượng</th>
                  <th className="text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-[var(--rp-text-muted)]">
                      Không tìm thấy bài làm nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row) => {
                    const rawPct =
                      row.percent !== undefined && row.percent !== null
                        ? row.percent
                        : row.percentDisplay && row.percentDisplay !== "—"
                        ? parseFloat(row.percentDisplay)
                        : null;
                    const rowBand = percentToBand(rawPct, row.skill);

                    return (
                      <tr key={row.rowKey} className="transition group">
                        <td className="font-bold text-[var(--rp-text)]">
                          <div>{row.assignmentTitle}</div>
                          <div className="text-[11px] font-normal text-[var(--rp-text-muted)]">
                            {row.className}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="rp-badge mr-1.5 uppercase font-bold" data-tone="brand">
                            {row.skill}
                          </span>
                          {row.attemptNumber > 0 && (
                            <span className="inline-flex items-center gap-1 font-semibold text-[var(--rp-text)]">
                              Lần {row.attemptNumber}
                              {row.isBestAttempt && (
                                <span className="inline-flex items-center gap-0.5 rounded-[var(--rp-radius-sm)] bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-600" /> Cao nhất
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="text-center font-bold text-[var(--rp-text)]">
                          {row.scoreDisplay}
                        </td>
                        <td className="text-center">
                          <span className="font-bold font-mono text-sm text-[var(--rp-brand)]">
                            {rowBand !== null ? `Band ${rowBand.toFixed(1)}` : "—"}
                          </span>
                        </td>
                        <td className="text-center">
                          <TabSwitchBadge count={row.tabSwitchCount || 0} />
                        </td>
                        <td className="text-center">
                          <ExamDurationOptionABadge />
                        </td>
                        <td className="text-center">
                          {renderStatusBadge(row.status)}
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
          {/* TÓM TẮT ĐIỂM MẠNH & ĐIỂM CẦN BỨT PHÁ */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rp-card rp-card--pad border-[var(--rp-good-border)] bg-[var(--rp-good-surface)]">
              <span className="text-[11px] font-bold uppercase text-[var(--rp-good)] tracking-wider">
                Kỹ năng nổi trội nhất hiện tại
              </span>
              <div className="mt-1 text-lg font-bold text-[var(--rp-text)]">
                {strongestSkill
                  ? `${strongestSkill.label} (${formatBandLabel(strongestSkill.averagePercent)})`
                  : "Chưa đủ dữ liệu"}
              </div>
              {strongestSkill && (
                <p className="mt-0.5 text-xs font-medium text-[var(--rp-text-dim)]">
                  Đã hoàn thành {strongestSkill.completedCount} bài luyện tập
                </p>
              )}
            </div>
            <div className="rp-card rp-card--pad border-[var(--rp-brand-border)] bg-[var(--rp-brand-surface)]">
              <span className="text-[11px] font-bold uppercase text-[var(--rp-brand)] tracking-wider">
                Kỹ năng cần ưu tiên bứt phá
              </span>
              <div className="mt-1 text-lg font-bold text-[var(--rp-text)]">
                {weakestSkill
                  ? `${weakestSkill.label} (${formatBandLabel(weakestSkill.averagePercent)})`
                  : "Chưa đủ dữ liệu"}
              </div>
              {weakestSkill && (
                <p className="mt-0.5 text-xs font-medium text-[var(--rp-text-dim)]">
                  Nên tập trung luyện thêm các dạng câu hỏi thuộc kỹ năng này
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* NĂNG LỰC 4 KỸ NĂNG */}
            <ReportFourSkillsCard
              title="Năng lực 4 Kỹ năng IELTS cá nhân (Thang Band 0.0 – 9.0)"
              subtitle="So sánh điểm Band trung bình chuẩn Cambridge giữa Nghe · Đọc · Viết · Nói"
              skills={report.fourSkillsComparison}
            />

            {/* MỨC ĐỘ THÀNH THẠO DẠNG CÂU HỎI */}
            <ReportHorizontalBars
              title="Mức độ thành thạo theo Dạng câu hỏi IELTS đã làm"
              subtitle="Xếp từ dạng câu hỏi cần cải thiện nhất đến dạng câu hỏi làm tốt nhất"
              displayMode="accuracy"
              items={practicedQuestionTypes.map((q) => ({
                id: q.code,
                label: q.label,
                percent: q.accuracyPercent,
                badgeText: q.skillTag,
                isLowData: q.isLowData,
                rightText: `Đúng ${q.correctCount}/${q.totalCount} câu (${q.accuracyPercent}%)`,
              }))}
            />
          </div>

          {/* NÚT TOGGLE MỞ RỘNG PHÂN TÍCH SÂU DẠNG BÀI & TIÊU CHÍ */}
          <div className="rp-card rp-card--pad">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="rp-title text-xs uppercase tracking-wider">
                  Phân tích chuyên sâu 4 Tiêu chí Writing / Speaking &amp; Dạng bài chi tiết
                </h4>
                <p className="rp-sub mt-0.5">
                  Xem chi tiết điểm tiêu chí Task Achievement, Coherence, Lexical, Grammar, Fluency, Pronunciation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeepQuestionTypes(!showDeepQuestionTypes)}
                className="rp-ctl text-xs font-bold inline-flex items-center gap-1"
              >
                <span>{showDeepQuestionTypes ? "Thu gọn phân tích" : "Xem phân tích chuyên sâu"}</span>
                {showDeepQuestionTypes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {showDeepQuestionTypes && (
              <div className="mt-4 pt-4 border-t border-[var(--rp-border-subtle)]">
                <StudentQuestionTypesTab analysis={report.questionTypeAnalysis} />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "PROGRESS" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div id="student-trend-section">
              <ReportTrendLineChart
                title="Xu hướng Điểm số qua các lần làm bài (Band 0.0 – 9.0)"
                subtitle={`Biến động điểm Band chuẩn Cambridge qua từng lượt nộp (${report.periodLabel})`}
                points={report.attemptTrendLine.map((pt) => ({
                  label: pt.label,
                  value: pt.percent,
                  subLabel: pt.assignmentTitle,
                }))}
              />
            </div>

            <div id="student-donut-section">
              <ReportDonut3Slice
                title="Cơ cấu hoàn thành bài tập cá nhân"
                subtitle="Tương quan giữa số bài Đã nộp, Đang mở (còn hạn) và Quá hạn chưa nộp"
                submitted={report.kpis.submittedCount}
                pendingNotDue={pendingNotDueCount}
                overdue={report.kpis.overdueCount}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "COMMENTS" && (
        <div className="space-y-5">
          {userRole === "STUDENT" ? (
            <StudentReadOnlyCommentsView
              classComment={report.comments.classComment}
              studentComment={report.comments.studentComment}
              periodLabel={report.periodLabel}
            />
          ) : (
            report.studentInfo.classId && (
              <ReportCommentEditorCard
                scope="STUDENT"
                classId={report.studentInfo.classId}
                studentId={report.studentInfo.id}
                periodKey={report.periodKey}
                periodLabel={report.periodLabel}
                targetTitle={report.studentInfo.fullName}
                initialComment={report.comments.studentComment}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
