"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShieldAlert,
  PenTool,
  Mic,
  FileText,
  Sparkles,
  BookOpen,
  Headphones,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateCriteriaBand,
  InlineGradingAnnotation,
  SPEAKING_CRITERIA,
  SpeakingTranscriptPayload,
  WRITING_CRITERIA,
} from "@/lib/ielts-report-config";
import { InlineAnnotationCanvas } from "./inline-annotation-canvas";
import { SpeakingAudioTranscriptBar } from "./speaking-audio-transcript-bar";
import { CriteriaGradingSidebar } from "./criteria-grading-sidebar";

export interface TeacherGradingAnswerState {
  points: number;
  comment: string;
  criteriaScores?: Record<string, number | null>;
  criteriaComments?: Record<string, string>;
  annotations?: InlineGradingAnnotation[];
  speakingTranscript?: SpeakingTranscriptPayload | null;
}

export interface TeacherGradingModalProps {
  gradingAssignment: any | null;
  onClose: () => void;
  submissionsList: any[];
  selectedSubmission: any | null;
  onSelectSubmission: (sub: any) => void;
  teacherGradingAnswers: Record<string, TeacherGradingAnswerState>;
  setTeacherGradingAnswers: React.Dispatch<
    React.SetStateAction<Record<string, TeacherGradingAnswerState>>
  >;
  overallFeedback: string;
  setOverallFeedback: (val: string) => void;
  isPending: boolean;
  onSaveGrading: (isDraft?: boolean) => void;
}

export function TeacherGradingModal({
  gradingAssignment,
  onClose,
  submissionsList,
  selectedSubmission,
  onSelectSubmission,
  teacherGradingAnswers,
  setTeacherGradingAnswers,
  overallFeedback,
  setOverallFeedback,
  isPending,
  onSaveGrading,
}: TeacherGradingModalProps) {
  const [activeAnswerId, setActiveAnswerId] = useState<string>("");
  const [currentAudioSec, setCurrentAudioSec] = useState<number>(0);

  useEffect(() => {
    const firstId = selectedSubmission?.answers?.[0]?.id || "";
    setActiveAnswerId(firstId);
    setCurrentAudioSec(0);
  }, [selectedSubmission?.id]);

  if (!gradingAssignment) return null;

  const assignmentSkill = (gradingAssignment.skill || "READING").toUpperCase();
  const isSpeakingSkill = assignmentSkill === "SPEAKING";
  const isWritingSkill = assignmentSkill === "WRITING";

  const isSubjectiveAnswer = (ans: any) => {
    const t = (ans?.type || "").toUpperCase();
    return (
      t === "ESSAY" ||
      t === "SPEAKING_RECORD" ||
      isWritingSkill ||
      isSpeakingSkill
    );
  };

  const getCriteriaDefinitions = (ans: any) => {
    const t = (ans?.type || "").toUpperCase();
    if (t === "SPEAKING_RECORD" || isSpeakingSkill) {
      return SPEAKING_CRITERIA;
    }
    return WRITING_CRITERIA;
  };

  const answers: any[] = selectedSubmission?.answers || [];
  const activeAns = answers.find((a) => a.id === activeAnswerId) || answers[0] || null;
  const isActiveSubjective = activeAns ? isSubjectiveAnswer(activeAns) : isWritingSkill || isSpeakingSkill;
  const activeCriteriaDefs = getCriteriaDefinitions(activeAns);
  const activeState: TeacherGradingAnswerState = (activeAns &&
    teacherGradingAnswers[activeAns.id]) || {
    points: activeAns?.awardedPoints ?? 0,
    comment: activeAns?.teacherComment ?? "",
    criteriaScores: {},
    criteriaComments: {},
    annotations: [],
    speakingTranscript: null,
  };

  // Kiểm tra BR-07: Tất cả câu Writing/Speaking phải nhập đủ 4 tiêu chí mới bật nút Hoàn tất chấm
  const hasIncompleteCriteria = Boolean(
    answers.some((ans: any) => {
      if (!isSubjectiveAnswer(ans)) return false;
      const defs = getCriteriaDefinitions(ans);
      const st = teacherGradingAnswers[ans.id];
      const scores = defs.map((d) => st?.criteriaScores?.[d.code]);
      return calculateCriteriaBand(scores) === null;
    })
  );

  const updateAnswerState = (
    ansId: string,
    updater: (prevState: TeacherGradingAnswerState) => TeacherGradingAnswerState
  ) => {
    setTeacherGradingAnswers((prev) => {
      const current = prev[ansId] || {
        points: 0,
        comment: "",
        criteriaScores: {},
        criteriaComments: {},
        annotations: [],
        speakingTranscript: null,
      };
      return {
        ...prev,
        [ansId]: updater(current),
      };
    });
  };

  const countWords = (txt?: string | null) => {
    if (!txt || !txt.trim()) return 0;
    return txt.trim().split(/\s+/).length;
  };

  const questionsNavList = answers.map((ans: any, idx: number) => {
    const defs = getCriteriaDefinitions(ans);
    const st = teacherGradingAnswers[ans.id];
    const isComplete =
      calculateCriteriaBand(defs.map((d) => st?.criteriaScores?.[d.code])) !== null;
    const isTask1 = ans.ieltsQuestionType === "WRITING_TASK_1" || idx === 0;
    const label = isWritingSkill
      ? isTask1
        ? "Task 1 · Report"
        : "Task 2 · Essay"
      : `Phần ${ans.questionNumber || idx + 1}`;
    return { id: ans.id, label, isComplete };
  });

  const renderWorkspaceSkillBadge = () => {
    if (isSpeakingSkill) {
      return (
        <>
          <Mic className="size-3.5 text-slate-600" /> Speaking Workspace
        </>
      );
    }
    if (isWritingSkill) {
      return (
        <>
          <FileText className="size-3.5 text-slate-600" /> Writing Workspace
        </>
      );
    }
    if (assignmentSkill === "LISTENING") {
      return (
        <>
          <Headphones className="size-3.5 text-slate-600" /> Listening (Trắc nghiệm & Điền từ)
        </>
      );
    }
    return (
      <>
        <BookOpen className="size-3.5 text-slate-600" /> Reading (Trắc nghiệm & Điền từ)
      </>
    );
  };

  const objectiveTotalPoints = answers.reduce(
    (acc, a) => acc + (Number(teacherGradingAnswers[a.id]?.points ?? a.awardedPoints) || 0),
    0
  );
  const objectiveMaxPoints = answers.reduce((acc, a) => acc + (Number(a.points) || 1), 0);

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F5F7] text-slate-900 flex flex-col h-screen overflow-hidden">
      {/* 1. THANH HEADER TRÊN CÙNG (.top) */}
      <header className="h-15 bg-white border-b border-slate-200 flex items-center justify-between gap-4 px-5 shrink-0">
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-slate-900 truncate flex items-center gap-2">
            {isSpeakingSkill ? (
              <Mic className="size-4 text-[#EA580C] shrink-0" />
            ) : isWritingSkill ? (
              <PenTool className="size-4 text-[#EA580C] shrink-0" />
            ) : assignmentSkill === "LISTENING" ? (
              <Headphones className="size-4 text-[#EA580C] shrink-0" />
            ) : (
              <BookOpen className="size-4 text-[#EA580C] shrink-0" />
            )}
            <span>{gradingAssignment.title}</span>
          </h1>
          <small className="text-xs text-slate-500 block truncate">
            {selectedSubmission
              ? `${selectedSubmission.studentName} (${selectedSubmission.studentEmail}) · Lần làm ${
                  selectedSubmission.attemptNumber || 1
                }`
              : "Chọn học viên ở danh sách bên trái để xem và chấm bài"}
          </small>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedSubmission?.isCheatingFlagged && (
            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs gap-1">
              <ShieldAlert className="size-3.5" /> Rời màn hình {selectedSubmission.tabSwitchCount} lần
            </Badge>
          )}
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-bold px-3 py-1 gap-1.5"
          >
            {renderWorkspaceSkillBadge()}
          </Badge>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="size-3.5" /> Về danh sách
          </button>
        </div>
      </header>

      {/* 2. BỐ CỤC 3 CỘT TOÀN MÀN HÌNH (.main: 220px | 1fr | 395px) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_395px] min-h-0">
        {/* CỘT TRÁI: DANH SÁCH HỌC VIÊN NỘP BÀI (.students) */}
        <aside className="bg-white border-r border-slate-200 p-3.5 overflow-y-auto">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Bài nộp ({submissionsList.length})
          </h3>
          <div className="space-y-2">
            {submissionsList.map((sub) => {
              const isSelected = selectedSubmission?.id === sub.id;
              const isGraded = sub.status === "GRADED";
              return (
                <div
                  key={sub.id}
                  onClick={() => onSelectSubmission(sub)}
                  className={`border rounded-xl p-2.5 cursor-pointer transition ${
                    isSelected
                      ? "border-[#EA580C] bg-[#FFF1EB]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <b className="text-[13px] text-slate-900 block truncate">{sub.studentName}</b>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span
                      className={`inline-block text-[11px] font-bold rounded-full px-2 py-0.5 ${
                        isGraded
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isGraded ? `Đã chấm · ${sub.score ?? 0}` : "Chờ chấm"}
                    </span>
                    {sub.isCheatingFlagged && (
                      <ShieldAlert className="size-3.5 text-rose-600 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CỘT GIỮA: KHÔNG GIAN BÀI LÀM (.center) */}
        <section className="overflow-y-auto p-5 sm:p-6 space-y-5">
          {!selectedSubmission ? (
            <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
              Chưa có bài nộp nào được chọn.
            </div>
          ) : (
            answers.map((ans: any, idx: number) => {
              const subjective = isSubjectiveAnswer(ans);
              const defs = getCriteriaDefinitions(ans);
              const ansState = teacherGradingAnswers[ans.id] || {
                points: ans.awardedPoints ?? 0,
                comment: ans.teacherComment ?? "",
                criteriaScores: {},
                criteriaComments: {},
                annotations: [],
                speakingTranscript: null,
              };

              if (!subjective) {
                return (
                  <div
                    key={ans.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-slate-900">
                        Câu {ans.questionNumber || idx + 1}: {ans.prompt}
                      </b>
                      {ans.isCorrect === true ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] gap-1 shrink-0">
                          <CheckCircle2 className="size-3" /> Đúng (+{ans.points}đ)
                        </Badge>
                      ) : ans.isCorrect === false ? (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] gap-1 shrink-0"
                        >
                          <XCircle className="size-3" /> Sai (0đ)
                        </Badge>
                      ) : (
                        <span className="font-mono text-slate-500">Thang điểm: {ans.points}đ</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Trả lời của học viên:
                        </span>
                        <b className={ans.isCorrect === false ? "text-rose-700" : "text-slate-900"}>
                          {ans.studentAnswer || "(Trống)"}
                        </b>
                      </div>
                      {ans.correctAnswer && (
                        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 block font-semibold">
                            Đáp án chuẩn:
                          </span>
                          <b className="font-mono text-emerald-900">{ans.correctAnswer}</b>
                        </div>
                      )}
                    </div>
                    {ans.explanation && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                        <b className="text-slate-800">Giải thích: </b>
                        {ans.explanation}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <Label className="text-xs">Điểm chấm</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={ansState.points}
                          onChange={(e) =>
                            updateAnswerState(ans.id, (prev) => ({
                              ...prev,
                              points: Number(e.target.value),
                            }))
                          }
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Nhận xét riêng câu này</Label>
                        <Input
                          value={ansState.comment}
                          onChange={(e) =>
                            updateAnswerState(ans.id, (prev) => ({
                              ...prev,
                              comment: e.target.value,
                            }))
                          }
                          placeholder="Ghi chú thêm cho câu này (nếu có)..."
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              const isSpeakingAns = ans.type === "SPEAKING_RECORD" || isSpeakingSkill;
              const minWords = ans.ieltsQuestionType === "WRITING_TASK_1" || idx === 0 ? 150 : 250;
              const transcriptObj = ansState.speakingTranscript;
              const displayText = isSpeakingAns
                ? transcriptObj?.rawText || ""
                : ans.studentAnswer || "";
              const wc = countWords(displayText);

              return (
                <div
                  key={ans.id}
                  onClick={() => {
                    if (activeAnswerId !== ans.id) setActiveAnswerId(ans.id);
                  }}
                  className="space-y-4"
                >
                  {isSpeakingAns && (
                    <SpeakingAudioTranscriptBar
                      audioUrl={ans.audioUrl}
                      questionPrompt={ans.passageText || ans.prompt}
                      transcript={transcriptObj}
                      onChangeTranscript={(nextTr) =>
                        updateAnswerState(ans.id, (prev) => ({
                          ...prev,
                          speakingTranscript: nextTr,
                        }))
                      }
                      currentTimeSec={currentAudioSec}
                      onTimeChange={setCurrentAudioSec}
                    />
                  )}

                  {isSpeakingAns && !transcriptObj ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2">
                      <Sparkles className="size-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">
                        Nhấn nút <b>“Tạo bản ghi chữ (AI)”</b> trên thanh phát âm thanh để gửi file ghi âm của học viên lên AI Whisper bóc tách thành văn bản và chấm chi tiết từng từ.
                      </p>
                      {ans.passageText && (
                        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-2xl mx-auto text-left whitespace-pre-wrap mt-2">
                          {ans.passageText}
                        </div>
                      )}
                    </div>
                  ) : (
                    <InlineAnnotationCanvas
                      headerTitle={
                        isSpeakingAns
                          ? ans.groupTitle || "Speaking Part 2 · Cue Card"
                          : idx === 0
                          ? "Task 1 · Report"
                          : "Task 2 · Essay"
                      }
                      badgeText={
                        isSpeakingAns
                          ? `Bản ghi ${wc} từ`
                          : `${wc} từ / tối thiểu ${minWords}`
                      }
                      badgeVariant={
                        isSpeakingAns ? "success" : wc < minWords ? "warning" : "success"
                      }
                      promptText={ans.passageText || ans.prompt}
                      contentText={displayText}
                      annotations={ansState.annotations || []}
                      criteriaDefs={defs}
                      onAddAnnotation={(newAnn) =>
                        updateAnswerState(ans.id, (prev) => ({
                          ...prev,
                          annotations: [...(prev.annotations || []), newAnn],
                        }))
                      }
                      onRemoveAnnotation={(removeId) =>
                        updateAnswerState(ans.id, (prev) => ({
                          ...prev,
                          annotations: (prev.annotations || []).filter((a) => a.id !== removeId),
                        }))
                      }
                      speakingWords={isSpeakingAns ? transcriptObj?.words : undefined}
                      currentAudioTimeSec={isSpeakingAns ? currentAudioSec : -1}
                      onSeekAudio={isSpeakingAns ? setCurrentAudioSec : undefined}
                    />
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* CỘT PHẢI: CHỈ HIỆN 4 TIÊU CHÍ CHO WRITING/SPEAKING; HIỆN TỔNG KẾT CHO READING/LISTENING */}
        {activeAns && isActiveSubjective ? (
          <CriteriaGradingSidebar
            skillLabel={isSpeakingSkill ? "Speaking" : "Writing"}
            questionsList={questionsNavList}
            activeAnswerId={activeAns.id}
            onSelectAnswerId={setActiveAnswerId}
            criteriaDefs={activeCriteriaDefs}
            criteriaScores={activeState.criteriaScores || {}}
            criteriaComments={activeState.criteriaComments || {}}
            onChangeCriterionScore={(code, score) =>
              updateAnswerState(activeAns.id, (prev) => {
                const nextScores = { ...(prev.criteriaScores || {}), [code]: score };
                const newBand = calculateCriteriaBand(
                  activeCriteriaDefs.map((d) => nextScores[d.code] ?? null)
                );
                return {
                  ...prev,
                  points: newBand ?? prev.points,
                  criteriaScores: nextScores,
                };
              })
            }
            onChangeCriterionComment={(code, commentText) =>
              updateAnswerState(activeAns.id, (prev) => ({
                ...prev,
                criteriaComments: { ...(prev.criteriaComments || {}), [code]: commentText },
              }))
            }
            annotations={activeState.annotations || []}
            overallFeedback={overallFeedback}
            onChangeOverallFeedback={setOverallFeedback}
            hasIncompleteCriteria={hasIncompleteCriteria}
            isPending={isPending}
            onSaveDraft={() => onSaveGrading(true)}
            onFinalizeGrading={() => onSaveGrading(false)}
          />
        ) : (
          <aside className="bg-white border-l border-slate-200 h-full overflow-y-auto p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tổng kết bài làm {assignmentSkill === "LISTENING" ? "Listening" : "Reading"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các câu hỏi trắc nghiệm và điền từ được hệ thống đối chiếu đáp án tự động.
                </p>
              </div>
              <div className="border-2 border-[#EA580C] rounded-2xl p-4 bg-[#FFF1EB] space-y-2">
                <div className="flex items-center justify-between">
                  <b className="text-xs font-bold text-slate-900">Tổng điểm đạt được</b>
                  <span className="text-2xl font-black font-mono text-[#EA580C]">
                    {objectiveTotalPoints} / {objectiveMaxPoints}đ
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="Nhận xét tổng quát của Giáo viên cho bài làm này..."
                  className="w-full p-2.5 text-xs rounded-xl border border-orange-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onSaveGrading(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#EA580C] hover:bg-[#c2410c] text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              <span>Lưu nhận xét & điểm</span>
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
