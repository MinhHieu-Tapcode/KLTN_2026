"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, RotateCcw, Save, Sparkles } from "lucide-react";
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
        text: "Nội dung nhận xét không được để trống hoặc chỉ chứa khoảng trắng (Quy tắc NX-06)!",
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
      text: "Đã lưu nhận xét thành công! Học sinh sẽ thấy dấu chấm đỏ thông báo mới (NX-08).",
    });
    onSaved?.(res.comment);
  };

  const handleReset = () => {
    setContent(savedRecord?.content || "");
    setFeedback(null);
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {scope === "CLASS" ? "Nhận xét chung của lớp" : "Nhận xét cá nhân cho học sinh"} —{" "}
              <span className="text-indigo-600">{targetTitle}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Kỳ báo cáo: <strong>{periodLabel}</strong> (Cập nhật mới sẽ ghi đè nhận xét hiện tại của kỳ này - NX-03, NX-04)
            </p>
          </div>
        </div>
        {savedRecord && (
          <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
            Cập nhật lần cuối bởi:{" "}
            <strong className="text-slate-800">
              {savedRecord.authorName} ({savedRecord.authorRole})
            </strong>{" "}
            — {new Date(savedRecord.updatedAt).toLocaleString("vi-VN")}
          </div>
        )}
      </div>

      <div className="mt-4">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            scope === "CLASS"
              ? "Nhập nhận xét chung về tình hình học tập, tiến độ nộp bài và dạng câu hỏi cần cải thiện của cả lớp..."
              : "Nhập nhận xét cá nhân về điểm mạnh, kỹ năng yếu, định hướng ôn luyện IELTS cho học sinh này..."
          }
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
        />
      </div>

      {feedback && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Hủy thay đổi
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
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

  const renderCard = (
    title: string,
    subtitle: string,
    record: ReportCommentDTO | null,
    isRead: boolean,
    type: "CLASS" | "STUDENT"
  ) => (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
            {record && !isRead && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                Nhận xét mới (NX-08)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        {record && !isRead && (
          <button
            type="button"
            onClick={() => handleMarkRead(record.id, type)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {record ? (
        <div className="mt-3 space-y-2">
          <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">
            {record.content}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
              Người nhận xét: {record.authorName} ({record.authorRole})
            </span>
            <span>Cập nhật: {new Date(record.updatedAt).toLocaleString("vi-VN")}</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 py-4 text-center text-xs italic text-slate-400">
          Chưa có nhận xét cho kỳ báo cáo ({periodLabel}).
        </p>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {renderCard(
        "1. Nhận xét chung của lớp (Chế độ chỉ đọc - NX-07)",
        `Áp dụng cho toàn bộ học sinh trong lớp — Kỳ ${periodLabel}`,
        classComment,
        clsRead,
        "CLASS"
      )}
      {renderCard(
        "2. Nhận xét cá nhân từ Giáo viên / Quản nhiệm (Chế độ chỉ đọc - NX-07)",
        `Đánh giá chuyên biệt cho kết quả của bạn — Kỳ ${periodLabel}`,
        studentComment,
        stuRead,
        "STUDENT"
      )}
    </div>
  );
}
