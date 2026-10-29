"use client";

import React from "react";
import { Flag, Headphones, Pause, Play, Volume2 } from "lucide-react";
import { FlowchartView } from "@/components/assignments/flowchart-view";
import { TableCompletionView } from "@/components/assignments/table-completion-view";
import { MatchingHeadingsView } from "@/components/assignments/matching-headings-view";
import { SummaryCompletionView } from "@/components/assignments/summary-completion-view";
import { SpeakingPartView } from "@/components/assignments/speaking-part-view";
import { cleanPromptRedundantNumbers } from "@/lib/exam-parser/clean-prompt";

export function getDefaultEnvisioningFlowcharts(questions: any[]): any[] {
  const qNums = (questions || []).map((q: any) => Number(q.questionNumber));
  if (qNums.includes(18) && qNums.includes(19) && qNums.includes(23)) {
    return [
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
            textTemplate: "- obeyed only at _______\n- can cause lack of _______",
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
  return [];
}

export function SpecializedQuestionGroups({
  flowcharts,
  tables,
  matchingHeadings,
  summaries,
  questions,
  studentAnswers,
  setStudentAnswers,
  activeQuestionNumber,
  setActiveQuestionNumber,
}: {
  flowcharts: any[];
  tables: any[];
  matchingHeadings: any[];
  summaries: any[];
  questions: any[];
  studentAnswers: Record<string, any>;
  setStudentAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  activeQuestionNumber: number;
  setActiveQuestionNumber: (qNum: number) => void;
}) {
  const handleSelectQ = (qNum: number) => {
    setActiveQuestionNumber(qNum);
    const el = document.getElementById("q-card-" + qNum);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleChangeAns = (qNum: number, val: any) => {
    const targetQ = questions.find((q: any) => (Number(q.questionNumber) || 0) === qNum);
    const key = targetQ?.id || "q_" + qNum;
    setStudentAnswers((prev) => ({
      ...prev,
      [key]: val,
      [qNum]: val,
    }));
    setActiveQuestionNumber(qNum);
  };

  return (
    <>
      {flowcharts && flowcharts.length > 0 && (
        <div className="space-y-4 mb-4">
          {flowcharts.map((fc: any, fIdx: number) => (
            <FlowchartView
              key={fc.id || fIdx}
              flowchart={fc}
              answers={studentAnswers}
              activeQuestionNumber={activeQuestionNumber}
              onSelectQuestion={handleSelectQ}
              onAnswerChange={handleChangeAns}
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
              onSelectQuestion={handleSelectQ}
              onAnswerChange={handleChangeAns}
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
              onSelectQuestion={handleSelectQ}
              onAnswerChange={handleChangeAns}
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
              onSelectQuestion={handleSelectQ}
              onAnswerChange={handleChangeAns}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function StandaloneQuestionCard({
  question: q,
  questionNumber: qNum,
  isFlagged,
  isCurrent,
  showPoints = true,
  studentAnswers,
  setStudentAnswers,
  onToggleFlag,
  onFocusQuestion,
}: {
  question: any;
  questionNumber: number;
  isFlagged: boolean;
  isCurrent: boolean;
  showPoints?: boolean;
  studentAnswers: Record<string, any>;
  setStudentAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onToggleFlag: (qNum: number) => void;
  onFocusQuestion: (qNum: number) => void;
}) {
  const answerKey = q.id || `q_${qNum}`;

  return (
    <div
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
          {showPoints && (
            <span className="text-[11px] text-slate-400 font-medium font-mono">
              ({q.points || 1} điểm)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleFlag(qNum)}
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

      {q.options && q.options.length > 0 ? (
        (() => {
          const isMultiChoice = q.prompt && /choose\s+(?:two|2|three|3)/i.test(q.prompt);
          const rawAns = studentAnswers[answerKey];
          const selectedList: string[] = Array.isArray(rawAns)
            ? rawAns
            : rawAns
            ? String(rawAns)
                .split(",")
                .map((s) => s.trim().toUpperCase())
            : [];

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
                  : studentAnswers[answerKey] === optLabel || studentAnswers[answerKey] === opt.optionLabel;

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
                          } else if (updated.length < 2) {
                            updated.push(optLabel);
                          } else {
                            updated = [updated[1], optLabel];
                          }
                          setStudentAnswers({
                            ...studentAnswers,
                            [answerKey]: updated,
                          });
                        } else {
                          setStudentAnswers({
                            ...studentAnswers,
                            [answerKey]: optLabel,
                          });
                        }
                        onFocusQuestion(qNum);
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
            const vals = isYesNo ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
            return vals.map((val) => {
              const isSelected = studentAnswers[answerKey] === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setStudentAnswers({
                      ...studentAnswers,
                      [answerKey]: val,
                    });
                    onFocusQuestion(qNum);
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
      ) : q.type === "ESSAY" ? (
        <div className="space-y-2">
          {q.passageText && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {q.passageText}
            </div>
          )}
          <textarea
            rows={8}
            value={studentAnswers[answerKey] || ""}
            onChange={(e) => {
              setStudentAnswers({
                ...studentAnswers,
                [answerKey]: e.target.value,
              });
              onFocusQuestion(qNum);
            }}
            placeholder="Nhập bài viết luận của bạn tại đây..."
            className="w-full p-3 text-sm leading-relaxed rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
          />
          <div className="flex justify-end text-[11px] font-semibold text-slate-500">
            Số từ hiện tại:{" "}
            <b className="ml-1 text-slate-800">
              {(studentAnswers[answerKey] || "").trim()
                ? (studentAnswers[answerKey] || "").trim().split(/\s+/).length
                : 0}{" "}
              từ
            </b>
          </div>
        </div>
      ) : q.type === "SPEAKING_RECORD" ? (
        <SpeakingPartView
          part={
            q.ieltsQuestionType === "SPEAKING_PART_1"
              ? "PART_1"
              : q.ieltsQuestionType === "SPEAKING_PART_3"
              ? "PART_3"
              : "PART_2"
          }
          questionText={q.passageText || q.prompt}
          onRecordingComplete={(_blob, _dur, dataUrl) => {
            if (dataUrl) {
              setStudentAnswers({
                ...studentAnswers,
                [answerKey]: dataUrl,
              });
              onFocusQuestion(qNum);
            }
          }}
        />
      ) : (
        <input
          type="text"
          value={studentAnswers[answerKey] || ""}
          onChange={(e) => {
            setStudentAnswers({
              ...studentAnswers,
              [answerKey]: e.target.value,
            });
            onFocusQuestion(qNum);
          }}
          placeholder="Nhập câu trả lời của bạn..."
          className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
        />
      )}
    </div>
  );
}

export function ListeningStickyAudioHeader({
  audioUrl,
  audioRef,
  isPlayingAudio,
  setIsPlayingAudio,
  audioCurrentTime,
  setAudioCurrentTime,
  audioDuration,
  setAudioDuration,
  formatTime,
}: {
  audioUrl?: string | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlayingAudio: boolean;
  setIsPlayingAudio: (v: boolean) => void;
  audioCurrentTime: number;
  setAudioCurrentTime: (v: number) => void;
  audioDuration: number;
  setAudioDuration: (v: number) => void;
  formatTime: (sec: number) => string;
}) {
  return (
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
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
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
            {isPlayingAudio ? (
              <Pause className="size-4 fill-white" />
            ) : (
              <Play className="size-4 fill-white ml-0.5" />
            )}
          </button>

          <div className="hidden sm:flex items-center gap-0.5 h-6 px-2 bg-slate-800/80 rounded-lg">
            {[10, 16, 24, 18, 12, 22, 28, 15, 20, 26, 14, 18, 22, 12, 8].map((h, idx) => (
              <div
                key={idx}
                style={{
                  height: isPlayingAudio
                    ? `${Math.max(4, (h * (Math.floor(audioCurrentTime) % 3 + 1)) % 22)}px`
                    : "4px",
                }}
                className={`w-0.5 rounded-full transition-all duration-150 ${
                  isPlayingAudio ? "bg-[#EA580C]" : "bg-slate-600"
                }`}
              />
            ))}
          </div>

          <div className="text-xs font-mono font-bold text-slate-300">
            {formatTime(Math.floor(audioCurrentTime))} / {formatTime(Math.floor(audioDuration || 1800))}
          </div>

          <Volume2 className="size-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
