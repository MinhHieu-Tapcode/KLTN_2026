"use client";

import React from "react";
import { Flag, Headphones, Pause, Play, Volume2 } from "lucide-react";
import { FlowchartView } from "@/components/assignments/flowchart-view";
import { TableCompletionView } from "@/components/assignments/table-completion-view";
import { MatchingHeadingsView } from "@/components/assignments/matching-headings-view";
import { SummaryCompletionView } from "@/components/assignments/summary-completion-view";
import { SpeakingPartView } from "@/components/assignments/speaking-part-view";
import { WritingTaskView } from "@/components/assignments/writing-task-view";
import {
  QuestionGroupCluster,
  SimpaceBookingFormCard,
  SimpaceMatchingGroupCard,
  SimpaceVisualGroupCard,
} from "@/components/assignments/simpace-question-views";
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

/**
 * Gom nhóm thông minh các câu hỏi liên tiếp có cùng dạng Bản đồ, Sơ đồ, Matching Headings, hoặc Biểu mẫu Form
 */
export function groupQuestionsIntoSimpaceClusters(questions: any[]): QuestionGroupCluster[] {
  const clusters: QuestionGroupCluster[] = [];
  let i = 0;

  const getQuestionClusterKind = (
    q: any
  ): "VISUAL_MAP_DIAGRAM" | "MATCHING_GROUP" | "FORM_COMPLETION" | "SINGLE" => {
    const ieltsType = (q.ieltsQuestionType || "").toUpperCase();
    const dbType = (q.type || "").toUpperCase();
    const text = `${q.groupTitle || ""} ${q.prompt || ""}`;

    // Nếu không phải Writing/Speaking mà có ảnh đính kèm hoặc thuộc dạng Map/Diagram
    if (
      dbType !== "ESSAY" &&
      dbType !== "SPEAKING_RECORD" &&
      !ieltsType.startsWith("WRITING") &&
      !ieltsType.startsWith("SPEAKING")
    ) {
      if (
        Boolean(q.imageUrl) ||
        ieltsType === "LISTENING_MAP_PLAN" ||
        ieltsType === "LISTENING_MAP_PLAN_DIAGRAM" ||
        ieltsType === "READING_DIAGRAM_LABELLING" ||
        dbType === "MAP" ||
        /\b(?:label the map|map below|diagram below|plan below)\b/i.test(text)
      ) {
        return "VISUAL_MAP_DIAGRAM";
      }
    }

    if (
      dbType === "MATCHING" ||
      ieltsType === "READING_MATCHING_HEADINGS" ||
      ieltsType === "LISTENING_MATCHING" ||
      (ieltsType === "READING_MATCHING_INFO" && q.options && q.options.length > 0)
    ) {
      return "MATCHING_GROUP";
    }

    if (
      ieltsType === "LISTENING_FORM_NOTE_TABLE" ||
      ieltsType === "READING_NOTE_TABLE_FORM" ||
      /\b(?:booking form|application form|registration form|complete the form)\b/i.test(text)
    ) {
      return "FORM_COMPLETION";
    }

    return "SINGLE";
  };

  while (i < (questions || []).length) {
    const current = questions[i];
    const kind = getQuestionClusterKind(current);

    if (kind === "SINGLE") {
      clusters.push({
        id: `cluster-single-${current.id || current.questionNumber || i}`,
        clusterType: "SINGLE",
        title: current.groupTitle || `Question ${current.questionNumber || i + 1}`,
        instruction: "",
        imageUrl: current.imageUrl || null,
        questions: [current],
      });
      i++;
      continue;
    }

    const grouped: any[] = [current];
    let j = i + 1;
    while (j < questions.length) {
      const nextQ = questions[j];
      const nextKind = getQuestionClusterKind(nextQ);
      const sameImage =
        !current.imageUrl || !nextQ.imageUrl || current.imageUrl === nextQ.imageUrl;

      if (nextKind === kind && sameImage) {
        grouped.push(nextQ);
        j++;
      } else {
        break;
      }
    }

    const sharedImg = grouped.find((g) => g.imageUrl)?.imageUrl || null;
    const ieltsType = (current.ieltsQuestionType || "").toUpperCase();

    let defaultTitle = current.groupTitle || "";
    let defaultInstruction = "";

    if (kind === "VISUAL_MAP_DIAGRAM") {
      defaultTitle =
        defaultTitle ||
        (ieltsType.includes("DIAGRAM") ? "Diagram Labelling" : "Map / Plan Labelling");
      defaultInstruction = ieltsType.includes("DIAGRAM")
        ? "Label the diagram below. Choose NO MORE THAN TWO WORDS from the passage for each answer."
        : "Label the map below. Write the correct letter, A–H, next to each question.";
    } else if (kind === "MATCHING_GROUP") {
      defaultTitle =
        defaultTitle ||
        (ieltsType.includes("LISTENING") ? "Matching" : "Matching Headings");
      defaultInstruction =
        "Choose the correct heading or option for each item from the list on the right.";
    } else if (kind === "FORM_COMPLETION") {
      defaultTitle = defaultTitle || "Form / Note / Table Completion";
      defaultInstruction =
        "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.";
    }

    clusters.push({
      id: `cluster-${kind}-${i}`,
      clusterType: kind,
      title: defaultTitle,
      instruction: defaultInstruction,
      imageUrl: sharedImg,
      questions: grouped,
    });

    i = j;
  }

  return clusters;
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

export function SimpaceQuestionClusterRenderer({
  clusters,
  skill,
  flaggedQuestions,
  activeQuestionNumber,
  showPoints = true,
  studentAnswers,
  setStudentAnswers,
  onToggleFlag,
  onFocusQuestion,
  onSubmitExam,
}: {
  clusters: QuestionGroupCluster[];
  skill: string;
  flaggedQuestions: Set<number>;
  activeQuestionNumber: number;
  showPoints?: boolean;
  studentAnswers: Record<string, any>;
  setStudentAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onToggleFlag: (qNum: number) => void;
  onFocusQuestion: (qNum: number) => void;
  onSubmitExam?: () => void;
}) {
  return (
    <div className="space-y-4">
      {clusters.map((cluster) => {
        if (cluster.clusterType === "VISUAL_MAP_DIAGRAM") {
          return (
            <SimpaceVisualGroupCard
              key={cluster.id}
              cluster={cluster}
              skill={skill}
              studentAnswers={studentAnswers}
              setStudentAnswers={setStudentAnswers}
              flaggedQuestions={flaggedQuestions}
              activeQuestionNumber={activeQuestionNumber}
              onToggleFlag={onToggleFlag}
              onFocusQuestion={onFocusQuestion}
            />
          );
        }

        if (cluster.clusterType === "MATCHING_GROUP") {
          return (
            <SimpaceMatchingGroupCard
              key={cluster.id}
              cluster={cluster}
              skill={skill}
              studentAnswers={studentAnswers}
              setStudentAnswers={setStudentAnswers}
              activeQuestionNumber={activeQuestionNumber}
              onFocusQuestion={onFocusQuestion}
            />
          );
        }

        if (cluster.clusterType === "FORM_COMPLETION") {
          return (
            <SimpaceBookingFormCard
              key={cluster.id}
              cluster={cluster}
              skill={skill}
              studentAnswers={studentAnswers}
              setStudentAnswers={setStudentAnswers}
              activeQuestionNumber={activeQuestionNumber}
              onFocusQuestion={onFocusQuestion}
            />
          );
        }

        const q = cluster.questions[0];
        const qNum = Number(q.questionNumber) || 1;
        return (
          <StandaloneQuestionCard
            key={q.id || cluster.id}
            question={q}
            questionNumber={qNum}
            isFlagged={flaggedQuestions.has(qNum)}
            isCurrent={activeQuestionNumber === qNum}
            showPoints={showPoints}
            studentAnswers={studentAnswers}
            setStudentAnswers={setStudentAnswers}
            onToggleFlag={onToggleFlag}
            onFocusQuestion={onFocusQuestion}
            onSubmitExam={onSubmitExam}
          />
        );
      })}
    </div>
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
  onSubmitExam,
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
  onSubmitExam?: () => void;
}) {
  const answerKey = q.id || `q_${qNum}`;
  const ieltsType = (q.ieltsQuestionType || "").toUpperCase();
  const dbType = (q.type || "").toUpperCase();

  // Nếu là câu Writing (Task 1 / Task 2) -> Render WritingTaskView 2 cột chuẩn SIMPACE
  if (dbType === "ESSAY" || ieltsType.startsWith("WRITING")) {
    const isTask1 = ieltsType === "WRITING_TASK_1" || qNum === 1;
    return (
      <div id={`q-card-${qNum}`}>
        <WritingTaskView
          taskType={isTask1 ? "TASK_1" : "TASK_2"}
          prompt={q.passageText ? `${q.passageText}\n\n${q.prompt || ""}` : q.prompt}
          chartImageUrl={q.imageUrl || null}
          value={studentAnswers[answerKey] || ""}
          onChange={(val) => {
            setStudentAnswers((prev) => ({
              ...prev,
              [answerKey]: val,
              [qNum]: val,
            }));
            onFocusQuestion(qNum);
          }}
          onSubmitExam={onSubmitExam}
        />
      </div>
    );
  }

  // Nếu là câu Speaking (Part 1, 2, 3) -> Render SpeakingPartView chuẩn SIMPACE
  if (dbType === "SPEAKING_RECORD" || ieltsType.startsWith("SPEAKING")) {
    return (
      <div id={`q-card-${qNum}`}>
        <SpeakingPartView
          part={
            ieltsType === "SPEAKING_PART_1"
              ? "PART_1"
              : ieltsType === "SPEAKING_PART_3"
              ? "PART_3"
              : "PART_2"
          }
          questionText={q.passageText || q.prompt}
          imageUrl={q.imageUrl || null}
          initialAudioUrl={studentAnswers[answerKey] || null}
          onRecordingComplete={(_blob, _dur, uploadedUrl) => {
            if (uploadedUrl) {
              setStudentAnswers((prev) => ({
                ...prev,
                [answerKey]: uploadedUrl,
                [qNum]: uploadedUrl,
              }));
              onFocusQuestion(qNum);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      id={`q-card-${qNum}`}
      className={`p-5 rounded-2xl border transition shadow-2xs ${
        isCurrent
          ? "bg-white border-[#EA580C] ring-2 ring-[#EA580C]/15"
          : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">
            Câu {qNum}
          </span>
          {q.groupTitle && (
            <span className="text-xs font-extrabold text-slate-800">{q.groupTitle}</span>
          )}
          {showPoints && (
            <span className="text-[11px] text-slate-400 font-medium font-mono">
              ({q.points || 1} điểm)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleFlag(qNum)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
            isFlagged
              ? "bg-amber-100 text-amber-800 border border-amber-200"
              : "text-slate-400 hover:text-slate-700 border border-transparent hover:border-slate-200"
          }`}
          title="Đánh dấu câu hỏi để xem lại sau"
        >
          <Flag className={`size-3 ${isFlagged ? "fill-amber-600 text-amber-600" : ""}`} />
          {isFlagged ? "Flagged" : "Flag"}
        </button>
      </div>

      {/* Nếu câu hỏi đơn có đính kèm ảnh minh họa */}
      {q.imageUrl && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2 flex justify-center">
          <img
            src={q.imageUrl}
            alt={`Minh họa câu ${qNum}`}
            className="max-h-64 w-auto object-contain rounded-lg"
          />
        </div>
      )}

      <p className="text-xs sm:text-[13px] font-bold text-slate-900 mb-3.5 leading-relaxed">
        {qNum}. {cleanPromptRedundantNumbers(q.prompt, qNum)}
      </p>

      {q.options && q.options.length > 0 && dbType !== "TRUE_FALSE_NG" && dbType !== "TRUE_FALSE_NOT_GIVEN" ? (
        (() => {
          const isMultiChoice =
            dbType === "MULTIPLE_SELECT" ||
            dbType === "MULTIPLE_CHOICE_MULTI" ||
            Boolean(q.prompt && /choose\s+(?:two|2|three|3)/i.test(q.prompt));
          const rawAns = studentAnswers[answerKey] ?? studentAnswers[qNum];
          const selectedList: string[] = Array.isArray(rawAns)
            ? rawAns
            : rawAns
            ? String(rawAns)
                .split(",")
                .map((s) => s.trim().toUpperCase())
            : [];

          return (
            <div className="space-y-2">
              {isMultiChoice && (
                <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 mb-1.5">
                  <span>Chọn nhiều đáp án đúng (Choose 2–3 answers)</span>
                </div>
              )}
              {q.options.map((opt: any) => {
                const optLabel = (opt.optionLabel || "").trim().toUpperCase();
                const isSelected = isMultiChoice
                  ? selectedList.includes(optLabel)
                  : studentAnswers[answerKey] === optLabel ||
                    studentAnswers[answerKey] === opt.optionLabel ||
                    studentAnswers[qNum] === optLabel;

                return (
                  <label
                    key={opt.id || opt.optionLabel}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? "border-[#EA580C] bg-[#FFF7ED] font-bold text-slate-900 ring-1 ring-[#EA580C]/30"
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
                          } else if (updated.length < 3) {
                            updated.push(optLabel);
                          } else {
                            updated = [updated[1], optLabel];
                          }
                          const joined = updated.join(", ");
                          setStudentAnswers((prev) => ({
                            ...prev,
                            [answerKey]: joined,
                            [qNum]: joined,
                          }));
                        } else {
                          setStudentAnswers((prev) => ({
                            ...prev,
                            [answerKey]: optLabel,
                            [qNum]: optLabel,
                          }));
                        }
                        onFocusQuestion(qNum);
                      }}
                      className="accent-[#EA580C] size-4"
                    />
                    <span className="font-bold text-slate-900">{opt.optionLabel}.</span>
                    <span className="flex-1">{opt.content}</span>
                  </label>
                );
              })}
            </div>
          );
        })()
      ) : dbType === "TRUE_FALSE_NG" ||
        dbType === "TRUE_FALSE_NOT_GIVEN" ||
        ieltsType === "READING_TFNG" ||
        ieltsType === "READING_YNNG" ||
        ieltsType === "READING_YES_NO_NG" ? (
        <div className="grid grid-cols-3 gap-2.5">
          {(() => {
            const isYesNo =
              ieltsType === "READING_YNNG" ||
              ieltsType === "READING_YES_NO_NG" ||
              q.options?.some((o: any) => o.content === "YES") ||
              /YES\s*\/\s*NO|claims of the writer|views of the writer/i.test(q.prompt || "") ||
              /YES\s*\/\s*NO|claims of the writer|views of the writer/i.test(q.passageText || "");
            const vals = isYesNo ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
            const currentAns = studentAnswers[answerKey] ?? studentAnswers[qNum];

            return vals.map((val) => {
              const isSelected = currentAns === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setStudentAnswers((prev) => ({
                      ...prev,
                      [answerKey]: val,
                      [qNum]: val,
                    }));
                    onFocusQuestion(qNum);
                  }}
                  className={`py-2.5 px-3 text-xs font-extrabold rounded-xl border transition ${
                    isSelected
                      ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50/50 hover:border-orange-200"
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
          value={studentAnswers[answerKey] ?? studentAnswers[qNum] ?? ""}
          onChange={(e) => {
            const nextVal = e.target.value;
            setStudentAnswers((prev) => ({
              ...prev,
              [answerKey]: nextVal,
              [qNum]: nextVal,
            }));
            onFocusQuestion(qNum);
          }}
          placeholder="Type your answer..."
          className="w-full h-9.5 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
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
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-3.5 px-6 border-b border-slate-200 shadow-xs">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
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
            className="size-9 rounded-full bg-[#EA580C] hover:bg-[#c2410c] text-white flex items-center justify-center shadow-sm transition shrink-0"
            title={isPlayingAudio ? "Tạm dừng" : "Phát Audio"}
          >
            {isPlayingAudio ? (
              <Pause className="size-4 fill-white" />
            ) : (
              <Play className="size-4 fill-white ml-0.5" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900">
                IELTS Listening Audio
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#EA580C] border border-orange-200">
                Listening Track
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Nghe kỹ băng ghi âm và điền/chọn đáp án bên dưới
            </div>
          </div>
        </div>

        {/* Sóng âm thanh cam SIMPACE + Thời gian */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-0.5 h-7 px-3 bg-[#FFF7ED] border border-orange-200/70 rounded-xl">
            {[8, 14, 22, 16, 10, 20, 24, 13, 18, 22, 12, 16, 20, 10, 8, 15, 21, 12].map(
              (h, idx) => (
                <div
                  key={idx}
                  style={{
                    height: isPlayingAudio
                      ? `${Math.max(4, (h * ((Math.floor(audioCurrentTime) % 3) + 1)) % 22)}px`
                      : `${Math.max(4, Math.floor(h * 0.6))}px`,
                  }}
                  className={`w-0.5 rounded-full transition-all duration-150 ${
                    isPlayingAudio ? "bg-[#EA580C]" : "bg-orange-300"
                  }`}
                />
              )
            )}
          </div>

          <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
            {formatTime(Math.floor(audioCurrentTime))} /{" "}
            {formatTime(Math.floor(audioDuration || 90))}
          </div>

          <Volume2 className="size-4 text-slate-500" />
        </div>
      </div>
    </div>
  );
}
