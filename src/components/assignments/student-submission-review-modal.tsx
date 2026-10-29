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
  EyeOff,
  FileText,
} from "lucide-react";
import { getAssignmentDetailAction } from "@/actions/assignments";
import {
  CRITERION_COLOR_MAP,
  SPEAKING_CRITERIA,
  WRITING_CRITERIA,
} from "@/lib/ielts-report-config";
import { InlineAnnotationCanvas } from "./inline-annotation-canvas";

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
  const skill = (assignment?.skill || "READING").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 bg-[#F4F5F7]">
        <DialogHeader className="border-b border-slate-200 pb-3 bg-white -mx-6 -mt-6 p-6 rounded-t-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="size-5 text-[#EA580C]" />
                <span>Chi tiết bài làm: {assignment?.title || "Đang tải..."}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Xem lại bài làm, các ghi chú sửa bài trực tiếp trên văn bản, điểm 4 tiêu chí và lời giải thích chi tiết
              </DialogDescription>
            </div>

            {submission && (
              <div className="flex items-center gap-2">
                {isGraded ? (
                  <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-bold">
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
          <div className="p-12 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="size-6 text-[#EA580C] animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Đang tải kết quả bài làm...</p>
          </div>
        ) : !assignment || !submission ? (
          <div className="p-8 text-center text-slate-500 space-y-2 bg-white rounded-2xl border border-slate-200">
            <HelpCircle className="size-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold">Chưa tìm thấy dữ liệu bài nộp của bạn cho bài tập này.</p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Lời nhận xét tổng quan của giáo viên */}
            {submission.teacherFeedback && (
              <div className="p-4 bg-white border border-slate-200 border-l-4 border-l-[#EA580C] rounded-2xl space-y-1.5 shadow-2xs">
                <b className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="size-4 text-[#EA580C]" />
                  <span>Nhận xét tổng quát của Giáo viên:</span>
                </b>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {submission.teacherFeedback}
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

            {/* Danh sách từng câu hỏi / phần thi */}
            <div className="space-y-5">
              {assignment.questions?.map((q: any, idx: number) => {
                const ans = (submission.answers || []).find((a: any) => a.questionId === q.id);
                const isSpeaking = q.type === "SPEAKING_RECORD" || skill === "SPEAKING";
                const isWriting = q.type === "ESSAY" || skill === "WRITING";
                const isSubjective = isSpeaking || isWriting;
                const isCorrect = ans?.isCorrect;

                if (isSubjective) {
                  const criteriaDefs = isSpeaking ? SPEAKING_CRITERIA : WRITING_CRITERIA;
                  const critScoresList: any[] = ans?.criteriaScores || [];
                  const annotations = ans?.gradingAnnotations?.annotations || [];
                  const speakingTranscript = ans?.gradingAnnotations?.speakingTranscript || null;
                  const canShowTranscript =
                    !isSpeaking || (speakingTranscript && speakingTranscript.isVisibleToStudent !== false);
                  const displayText = isSpeaking
                    ? speakingTranscript?.rawText || ans?.studentAnswer || ""
                    : ans?.studentAnswer || "";

                  return (
                    <div
                      key={q.id || idx}
                      className="space-y-4 bg-white/60 p-4 rounded-2xl border border-slate-200"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {q.groupTitle || `Phần ${q.questionNumber || idx + 1}`}: {q.prompt}
                        </span>
                        <Badge className="bg-slate-900 text-white text-xs font-mono">
                          Band phần này: {ans?.awardedPoints ?? "—"} / {q.points || 9}
                        </Badge>
                      </div>

                      {/* Trình phát Audio cho bài Speaking */}
                      {isSpeaking && (ans?.audioUrl || ans?.studentAnswer?.startsWith("http")) && (
                        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Volume2 className="size-4 text-[#EA580C]" />
                            <span>Bản thu âm bài nói của bạn:</span>
                          </div>
                          <audio
                            controls
                            className="h-9 w-full sm:w-96"
                            src={ans?.audioUrl || ans?.studentAnswer}
                          />
                        </div>
                      )}

                      {/* Bảng điểm & Nhận xét riêng của 4 tiêu chí IELTS */}
                      {critScoresList.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {criteriaDefs.map((def) => {
                            const found = critScoresList.find(
                              (cs: any) => (cs.criterion || cs.criterionCode) === def.code
                            );
                            const scoreVal =
                              typeof found?.score === "number" ? found.score : found?.bandScore;
                            const colorCfg =
                              CRITERION_COLOR_MAP[def.code] || CRITERION_COLOR_MAP.TA_TR;

                            return (
                              <div
                                key={def.code}
                                className={`bg-white border border-slate-200 border-t-4 ${colorCfg.borderTopClass} rounded-xl p-3 space-y-1.5 shadow-2xs`}
                              >
                                <div className="flex items-center justify-between">
                                  <b className="text-xs text-slate-900">{def.shortLabel}</b>
                                  <span
                                    style={{ color: colorCfg.hex }}
                                    className="text-lg font-extrabold font-mono"
                                  >
                                    {scoreVal != null ? Number(scoreVal).toFixed(1) : "—"}
                                  </span>
                                </div>
                                <span className="block text-[10.5px] text-slate-500">
                                  {def.label}
                                </span>
                                {found?.comment && (
                                  <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                                    {found.comment}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Bài viết / Bản phiên âm kèm ghi chú trực tiếp (Inline Annotations) */}
                      {isSpeaking && !canShowTranscript ? (
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                          <EyeOff className="size-4 text-slate-400 shrink-0" />
                          <span>
                            Giáo viên đã ẩn bản ghi chữ tự động cho phần nói này. Bạn vui lòng nghe lại file thu âm và xem nhận xét theo 4 tiêu chí ở trên.
                          </span>
                        </div>
                      ) : (
                        <InlineAnnotationCanvas
                          headerTitle={
                            isSpeaking
                              ? "Bản ghi chữ bài nói & Sửa lỗi của Giáo viên"
                              : "Bài viết của bạn & Ghi chú sửa bài của Giáo viên"
                          }
                          promptText={q.passageText}
                          contentText={displayText}
                          annotations={annotations}
                          criteriaDefs={criteriaDefs}
                          readOnly={true}
                          speakingWords={isSpeaking ? speakingTranscript?.words : undefined}
                        />
                      )}
                    </div>
                  );
                }

                // Câu hỏi khách quan Reading / Listening
                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-2xl border text-xs space-y-2.5 bg-white shadow-2xs ${
                      isCorrect === true
                        ? "border-emerald-200"
                        : isCorrect === false
                        ? "border-rose-200"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        Câu {q.questionNumber || idx + 1}: {q.prompt}
                      </span>
                      {isCorrect === true ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] gap-1 shrink-0">
                          <CheckCircle2 className="size-3" /> Đúng (+{q.points}đ)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] gap-1 shrink-0"
                        >
                          <XCircle className="size-3 text-rose-600" /> Chưa đúng (0đ)
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-semibold text-slate-400 block">
                          Câu trả lời của bạn:
                        </span>
                        <b className={isCorrect === false ? "text-rose-700" : "text-slate-900"}>
                          {ans?.studentAnswer || "(Chưa trả lời)"}
                        </b>
                      </div>
                      {q.correctAnswer && (
                        <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                          <span className="text-[10px] font-semibold text-emerald-700 block">
                            Đáp án chuẩn:
                          </span>
                          <b className="font-mono text-emerald-900">{q.correctAnswer}</b>
                        </div>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <b className="text-slate-800 flex items-center gap-1.5 text-[11.5px]">
                          <FileText className="size-3.5 text-[#EA580C]" />
                          <span>Giải thích chi tiết đáp án:</span>
                        </b>
                        <p className="text-slate-600 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-200">
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
