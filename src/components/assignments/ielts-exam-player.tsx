import React, { useState, useEffect, useRef } from "react";
import { FormattedPassageView } from "@/components/assignments/formatted-passage-view";
import {
  getDefaultEnvisioningFlowcharts,
  ListeningStickyAudioHeader,
  SpecializedQuestionGroups,
  StandaloneQuestionCard,
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
} from "lucide-react";

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
  let flowcharts = assignment.flowcharts || assignment.parsedData?.flowcharts || [];
  const tables = assignment.tables || assignment.parsedData?.tables || [];
  const matchingHeadings = assignment.matchingHeadings || assignment.parsedData?.matchingHeadings || [];
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

  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>(initialAnswers);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number>(1);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [textSize, setTextSize] = useState<"normal" | "large">("normal");

  const durationMinutes = Number(assignment.durationMinutes) || (isListening ? 30 : 60);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(durationMinutes * 60);

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

  useEffect(() => {
    if (!enableProctoring) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          setProctorWarning(
            `Nhắc nhở: Hệ thống ghi nhận bạn vừa rời khỏi màn hình làm bài (lần thứ ${next}). Lịch sử rời tab sẽ được gửi cho giáo viên.`
          );
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enableProctoring]);

  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      if (!isPreview) {
        onSubmit(studentAnswers, {
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
  }, [isPreview, timeLeftSeconds, studentAnswers, tabSwitches, onSubmit]);

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

  const answeredCount = Object.keys(studentAnswers).filter((k) => studentAnswers[k] !== "").length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col h-screen overflow-hidden text-slate-900 select-none">
      {/* 1. THANH TIÊU ĐỀ TRÊN CÙNG (COMPUTER-DELIVERED IELTS HEADER) */}
      <header className="h-14 bg-slate-900 text-white px-4 sm:px-6 flex items-center justify-between shadow-md shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Badge className="bg-[#EA580C] text-white text-xs font-bold gap-1 px-2.5 py-1">
            {isListening ? <Headphones className="size-3.5" /> : <BookOpen className="size-3.5" />}
            IELTS {skill}
          </Badge>
          {isPreview && (
            <Badge
              variant="outline"
              className="border-amber-400/60 bg-amber-500/10 text-amber-300 text-xs font-semibold gap-1 px-2.5 py-1"
            >
              <Eye className="size-3.5" /> Chế độ xem trước của Giáo viên
            </Badge>
          )}
          <span className="font-bold text-sm tracking-tight text-slate-100 hidden sm:inline">
            {assignment.title}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700">
          <Clock className="size-4 text-amber-400" />
          <span className="font-mono font-bold text-sm text-amber-300">
            {formatTime(timeLeftSeconds)}
          </span>
          <span className="text-[10px] text-slate-400 hidden md:inline">còn lại</span>
        </div>

        <div className="flex items-center gap-3">
          {!isPreview && enableProctoring && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-300">
              <ShieldAlert className="size-3.5 text-amber-400" />
              <span>Rời tab: </span>
              <b className={tabSwitches > 0 ? "text-amber-400" : "text-emerald-400"}>
                {tabSwitches} lần
              </b>
            </div>
          )}

          {isPreview ? (
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="h-8.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl shadow-sm gap-1.5"
            >
              <ChevronLeft className="size-3.5" /> Quay lại duyệt đề (Bước 4)
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => onSubmit(studentAnswers, { tabSwitchCount: tabSwitches })}
              className="h-8.5 px-4 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs rounded-xl shadow-sm gap-1.5"
            >
              <Send className="size-3.5" /> Nộp bài thi
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            title={isPreview ? "Đóng xem trước" : "Đóng màn hình"}
            className="size-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      {proctorWarning && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shrink-0 animate-pulse">
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

      {/* 2. NỘI DUNG CHÍNH */}
      <div className="flex-1 overflow-hidden relative">
        {isReading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* CỘT TRÁI: BÀI ĐỌC */}
            <div className="h-full overflow-y-auto bg-white p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    {currentSection ? currentSection.title : "READING PASSAGE"}
                  </h3>
                  {sections.length > 1 && (
                    <div className="flex items-center gap-1">
                      {sections.map((sec, idx) => (
                        <button
                          key={sec.id || idx}
                          type="button"
                          onClick={() => setActiveSectionIndex(idx)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                            activeSectionIndex === idx
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Passage {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">Cỡ chữ:</span>
                  <button
                    type="button"
                    onClick={() => setTextSize("normal")}
                    className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                      textSize === "normal"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextSize("large")}
                    className={`px-2 py-0.5 rounded border text-[13px] font-bold ${
                      textSize === "large"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className={textSize === "large" ? "text-sm leading-loose" : "text-xs leading-relaxed"}>
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

            {/* CỘT PHẢI: KHỐI CÂU HỎI */}
            <div className="h-full overflow-y-auto bg-slate-50 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  QUESTIONS & ANSWER SHEET
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Đã làm <b className="text-[#EA580C]">{answeredCount}</b>/{questions.length} câu
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

                {standaloneQuestions.map((q: any, idx: number) => {
                  const qNum = Number(q.questionNumber) || idx + 1;
                  return (
                    <StandaloneQuestionCard
                      key={q.id || idx}
                      question={q}
                      questionNumber={qNum}
                      isFlagged={flaggedQuestions.has(qNum)}
                      isCurrent={activeQuestionNumber === qNum}
                      studentAnswers={studentAnswers}
                      setStudentAnswers={setStudentAnswers}
                      onToggleFlag={handleToggleFlag}
                      onFocusQuestion={setActiveQuestionNumber}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* BỐ CỤC LISTENING: 1 CỘT TOÀN MÀN HÌNH + AUDIO STICKY TRÊN */
          <div className="h-full overflow-y-auto bg-slate-50">
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

            <div className="max-w-4xl mx-auto p-6 space-y-5 pb-24">
              {sections.length > 0 ? (
                sections.map((sec, sIdx) => (
                  <div key={sec.id || sIdx} className="space-y-4">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                      <h3 className="font-bold text-xs uppercase tracking-wide text-[#EA580C]">
                        {sec.title || `SECTION ${sIdx + 1}`}
                      </h3>
                      {sec.passageText && (
                        <p className="text-xs text-slate-600 mt-1 italic leading-relaxed">
                          {sec.passageText}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3.5">
                      {sec.questions.map((q: any) => {
                        const qNum = q.questionNumber;
                        return (
                          <StandaloneQuestionCard
                            key={q.id || qNum}
                            question={q}
                            questionNumber={qNum}
                            isFlagged={flaggedQuestions.has(qNum)}
                            isCurrent={activeQuestionNumber === qNum}
                            showPoints={false}
                            studentAnswers={studentAnswers}
                            setStudentAnswers={setStudentAnswers}
                            onToggleFlag={handleToggleFlag}
                            onFocusQuestion={setActiveQuestionNumber}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-3.5">
                  {standaloneQuestions.map((q: any, idx: number) => {
                    const qNum = q.questionNumber || idx + 1;
                    return (
                      <StandaloneQuestionCard
                        key={q.id || idx}
                        question={q}
                        questionNumber={qNum}
                        isFlagged={flaggedQuestions.has(qNum)}
                        isCurrent={activeQuestionNumber === qNum}
                        showPoints={false}
                        studentAnswers={studentAnswers}
                        setStudentAnswers={setStudentAnswers}
                        onToggleFlag={handleToggleFlag}
                        onFocusQuestion={setActiveQuestionNumber}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. THANH ĐIỀU HƯỚNG CÂU HỎI Ở CHÂN TRANG */}
      <footer className="h-14 bg-slate-900 text-white px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 border-t border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-[65%] sm:max-w-[75%] scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 hidden sm:inline">
            Bảng câu hỏi:
          </span>
          {questions.map((q: any, idx: number) => {
            const qNum = Number(q.questionNumber) || idx + 1;
            const hasAnswer = Boolean(studentAnswers[q.id || `q_${qNum}`]);
            const isFlagged = flaggedQuestions.has(qNum);
            const isCurrent = activeQuestionNumber === qNum;

            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => scrollToQuestion(qNum)}
                className={`size-7 rounded-lg text-xs font-mono font-bold shrink-0 transition relative flex items-center justify-center ${
                  isCurrent
                    ? "bg-[#EA580C] text-white ring-2 ring-white"
                    : hasAnswer
                    ? "bg-slate-700 text-white hover:bg-slate-600"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                }`}
                title={`Câu ${qNum}${hasAnswer ? " (Đã làm)" : ""}${isFlagged ? " (Đã gắn cờ)" : ""}`}
              >
                {qNum}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={activeQuestionNumber <= 1}
            onClick={() => scrollToQuestion(Math.max(1, activeQuestionNumber - 1))}
            className="h-8 px-2.5 text-xs bg-slate-800 border-slate-700 text-white hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5 mr-0.5" /> Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={activeQuestionNumber >= questions.length}
            onClick={() => scrollToQuestion(Math.min(questions.length, activeQuestionNumber + 1))}
            className="h-8 px-2.5 text-xs bg-slate-800 border-slate-700 text-white hover:bg-slate-700 disabled:opacity-40"
          >
            Tiếp <ChevronRight className="size-3.5 ml-0.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
