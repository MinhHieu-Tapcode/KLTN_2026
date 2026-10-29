"use client";

import React, { useState } from "react";
import { AlertCircle, Layers, ListChecks, Star, TrendingUp } from "lucide-react";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import { ReportCommentDTO } from "@/services/report-comment.service";
import { ReportCommentEditorCard, StudentReadOnlyCommentsView } from "./report-comment-section";
import { ReportEmptyState, ReportKpiCard, ReportTrendLineChart } from "./report-shared-widgets";
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
    submittedCount: number;
    assignedCount: number;
    completionRatePercent: number;
    overdueCount: number;
    pendingGradingCount: number;
    needsSupport: boolean;
    supportReasons: string[];
  };
  fourSkillsComparison: Array<{
    skill: string;
    label: string;
    averagePercent: number | null;
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
    scoreDisplay: string;
    percentDisplay: string;
    estimatedBandDisplay: string;
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
  const [subTab, setSubTab] = useState<"OVERVIEW" | "BY_SKILL" | "BY_TYPES">("OVERVIEW");
  const [skillFilter, setSkillFilter] = useState<string>("ALL");

  const skillsWithScore = report.fourSkillsComparison.filter(
    (s): s is typeof s & { averagePercent: number } => s.averagePercent !== null
  );
  const strongestSkill = [...skillsWithScore].sort((a, b) => b.averagePercent - a.averagePercent)[0] || null;
  const weakestSkill = [...skillsWithScore].sort((a, b) => a.averagePercent - b.averagePercent)[0] || null;

  const renderStatusBadge = (status: string) => {
    if (status === "GRADED")
      return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Đã chấm (GRADED)</span>;
    if (status === "SUBMITTED")
      return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">⏳ Chờ chấm (BR-08)</span>;
    if (status === "OVERDUE")
      return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">🔴 Quá hạn (BR-06)</span>;
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">Chưa nộp (Còn hạn)</span>;
  };

  const tabBtn = (key: "OVERVIEW" | "BY_SKILL" | "BY_TYPES", icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setSubTab(key)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
        subTab === key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {tabBtn("OVERVIEW", <TrendingUp className="h-3.5 w-3.5" />, "1. Tổng quan kết quả")}
          {tabBtn("BY_SKILL", <Layers className="h-3.5 w-3.5" />, "2. Phân tích theo 4 kỹ năng")}
          {tabBtn("BY_TYPES", <ListChecks className="h-3.5 w-3.5" />, "3. Theo dạng bài & 4 tiêu chí chấm")}
        </div>
        <div className="px-3 text-xs text-slate-500">
          Học sinh: <strong className="text-slate-800">{report.studentInfo.fullName}</strong> ({report.studentInfo.className})
        </div>
      </div>

      {!hasData ? (
        <ReportEmptyState onResetPeriod={onResetPeriod} />
      ) : subTab === "BY_TYPES" ? (
        <StudentQuestionTypesTab analysis={report.questionTypeAnalysis} />
      ) : (
        <>
          {report.kpis.needsSupport && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Cảnh báo học tập (Quy tắc BR-11):</div>
                <p className="mt-0.5 text-rose-700">{report.kpis.supportReasons.join(" • ")}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportKpiCard
              label="Điểm trung bình tổng hợp"
              value={report.kpis.averagePercent !== null ? `${report.kpis.averagePercent}%` : "Chưa có điểm"}
              subtext="Tính từ lần cao nhất của bài GRADED (BR-08, BR-09)"
              tone="indigo"
            />
            <ReportKpiCard
              label="Số bài đã nộp / Tổng giao"
              value={`${report.kpis.submittedCount}/${report.kpis.assignedCount}`}
              subtext={`Chờ giáo viên chấm: ${report.kpis.pendingGradingCount} bài`}
              tone="emerald"
            />
            <ReportKpiCard
              label="Tỷ lệ hoàn thành bài tập"
              value={`${report.kpis.completionRatePercent}%`}
              subtext={`Kỳ: ${report.periodLabel}`}
              tone="amber"
            />
            <ReportKpiCard
              label="Số bài quá hạn chưa nộp"
              value={report.kpis.overdueCount}
              subtext="Bài quá hạn đã bị khóa nút nộp (BR-05, BR-06)"
              tone="rose"
            />
          </div>

          {subTab === "BY_SKILL" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <span className="text-[11px] font-bold uppercase text-emerald-700">Kỹ năng mạnh nhất hiện tại</span>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {strongestSkill ? `${strongestSkill.label} (${strongestSkill.averagePercent}%)` : "Chưa đủ dữ liệu"}
                </div>
                {strongestSkill && <p className="mt-0.5 text-xs text-slate-600">{strongestSkill.originalBandText}</p>}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <span className="text-[11px] font-bold uppercase text-amber-800">Kỹ năng cần ưu tiên cải thiện</span>
                <div className="mt-1 text-lg font-bold text-slate-800">
                  {weakestSkill ? `${weakestSkill.label} (${weakestSkill.averagePercent}%)` : "Chưa đủ dữ liệu"}
                </div>
                {weakestSkill && <p className="mt-0.5 text-xs text-slate-600">{weakestSkill.originalBandText}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">
                So sánh 4 kỹ năng IELTS trên cùng trục chuẩn hóa 0–100% (Mục 8.6)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Đối chiếu mặt bằng chung % kèm chú thích Band gốc Writing/Speaking &amp; Band ước tính
              </p>
              <div className="mt-5 space-y-3.5">
                {report.fourSkillsComparison.map((sk) => (
                  <div key={sk.skill} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {sk.label} <span className="font-normal text-slate-500">({sk.completedCount} bài)</span>
                      </span>
                      <span className="font-semibold text-indigo-600">
                        {sk.averagePercent !== null ? `${sk.averagePercent}%` : "Chưa có điểm"} •{" "}
                        <span className="text-slate-600">{sk.originalBandText}</span>
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, sk.averagePercent ?? 0))}%` }}
                        title={`${sk.label}: ${sk.averagePercent ?? 0}% (${sk.originalBandText})`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ReportTrendLineChart
              title="Xu hướng điểm số qua các lần làm bài gần nhất"
              subtitle="Theo dõi sự tiến bộ qua từng lượt nộp bài đã được chấm điểm"
              points={report.attemptTrendLine.map((pt) => ({
                label: pt.label,
                value: pt.percent,
                subLabel: `${pt.assignmentTitle}: ${pt.percent}%`,
              }))}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Bảng lịch sử bài làm &amp; Các lần nộp bài (BR-01, BR-03, BR-08, BR-09)
                </h3>
                <p className="text-xs text-slate-500">
                  Hiển thị mọi lần làm; lần có % điểm cao nhất được gắn nhãn ⭐ để tính vào Điểm trung bình
                </p>
              </div>
              {subTab === "BY_SKILL" && (
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Tất cả kỹ năng</option>
                  <option value="reading">Reading</option>
                  <option value="listening">Listening</option>
                  <option value="writing">Writing</option>
                  <option value="speaking">Speaking</option>
                </select>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Bài tập</th>
                    <th className="px-4 py-3 text-center">Kỹ năng</th>
                    <th className="px-4 py-3 text-center">Lần làm (BR-09)</th>
                    <th className="px-4 py-3 text-center">Kết quả gốc</th>
                    <th className="px-4 py-3 text-center">% Chuẩn hóa</th>
                    <th className="px-4 py-3 text-center">Band ước tính (BR-01/03)</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.submissionHistory
                    .filter((r) => skillFilter === "ALL" || r.skill === skillFilter)
                    .map((row) => (
                      <tr key={row.rowKey} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          <div>{row.assignmentTitle}</div>
                          <div className="text-[11px] font-normal text-slate-400">{row.className}</div>
                        </td>
                        <td className="px-4 py-3 text-center uppercase font-medium text-indigo-600">{row.skill}</td>
                        <td className="px-4 py-3 text-center">
                          {row.attemptNumber > 0 ? (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              Lần {row.attemptNumber}
                              {row.isBestAttempt && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-600" /> Cao nhất
                                </span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{row.scoreDisplay}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{row.percentDisplay}</td>
                        <td className="px-4 py-3 text-center font-semibold text-indigo-600">{row.estimatedBandDisplay}</td>
                        <td className="px-4 py-3 text-center">{renderStatusBadge(row.status)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
