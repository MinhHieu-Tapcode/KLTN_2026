import React, { useState, useEffect, useRef } from "react";
import { FormattedPassageView } from "@/components/assignments/formatted-passage-view";
import { FlowchartView } from "@/components/assignments/flowchart-view";
import { TableCompletionView } from "@/components/assignments/table-completion-view";
import { MatchingHeadingsView } from "@/components/assignments/matching-headings-view";
import { SummaryCompletionView } from "@/components/assignments/summary-completion-view";
import { WritingTaskView } from "@/components/assignments/writing-task-view";
import { SpeakingPartView } from "@/components/assignments/speaking-part-view";
import { ListeningMapView } from "@/components/assignments/listening-map-view";
import { ListeningFormView } from "@/components/assignments/listening-form-view";
import { cleanPromptRedundantNumbers } from "@/lib/exam-parser/clean-prompt";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Flag,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Send,
  X,
  BookOpen,
  Headphones,
  CheckCircle2,
  Eye,
} from "lucide-react";

export interface IeltsExamPlayerProps {
  assignment: any;
  onClose: () => void;
  onSubmit: (answers: Record<string, any>) => void;
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
  const matchingHeadings = assignment.matchingHeadings || assignment.parsedData?.matchingHeadings || [];
  const summaries = assignment.summaries || assignment.parsedData?.summaries || [];

  // Auto-Format Adapter: Khôi phục sơ đồ khối hộp nếu phát hiện nhóm câu hỏi The Envisioning Process (câu 18-23)
  if ((!flowcharts || flowcharts.length === 0) && assignment.questions) {
    const qNums = (assignment.questions || []).map((q: any) => Number(q.questionNumber));
    if (qNums.includes(18) && qNums.includes(19) && qNums.includes(23)) {
      flowcharts = [
        {
          id: "fc-envisioning",
          title: "The Envisioning Process",
          instruction:
            "Complete the flow chart. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
          boxes: [
            {
              id: "box-1",
              textTemplate: "manager (having just obtained _______)",
              questionNumbers: [18],
              isStatic: false,
              nextBoxIds: ["box-center"],
            },
            {
              id: "box-2",
              textTemplate: "people with greatly varied _______",
              questionNumbers: [19],
              isStatic: false,
              nextBoxIds: ["box-center", "box-6"],
            },
            {
              id: "box-center",
              textTemplate: "playing with language for a long time",
              isStatic: true,
              nextBoxIds: ["box-4"],
            },
            {
              id: "box-4",
              textTemplate: "_______ set of words",
              questionNumbers: [20],
              isStatic: false,
              nextBoxIds: ["box-5"],
            },
            {
              id: "box-5",
              textTemplate:
                "- obeyed only at _______\n- can cause lack of _______",
              questionNumbers: [21, 22],
              isStatic: false,
              nextBoxIds: [],
            },
            {
              id: "box-6",
              textTemplate: "want _______ payback",
              questionNumbers: [23],
              isStatic: false,
              nextBoxIds: [],
            },
          ],
          questionNumbers: [18, 19, 20, 21, 22, 23],
        },
      ];
    }
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

  // Timer đếm ngược
  const durationMinutes = Number(assignment.durationMinutes) || (isListening ? 30 : 60);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(durationMinutes * 60);

  // Audio state cho Listening
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);

  // Giám sát gian lận / chuyển tab (Proctoring) - Tắt hoàn toàn khi giáo viên Xem trước (Preview)
  const enableProctoring = isPreview ? false : (assignment.enableProctoring ?? true);
  const maxTabSwitches = Number(assignment.maxTabSwitches) || 3;
  const [tabSwitches, setTabSwitches] = useState(0);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);

  const questions: any[] = assignment.questions || [];
  const sections: any[] = assignment.sections || [];

  // Xác định câu hỏi theo section hiện tại (nếu có chia section)
  const currentSection = sections.length > 0 ? sections[activeSectionIndex] : null;

  // Lắng nghe sự kiện chuyển tab (Chỉ ghi nhận số lần rời tab để gửi giáo viên, không tự động thu bài)
  useEffect(() => {
    if (!enableProctoring) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          setProctorWarning(`Nhắc nhở: Hệ thống ghi nhận bạn vừa rời khỏi màn hình làm bài (lần thứ ${next}). Lịch sử rời tab sẽ được gửi cho giáo viên.`);
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enableProctoring]);

  // Đếm ngược thời gian
  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      if (!isPreview) {
        onSubmit(studentAnswers);
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPreview, timeLeftSeconds, studentAnswers, onSubmit]);

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
            <Badge variant="outline" className="border-amber-400/60 bg-amber-500/10 text-amber-300 text-xs font-semibold gap-1 px-2.5 py-1">
              <Eye className="size-3.5" /> Chế độ xem trước của Giáo viên
            </Badge>
          )}
          <span className="font-bold text-sm tracking-tight text-slate-100 hidden sm:inline">
            {assignment.title}
          </span>
        </div>

        {/* Đồng hồ đếm ngược trung tâm */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700">
          <Clock className="size-4 text-amber-400" />
          <span className="font-mono font-bold text-sm text-amber-300">
            {formatTime(timeLeftSeconds)}
          </span>
          <span className="text-[10px] text-slate-400 hidden md:inline">còn lại</span>
        </div>

        {/* Nút hành động & Cảnh báo Tab */}
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
              onClick={() => onSubmit(studentAnswers)}
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

      {/* Cảnh báo vi phạm gian lận nếu có */}
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

      {/* 2. NỘI DUNG CHÍNH (READING: 2 CỘT SPLIT-VIEW | LISTENING: 1 CỘT TOÀN MÀN HÌNH) */}
      <div className="flex-1 overflow-hidden relative">
        {isReading ? (
          /* ============================================================ */
          /* BỐ CỤC READING: 2 CỘT SPLIT-VIEW CUỘN ĐỘC LẬP                */
          /* ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* CỘT TRÁI: BÀI ĐỌC (PASSAGE) CUỘN ĐỘC LẬP */}
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

                {/* Nút chỉnh cỡ chữ */}
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

              {/* Văn bản bài đọc */}
              <div className={textSize === "large" ? "text-sm leading-loose" : "text-xs leading-relaxed"}>
                <FormattedPassageView
                  text={
                    currentSection
                      ? currentSection.passageText
                      : assignment.passageText ||
                        Array.from(
                          new Set(
                            questions
                              .map((q: any) => q.passageText?.trim())
                              .filter(Boolean)
                          )
                        ).join("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")
                  }
                />
              </div>
            </div>

            {/* CỘT PHẢI: KHỐI CÂU HỎI CUỘN ĐỘC LẬP */}
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
                {flowcharts && flowcharts.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {flowcharts.map((fc: any, fIdx: number) => (
                      <FlowchartView
                        key={fc.id || fIdx}
                        flowchart={fc}
                        answers={studentAnswers}
                        activeQuestionNumber={activeQuestionNumber}
                        onSelectQuestion={(qNum) => {
                          setActiveQuestionNumber(qNum);
                          const el = document.getElementById('q-card-' + qNum);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        onAnswerChange={(qNum, val) => {
                          const targetQ = questions.find((q: any) => (Number(q.questionNumber) || 0) === qNum);
                          const key = targetQ?.id || ('q_' + qNum);
                          setStudentAnswers((prev) => ({
                            ...prev,
                            [key]: val,
                            [qNum]: val,
                          }));
                          setActiveQuestionNumber(qNum);
                        }}
                      />
                    ))}
                  </div>
                )}
                {tables && tables.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {tables.map((tbl: any, tIdx: number) => (
                      <TableCompletionView
                        key={tbl.id || tIdx}
                        table={tbl}
                        answers={studentAnswers}
                        activeQuestionNumber={activeQuestionNumber}
                        onSelectQuestion={(qNum) => {
                          setActiveQuestionNumber(qNum);
                          const el = document.getElementById('q-card-' + qNum);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        onAnswerChange={(qNum, val) => {
                          const targetQ = questions.find((q: any) => (Number(q.questionNumber) || 0) === qNum);
                          const key = targetQ?.id || ('q_' + qNum);
                          setStudentAnswers((prev) => ({
                            ...prev,
                            [key]: val,
                            [qNum]: val,
                          }));
                          setActiveQuestionNumber(qNum);
                        }}
                      />
                    ))}
                  </div>
                )}
                {matchingHeadings && matchingHeadings.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {matchingHeadings.map((mh: any, mhIdx: number) => (
                      <MatchingHeadingsView
                        key={mh.id || mhIdx}
                        group={mh}
                        answers={studentAnswers}
                        activeQuestionNumber={activeQuestionNumber}
                        onSelectQuestion={(qNum) => {
                          setActiveQuestionNumber(qNum);
                          const el = document.getElementById('q-card-' + qNum);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        onAnswerChange={(qNum, val) => {
                          const targetQ = questions.find((q: any) => (Number(q.questionNumber) || 0) === qNum);
                          const key = targetQ?.id || ('q_' + qNum);
                          setStudentAnswers((prev) => ({
                            ...prev,
                            [key]: val,
                            [qNum]: val,
                          }));
                          setActiveQuestionNumber(qNum);
                        }}
                      />
                    ))}
                  </div>
                )}
                {summaries && summaries.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {summaries.map((sm: any, smIdx: number) => (
                      <SummaryCompletionView
                        key={sm.id || smIdx}
                        group={sm}
                        answers={studentAnswers}
                        activeQuestionNumber={activeQuestionNumber}
                        onSelectQuestion={(qNum) => {
                          setActiveQuestionNumber(qNum);
                          const el = document.getElementById('q-card-' + qNum);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        onAnswerChange={(qNum, val) => {
                          const targetQ = questions.find((q: any) => (Number(q.questionNumber) || 0) === qNum);
                          const key = targetQ?.id || ('q_' + qNum);
                          setStudentAnswers((prev) => ({
                            ...prev,
                            [key]: val,
                            [qNum]: val,
                          }));
                          setActiveQuestionNumber(qNum);
                        }}
                      />
                    ))}
                  </div>
                )}
                {standaloneQuestions.map((q: any, idx: number) => {
                  const qNum = Number(q.questionNumber) || idx + 1;
                  const isFlagged = flaggedQuestions.has(qNum);
                  const isCurrent = activeQuestionNumber === qNum;

                  return (
                    <div
                      key={q.id || idx}
                      id={`q-card-${qNum}`}
                      className={`p-4 rounded-2xl border transition shadow-2xs ${
                        isCurrent
                          ? "bg-white border-[#EA580C] ring-2 ring-[#EA580C]/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs">
                            Câu {qNum}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium font-mono">
                            ({q.points || 1} điểm)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleFlag(qNum)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                            isFlagged
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "text-slate-400 hover:text-slate-700"
                          }`}
                          title="Đánh dấu câu hỏi để xem lại sau"
                        >
                          <Flag className={`size-3 ${isFlagged ? "fill-amber-600 text-amber-600" : ""}`} />
                          {isFlagged ? "Đã gắn cờ" : "Gắn cờ"}
                        </button>
                      </div>

                      <p className="text-xs font-semibold text-slate-900 mb-3 leading-relaxed">
                        {cleanPromptRedundantNumbers(q.prompt, qNum)}
                      </p>

                      {/* Các lựa chọn trả lời (Form 1.7 Multiple Choice) */}
                      {q.options && q.options.length > 0 ? (
                        (() => {
                          const isMultiChoice = q.prompt && /choose\s+(?:two|2|three|3)/i.test(q.prompt);
                          const rawAns = studentAnswers[q.id || `q_${qNum}`];
                          const selectedList: string[] = Array.isArray(rawAns)
                            ? rawAns
                            : rawAns ? String(rawAns).split(",").map((s) => s.trim().toUpperCase()) : [];

                          return (
                            <div className="space-y-1.5">
                              {isMultiChoice && (
                                <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 mb-1.5">
                                  <span>Chọn tối đa 2 đáp án (Choose 2 answers)</span>
                                </div>
                              )}
                              {q.options.map((opt: any) => {
                                const optLabel = (opt.optionLabel || "").trim().toUpperCase();
                                const isSelected = isMultiChoice
                                  ? selectedList.includes(optLabel)
                                  : studentAnswers[q.id || `q_${qNum}`] === optLabel;

                                return (
                                  <label
                                    key={opt.id || opt.optionLabel}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                                      isSelected
                                        ? "border-[#EA580C] bg-orange-50 font-bold text-[#EA580C]"
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <input
                                      type={isMultiChoice ? "checkbox" : "radio"}
                                      name={`question-${q.id || qNum}`}
                                      checked={isSelected}
                                      onChange={() => {
                                        if (isMultiChoice) {
                                          let updated = [...selectedList];
                                          if (updated.includes(optLabel)) {
                                            updated = updated.filter((x) => x !== optLabel);
                                          } else {
                                            if (updated.length < 2) {
                                              updated.push(optLabel);
                                            } else {
                                              updated = [updated[1], optLabel];
                                            }
                                          }
                                          setStudentAnswers({
                                            ...studentAnswers,
                                            [q.id || `q_${qNum}`]: updated,
                                          });
                                        } else {
                                          setStudentAnswers({
                                            ...studentAnswers,
                                            [q.id || `q_${qNum}`]: optLabel,
                                          });
                                        }
                                        setActiveQuestionNumber(qNum);
                                      }}
                                      className="accent-[#EA580C] size-3.5"
                                    />
                                    <span className="font-bold">{opt.optionLabel}.</span>
                                    <span>{opt.content}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : q.type === "TRUE_FALSE_NG" ? (
                        <div className="grid grid-cols-3 gap-2">
                          {(() => {
                            const isYesNo =
                              q.options?.some((o: any) => o.content === "YES") ||
                              /YES\s*\/\s*NO|claims of the writer|views of the writer/i.test(q.prompt || "") ||
                              /YES\s*\/\s*NO|claims of the writer|views of the writer/i.test(q.passageText || "");
                            const vals = isYesNo
                              ? ["YES", "NO", "NOT GIVEN"]
                              : ["TRUE", "FALSE", "NOT GIVEN"];
                            return vals.map((val) => {
                              const isSelected = studentAnswers[q.id || `q_${qNum}`] === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    setStudentAnswers({
                                      ...studentAnswers,
                                      [q.id || `q_${qNum}`]: val,
                                    });
                                    setActiveQuestionNumber(qNum);
                                  }}
                                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                                    isSelected
                                      ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={studentAnswers[q.id || `q_${qNum}`] || ""}
                          onChange={(e) => {
                            setStudentAnswers({
                              ...studentAnswers,
                              [q.id || `q_${qNum}`]: e.target.value,
                            });
                            setActiveQuestionNumber(qNum);
                          }}
                          placeholder="Nhập câu trả lời của bạn..."
                          className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* BỐ CỤC LISTENING: 1 CỘT TOÀN MÀN HÌNH + AUDIO STICKY TRÊN    */
          /* ============================================================ */
          <div className="h-full overflow-y-auto bg-slate-50">
            {/* Thanh Audio cố định trên đầu (Form 2.1) */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md text-white p-3 px-6 border-b border-slate-800 shadow-md">
              <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-[#EA580C] flex items-center justify-center text-white shrink-0">
                    <Headphones className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">2.1 Sticky Audio Header</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Chỉ nghe 1 lần
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      IELTS Listening Audio Track • Computer-Delivered
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {assignment.audioUrl && (
                    <audio
                      ref={audioRef}
                      src={assignment.audioUrl}
                      onTimeUpdate={() => {
                        if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (audioRef.current) setAudioDuration(audioRef.current.duration);
                      }}
                      onEnded={() => setIsPlayingAudio(false)}
                      className="hidden"
                    />
                  )}

                  {/* Nút Play/Pause màu cam đất */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!audioRef.current) return;
                      if (isPlayingAudio) {
                        audioRef.current.pause();
                        setIsPlayingAudio(false);
                      } else {
                        audioRef.current.play();
                        setIsPlayingAudio(true);
                      }
                    }}
                    className="size-8 rounded-full bg-[#EA580C] hover:bg-[#c2410c] text-white flex items-center justify-center shadow-sm transition shrink-0"
                    title={isPlayingAudio ? "Tạm dừng" : "Phát Audio"}
                  >
                    {isPlayingAudio ? <Pause className="size-4 fill-white" /> : <Play className="size-4 fill-white ml-0.5" />}
                  </button>

                  {/* Cột sóng âm giả lập sống động (Waveform) */}
                  <div className="hidden sm:flex items-center gap-0.5 h-6 px-2 bg-slate-800/80 rounded-lg">
                    {[10, 16, 24, 18, 12, 22, 28, 15, 20, 26, 14, 18, 22, 12, 8].map((h, idx) => (
                      <div
                        key={idx}
                        style={{ height: isPlayingAudio ? `${Math.max(4, (h * (Math.floor(audioCurrentTime) % 3 + 1)) % 22)}px` : "4px" }}
                        className={`w-0.5 rounded-full transition-all duration-150 ${
                          isPlayingAudio ? "bg-[#EA580C]" : "bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Thời gian phát */}
                  <div className="text-xs font-mono font-bold text-slate-300">
                    {formatTime(Math.floor(audioCurrentTime))} / {formatTime(Math.floor(audioDuration || 1800))}
                  </div>

                  <Volume2 className="size-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Khối câu hỏi Listening ở trung tâm */}
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
                        const isFlagged = flaggedQuestions.has(qNum);
                        const isCurrent = activeQuestionNumber === qNum;

                        return (
                          <div
                            key={q.id || qNum}
                            id={`q-card-${qNum}`}
                            className={`p-4 rounded-2xl border transition shadow-2xs ${
                              isCurrent
                                ? "bg-white border-[#EA580C] ring-2 ring-[#EA580C]/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs">
                                Câu {qNum}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleFlag(qNum)}
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition ${
                                  isFlagged
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "text-slate-400 hover:text-slate-700"
                                }`}
                              >
                                <Flag className={`size-3 ${isFlagged ? "fill-amber-600 text-amber-600" : ""}`} />
                                {isFlagged ? "Đã gắn cờ" : "Gắn cờ"}
                              </button>
                            </div>

                            <p className="text-xs font-semibold text-slate-900 mb-2.5">
                              {cleanPromptRedundantNumbers(q.prompt, qNum)}
                            </p>

                            {/* Lựa chọn hoặc ô điền */}
                            {q.options && q.options.length > 0 ? (
                              <div className="space-y-1.5">
                                {q.options.map((opt: any) => {
                                  const isSelected = studentAnswers[q.id || `q_${qNum}`] === opt.optionLabel;
                                  return (
                                    <label
                                      key={opt.optionLabel}
                                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                                        isSelected
                                          ? "border-[#EA580C] bg-orange-50 font-bold text-[#EA580C]"
                                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`question-${q.id || qNum}`}
                                        checked={isSelected}
                                        onChange={() => {
                                          setStudentAnswers({
                                            ...studentAnswers,
                                            [q.id || `q_${qNum}`]: opt.optionLabel,
                                          });
                                          setActiveQuestionNumber(qNum);
                                        }}
                                        className="accent-[#EA580C]"
                                      />
                                      <span>{opt.optionLabel}. {opt.content}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={studentAnswers[q.id || `q_${qNum}`] || ""}
                                onChange={(e) => {
                                  setStudentAnswers({
                                    ...studentAnswers,
                                    [q.id || `q_${qNum}`]: e.target.value,
                                  });
                                  setActiveQuestionNumber(qNum);
                                }}
                                placeholder="Nhập câu trả lời..."
                                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback nếu đề không có sections */
                <div className="space-y-3.5">
                  {standaloneQuestions.map((q: any, idx: number) => {
                    const qNum = q.questionNumber || idx + 1;
                    const isFlagged = flaggedQuestions.has(qNum);
                    return (
                      <div
                        key={q.id || idx}
                        id={`q-card-${qNum}`}
                        className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs">
                            Câu {qNum}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleFlag(qNum)}
                            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                          >
                            <Flag className="size-3" /> Gắn cờ
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-slate-900">
                          {cleanPromptRedundantNumbers(q.prompt, qNum)}
                        </p>
                        <input
                          type="text"
                          value={studentAnswers[q.id || `q_${qNum}`] || ""}
                          onChange={(e) =>
                            setStudentAnswers({ ...studentAnswers, [q.id || `q_${qNum}`]: e.target.value })
                          }
                          className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. THANH ĐIỀU HƯỚNG CÂU HỎI Ở CHÂN TRANG (COMPUTER-DELIVERED IELTS QUESTION PALETTE) */}
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

        {/* Nút Điều hướng Câu trước / Câu tiếp */}
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
