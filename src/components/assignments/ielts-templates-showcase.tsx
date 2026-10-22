"use client";

import React, { useState } from "react";
import { BookOpen, Headphones, PenTool, Mic, X } from "lucide-react";
import { FormattedPassageView } from "@/components/assignments/formatted-passage-view";
import { MatchingHeadingsView } from "@/components/assignments/matching-headings-view";
import { TableCompletionView } from "@/components/assignments/table-completion-view";
import { FlowchartView } from "@/components/assignments/flowchart-view";
import { SummaryCompletionView } from "@/components/assignments/summary-completion-view";
import { WritingTaskView } from "@/components/assignments/writing-task-view";
import { SpeakingPartView } from "@/components/assignments/speaking-part-view";
import { ListeningMapView } from "@/components/assignments/listening-map-view";
import { ListeningFormView } from "@/components/assignments/listening-form-view";
import {
  SHOWCASE_PASSAGE_SAMPLE,
  SHOWCASE_FLOWCHART_SAMPLE,
  SHOWCASE_HEADINGS_SAMPLE,
  SHOWCASE_TABLE_SAMPLE,
} from "./showcase-sample-data";

interface IeltsTemplatesShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IeltsTemplatesShowcase({ isOpen, onClose }: IeltsTemplatesShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"READING" | "LISTENING" | "WRITING" | "SPEAKING">("READING");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab")?.toUpperCase();
      if (tabParam === "LISTENING" || tabParam === "WRITING" || tabParam === "SPEAKING") {
        setActiveTab(tabParam as any);
      } else if (tabParam === "FLOWCHART") {
        setActiveTab("READING");
        setTimeout(() => {
          const el = document.getElementById("flowchart-section");
          if (el) el.scrollIntoView();
        }, 500);
      }
    }
  }, []);
  const [sampleAnswers, setSampleAnswers] = useState<Record<string | number, string>>({
    18: "MBA",
    19: "backgrounds",
    20: "inspiring",
    21: "first",
    22: "clarity",
    23: "immediate",
    1: "John Smith",
    2: "0912345678",
    11: "A",
    12: "C",
  });
  const [writingContent, setWritingContent] = useState(
    "The bar chart illustrates the volume of international and domestic tourist arrivals between 2010 and 2020..."
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-6xl h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        {/* Header Poster SIMPACE */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[#EA580C] flex items-center justify-center font-black text-white text-base shadow-sm">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight uppercase text-white">
                  KHUÔN MẪU HIỂN THỊ GIAO DIỆN IELTS
                </h3>
                <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
                  UI Design System & Templates
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-[#EA580C]" /> Cam đất #EA580C
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-slate-900 border border-slate-700" /> Slate-900
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" /> Chuẩn Cambridge
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 4 Tabs Kỹ năng */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between overflow-x-auto shrink-0 py-2">
          <div className="flex items-center gap-2">
            {[
              { id: "READING", label: "1. READING (Bài đọc)", icon: BookOpen, count: "Form 1.1 - 1.7" },
              { id: "LISTENING", label: "2. LISTENING (Bài nghe)", icon: Headphones, count: "Form 2.1 - 2.3" },
              { id: "WRITING", label: "3. WRITING (Bài viết)", icon: PenTool, count: "Form 3.1 - 3.2" },
              { id: "SPEAKING", label: "4. SPEAKING (Bài nói)", icon: Mic, count: "Form 4.1 - 4.2" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    isActive ? "bg-[#EA580C] text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500 hidden lg:inline font-medium italic">
            Nghiệm thu trực tiếp từng khuôn mẫu
          </span>
        </div>

        {/* Nội dung Showcase cuộn độc lập */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === "READING" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <FormattedPassageView text={SHOWCASE_PASSAGE_SAMPLE} />
              </div>

              <MatchingHeadingsView
                group={SHOWCASE_HEADINGS_SAMPLE}
                answers={sampleAnswers}
                onAnswerChange={(qNum: number, val: string) => setSampleAnswers({ ...sampleAnswers, [qNum]: val })}
              />

              <TableCompletionView
                table={SHOWCASE_TABLE_SAMPLE}
                answers={sampleAnswers}
                onAnswerChange={(qNum: number, val: string) => setSampleAnswers({ ...sampleAnswers, [qNum]: val })}
              />

              <div id="flowchart-section">
                <FlowchartView
                  flowchart={SHOWCASE_FLOWCHART_SAMPLE}
                  answers={sampleAnswers}
                  onAnswerChange={(qNum: number, val: string) => setSampleAnswers({ ...sampleAnswers, [qNum]: val })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider">
                    1.5 True / False / Not Given
                  </span>
                  <p className="text-xs font-semibold text-slate-800">
                    The use of technology in education has completely replaced traditional teaching methods.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {["TRUE", "FALSE", "NOT GIVEN"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSampleAnswers({ ...sampleAnswers, tf_demo: val })}
                        className={`py-2 text-xs font-bold rounded-xl border transition ${
                          sampleAnswers.tf_demo === val
                            ? "bg-[#EA580C] text-white border-[#EA580C] shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <SummaryCompletionView
                  group={{
                    id: "sm-showcase",
                    title: "1.6 Summary Completion",
                    instruction: "Complete the summary below. Choose ONE WORD ONLY from the passage.",
                    summaryText: "Many researchers believe that (1) _______ is the main factor influencing (2) _______ in humans. Additionally, (3) _______ can have a positive impact on (4) _______.",
                    questionNumbers: [1, 2, 3, 4],
                  }}
                  answers={sampleAnswers}
                  onAnswerChange={(qNum, val) => setSampleAnswers({ ...sampleAnswers, [qNum]: val })}
                />
              </div>
            </div>
          )}

          {activeTab === "LISTENING" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <ListeningFormView
                formTitle="Hotel Reservation Form"
                instruction="Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer."
                fields={[
                  { questionNumber: 1, label: "Name" },
                  { questionNumber: 2, label: "Phone number" },
                  { questionNumber: 3, label: "Arrival date" },
                  { questionNumber: 4, label: "Room type" },
                  { questionNumber: 5, label: "Special request" },
                ]}
                answers={sampleAnswers}
                onAnswerChange={(qNum, val) => setSampleAnswers({ ...sampleAnswers, [qNum]: val })}
              />

              <ListeningMapView
                mapTitle="2.3 Map / Plan / Diagram Labeling"
                questions={[
                  { questionNumber: 11, placeName: "Cafe" },
                  { questionNumber: 12, placeName: "Library" },
                  { questionNumber: 13, placeName: "Restrooms" },
                  { questionNumber: 14, placeName: "Gym" },
                  { questionNumber: 15, placeName: "Administration" },
                ]}
                answers={sampleAnswers}
                onSelectAnswer={(qNum, val) => setSampleAnswers({ ...sampleAnswers, [qNum]: val })}
              />
            </div>
          )}

          {activeTab === "WRITING" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <WritingTaskView
                taskType="TASK_1"
                prompt="The graph below shows the number of tourists visiting a country from 2010 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
                value={writingContent}
                onChange={setWritingContent}
                minWords={150}
                timeLimitMinutes={20}
              />
            </div>
          )}

          {activeTab === "SPEAKING" && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <SpeakingPartView
                part="PART_1"
                questionText="Do you live in a house or an apartment? Why do you prefer it?"
              />
              <SpeakingPartView
                part="PART_2"
                questionText="Describe a person who inspired you."
                cueCardBulletPoints={[
                  "Who the person is",
                  "When you met them",
                  "Why they inspired you",
                  "And explain how they have influenced you",
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
