"use client";

import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, MessageSquareText, RotateCcw, Save, Sparkles } from "lucide-react";
import {
  markReportCommentReadAction,
  saveReportCommentAction,
} from "@/actions/reports";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import { ReportCommentDTO } from "@/services/report-comment.service";

export function ReportCommentEditorCard({
  scope,
  classId,
  studentId,
  periodKey,
  periodLabel,
  targetTitle,
  initialComment,
  onSaved,
}: {
  scope: "CLASS" | "STUDENT";
  classId: string;
  studentId?: string | null;
  periodKey: ReportPeriodKey;
  periodLabel: string;
  targetTitle: string;
  initialComment: ReportCommentDTO | null;
  onSaved?: (comment: ReportCommentDTO) => void;
}) {
  const [content, setContent] = useState(initialComment?.content || "");
  const [savedRecord, setSavedRecord] = useState<ReportCommentDTO | null>(initialComment);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setSavedRecord(initialComment);
    setContent(initialComment?.content || "");
    setFeedback(null);
  }, [initialComment, classId, studentId, periodKey]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setFeedback({
        type: "err",
        text: "Nội dung nhận xét không được để trống!",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    const res = await saveReportCommentAction({
      scope,
      classId,
      studentId,
      periodKey,
      content: trimmed,
    });
    setSaving(false);

    if (!res.success || !res.comment) {
      setFeedback({
        type: "err",
        text: res.error || "Không thể lưu nhận xét. Vui lòng thử lại!",
      });
      return;
    }

    setSavedRecord(res.comment);
    setContent(res.comment.content);
    setFeedback({
      type: "ok",
      text: "Đã lưu nhận xét thành công! Học sinh sẽ nhận được thông báo mới khi mở báo cáo.",
    });
    onSaved?.(res.comment);
  };

  const handleReset = () => {
    setContent(savedRecord?.content || "");
    setFeedback(null);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#EA580C]">
            <MessageSquareText className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {scope === "CLASS" ? "Nhận xét chung của lớp" : "Nhận xét cá nhân cho học sinh"} —{" "}
              <span className="text-[#EA580C]">{targetTitle}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kỳ báo cáo: <strong className="text-slate-800 font-semibold">{periodLabel}</strong>
            </p>
          </div>
        </div>
        {savedRecord && (
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-[11px] text-slate-500">
            Cập nhật lần cuối bởi:{" "}
            <strong className="text-slate-700 font-semibold">
              {savedRecord.authorName} ({savedRecord.authorRole})
            </strong>{" "}
            — {new Date(savedRecord.updatedAt).toLocaleString("vi-VN")}
          </div>
        )}
      </div>

      <div>
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            scope === "CLASS"
              ? "Nhập nhận xét chung về tình hình học tập, tiến độ nộp bài và dạng câu hỏi cần cải thiện của cả lớp..."
              : "Nhập nhận xét cá nhân về điểm mạnh, kỹ năng yếu, định hướng ôn luyện IELTS cho học sinh này..."
          }
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#EA580C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 transition-all resize-y min-h-[90px]"
        />
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-3.5 py-2.5 text-xs font-medium border ${
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Hủy thay đổi
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA580C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C] transition-all shadow-sm disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
          {saving ? "Đang lưu..." : "Lưu nhận xét"}
        </button>
      </div>
    </div>
  );
}

export function StudentReadOnlyCommentsView({
  classComment,
  studentComment,
  periodLabel,
}: {
  classComment: ReportCommentDTO | null;
  studentComment: ReportCommentDTO | null;
  periodLabel: string;
}) {
  const [clsRead, setClsRead] = useState(classComment?.isReadByStudent ?? true);
  const [stuRead, setStuRead] = useState(studentComment?.isReadByStudent ?? true);

  useEffect(() => {
    setClsRead(classComment?.isReadByStudent ?? true);
    setStuRead(studentComment?.isReadByStudent ?? true);
  }, [classComment, studentComment]);

  const handleMarkRead = async (commentId: string, type: "CLASS" | "STUDENT") => {
    await markReportCommentReadAction(commentId);
    if (type === "CLASS") setClsRead(true);
    else setStuRead(true);
  };

  const hasAnyComment = Boolean(classComment || studentComment);
  const hasUnread = (Boolean(classComment) && !clsRead) || (Boolean(studentComment) && !stuRead);

  const renderCard = (
    title: string,
    subtitle: string,
    record: ReportCommentDTO | null,
    isRead: boolean,
    type: "CLASS" | "STUDENT"
  ) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            {record && !isRead && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold text-[#EA580C]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                Nhận xét mới
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {record && !isRead && (
          <button
            type="button"
            onClick={() => handleMarkRead(record.id, type)}
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
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#EA580C]">
              <Sparkles className="h-3.5 w-3.5 text-[#EA580C]" strokeWidth={1.75} />
              Giáo viên nhận xét: {record.authorName} ({record.authorRole})
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

  return (
    <div className="space-y-4">
      {/* NOTE THÔNG BÁO MỀM MẠI KHI CÓ NHẬN XÉT DÀNH CHO HỌC SINH */}
      {hasAnyComment && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-none">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 text-amber-700">
            <Bell className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex-1 space-y-0.5">
            <b className="text-xs font-bold text-amber-950">
              {hasUnread
                ? "Bạn có nhận xét mới từ Giáo viên bộ môn!"
                : "Ghi chú & Nhận xét từ Giáo viên bộ môn"}
            </b>
            <p className="text-[11.5px] text-amber-800 leading-relaxed">
              {hasUnread
                ? "Thầy cô vừa gửi đánh giá kết quả làm bài thi IELTS của bạn cho kỳ này. Hãy đọc kỹ các lời khuyên bên dưới để khắc phục điểm yếu và nâng cao điểm Band nhé."
                : "Dưới đây là toàn bộ nhận xét và định hướng ôn tập từ thầy cô dành riêng cho quá trình học tập của bạn."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {renderCard(
          "1. Nhận xét chung của lớp",
          `Áp dụng cho toàn bộ học sinh trong lớp — Kỳ ${periodLabel}`,
          classComment,
          clsRead,
          "CLASS"
        )}
        {renderCard(
          "2. Nhận xét cá nhân từ Giáo viên / Quản nhiệm",
          `Đánh giá chuyên biệt cho kết quả của bạn — Kỳ ${periodLabel}`,
          studentComment,
          stuRead,
          "STUDENT"
        )}
      </div>
    </div>
  );
}
