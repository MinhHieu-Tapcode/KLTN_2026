"use client";

import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, Sparkles } from "lucide-react";
import { markReportCommentReadAction } from "@/actions/reports";
import { canWriteReportComment, type ReportCommentAuthorType } from "@/lib/permissions";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import type { ReportCommentDTO, ReportCommentsBundle } from "@/services/report-comment.service";
import { COMMENT_AUTHOR_LABEL, ReportCommentEditorCard } from "./report-comment-section";

const AUTHOR_TYPES: ReportCommentAuthorType[] = ["TEACHER", "MANAGER"];

/** Thẻ chỉ đọc một nhận xét (dùng cho khung của người khác và cho Học viên) */
function CommentReadOnlyCard({
  title,
  subtitle,
  record,
  periodLabel,
  isNew,
  onMarkRead,
}: {
  title: string;
  subtitle: string;
  record: ReportCommentDTO | null;
  periodLabel: string;
  isNew?: boolean;
  onMarkRead?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            {record && isNew && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold text-[#EA580C]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                Nhận xét mới
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {record && isNew && onMarkRead && (
          <button
            type="button"
            onClick={onMarkRead}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-all"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {record ? (
        <div className="space-y-2.5">
          <p className="whitespace-pre-line rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 text-xs leading-relaxed text-slate-800">
            {record.content}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#EA580C]">
              <Sparkles className="h-3.5 w-3.5 text-[#EA580C]" strokeWidth={1.75} />
              Người viết: {record.authorName} ({record.authorRole})
            </span>
            <span>Cập nhật: {new Date(record.updatedAt).toLocaleString("vi-VN")}</span>
          </div>
        </div>
      ) : (
        <p className="py-6 text-center text-xs italic text-slate-400">
          Chưa có nhận xét cho kỳ báo cáo ({periodLabel}).
        </p>
      )}
    </div>
  );
}

/**
 * Hai khung nhận xét cạnh nhau cho Giáo viên / Quản nhiệm / Quản trị viên.
 * Khung mình được quyền viết thì soạn được, khung còn lại chỉ xem.
 */
export function StaffCommentPanels({
  scope,
  classId,
  studentId,
  periodKey,
  periodLabel,
  targetTitle,
  userRole,
  teacherComment,
  managerComment,
}: {
  scope: "CLASS" | "STUDENT";
  classId: string;
  studentId?: string | null;
  periodKey: ReportPeriodKey;
  periodLabel: string;
  targetTitle: string;
  userRole: string;
  teacherComment: ReportCommentDTO | null;
  managerComment: ReportCommentDTO | null;
}) {
  const byType: Record<ReportCommentAuthorType, ReportCommentDTO | null> = {
    TEACHER: teacherComment,
    MANAGER: managerComment,
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {AUTHOR_TYPES.map((type) =>
        canWriteReportComment(userRole, type) ? (
          <ReportCommentEditorCard
            key={type}
            scope={scope}
            authorType={type}
            classId={classId}
            studentId={studentId}
            periodKey={periodKey}
            periodLabel={periodLabel}
            targetTitle={targetTitle}
            initialComment={byType[type]}
          />
        ) : (
          <CommentReadOnlyCard
            key={type}
            title={COMMENT_AUTHOR_LABEL[type]}
            subtitle={`${targetTitle} — Chỉ xem, bạn không có quyền sửa khung này`}
            record={byType[type]}
            periodLabel={periodLabel}
          />
        )
      )}
    </div>
  );
}

/** Đếm các nhận xét Học viên chưa đọc (dùng cho chấm "Mới" trên tab) */
export function hasUnreadReportComments(comments: ReportCommentsBundle): boolean {
  return Object.values(comments).some((c) => Boolean(c && !c.isReadByStudent));
}

/** Giao diện chỉ đọc của Học viên: nhận xét lớp và nhận xét cá nhân, mỗi phần có khung Giáo viên và Quản nhiệm */
export function StudentCommentsPanels({
  comments,
  periodLabel,
}: {
  comments: ReportCommentsBundle;
  periodLabel: string;
}) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(new Set());
  }, [comments]);

  const isNew = (c: ReportCommentDTO | null) => Boolean(c && !c.isReadByStudent && !readIds.has(c.id));

  const handleMarkRead = async (commentId: string) => {
    await markReportCommentReadAction(commentId);
    setReadIds((prev) => new Set(prev).add(commentId));
  };

  const all = Object.values(comments);
  const hasAnyComment = all.some(Boolean);
  const hasUnread = all.some(isNew);

  const sections: Array<{
    heading: string;
    subtitle: string;
    items: Record<ReportCommentAuthorType, ReportCommentDTO | null>;
  }> = [
    {
      heading: "1. Nhận xét chung của lớp",
      subtitle: `Áp dụng cho toàn bộ học sinh trong lớp — Kỳ ${periodLabel}`,
      items: { TEACHER: comments.classComment, MANAGER: comments.classManagerComment },
    },
    {
      heading: "2. Nhận xét cá nhân dành cho bạn",
      subtitle: `Đánh giá riêng cho kết quả của bạn — Kỳ ${periodLabel}`,
      items: { TEACHER: comments.studentComment, MANAGER: comments.studentManagerComment },
    },
  ];

  return (
    <div className="space-y-5">
      {hasAnyComment && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-none">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700">
            <Bell className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex-1 space-y-0.5">
            <b className="text-xs font-bold text-amber-950">
              {hasUnread
                ? "Bạn có nhận xét mới từ Giáo viên / Quản nhiệm!"
                : "Ghi chú & Nhận xét từ Giáo viên và Quản nhiệm"}
            </b>
            <p className="text-[11.5px] text-amber-800 leading-relaxed">
              {hasUnread
                ? "Thầy cô vừa gửi đánh giá kết quả học tập của bạn cho kỳ này. Hãy đọc kỹ các lời khuyên bên dưới để khắc phục điểm yếu và nâng cao điểm Band nhé."
                : "Dưới đây là toàn bộ nhận xét và định hướng ôn tập từ thầy cô dành cho quá trình học tập của bạn."}
            </p>
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.heading} className="space-y-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{section.heading}</h3>
            <p className="text-[11px] text-slate-500">{section.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {AUTHOR_TYPES.map((type) => {
              const record = section.items[type];
              return (
                <CommentReadOnlyCard
                  key={type}
                  title={COMMENT_AUTHOR_LABEL[type]}
                  subtitle={type === "TEACHER" ? "Từ Giáo viên phụ trách lớp" : "Từ Quản nhiệm trường"}
                  record={record}
                  periodLabel={periodLabel}
                  isNew={isNew(record)}
                  onMarkRead={record ? () => handleMarkRead(record.id) : undefined}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
