"use client";

import React, { useState } from "react";
import { AlertCircle, ArrowUpRight, ChevronDown, ChevronUp, Sparkles, Users } from "lucide-react";
import {
  ReportDonut3Slice,
  ReportEmptyState,
  ReportHorizontalBars,
  ReportKpiCard,
  ReportTrendLineChart,
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
    completionRatePercent: number;
    flaggedSubmissionsCount: number;
    pendingGradingCount: number;
  };
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
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  if (!hasData) {
    return <ReportEmptyState onResetPeriod={onResetPeriod} />;
  }

  return (
    <div className="space-y-6">
      {/* Khối Gợi ý Insight tự động (Mục 6.1) */}
      {report.insights.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
            <Sparkles className="h-4 w-4" />
            Gợi ý Insight quản lý trường ({report.schoolName})
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
            {report.insights.map((ins, i) => (
              <li key={i}>{ins}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4 KPI Cards (Mục 6.1) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpiCard
          label="Tổng số lớp học"
          value={report.kpis.totalClasses}
          subtext={`Trường ${report.schoolCode}`}
          tone="indigo"
        />
        <ReportKpiCard
          label="Tổng số học sinh"
          value={report.kpis.totalStudents}
          subtext="Đang theo học các lớp hoạt động"
          tone="slate"
        />
        <ReportKpiCard
          label="Điểm trung bình toàn trường"
          value={
            report.kpis.schoolAveragePercent !== null
              ? `${report.kpis.schoolAveragePercent}%`
              : "Chưa có điểm"
          }
          subtext="Trung bình ĐTB các lớp đã có điểm (BR-14)"
          tone="emerald"
        />
        <ReportKpiCard
          label="Tỷ lệ hoàn thành bài tập"
          value={`${report.kpis.completionRatePercent}%`}
          subtext={`Chờ chấm: ${report.kpis.pendingGradingCount} | Cờ gian lận: ${report.kpis.flaggedSubmissionsCount}`}
          tone="amber"
        />
      </div>

      {/* 4 Biểu đồ cấp Trường (Mục 6.1) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ReportHorizontalBars
          title="1. Điểm trung bình theo lớp (Thang % chuẩn hóa)"
          subtitle="Bấm vào thanh của một lớp để đi sâu (drill-down) vào Báo cáo Lớp đó"
          items={report.classRows.map((c) => ({
            id: c.classId,
            label: `${c.classCode} — ${c.className}`,
            percent: c.averagePercent,
            badgeText: `${c.studentCount} HV`,
          }))}
          onItemClick={onSelectClass}
        />

        <ReportDonut3Slice
          title="2. Tỷ lệ hoàn thành bài tập toàn trường"
          subtitle="Phân bổ trên tổng số lượt bài tập đã mở giao cho học sinh"
          submitted={report.donut.submitted}
          pendingNotDue={report.donut.pendingNotDue}
          overdue={report.donut.overdue}
        />

        <ReportTrendLineChart
          title="3. Xu hướng điểm trung bình toàn trường theo thời gian"
          subtitle={`Biến động ĐTB qua các mốc thời gian (${report.periodLabel})`}
          points={report.weeklyTrend.map((w) => ({
            label: w.label,
            value: w.averagePercent,
          }))}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">4. Số học sinh theo từng lớp</h3>
          <p className="mt-0.5 text-xs text-slate-500">Quy mô sĩ số học sinh đang hoạt động ở mỗi lớp</p>
          <div className="mt-4 flex h-44 items-end gap-3 border-b border-l border-slate-200 px-3 pb-2 pt-4">
            {report.classRows.map((c) => {
              const maxStu = Math.max(1, ...report.classRows.map((r) => r.studentCount));
              const hPct = Math.max(10, Math.round((c.studentCount / maxStu) * 100));
              return (
                <div
                  key={c.classId}
                  onClick={() => onSelectClass(c.classId)}
                  className="flex flex-1 cursor-pointer flex-col items-center justify-end gap-1.5 h-full group"
                >
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-600">
                    {c.studentCount} HV
                  </span>
                  <div
                    className="w-full max-w-[44px] rounded-t-md bg-emerald-500/90 group-hover:bg-indigo-600 transition-all"
                    style={{ height: `${hPct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 px-3">
            {report.classRows.map((c) => (
              <div key={c.classId} className="flex-1 truncate text-center text-[11px] font-medium text-slate-600">
                {c.classCode}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng dữ liệu lớp học & Học sinh cần hỗ trợ (BR-11) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Bảng tổng hợp kết quả theo Lớp học</h3>
            <p className="text-xs text-slate-500">
              Bấm vào tên lớp để xem Báo cáo Lớp, hoặc bấm vào nút &quot;Cần hỗ trợ&quot; để xem danh sách học sinh kèm lý do (BR-11)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Lớp học</th>
                <th className="px-4 py-3 text-center">Sĩ số</th>
                <th className="px-4 py-3 text-center">Số bài đã giao</th>
                <th className="px-4 py-3 text-center">Điểm TB (%)</th>
                <th className="px-4 py-3 text-center">Tỷ lệ hoàn thành</th>
                <th className="px-4 py-3 text-center">Học sinh cần hỗ trợ (BR-11)</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.classRows.map((cls) => {
                const isExpanded = expandedClassId === cls.classId;
                return (
                  <React.Fragment key={cls.classId}>
                    <tr className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <button
                          type="button"
                          onClick={() => onSelectClass(cls.classId)}
                          className="text-left hover:text-indigo-600 hover:underline"
                        >
                          {cls.classCode} — {cls.className}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{cls.studentCount}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{cls.assignmentCount}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {cls.averagePercent !== null ? `${cls.averagePercent}%` : "Chưa có điểm"}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                        {cls.completionRatePercent}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cls.supportNeededCount > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedClassId(isExpanded ? null : cls.classId)
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200"
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                            {cls.supportNeededCount} học sinh
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                            Ổn định (0)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectClass(cls.classId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                        >
                          Xem lớp
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && cls.supportStudents.length > 0 && (
                      <tr className="bg-rose-50/40">
                        <td colSpan={7} className="px-6 py-3">
                          <div className="text-[11px] font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Danh sách học sinh cần hỗ trợ tại lớp {cls.classCode} (ĐTB &lt; 50%, quá hạn ≥ 2 bài hoặc giảm điểm 3 bài liên tiếp):
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {cls.supportStudents.map((st) => (
                              <div
                                key={st.studentId}
                                className="flex items-center justify-between rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-800">{st.fullName}</div>
                                  <div className="text-[11px] text-rose-600">
                                    Lý do: {st.reasons.join(" • ")}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onSelectStudent(cls.classId, st.studentId)}
                                  className="rounded bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100"
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
