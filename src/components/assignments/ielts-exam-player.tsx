"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FormattedPassageView } from "@/components/assignments/formatted-passage-view";
import {
  getDefaultEnvisioningFlowcharts,
  groupQuestionsIntoSimpaceClusters,
  ListeningStickyAudioHeader,
  SimpaceQuestionClusterRenderer,
  SpecializedQuestionGroups,
} from "@/components/assignments/ielts-question-renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  X,
  BookOpen,
  Headphones,
  Eye,
  PenTool,
  Mic,
  CheckCircle2,
} from "lucide-react";
import { recordOutTabAction } from "@/actions/notifications";

export interface IeltsExamPlayerProps {
  assignment: any;
  onClose: () => void;
  onSubmit: (
    answers: Record<string, any>,
    meta?: { tabSwitchCount?: number; autoSubmittedReason?: string }
  ) => void;
  initialAnswers?: Record<string, any>;
  isPreview?: boolean;
}

export function IeltsExamPlayer({
  assignment,
  onClose,
  onSubmit,
  initialAnswers = {},
  isPreview = false,
}: IeltsExamPlayerProps) {
  const skill = (assignment.skill || "READING").toUpperCase();
  const isListening = skill === "LISTENING";
  const isReading = skill === "READING";
  const isWriting = skill === "WRITING";
  const isSpeaking = skill === "SPEAKING";

  let flowcharts = assignment.flowcharts || assignment.parsedData?.flowcharts || [];
  const tables = assignment.tables || assignment.parsedData?.tables || [];
  const matchingHeadings =
    assignment.matchingHeadings || assignment.parsedData?.matchingHeadings || [];
  const summaries = assignment.summaries || assignment.parsedData?.summaries || [];

  if ((!flowcharts || flowcharts.length === 0) && assignment.questions) {
    flowcharts = getDefaultEnvisioningFlowcharts(assignment.questions);
  }

  const specializedQuestionNumbers = new Set<number>();
  (flowcharts || []).forEach((fc: any) => {
    (fc.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)));
  });
  (tables || []).forEach((tbl: any) => {
    (tbl.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)));
  });
  (matchingHeadings || []).forEach((mh: any) => {
    (mh.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)));
  });
  (summaries || []).forEach((sm: any) => {
    (sm.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)));
  });

  const standaloneQuestions = (assignment.questions || []).filter(
    (q: any) => !specializedQuestionNumbers.has(Number(q.questionNumber))
  );

  const storageKey = `simpace_exam_autosave_${assignment.id || "temp"}`;

  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>(() => {
    if (!isPreview && typeof window !== "undefined" && assignment.id) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.answers && Object.keys(parsed.answers).length > 0) {
            return { ...initialAnswers, ...parsed.answers };
          }
        }
      } catch {}
    }
    return initialAnswers;
  });

  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number>(1);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [textSize, setTextSize] = useState<"normal" | "large">("normal");
  const [lastSavedText, setLastSavedText] = useState<string>("Đã lưu tự động");

  const durationMinutes =
    Number(assignment.durationMinutes) || (isListening ? 30 : isSpeaking ? 15 : 60);

  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    if (!isPreview && typeof window !== "undefined" && assignment.id) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed?.timeLeftSeconds === "number" && parsed.timeLeftSeconds > 15) {
            return parsed.timeLeftSeconds;
          }
        }
      } catch {}
    }
    return durationMinutes * 60;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const enableProctoring = isPreview ? false : (assignment.enableProctoring ?? true);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);

  const questions: any[] = assignment.questions || [];
  const sections: any[] = assignment.sections || [];
  const currentSection = sections.length > 0 ? sections[activeSectionIndex] : null;

  // Tự động lưu nháp vào localStorage mỗi khi học viên trả lời
  useEffect(() => {
    if (isPreview || typeof window === "undefined" || !assignment.id) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers: studentAnswers,
          timeLeftSeconds,
          updatedAt: Date.now(),
        })
      );
      setLastSavedText("Đã lưu tự động");
    } catch {}
  }, [studentAnswers, timeLeftSeconds, isPreview, assignment.id, storageKey]);

  const handleFinalSubmit = (
    answers: Record<string, any>,
    meta?: { tabSwitchCount?: number; autoSubmittedReason?: string }
  ) => {
    if (typeof window !== "undefined" && assignment.id) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
    onSubmit(answers, meta);
  };

  const lastOutTabRef = useRef<number>(0);
  useEffect(() => {
    if (!enableProctoring) return;

    const handleOutTab = () => {
      const now = Date.now();
      if (now - lastOutTabRef.current < 1000) return;
      lastOutTabRef.current = now;

      setTabSwitches((prev) => {
        const next = prev + 1;
        setProctorWarning(
          `Nhắc nhở: Hệ thống ghi nhận bạn vừa rời khỏi màn hình làm bài (Out Tab lần thứ ${next}). Vi phạm Out Tab sẽ được báo cáo cho giáo viên phụ trách.`
        );
        return next;
      });

      if (!isPreview && assignment?.id) {
        recordOutTabAction({ assignmentId: assignment.id }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleOutTab();
      }
    };

    const handleBlur = () => {
      handleOutTab();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enableProctoring, isPreview, assignment?.id]);

  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      if (!isPreview) {
        handleFinalSubmit(studentAnswers, {
          tabSwitchCount: tabSwitches,
          autoSubmittedReason: "TIME_EXPIRED",
        });
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPreview, timeLeftSeconds, studentAnswers, tabSwitches]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleFlag = (qNum: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) next.delete(qNum);
      else next.add(qNum);
      return next;
    });
  };

  const scrollToQuestion = (qNum: number) => {
    setActiveQuestionNumber(qNum);
    const el = document.getElementById(`q-card-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const answeredCount = questions.filter((q: any, idx: number) => {
    const qNum = Number(q.questionNumber) || idx + 1;
    const val = studentAnswers[q.id || `q_${qNum}`] ?? studentAnswers[qNum];
    return Boolean(val && String(val).trim() !== "");
  }).length;

  const progressPercent =
    questions.length > 0 ? Math.min(100, Math.round((answeredCount / questions.length) * 100)) : 0;

  const renderSkillIcon = () => {
    if (isListening) return <Headphones className="size-3.5" />;
    if (isWriting) return <PenTool className="size-3.5" />;
    if (isSpeaking) return <Mic className="size-3.5" />;
    return <BookOpen className="size-3.5" />;
  };

  const standaloneClusters = groupQuestionsIntoSimpaceClusters(standaloneQuestions);

  // Khóa cuộn trang nền khi mở màn hình làm bài toàn màn hình để không xuất hiện 2 thanh cuộn
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const playerContent = (
    <div className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col w-screen h-[100dvh] max-h-[100dvh] overflow-hidden text-slate-900 select-none">
      {/* 1. THANH HEADER TRÊN CÙNG CHUẨN THIẾT KẾ MỚI SIMPACE (LIGHT MODE + PROGRESS BAR CAM) */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Badge className="bg-[#EA580C] hover:bg-[#EA580C] text-white text-xs font-bold gap-1.5 px-3 py-1 rounded-full shrink-0">
              {renderSkillIcon()}
              <span>SIMPACE • {skill}</span>
            </Badge>
            {isPreview && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold gap-1 px-2.5 py-0.5 shrink-0"
              >
                <Eye className="size-3.5" /> Chế độ xem trước
              </Badge>
            )}
            <span className="font-extrabold text-sm tracking-tight text-slate-900 truncate hidden sm:inline">
              {assignment.title}
            </span>
          </div>

          {/* Cụm Đồng hồ + Số câu theo đúng thiết kế SIMPACE */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200">
              <Clock className="size-4 text-[#EA580C]" />
              <span className="font-mono font-extrabold text-sm text-slate-900">
                {formatTime(timeLeftSeconds)}
              </span>
            </div>

            <span className="text-xs font-mono font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {activeQuestionNumber} / {questions.length || 1}
            </span>
          </div>

          {/* Cụm Trạng thái Lưu tự động + Nộp bài */}
          <div className="flex items-center gap-2.5">
            {!isPreview && (
              <span className="hidden xl:flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="size-3.5" />
                <span>{lastSavedText}</span>
              </span>
            )}

            {!isPreview && enableProctoring && (
              <div className="hidden lg:flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                <ShieldAlert className="size-3.5 text-[#EA580C]" />
                <span>Out Tab:</span>
                <b className={tabSwitches > 0 ? "text-rose-600" : "text-emerald-600"}>
                  {tabSwitches}
                </b>
              </div>
            )}

            {isPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-3.5 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl gap-1.5"
              >
                <ChevronLeft className="size-3.5" /> Quay lại
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Đóng màn hình"
              className="size-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Thanh tiến độ màu cam đặc trưng của thiết kế SIMPACE */}
        <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden mt-2">
          <div
            style={{ width: `${Math.max(4, progressPercent)}%` }}
            className="h-full bg-[#EA580C] rounded-full transition-all duration-300"
          />
        </div>
      </header>

      {proctorWarning && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shrink-0">
          <span>{proctorWarning}</span>
          <button
            type="button"
            onClick={() => setProctorWarning(null)}
            className="underline text-[11px] hover:text-rose-200"
          >
            Đã hiểu
          </button>
        </div>
      )}

      {/* 2. NỘI DUNG CHÍNH THEO TỪNG KỸ NĂNG */}
      <div className="flex-1 overflow-hidden relative">
        {isReading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* CỘT TRÁI: BÀI ĐỌC READING PASSAGE */}
            <div className="h-full overflow-y-auto bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#EA580C]">
                    {currentSection ? currentSection.title : "READING PASSAGE"}
                  </h3>
                  {sections.length > 1 && (
                    <div className="flex items-center gap-1">
                      {sections.map((sec, idx) => (
                        <button
                          key={sec.id || idx}
                          type="button"
                          onClick={() => setActiveSectionIndex(idx)}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                            activeSectionIndex === idx
                              ? "bg-[#EA580C] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Passage {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs leading-relaxed">
                <FormattedPassageView
                  text={
                    currentSection
                      ? currentSection.passageText
                      : assignment.passageText ||
                        Array.from(
                          new Set(
                            questions.map((q: any) => q.passageText?.trim()).filter(Boolean)
                          )
                        ).join("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
                  }
                />
              </div>
            </div>

            {/* CỘT PHẢI: KHỐI CÂU HỎI READING CHUẨN SIMPACE */}
            <div className="h-full overflow-y-auto bg-[#F8FAFC] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-[#F8FAFC]/95 backdrop-blur-xs z-10">
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                  QUESTIONS & ANSWER SHEET
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Đã trả lời <b className="text-[#EA580C]">{answeredCount}</b>/{questions.length} câu
                </span>
              </div>

              <div className="space-y-4 pb-20">
                <SpecializedQuestionGroups
                  flowcharts={flowcharts}
                  tables={tables}
                  matchingHeadings={matchingHeadings}
                  summaries={summaries}
                  questions={questions}
                  studentAnswers={studentAnswers}
                  setStudentAnswers={setStudentAnswers}
                  activeQuestionNumber={activeQuestionNumber}
                  setActiveQuestionNumber={setActiveQuestionNumber}
                />

                <SimpaceQuestionClusterRenderer
                  clusters={standaloneClusters}
                  skill={skill}
                  flaggedQuestions={flaggedQuestions}
                  activeQuestionNumber={activeQuestionNumber}
                  studentAnswers={studentAnswers}
                  setStudentAnswers={setStudentAnswers}
                  onToggleFlag={handleToggleFlag}
                  onFocusQuestion={setActiveQuestionNumber}
                />
              </div>
            </div>
          </div>
        ) : (
          /* BỐ CỤC CHO LISTENING, WRITING & SPEAKING */
          <div className="h-full overflow-y-auto bg-[#F8FAFC]">
            {/* Chỉ hiển thị thanh Audio Header khi là đề LISTENING hoặc đề có đính kèm audioUrl */}
            {(isListening || Boolean(assignment.audioUrl)) && (
              <ListeningStickyAudioHeader
                audioUrl={assignment.audioUrl}
                audioRef={audioRef}
                isPlayingAudio={isPlayingAudio}
                setIsPlayingAudio={setIsPlayingAudio}
                audioCurrentTime={audioCurrentTime}
                setAudioCurrentTime={setAudioCurrentTime}
                audioDuration={audioDuration}
                setAudioDuration={setAudioDuration}
                formatTime={formatTime}
              />
            )}

            <div className="max-w-5xl mx-auto p-6 space-y-5 pb-12">
              <SpecializedQuestionGroups
                flowcharts={flowcharts}
                tables={tables}
                matchingHeadings={matchingHeadings}
                summaries={summaries}
                questions={questions}
                studentAnswers={studentAnswers}
                setStudentAnswers={setStudentAnswers}
                activeQuestionNumber={activeQuestionNumber}
                setActiveQuestionNumber={setActiveQuestionNumber}
              />

              {sections.length > 0 ? (
                sections.map((sec, sIdx) => (
                  <div key={sec.id || sIdx} className="space-y-4">
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      <h3 className="font-extrabold text-xs uppercase tracking-wide text-[#EA580C]">
                        {sec.title || `SECTION ${sIdx + 1}`}
                      </h3>
                      {sec.passageText && (
                        <p className="text-xs text-slate-600 mt-1 italic leading-relaxed">
                          {sec.passageText}
                        </p>
                      )}
                    </div>

                    <SimpaceQuestionClusterRenderer
                      clusters={groupQuestionsIntoSimpaceClusters(sec.questions || [])}
                      skill={skill}
                      flaggedQuestions={flaggedQuestions}
                      activeQuestionNumber={activeQuestionNumber}
                      showPoints={false}
                      studentAnswers={studentAnswers}
                      setStudentAnswers={setStudentAnswers}
                      onToggleFlag={handleToggleFlag}
                      onFocusQuestion={setActiveQuestionNumber}
                    />
                  </div>
                ))
              ) : (
                <SimpaceQuestionClusterRenderer
                  clusters={standaloneClusters}
                  skill={skill}
                  flaggedQuestions={flaggedQuestions}
                  activeQuestionNumber={activeQuestionNumber}
                  showPoints={false}
                  studentAnswers={studentAnswers}
                  setStudentAnswers={setStudentAnswers}
                  onToggleFlag={handleToggleFlag}
                  onFocusQuestion={setActiveQuestionNumber}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. THANH ĐIỀU HƯỚNG CÂU HỎI Ở CHÂN TRANG CHUẨN SIMPACE */}
      <footer className="h-14 bg-white text-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 border-t border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[55%] sm:max-w-[65%] scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 mr-1 hidden sm:inline">
            Câu hỏi:
          </span>
          {questions.map((q: any, idx: number) => {
            const qNum = Number(q.questionNumber) || idx + 1;
            const hasAnswer = Boolean(
              studentAnswers[q.id || `q_${qNum}`] || studentAnswers[qNum]
            );
            const isFlagged = flaggedQuestions.has(qNum);
            const isCurrent = activeQuestionNumber === qNum;

            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => scrollToQuestion(qNum)}
                className={`size-7 rounded-lg text-xs font-mono font-bold shrink-0 transition relative flex items-center justify-center ${
                  isCurrent
                    ? "bg-[#EA580C] text-white shadow-xs"
                    : hasAnswer
                    ? "bg-orange-100 text-[#EA580C] border border-orange-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
                title={`Câu ${qNum}${hasAnswer ? " (Đã trả lời)" : ""}${isFlagged ? " (Flagged)" : ""}`}
              >
                {qNum}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 ring-1 ring-white" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={activeQuestionNumber <= 1}
            onClick={() => scrollToQuestion(Math.max(1, activeQuestionNumber - 1))}
            className="h-9 px-3 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5 mr-1" /> Câu trước
          </Button>
          {activeQuestionNumber < questions.length && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => scrollToQuestion(Math.min(questions.length, activeQuestionNumber + 1))}
              className="h-9 px-3 text-xs rounded-xl border-orange-200 text-[#EA580C] hover:bg-orange-50 font-bold"
            >
              Câu tiếp <ChevronRight className="size-3.5 ml-1" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => handleFinalSubmit(studentAnswers, { tabSwitchCount: tabSwitches })}
            className="h-9 px-4 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold gap-1.5 shadow-xs"
          >
            <Send className="size-3.5" /> {isPreview ? "Nộp bài (Thử)" : "Nộp bài (Submit)"}
          </Button>
        </div>
      </footer>
    </div>
  );

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(playerContent, document.body);
}
