"use client";

import React, { useEffect, useState } from "react";
import { MessageSquareText, RotateCcw, Save } from "lucide-react";
import { saveReportCommentAction } from "@/actions/reports";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import { ReportCommentDTO } from "@/services/report-comment.service";
import type { ReportCommentAuthorType } from "@/lib/permissions";

export const COMMENT_AUTHOR_LABEL: Record<ReportCommentAuthorType, string> = {
  TEACHER: "Giáo viên nhận xét",
  MANAGER: "Quản nhiệm nhận xét",
};

export function ReportCommentEditorCard({
  scope,
  authorType,
  classId,
  studentId,
  periodKey,
  periodLabel,
  targetTitle,
  initialComment,
  onSaved,
}: {
  scope: "CLASS" | "STUDENT";
  authorType: ReportCommentAuthorType;
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
  }, [initialComment, classId, studentId, periodKey, authorType]);

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
      authorType,
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
              {COMMENT_AUTHOR_LABEL[authorType]}{" "}
              <span className="font-medium text-slate-500">
                ({scope === "CLASS" ? "nhận xét chung của lớp" : "nhận xét cá nhân"})
              </span>{" "}
              — <span className="text-[#EA580C]">{targetTitle}</span>
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
