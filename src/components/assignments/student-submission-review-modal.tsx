"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Clock,
  BookOpen,
  Volume2,
} from "lucide-react";
import { getAssignmentDetailAction } from "@/actions/assignments";

export interface StudentSubmissionReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
}

export function StudentSubmissionReviewModal({
  open,
  onOpenChange,
  assignmentId,
}: StudentSubmissionReviewModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [assignment, setAssignment] = useState<any | null>(null);

  useEffect(() => {
    if (!open || !assignmentId) {
      setAssignment(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getAssignmentDetailAction(assignmentId)
      .then((res) => {
        if (isMounted && res.success && res.assignment) {
          setAssignment(res.assignment);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, assignmentId]);

  const submission = assignment?.latestSubmission;
  const isGraded = submission?.status === "GRADED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="size-5 text-[#EA580C]" />
                <span>Chi tiết bài làm: {assignment?.title || "Đang tải..."}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Xem lại câu trả lời, đáp án chuẩn và lời phê của giáo viên
              </DialogDescription>
            </div>

            {submission && (
              <div className="flex items-center gap-2">
                {isGraded ? (
                  <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1">
                    Đã chấm: {submission.score ?? 0} / {submission.totalPoints ?? assignment?.totalPoints} điểm
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                    <Clock className="size-3 mr-1" /> Đang chờ giáo viên chấm
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="p-12 text-center space-y-2">
            <Loader2 className="size-6 text-[#EA580C] animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Đang tải kết quả bài làm...</p>
          </div>
        ) : !assignment || !submission ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <HelpCircle className="size-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold">Chưa tìm thấy dữ liệu bài nộp của bạn cho bài tập này.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Lời phê tổng quan của giáo viên */}
            {submission.teacherFeedback && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-1.5">
                <b className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <MessageSquare className="size-4 text-blue-600" />
                  <span>Lời nhận xét của Giáo viên:</span>
                </b>
                <p className="text-xs text-blue-800 leading-relaxed italic bg-white/70 p-2.5 rounded-xl border border-blue-100">
                  "{submission.teacherFeedback}"
                </p>
              </div>
            )}

            {/* Cảnh báo nếu có vi phạm chuyển tab */}
            {submission.isCheatingFlagged && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="size-4 shrink-0 text-rose-600" />
                <span>
                  Hệ thống đã ghi nhận <b>{submission.tabSwitchCount} lần rời màn hình làm bài</b> trong quá trình thi.
                </span>
              </div>
            )}

            {/* Danh sách từng câu hỏi */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Chi tiết các câu hỏi ({assignment.questions?.length || 0} câu):</h4>

              {assignment.questions?.map((q: any, idx: number) => {
                const ans = (submission.answers || []).find((a: any) => a.questionId === q.id);
                const isSubjective = q.type === "ESSAY" || q.type === "SPEAKING_RECORD";
                const isCorrect = ans?.isCorrect;

                return (
                  <div
                    key={q.id || idx}
                    className={`p-3.5 rounded-2xl border text-xs space-y-2 transition ${
                      isSubjective
                        ? "bg-slate-50 border-slate-200"
                        : isCorrect === true
                        ? "bg-emerald-50/40 border-emerald-200"
                        : isCorrect === false
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {/* Header câu hỏi */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        Câu {q.questionNumber || idx + 1}: {q.prompt}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSubjective ? (
                          <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 font-bold">
                            {ans?.awardedPoints ?? 0} / {q.points}đ
                          </span>
                        ) : isCorrect === true ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                            <CheckCircle2 className="size-3" /> Đúng (+{q.points}đ)
                          </Badge>
                        ) : isCorrect === false ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] gap-1">
                            <XCircle className="size-3 text-rose-600" /> Chưa đúng (0đ)
                          </Badge>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">
                            {q.points}đ
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Câu trả lời của học sinh */}
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 block">
                        Câu trả lời của bạn:
                      </span>
                      {q.type === "SPEAKING_RECORD" && ans?.audioUrl ? (
                        <div className="space-y-1 pt-1">
                          <audio controls className="w-full h-8" src={ans.audioUrl} />
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Volume2 className="size-3" /> Bản ghi âm bài nói của bạn
                          </span>
                        </div>
                      ) : (
                        <p className={`font-semibold ${isCorrect === false ? "text-rose-700" : "text-slate-800"}`}>
                          {ans?.studentAnswer || "(Chưa có câu trả lời)"}
                        </p>
                      )}
                    </div>

                    {/* Đáp án chuẩn (với trắc nghiệm/điền từ nếu đã có) */}
                    {!isSubjective && q.correctAnswer && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 flex items-center gap-2">
                        <b className="shrink-0 text-emerald-900">Đáp án chuẩn:</b>
                        <span className="font-mono font-bold">{q.correctAnswer}</span>
                      </div>
                    )}

                    {/* Lời giải thích */}
                    {q.explanation && (
                      <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-200 space-y-0.5">
                        <b className="text-slate-700">Giải thích chi tiết:</b>
                        <p>{q.explanation}</p>
                      </div>
                    )}

                    {/* Lời phê riêng của giáo viên cho câu này */}
                    {ans?.teacherComment && (
                      <div className="text-[11px] text-purple-800 bg-purple-50/70 p-2 rounded-xl border border-purple-200 space-y-0.5">
                        <b className="text-purple-900">Nhận xét của Giáo viên cho câu này:</b>
                        <p className="italic">{ans.teacherComment}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 border-t border-slate-100">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full text-xs rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold h-9"
          >
            Đóng xem lại kết quả
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
