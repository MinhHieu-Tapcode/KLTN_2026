"use client";

import React from "react";
import { AlertTriangle, Clock, ShieldAlert, UserCheck } from "lucide-react";
import { ReportKpiCard, TabSwitchBadge } from "./report-shared-widgets";

export interface ClassOperationsData {
  flaggedCount: number;
  flaggedRatePercent: number;
  avgTabSwitches: number;
  totalTabSwitches?: number;
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
  const formatAutoReason = (reason: string | null, count: number) => {
    if (reason === "VIOLATED_TAB_SWITCH_LIMIT") {
      return "Vượt giới hạn chuyển tab (Thu bài tự động)";
    }
    if (reason === "TIME_EXPIRED") {
      return "Hết thời gian làm bài (Tự động nộp bài)";
    }
    if (count > 0) {
      return `Hệ thống ghi nhận ${count} lần rời màn hình`;
    }
    return "Cảnh báo giám sát thi";
  };

  return (
    <div className="space-y-6">
      {/* 3 Thẻ chỉ số giám sát vận hành lớp */}
      <div className="rp-kpi-grid sm:grid-cols-3">
        <ReportKpiCard
          label="Tỷ lệ bài nộp bị gắn cờ giám sát"
          value={`${operations.flaggedRatePercent}%`}
          subtext={`${operations.flaggedCount} lượt bài vượt ngưỡng chuyển tab cho phép`}
          tone={operations.flaggedCount > 0 ? "bad" : "empty"}
          tooltip="Tỷ lệ các bài thi có số lần chuyển tab vượt ngưỡng maxTabSwitches của đề thi"
        />
        <ReportKpiCard
          label="Số lần rời màn hình trung bình"
          value={`${operations.avgTabSwitches} lần / bài`}
          subtext={`Tổng cộng ${operations.totalTabSwitches ?? (operations.avgTabSwitches * operations.flaggedCount).toFixed(0)} lượt rời màn hình trong kỳ`}
          tone={operations.avgTabSwitches > 1 ? "watch" : "good"}
          tooltip="Tính trung bình trên mọi lượt nộp bài đã ghi nhận trong khoảng thời gian đã chọn"
        />
        <ReportKpiCard
          label="Bài Writing / Speaking đang chờ chấm"
          value={operations.pendingGradingCount}
          subtext="Bài tự luận cần giáo viên hoàn thành chấm 4 tiêu chí"
          tone="brand"
          tooltip="Số bài thi tự luận đã nộp và đang chờ giáo viên chấm điểm để cập nhật điểm Band"
        />
      </div>

      {/* Bảng 1: Danh sách bài nộp có chuyển tab / vượt ngưỡng */}
      <div className="rp-card overflow-hidden">
        <div className="border-b border-[var(--rp-border)] px-5 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--rp-bad)] shrink-0" />
            <div>
              <h3 className="rp-title">
                Nhật ký giám sát làm bài &amp; Thu bài tự động
              </h3>
              <p className="rp-sub">
                Chi tiết số lần học sinh chuyển tab và lý do hệ thống can thiệp thu bài
              </p>
            </div>
          </div>
          <span className="rp-badge" data-tone="empty">
            {operations.flaggedSubmissions.length} lượt cần lưu ý
          </span>
        </div>

        {operations.flaggedSubmissions.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--rp-text-muted)]">
            Không có bài nộp nào bị gắn cờ giám sát hoặc vượt ngưỡng chuyển tab trong kỳ này.
          </p>
        ) : (
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="text-left">Học sinh</th>
                  <th className="text-left">Bài tập</th>
                  <th className="text-center">Kỹ năng</th>
                  <th className="text-center">Mức độ rời MH</th>
                  <th className="text-left">Ghi nhận / Tự nộp</th>
                  <th className="text-right">Thời gian nộp</th>
                </tr>
              </thead>
              <tbody>
                {operations.flaggedSubmissions.map((item) => (
                  <tr key={item.submissionId} className="transition group">
                    <td className="font-bold text-[var(--rp-text)]">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(item.studentId)}
                        className="hover:text-[var(--rp-brand)] hover:underline"
                      >
                        {item.studentName}
                      </button>
                    </td>
                    <td className="text-[var(--rp-text)] font-medium">
                      {item.assignmentTitle}
                    </td>
                    <td className="text-center">
                      <span className="rp-badge uppercase font-bold" data-tone="brand">
                        {item.skill || "IELTS"}
                      </span>
                    </td>
                    <td className="text-center">
                      <TabSwitchBadge count={item.tabSwitchCount} />
                    </td>
                    <td>
                      <span
                        className="rp-badge inline-flex items-center gap-1"
                        data-tone={
                          item.autoSubmittedReason === "VIOLATED_TAB_SWITCH_LIMIT"
                            ? "bad"
                            : item.autoSubmittedReason === "TIME_EXPIRED"
                            ? "watch"
                            : "empty"
                        }
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>
                          {formatAutoReason(item.autoSubmittedReason, item.tabSwitchCount)}
                        </span>
                      </span>
                    </td>
                    <td className="text-right text-[var(--rp-text-muted)] font-mono text-[11px]">
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
      <div className="rp-card overflow-hidden">
        <div className="border-b border-[var(--rp-border)] px-5 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--rp-watch)] shrink-0" />
            <div>
              <h3 className="rp-title">
                Danh sách bài nộp đang chờ giáo viên chấm điểm
              </h3>
              <p className="rp-sub">
                Các bài đã nộp hoàn tất, sẽ tự động cập nhật vào điểm Band ngay sau khi chấm xong
              </p>
            </div>
          </div>
          <span className="rp-badge" data-tone="watch">
            {operations.pendingGradingSubmissions.length} bài
          </span>
        </div>

        {operations.pendingGradingSubmissions.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--rp-text-muted)]">
            Tất cả bài nộp trong kỳ đều đã được chấm điểm hoàn tất.
          </p>
        ) : (
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="text-left">Học sinh</th>
                  <th className="text-left">Bài tập</th>
                  <th className="text-center">Kỹ năng</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-right">Ngày nộp</th>
                </tr>
              </thead>
              <tbody>
                {operations.pendingGradingSubmissions.map((item) => (
                  <tr key={item.submissionId} className="transition group">
                    <td className="font-bold text-[var(--rp-text)]">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(item.studentId)}
                        className="hover:text-[var(--rp-brand)] hover:underline"
                      >
                        {item.studentName}
                      </button>
                    </td>
                    <td className="text-[var(--rp-text)] font-medium">
                      {item.assignmentTitle}
                    </td>
                    <td className="text-center">
                      <span className="rp-badge uppercase font-bold" data-tone="brand">
                        {item.skill}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="rp-badge" data-tone="watch">
                        ⏳ Chờ chấm (4 tiêu chí)
                      </span>
                    </td>
                    <td className="text-right text-[var(--rp-text-muted)] font-mono text-[11px]">
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

      {/* Bảng 3: Năng suất chấm bài theo Giáo viên */}
      {(userRole === "SCHOOL_MANAGER" || userRole === "ADMIN") && (
        <div className="rp-card overflow-hidden">
          <div className="border-b border-[var(--rp-border)] px-5 py-4 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[var(--rp-brand)] shrink-0" />
            <div>
              <h3 className="rp-title">
                Tiến độ chấm bài của Giáo viên phụ trách lớp
              </h3>
              <p className="rp-sub">
                Tổng hợp số lượng bài tự luận đã chấm xong và đang chờ chấm trong kỳ
              </p>
            </div>
          </div>
          <div className="rp-table-wrap">
            <table className="rp-table">
              <thead>
                <tr>
                  <th className="text-left">Giáo viên</th>
                  <th className="text-center">Vai trò trong lớp</th>
                  <th className="text-center">Số bài đã chấm xong</th>
                  <th className="text-center">Số bài của lớp còn chờ chấm</th>
                </tr>
              </thead>
              <tbody>
                {operations.teacherGradingStats.map((t) => (
                  <tr key={t.staffId} className="transition">
                    <td className="font-bold text-[var(--rp-text)]">{t.staffName}</td>
                    <td className="text-center text-[var(--rp-text-dim)]">{t.roleInClass}</td>
                    <td className="text-center font-bold text-[var(--rp-good)]">
                      {t.gradedCount} bài
                    </td>
                    <td className="text-center font-semibold text-[var(--rp-watch)]">
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
