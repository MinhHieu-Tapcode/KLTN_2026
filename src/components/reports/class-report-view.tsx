"use client";

import React, { useState } from "react";
import { ArrowUpRight, BarChart2, ShieldCheck } from "lucide-react";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import { ReportCommentDTO } from "@/services/report-comment.service";
import { ClassOperationsData, ClassOperationsTab } from "./class-operations-tab";
import { ReportCommentEditorCard } from "./report-comment-section";
import {
  ReportDonut3Slice,
  ReportEmptyState,
  ReportHorizontalBars,
  ReportKpiCard,
  ReportTrendLineChart,
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
    assignedCount: number;
    completionRatePercent: number;
  };
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
  const [subTab, setSubTab] = useState<"ACADEMIC" | "OPERATIONS">("ACADEMIC");

  return (
    <div className="space-y-6">
      {/* Thanh chuyển Sub-tab: Kết quả học tập lớp vs Vận hành lớp (Mục 6.2 & 6.7) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("ACADEMIC")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              subTab === "ACADEMIC"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Kết quả học tập lớp ({report.classCode})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("OPERATIONS")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              subTab === "OPERATIONS"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Vận hành lớp &amp; Giám sát gian lận
            {report.operations.flaggedCount > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                {report.operations.flaggedCount}
              </span>
            )}
          </button>
        </div>
        <span className="px-3 text-xs text-slate-500">
          Trường: <strong className="text-slate-700">{report.schoolName}</strong>
        </span>
      </div>

      {!hasData ? (
        <ReportEmptyState onResetPeriod={onResetPeriod} />
      ) : subTab === "OPERATIONS" ? (
        <ClassOperationsTab
          operations={report.operations}
          userRole={userRole}
          onSelectStudent={onSelectStudent}
        />
      ) : (
        <>
          {/* 4 KPI Cards cấp Lớp (Mục 6.2) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportKpiCard
              label="Sĩ số lớp"
              value={`${report.kpis.studentCount} học sinh`}
              subtext={report.className}
              tone="indigo"
            />
            <ReportKpiCard
              label="Điểm trung bình của lớp"
              value={
                report.kpis.classAveragePercent !== null
                  ? `${report.kpis.classAveragePercent}%`
                  : "Chưa có điểm"
              }
              subtext="Chuẩn hóa thang % (Chỉ tính bài GRADED - BR-08)"
              tone="emerald"
            />
            <ReportKpiCard
              label="Số bài tập đã giao"
              value={report.kpis.assignedCount}
              subtext={`Kỳ: ${report.periodLabel}`}
              tone="slate"
            />
            <ReportKpiCard
              label="Tỷ lệ hoàn thành bài tập"
              value={`${report.kpis.completionRatePercent}%`}
              subtext={`Đã nộp ${report.donut.submitted}/${report.donut.total} lượt`}
              tone="amber"
            />
          </div>

          {/* 5 Biểu đồ cấp Lớp (Mục 6.2) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ReportHorizontalBars
              title="1. Điểm trung bình của lớp theo từng bài tập"
              subtitle="Giúp giáo viên nhận diện bài tập nào cả lớp làm tốt hoặc gặp khó khăn"
              items={report.assignmentAverages.map((a) => ({
                id: a.assignmentId,
                label: a.title,
                percent: a.averagePercent,
                badgeText: a.skill.toUpperCase(),
                rightText:
                  a.averagePercent !== null
                    ? `${a.averagePercent}% (${a.submittedCount} HV nộp)`
                    : `Chưa chấm (${a.submittedCount} HV nộp)`,
              }))}
            />

            <ReportTrendLineChart
              title="2. Xu hướng điểm trung bình của lớp theo thời gian"
              subtitle="Biến động kết quả học tập của lớp qua các tuần"
              points={report.weeklyTrend.map((w) => ({
                label: w.label,
                value: w.averagePercent,
              }))}
            />

            <ReportHorizontalBars
              title="3. Tỷ lệ đúng theo dạng câu hỏi IELTS của cả lớp (Reading & Listening)"
              subtitle="Phát hiện dạng bài cả lớp đang yếu để điều chỉnh giáo án (Cảnh báo BR-04 nếu < 10 câu)"
              items={report.questionTypeAccuracy.map((q) => ({
                id: q.code,
                label: q.label,
                percent: q.accuracyPercent,
                badgeText: q.skill.toUpperCase(),
                isLowData: q.isLowData,
                rightText: `${q.accuracyPercent}% (${q.correctCount}/${q.totalCount} câu)`,
              }))}
            />

            <ReportDonut3Slice
              title="4. Tỷ lệ hoàn thành bài tập của lớp"
              subtitle="Tương quan giữa Đã nộp, Chưa nộp (còn hạn) và Quá hạn bị khóa"
              submitted={report.donut.submitted}
              pendingNotDue={report.donut.pendingNotDue}
              overdue={report.donut.overdue}
            />
          </div>

          <ReportHorizontalBars
            title="5. Điểm trung bình của từng học sinh trong lớp"
            subtitle="Bấm vào thanh của một học sinh để chuyển sang Báo cáo chi tiết Học sinh đó"
            items={report.studentRows.map((st) => ({
              id: st.studentId,
              label: st.fullName,
              percent: st.averagePercent,
              badgeText: st.needsSupport ? "⚠️ Cần hỗ trợ" : undefined,
            }))}
            onItemClick={onSelectStudent}
          />

          {/* Bảng dữ liệu học sinh trong lớp */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-800">
                Bảng kết quả học tập từng học sinh ({report.classCode})
              </h3>
              <p className="text-xs text-slate-500">
                Bấm vào tên học sinh để xem phân tích 4 kỹ năng IELTS, dạng câu hỏi và nhận xét cá nhân
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Học sinh</th>
                    <th className="px-4 py-3 text-center">Bài đã nộp</th>
                    <th className="px-4 py-3 text-center">Quá hạn (BR-06)</th>
                    <th className="px-4 py-3 text-center">Chờ chấm (BR-08)</th>
                    <th className="px-4 py-3 text-center">Điểm TB (%)</th>
                    <th className="px-4 py-3">Trạng thái hỗ trợ (BR-11)</th>
                    <th className="px-4 py-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.studentRows.map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <button
                          type="button"
                          onClick={() => onSelectStudent(st.studentId)}
                          className="hover:text-indigo-600 hover:underline text-left"
                        >
                          {st.fullName}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {st.submittedCount}/{st.assignedCount} ({st.completionRatePercent}%)
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-rose-600">
                        {st.overdueCount}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-amber-600">
                        {st.pendingGradingCount}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {st.averagePercent !== null ? `${st.averagePercent}%` : "Chưa có điểm"}
                      </td>
                      <td className="px-4 py-3">
                        {st.needsSupport ? (
                          <span className="inline-block rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
                            ⚠️ {st.supportReasons.join(" • ")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                            Đạt yêu cầu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectStudent(st.studentId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                        >
                          Báo cáo HV
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Khung Nhận xét chung của lớp (NX-01 đến NX-06) */}
          <ReportCommentEditorCard
            scope="CLASS"
            classId={report.classId}
            periodKey={report.periodKey}
            periodLabel={report.periodLabel}
            targetTitle={`${report.classCode} — ${report.className}`}
            initialComment={report.classComment}
          />
        </>
      )}
    </div>
  );
}
