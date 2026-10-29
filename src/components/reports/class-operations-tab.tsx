"use client";

import React from "react";
import { AlertTriangle, Clock, ShieldAlert, UserCheck } from "lucide-react";
import { ReportKpiCard } from "./report-shared-widgets";

export interface ClassOperationsData {
  flaggedCount: number;
  flaggedRatePercent: number;
  avgTabSwitches: number;
  flaggedSubmissions: Array<{
    submissionId: string;
    studentId: string;
    studentName: string;
    assignmentTitle: string;
    skill: string;
    tabSwitchCount: number;
    autoSubmittedReason: string | null;
    submittedAt: string | null;
  }>;
  pendingGradingCount: number;
  pendingGradingSubmissions: Array<{
    submissionId: string;
    studentId: string;
    studentName: string;
    assignmentTitle: string;
    skill: string;
    submittedAt: string | null;
  }>;
  teacherGradingStats: Array<{
    staffId: string;
    staffName: string;
    roleInClass: string;
    gradedCount: number;
    pendingCount: number;
  }>;
}

export function ClassOperationsTab({
  operations,
  userRole,
  onSelectStudent,
}: {
  operations: ClassOperationsData;
  userRole: string;
  onSelectStudent: (studentId: string) => void;
}) {
  const formatAutoReason = (reason: string | null) => {
    if (reason === "VIOLATED_TAB_SWITCH_LIMIT") {
      return "Vượt giới hạn chuyển tab (Nộp tự động)";
    }
    if (reason === "TIME_EXPIRED") {
      return "Hết thời gian làm bài (Nộp tự động)";
    }
    return "Cảnh báo chuyển tab bất thường";
  };

  return (
    <div className="space-y-6">
      {/* 3 KPI Vận hành lớp (Mục 6.7) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ReportKpiCard
          label="Tỷ lệ bài nộp bị gắn cờ gian lận"
          value={`${operations.flaggedRatePercent}%`}
          subtext={`${operations.flaggedCount} lượt nộp bài bị gắn cờ hoặc tự động thu bài`}
          tone="rose"
        />
        <ReportKpiCard
          label="Số lần chuyển tab trung bình"
          value={`${operations.avgTabSwitches} lần / bài`}
          subtext="Trung bình trên tổng số lượt nộp trong kỳ"
          tone="amber"
        />
        <ReportKpiCard
          label="Bài Tự luận (Writing/Speaking) chờ chấm"
          value={operations.pendingGradingCount}
          subtext="Trạng thái SUBMITTED chưa tính vào ĐTB (BR-08)"
          tone="indigo"
        />
      </div>

      {/* Bảng 1: Danh sách bài nộp bị gắn cờ gian lận / tự động nộp */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Danh sách bài nộp bị gắn cờ gian lận &amp; thu bài tự động
            </h3>
            <p className="text-xs text-slate-500">
              Theo dõi các lượt làm bài vượt giới hạn chuyển tab hoặc hết giờ hệ thống tự động thu bài
            </p>
          </div>
        </div>
        {operations.flaggedSubmissions.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Không có bài nộp nào bị gắn cờ gian lận trong khoảng thời gian này.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-4 py-3">Bài tập</th>
                  <th className="px-4 py-3 text-center">Kỹ năng</th>
                  <th className="px-4 py-3 text-center">Số lần chuyển tab</th>
                  <th className="px-4 py-3">Lý do cảnh báo / Nộp tự động</th>
                  <th className="px-4 py-3 text-right">Thời gian nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operations.flaggedSubmissions.map((item) => (
                  <tr key={item.submissionId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(item.studentId)}
                        className="hover:text-indigo-600 hover:underline"
                      >
                        {item.studentName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.assignmentTitle}</td>
                    <td className="px-4 py-3 text-center uppercase font-medium text-slate-600">
                      {item.skill}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600">
                      {item.tabSwitchCount} lần
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                        <AlertTriangle className="h-3 w-3" />
                        {formatAutoReason(item.autoSubmittedReason)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bảng 2: Bài tập Writing / Speaking đang chờ chấm */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Danh sách bài nộp đang chờ giáo viên chấm điểm (SUBMITTED)
            </h3>
            <p className="text-xs text-slate-500">
              Quy tắc BR-08: Bài chờ chấm được tính là &quot;Đã nộp&quot; nhưng chưa tính vào Điểm trung bình cho đến khi chuyển sang GRADED
            </p>
          </div>
        </div>
        {operations.pendingGradingSubmissions.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Tất cả bài nộp trong kỳ đều đã được chấm điểm hoàn tất.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-4 py-3">Bài tập</th>
                  <th className="px-4 py-3 text-center">Kỹ năng</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Ngày nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operations.pendingGradingSubmissions.map((item) => (
                  <tr key={item.submissionId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.studentName}</td>
                    <td className="px-4 py-3 text-slate-700">{item.assignmentTitle}</td>
                    <td className="px-4 py-3 text-center uppercase font-medium text-indigo-600">
                      {item.skill}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        ⏳ Chờ chấm (4 tiêu chí)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {item.submittedAt
                        ? new Date(item.submittedAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bảng 3: Năng suất chấm bài theo Giáo viên (Chỉ Quản nhiệm / Admin thấy - Mục 6.7) */}
      {(userRole === "SCHOOL_MANAGER" || userRole === "ADMIN") && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Thống kê năng suất chấm bài của Giáo viên phụ trách lớp (Dành riêng Quản nhiệm)
              </h3>
              <p className="text-xs text-slate-500">
                Tổng hợp dựa trên trường graded_by_id của các bài tự luận đã chấm trong kỳ
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Giáo viên</th>
                  <th className="px-4 py-3 text-center">Vai trò trong lớp</th>
                  <th className="px-4 py-3 text-center">Số bài đã chấm xong</th>
                  <th className="px-4 py-3 text-center">Số bài của lớp còn chờ chấm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operations.teacherGradingStats.map((t) => (
                  <tr key={t.staffId}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{t.staffName}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{t.roleInClass}</td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-700">
                      {t.gradedCount} bài
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-700">
                      {t.pendingCount} bài
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
