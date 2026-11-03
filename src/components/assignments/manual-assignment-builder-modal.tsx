"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Eye,
  Headphones,
  Layers,
  Loader2,
  Mic,
  Music,
  PenTool,
  ShieldCheck,
  Trash2,
  Upload,
  Volume2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getIeltsSubtypesBySkill } from "@/lib/ielts-report-config";
import { QuestionImageUploader } from "@/components/assignments/question-image-uploader";
import { getQuestionTemplatePreset } from "@/lib/exam-parser/question-media-detector";
import {
  groupQuestionsIntoSimpaceClusters,
  SimpaceQuestionClusterRenderer,
} from "@/components/assignments/ielts-question-renderer";
import { IeltsExamPlayer } from "@/components/assignments/ielts-exam-player";
import {
  AssignmentConfigFields,
} from "@/components/assignments/assignment-config-fields";
import { AnswerVisibilityMode } from "@/lib/assignment-config";
import { Settings } from "lucide-react";

export const IELTS_QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm 1 đáp án (A, B, C, D)" },
  { value: "MULTIPLE_CHOICE_MULTI", label: "Trắc nghiệm nhiều đáp án (Chọn 2-3 đáp án)" },
  { value: "TRUE_FALSE_NG", label: "True / False / Not Given" },
  { value: "FILL_IN_BLANK", label: "Điền từ vào chỗ trống (Fill in the Blank)" },
  { value: "MATCHING", label: "Nối thông tin / Tiêu đề (Matching Headings)" },
  { value: "ESSAY", label: "Tự luận Viết (Writing Task 1 & 2)" },
  { value: "SPEAKING_RECORD", label: "Ghi âm Nói (Speaking Part 1, 2, 3)" },
];

export function inferDbQuestionTypeFromIeltsSubtype(
  ieltsCode: string,
  currentDbType?: string
): string {
  const code = (ieltsCode || "").toUpperCase();
  if (code.startsWith("WRITING_")) return "ESSAY";
  if (code.startsWith("SPEAKING_")) return "SPEAKING_RECORD";
  if (code === "READING_TFNG" || code === "READING_YES_NO_NG") return "TRUE_FALSE_NG";
  if (
    code === "READING_MATCHING_HEADINGS" ||
    code === "READING_MATCHING_INFO" ||
    code === "READING_MATCHING_FEATURES" ||
    code === "READING_MATCHING_ENDINGS" ||
    code === "LISTENING_MATCHING"
  ) {
    return "MATCHING";
  }
  if (code === "READING_MCQ_SINGLE" || code === "LISTENING_MCQ_SINGLE") {
    return "MULTIPLE_CHOICE";
  }
  if (code === "READING_MCQ_MULTIPLE" || code === "LISTENING_MCQ_MULTIPLE") {
    return "MULTIPLE_CHOICE_MULTI";
  }
  if (code === "LISTENING_MAP_PLAN") {
    return currentDbType === "FILL_IN_BLANK" ? "FILL_IN_BLANK" : "MULTIPLE_CHOICE";
  }
  if (
    code.includes("COMPLETION") ||
    code.includes("SHORT_ANSWER") ||
    code.includes("DIAGRAM") ||
    code.includes("FORM_NOTE_TABLE") ||
    code.includes("NOTE_TABLE_FORM")
  ) {
    return "FILL_IN_BLANK";
  }
  return currentDbType || "MULTIPLE_CHOICE";
}

export function buildDefaultQuestionsForSkill(
  skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS"
): any[] {
  if (skill === "WRITING") {
    return [
      {
        questionNumber: 1,
        type: "ESSAY",
        ieltsQuestionType: "WRITING_TASK_1",
        groupTitle: "Writing Task 1: Academic Report (20 phút • Tối thiểu 150 từ)",
        passageText:
          "The chart below shows the percentage of people using different modes of transport in a city between 2010 and 2020.\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.",
        prompt: "Write at least 150 words analysing the chart/diagram.",
        points: 9.0,
        correctAnswer: "",
        explanation: "",
        options: [],
      },
      {
        questionNumber: 2,
        type: "ESSAY",
        ieltsQuestionType: "WRITING_TASK_2",
        groupTitle: "Writing Task 2: Academic Essay (40 phút • Tối thiểu 250 từ)",
        passageText:
          "Some people believe that technology has made learning easier and more accessible, while others think it distracts students from deep thinking.\nDiscuss both views and give your own opinion.",
        prompt: "Write at least 250 words giving reasons and relevant examples.",
        points: 9.0,
        correctAnswer: "",
        explanation: "",
        options: [],
      },
    ];
  }

  if (skill === "SPEAKING") {
    return [
      {
        questionNumber: 1,
        type: "SPEAKING_RECORD",
        ieltsQuestionType: "SPEAKING_PART_2",
        groupTitle: "Speaking Part 2: Cue Card (1 phút chuẩn bị • 2 phút nói)",
        passageText:
          "Describe a place you would like to visit in the future.\nYou should say:\n• Where it is located\n• What you can do there\n• Who you would like to go with\nand explain why you would like to visit this place.",
        prompt: "Read the Cue Card above. You have 1 minute to prepare and up to 2 minutes to speak.",
        points: 9.0,
        correctAnswer: "",
        explanation: "",
        options: [],
      },
    ];
  }

  if (skill === "LISTENING") {
    return [
      {
        questionNumber: 1,
        type: "FILL_IN_BLANK",
        ieltsQuestionType: "LISTENING_FORM_NOTE_TABLE",
        groupTitle: "BOOKING FORM",
        passageText:
          "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
        prompt: "Customer Name: ________",
        points: 1.0,
        correctAnswer: "Sarah Jenkins",
        explanation: "",
        options: [],
      },
    ];
  }

  return [
    {
      questionNumber: 1,
      type: "MULTIPLE_CHOICE",
      ieltsQuestionType: "READING_MCQ_SINGLE",
      groupTitle: "Questions 1–5: Multiple Choice",
      passageText:
        "Paragraph A: Architecture has always been an accurate reflection of cultural values and technological capabilities. Throughout history, civilizations have used monumental structures not merely for shelter, but to communicate power and artistic vision.\n\nParagraph B: In the early twentieth century, modernist pioneers championed the principle that 'form follows function', stripping away neoclassical ornamentation in favor of steel, glass, and reinforced concrete.",
      prompt: "What is considered an accurate reflection of cultural values in human history?",
      points: 1.0,
      correctAnswer: "B",
      explanation: "",
      options: [
        { optionLabel: "A", content: "Contemporary megacities", isCorrect: false },
        { optionLabel: "B", content: "Architecture and built environment", isCorrect: true },
        { optionLabel: "C", content: "Ancient neoclassical ornamentation", isCorrect: false },
        { optionLabel: "D", content: "Industrial plate glass manufacturing", isCorrect: false },
      ],
    },
  ];
}

export interface ManualAssignmentBuilderModalProps {
  open: boolean;
  onClose: () => void;
  isPending: boolean;
  manualTitle: string;
  setManualTitle: (v: string) => void;
  manualSkill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS";
  setManualSkill: (v: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS") => void;
  manualDuration: number;
  setManualDuration: (v: number) => void;
  manualDueDate?: string;
  setManualDueDate?: (v: string) => void;
  manualStartDate?: string;
  setManualStartDate?: (v: string) => void;
  manualMaxAttempts?: number;
  setManualMaxAttempts?: (v: number) => void;
  manualAnswerVisibility?: AnswerVisibilityMode;
  setManualAnswerVisibility?: (v: AnswerVisibilityMode) => void;
  manualAnswerVisibleAt?: string;
  setManualAnswerVisibleAt?: (v: string) => void;
  manualAudioSourceType: "file" | "url";
  setManualAudioSourceType: (v: "file" | "url") => void;
  manualAudioUrl: string;
  setManualAudioUrl: (v: string) => void;
  manualAudioFileName: string;
  manualAudioFileSize: string;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  manualQuestions: any[];
  setManualQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  onAddQuestion: (type?: string) => void;
  onDuplicateQuestion: (idx: number) => void;
  onDeleteQuestion: (idx: number) => void;
  onSave: () => void;
}

export function ManualAssignmentBuilderModal({
  open,
  onClose,
  isPending,
  manualTitle,
  setManualTitle,
  manualSkill,
  setManualSkill,
  manualDuration,
  setManualDuration,
  manualDueDate,
  setManualDueDate,
  manualStartDate,
  setManualStartDate,
  manualMaxAttempts = 1,
  setManualMaxAttempts,
  manualAnswerVisibility = "AFTER_SUBMIT",
  setManualAnswerVisibility,
  manualAnswerVisibleAt = "",
  setManualAnswerVisibleAt,
  manualAudioSourceType,
  setManualAudioSourceType,
  manualAudioUrl,
  setManualAudioUrl,
  manualAudioFileName,
  manualAudioFileSize,
  onAudioUpload,
  manualQuestions,
  setManualQuestions,
  onDuplicateQuestion,
  onDeleteQuestion,
  onSave,
}: ManualAssignmentBuilderModalProps) {
  const [localDueDate, setLocalDueDate] = useState("");
  const [localStartDate, setLocalStartDate] = useState("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [viewAllQuestions, setViewAllQuestions] = useState<boolean>(false);
  const [sharedReadingPassage, setSharedReadingPassage] = useState<string>(
    manualQuestions[0]?.passageText || ""
  );
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState<boolean>(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  const effectiveDueDate = manualDueDate !== undefined ? manualDueDate : localDueDate;
  const handleDueDateChange = (val: string) => {
    if (setManualDueDate) setManualDueDate(val);
    else setLocalDueDate(val);
  };

  const effectiveStartDate = manualStartDate !== undefined ? manualStartDate : localStartDate;
  const handleStartDateChange = (val: string) => {
    if (setManualStartDate) setManualStartDate(val);
    else setLocalStartDate(val);
  };

  const subtypeOptions = getIeltsSubtypesBySkill(manualSkill);

  useEffect(() => {
    if (activeQuestionIdx >= manualQuestions.length && manualQuestions.length > 0) {
      setActiveQuestionIdx(manualQuestions.length - 1);
    }
  }, [manualQuestions.length, activeQuestionIdx]);

  const handleSelectSkill = (
    nextSkill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS"
  ) => {
    setManualSkill(nextSkill);
    if (nextSkill === "READING") setManualDuration(60);
    else if (nextSkill === "LISTENING") setManualDuration(30);
    else if (nextSkill === "WRITING") setManualDuration(60);
    else if (nextSkill === "SPEAKING") setManualDuration(15);

    const defaults = buildDefaultQuestionsForSkill(nextSkill);
    setManualQuestions(defaults);
    setActiveQuestionIdx(0);
    if (nextSkill === "READING" && defaults[0]?.passageText) {
      setSharedReadingPassage(defaults[0].passageText);
    }
  };

  const handleQuickAddBySubtype = (ieltsCode: string) => {
    const nextNum = manualQuestions.length + 1;
    const dbType = inferDbQuestionTypeFromIeltsSubtype(ieltsCode);
    const preset = getQuestionTemplatePreset(ieltsCode, nextNum);
    const isSubj = dbType === "ESSAY" || dbType === "SPEAKING_RECORD";

    let initialOptions: any[] = preset?.options || [];
    let initialCorrect = preset?.correctAnswer ?? "";

    if (initialOptions.length === 0) {
      if (dbType === "MULTIPLE_CHOICE") {
        initialOptions = [
          { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
          { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
          { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
          { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
        ];
        initialCorrect = "A";
      } else if (dbType === "MULTIPLE_CHOICE_MULTI") {
        initialOptions = [
          { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
          { optionLabel: "B", content: "Lựa chọn B", isCorrect: true },
          { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
          { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
          { optionLabel: "E", content: "Lựa chọn E", isCorrect: false },
        ];
        initialCorrect = "A, B";
      } else if (dbType === "TRUE_FALSE_NG") {
        const isYesNo = ieltsCode === "READING_YES_NO_NG";
        initialCorrect = isYesNo ? "YES" : "TRUE";
      } else if (dbType === "MATCHING") {
        initialOptions = [
          { optionLabel: "i", content: "Tiêu đề / Thông tin i", isCorrect: true },
          { optionLabel: "ii", content: "Tiêu đề / Thông tin ii", isCorrect: false },
          { optionLabel: "iii", content: "Tiêu đề / Thông tin iii", isCorrect: false },
        ];
        initialCorrect = "i";
      }
    }

    const newQuestion = {
      questionNumber: nextNum,
      type: preset?.type || dbType,
      ieltsQuestionType: ieltsCode,
      groupTitle: preset?.groupTitle || "",
      passageText:
        preset?.passageText ||
        (manualSkill === "READING" ? sharedReadingPassage : ""),
      prompt: preset?.prompt || `Nội dung câu hỏi số ${nextNum}`,
      points: isSubj ? 9.0 : 1.0,
      correctAnswer: initialCorrect,
      explanation: "",
      options: initialOptions,
    };

    setManualQuestions((prev) => [...prev, newQuestion]);
    setActiveQuestionIdx(manualQuestions.length);
  };

  const handleChangeQuestionSubtype = (qIdx: number, newIeltsCode: string) => {
    setManualQuestions((prev) =>
      prev.map((item, idx) => {
        if (idx !== qIdx) return item;
        const nextDbType = inferDbQuestionTypeFromIeltsSubtype(newIeltsCode, item.type);
        const isSubj = nextDbType === "ESSAY" || nextDbType === "SPEAKING_RECORD";
        const preset = getQuestionTemplatePreset(newIeltsCode, idx + 1);

        let nextOptions = item.options || [];
        let nextCorrect = item.correctAnswer || "";

        if (nextDbType === "MULTIPLE_CHOICE" && nextOptions.length === 0) {
          nextOptions = [
            { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
            { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
            { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
            { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
          ];
          nextCorrect = "A";
        } else if (nextDbType === "MATCHING" && nextOptions.length === 0) {
          nextOptions = [
            { optionLabel: "i", content: "", isCorrect: true },
            { optionLabel: "ii", content: "", isCorrect: false },
            { optionLabel: "iii", content: "", isCorrect: false },
          ];
          nextCorrect = "i";
        } else if (nextDbType === "TRUE_FALSE_NG") {
          const isYesNo = newIeltsCode === "READING_YES_NO_NG";
          if (!["TRUE", "FALSE", "NOT GIVEN", "YES", "NO"].includes(nextCorrect)) {
            nextCorrect = isYesNo ? "YES" : "TRUE";
          }
        }

        return {
          ...item,
          type: preset?.type || nextDbType,
          ieltsQuestionType: newIeltsCode,
          groupTitle: preset?.groupTitle || item.groupTitle || "",
          passageText: preset?.passageText || item.passageText || "",
          prompt: preset?.prompt || item.prompt,
          points: isSubj ? 9.0 : 1.0,
          options: preset?.options || nextOptions,
          correctAnswer: preset?.correctAnswer !== undefined ? preset.correctAnswer : nextCorrect,
        };
      })
    );
  };

  const handleSyncSharedPassage = (val: string) => {
    setSharedReadingPassage(val);
    setManualQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        passageText: val,
      }))
    );
  };

  const questionsToRender = viewAllQuestions
    ? manualQuestions.map((q, idx) => ({ q, idx }))
    : manualQuestions[activeQuestionIdx]
    ? [{ q: manualQuestions[activeQuestionIdx], idx: activeQuestionIdx }]
    : [];

  const activeQuestionObj = manualQuestions[activeQuestionIdx] || manualQuestions[0];

  return (
    <>
      <Dialog open={open && !isFullPreviewOpen} onOpenChange={onClose}>
        <DialogContent className="!w-[96vw] !max-w-[1420px] h-[92vh] p-0 flex flex-col overflow-hidden rounded-2xl border-slate-200 gap-0">
          {/* 1. HEADER CỐ ĐỊNH TRÊN CÙNG (STICKY STUDIO HEADER) */}
          <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 className="size-5 text-[#EA580C]" />
                  <span>Studio Soạn & Giao Bài Tập IELTS</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Không gian soạn đề 2 cột trực quan • Tự động chuẩn hóa giao diện làm bài SIMPACE theo từng kỹ năng.
                </DialogDescription>
              </div>

              {/* 4 Tab Kỹ năng trực quan ngay trên Header */}
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[
                  { id: "READING", label: "Reading (Đọc)", icon: BookOpen },
                  { id: "LISTENING", label: "Listening (Nghe)", icon: Headphones },
                  { id: "WRITING", label: "Writing (Viết)", icon: PenTool },
                  { id: "SPEAKING", label: "Speaking (Nói)", icon: Mic },
                ].map((sk) => {
                  const Icon = sk.icon;
                  const active = manualSkill === sk.id;
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => handleSelectSkill(sk.id as any)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        active
                          ? "bg-[#EA580C] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      <span>{sk.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thanh nhập nhanh Tên bài tập + Thời gian + Hạn nộp + Mở lịch */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1">
              <div className="sm:col-span-5 flex items-center gap-2">
                <Label className="text-xs font-bold text-slate-700 shrink-0">
                  Tên bài tập <span className="text-rose-500">*</span>:
                </Label>
                <Input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder={
                    manualSkill === "SPEAKING"
                      ? "VD: IELTS Speaking Part 2 - Cue Card Travel"
                      : manualSkill === "WRITING"
                      ? "VD: IELTS Writing Task 1 & Task 2 Practice"
                      : "VD: Cambridge IELTS 18 - Reading Test 1"
                  }
                  className="h-8.5 text-xs rounded-xl bg-slate-50/70 focus:bg-white flex-1"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-1.5">
                <Clock className="size-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-600 shrink-0">Phút:</span>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={manualDuration}
                  onChange={(e) => setManualDuration(Number(e.target.value))}
                  className="h-8.5 text-xs rounded-xl bg-slate-50/70 font-bold w-20 text-center"
                />
              </div>

              <div className="sm:col-span-3 flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[#EA580C] shrink-0" />
                <span className="text-xs font-semibold text-slate-600 shrink-0">Hạn nộp:</span>
                <Input
                  type="datetime-local"
                  value={effectiveDueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="h-8.5 text-xs rounded-xl bg-slate-50/70 border-orange-200 flex-1"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsConfigDialogOpen(true)}
                  title="Cài đặt số lần làm bài & chế độ đáp án"
                  className="h-8.5 px-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Settings className="size-3.5 text-[#EA580C]" />
                  <span>Cài đặt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullPreviewOpen(true)}
                  className="h-8.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition"
                >
                  <Eye className="size-3.5 text-amber-400" />
                  <span>Xem thử</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. KHÔNG GIAN CHÍNH CHIA 2 CỘT SONG SONG (MỖI CỘT CUỘN ĐỘC LẬP) */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50/60 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* CỘT TRÁI (5/12): BÀI ĐỌC READING / FILE AUDIO LISTENING / XEM TRƯỚC TRỰC TIẾP THẺ SIMPACE */}
            <div className="lg:col-span-5 h-full overflow-y-auto p-5 bg-white flex flex-col gap-4">
              {manualSkill === "READING" && (
                <div className="flex-1 flex flex-col space-y-2 min-h-[360px]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="size-4 text-[#EA580C]" />
                      <span>Cột 1: Nội dung Bài đọc (Reading Passage)</span>
                    </Label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Áp dụng chung cho các câu hỏi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dán văn bản bài đọc vào đây. Bạn có thể vừa nhìn bài đọc ở cột trái, vừa soạn câu hỏi ở cột phải mà không cần cuộn trang.
                  </p>
                  <textarea
                    value={sharedReadingPassage || manualQuestions[0]?.passageText || ""}
                    onChange={(e) => handleSyncSharedPassage(e.target.value)}
                    placeholder="Dán toàn bộ văn bản bài đọc IELTS Reading (Paragraph A, B, C...) vào đây..."
                    className="w-full flex-1 min-h-[300px] p-3.5 text-xs bg-slate-50/60 focus:bg-white border border-slate-200 rounded-2xl resize-none font-serif text-slate-800 leading-relaxed focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>
              )}

              {(manualSkill === "LISTENING" || manualSkill === "ALL_SKILLS") && (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950">
                      <Music className="size-4 text-blue-600" />
                      <span>
                        Cột 1: Tệp âm thanh bài Nghe (Audio) <span className="text-rose-600">*</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] bg-white p-0.5 rounded-lg border border-blue-200">
                      <button
                        type="button"
                        onClick={() => setManualAudioSourceType("file")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          manualAudioSourceType === "file"
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Tải file từ máy
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualAudioSourceType("url")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          manualAudioSourceType === "url"
                            ? "bg-blue-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Dán link Audio
                      </button>
                    </div>
                  </div>

                  {manualAudioSourceType === "file" ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-dashed border-blue-300">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Upload className="size-5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {manualAudioFileName || "Chọn tệp âm thanh (.mp3, .wav, .m4a)"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {manualAudioFileSize
                              ? `Dung lượng: ${manualAudioFileSize}`
                              : "Tệp âm thanh sẽ lưu lên máy chủ và phát ở đầu đề thi"}
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a"
                        id="manual-audio-input"
                        className="hidden"
                        onChange={onAudioUpload}
                      />
                      <label
                        htmlFor="manual-audio-input"
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer shrink-0 transition"
                      >
                        {manualAudioUrl ? "Đổi tệp Audio" : "Chọn tệp Audio..."}
                      </label>
                    </div>
                  ) : (
                    <Input
                      value={manualAudioUrl}
                      onChange={(e) => setManualAudioUrl(e.target.value)}
                      placeholder="Dán đường dẫn tệp âm thanh (VD: https://.../audio.mp3)"
                      className="h-9 text-xs rounded-xl bg-white border-blue-200"
                    />
                  )}

                  {manualAudioUrl && (
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-blue-200">
                      <Volume2 className="size-4 text-blue-600 shrink-0" />
                      <audio controls className="w-full h-8" src={manualAudioUrl} />
                    </div>
                  )}
                </div>
              )}

              {/* KHUNG XEM TRƯỚC TRỰC TIẾP (LIVE STUDENT CARD PREVIEW) NGAY TRONG CỘT TRÁI */}
              {activeQuestionObj && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Eye className="size-3.5 text-[#EA580C]" />
                      <span>
                        Xem trước trực tiếp:{" "}
                        {manualSkill === "WRITING"
                          ? `Task ${activeQuestionIdx + 1}`
                          : manualSkill === "SPEAKING"
                          ? `Phần ${activeQuestionIdx + 1}`
                          : `Câu ${activeQuestionIdx + 1}`}
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      Giao diện Học viên sẽ thấy
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 max-h-[420px] overflow-y-auto">
                    <SimpaceQuestionClusterRenderer
                      clusters={groupQuestionsIntoSimpaceClusters([
                        { ...activeQuestionObj, questionNumber: activeQuestionIdx + 1 },
                      ])}
                      skill={manualSkill}
                      flaggedQuestions={new Set()}
                      activeQuestionNumber={activeQuestionIdx + 1}
                      showPoints={true}
                      studentAnswers={previewAnswers}
                      setStudentAnswers={setPreviewAnswers}
                      onToggleFlag={() => {}}
                      onFocusQuestion={() => {}}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CỘT PHẢI (7/12): DANH SÁCH & KHUNG SOẠN THẢO CÂU HỎI RỘNG RÃI */}
            <div className="lg:col-span-7 h-full overflow-y-auto p-5 space-y-4">
              {/* Thanh công cụ Thêm nhanh câu hỏi + Chọn câu hỏi ghim cố định ở đầu Cột Phải */}
              <div className="sticky top-0 z-10 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    Cột 2: Soạn thảo câu hỏi ({manualQuestions.length}{" "}
                    {manualSkill === "WRITING"
                      ? "Task"
                      : manualSkill === "SPEAKING"
                      ? "Phần nói"
                      : "câu"}
                    )
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {manualSkill === "READING" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("READING_MCQ_SINGLE")}
                          className="h-7 text-[11px] rounded-lg border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold"
                        >
                          + Trắc nghiệm
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("READING_TFNG")}
                          className="h-7 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          + True/False/NG
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("READING_MATCHING_HEADINGS")}
                          className="h-7 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          + Matching Headings
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("READING_SUMMARY_COMPLETION")}
                          className="h-7 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          + Điền từ / Bảng / Sơ đồ
                        </Button>
                      </>
                    )}

                    {manualSkill === "LISTENING" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("LISTENING_FORM_NOTE_TABLE")}
                          className="h-7 text-[11px] rounded-lg border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold"
                        >
                          + Điền Form / Bảng / Note
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("LISTENING_MAP_PLAN")}
                          className="h-7 text-[11px] rounded-lg border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 font-semibold"
                        >
                          + Bản đồ (Map Labelling)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("LISTENING_MCQ_SINGLE")}
                          className="h-7 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          + Trắc nghiệm
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("LISTENING_MATCHING")}
                          className="h-7 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          + Nối thông tin
                        </Button>
                      </>
                    )}

                    {manualSkill === "WRITING" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("WRITING_TASK_1")}
                          className="h-7 text-[11px] rounded-lg border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold"
                        >
                          + Thêm Task 1 (Biểu đồ / Bản đồ)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("WRITING_TASK_2")}
                          className="h-7 text-[11px] rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold"
                        >
                          + Thêm Task 2 (Bài luận Essay)
                        </Button>
                      </>
                    )}

                    {manualSkill === "SPEAKING" && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("SPEAKING_PART_1")}
                          className="h-7 text-[11px] rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          + Thêm Part 1 (Phỏng vấn)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("SPEAKING_PART_2")}
                          className="h-7 text-[11px] rounded-lg border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold"
                        >
                          + Thêm Part 2 (Cue Card)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAddBySubtype("SPEAKING_PART_3")}
                          className="h-7 text-[11px] rounded-lg border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold"
                        >
                          + Thêm Part 3 (Thảo luận)
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Dải nút chọn câu hỏi nhanh */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {manualQuestions.map((_, idx) => {
                      const isActive = !viewAllQuestions && activeQuestionIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setViewAllQuestions(false);
                            setActiveQuestionIdx(idx);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            isActive
                              ? "bg-[#EA580C] text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-orange-50"
                          }`}
                        >
                          {manualSkill === "WRITING"
                            ? `Task ${idx + 1}`
                            : manualSkill === "SPEAKING"
                            ? `Phần ${idx + 1}`
                            : `Câu ${idx + 1}`}
                        </button>
                      );
                    })}
                  </div>

                  {manualQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setViewAllQuestions(!viewAllQuestions)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:text-slate-900 shrink-0 flex items-center gap-1"
                    >
                      <Layers className="size-3" />
                      <span>{viewAllQuestions ? "Xem từng câu" : "Mở tất cả câu"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* THẺ SOẠN THẢO CHI TIẾT CÂU HỎI */}
              <div className="space-y-4">
                {questionsToRender.map(({ q, idx: qIdx }) => {
                  const isSubjective =
                    q.type === "ESSAY" ||
                    q.type === "SPEAKING_RECORD" ||
                    manualSkill === "WRITING" ||
                    manualSkill === "SPEAKING";
                  const currentSubtype =
                    q.ieltsQuestionType || subtypeOptions[0]?.code || "";
                  const isYesNoSubtype = currentSubtype === "READING_YES_NO_NG";

                  return (
                    <div
                      key={qIdx}
                      onClick={() => setActiveQuestionIdx(qIdx)}
                      className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <span className="px-2.5 py-1 rounded-lg bg-[#EA580C] text-white text-xs font-extrabold shrink-0">
                            {manualSkill === "WRITING"
                              ? `Task ${qIdx + 1}`
                              : manualSkill === "SPEAKING"
                              ? `Phần ${qIdx + 1}`
                              : `Câu ${qIdx + 1}`}
                          </span>

                          <select
                            value={currentSubtype}
                            onChange={(e) => handleChangeQuestionSubtype(qIdx, e.target.value)}
                            className="h-8.5 text-xs rounded-xl border border-orange-200 bg-orange-50/50 font-bold text-slate-800 px-3 flex-1 min-w-[220px] max-w-md focus:ring-2 focus:ring-orange-200 outline-none"
                          >
                            {subtypeOptions.map((sub) => (
                              <option key={sub.code} value={sub.code}>
                                {sub.viLabel}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const preset = getQuestionTemplatePreset(currentSubtype, qIdx + 1);
                              if (!preset) return;
                              setManualQuestions((prev) =>
                                prev.map((item, idx) =>
                                  idx === qIdx
                                    ? {
                                        ...item,
                                        ...preset,
                                        ieltsQuestionType: currentSubtype,
                                      }
                                    : item
                                )
                              );
                            }}
                            className="h-8.5 px-3 text-[11px] font-bold text-[#EA580C] bg-white hover:bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-1 transition shrink-0"
                            title="Tự động điền nội dung mẫu chuẩn của dạng bài này"
                          >
                            <Wand2 className="size-3.5" /> Điền đề mẫu
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                            <span>Điểm:</span>
                            <span className="font-bold text-slate-900">
                              {isSubjective ? "9.0 Band" : `${q.points || 1}đ`}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDuplicateQuestion(qIdx)}
                            className="size-8 grid place-items-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                            title="Nhân bản câu hỏi này"
                          >
                            <Copy className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteQuestion(qIdx)}
                            className="size-8 grid place-items-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Khung Đính kèm Ảnh minh họa (Tự động bật Đỏ nếu là Map / Diagram / Task 1 Chart) */}
                      <QuestionImageUploader
                        question={{ ...q, questionNumber: qIdx + 1 }}
                        assignmentSkill={manualSkill}
                        totalQuestions={manualQuestions.length}
                        onImageChange={(url) => {
                          setManualQuestions((prev) =>
                            prev.map((item, idx) =>
                              idx === qIdx ? { ...item, imageUrl: url } : item
                            )
                          );
                        }}
                        onApplyToRange={(startNum, endNum, url) => {
                          setManualQuestions((prev) =>
                            prev.map((item, idx) => {
                              const num = idx + 1;
                              return num >= startNum && num <= endNum
                                ? { ...item, imageUrl: url }
                                : item;
                            })
                          );
                        }}
                      />

                      {isSubjective ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-700">
                              {manualSkill === "SPEAKING"
                                ? "Nội dung Thẻ chủ đề (Cue Card / Các ý gợi ý You should say...)"
                                : "Nội dung Đề bài Writing (Hiển thị cột bên trái cho học viên)"}
                            </Label>
                            <textarea
                              value={q.passageText || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setManualQuestions((prev) =>
                                  prev.map((item, idx) =>
                                    idx === qIdx ? { ...item, passageText: val } : item
                                  )
                                );
                              }}
                              placeholder={
                                manualSkill === "SPEAKING"
                                  ? "VD:\nDescribe a place you would like to visit.\nYou should say:\n• Where it is\n• What you can do there\n• And explain why you would like to visit it."
                                  : "VD: The chart below shows the percentage of people using different modes of transport in a city in 2010 and 2020..."
                              }
                              className="w-full h-32 p-3 text-xs bg-slate-50/70 border border-slate-200 rounded-xl resize-y text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">
                              Yêu cầu / Hướng dẫn làm bài ngắn gọn
                            </Label>
                            <Input
                              value={q.prompt || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setManualQuestions((prev) =>
                                  prev.map((item, idx) =>
                                    idx === qIdx ? { ...item, prompt: val } : item
                                  )
                                );
                              }}
                              placeholder={
                                manualSkill === "SPEAKING"
                                  ? "VD: Chuẩn bị trong 1 phút và thu âm bài nói dài tối đa 2 phút."
                                  : "VD: Write at least 150 words."
                              }
                              className="h-9 text-xs bg-white"
                            />
                          </div>

                          <div className="p-3 bg-orange-50/60 border border-orange-200/80 rounded-xl text-[11px] text-slate-700 flex items-center gap-2">
                            <CheckCircle2 className="size-4 text-[#EA580C] shrink-0" />
                            <span>
                              Bài làm của học viên sẽ được Giáo viên chấm trực tiếp trên <b>4 tiêu chí IELTS</b> (Tự động tính Band trung bình làm tròn 0.5).
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-8 space-y-1">
                              <Label className="text-xs font-bold text-slate-700">
                                Câu hỏi / Vị trí cần điền đáp án
                              </Label>
                              <Input
                                value={q.prompt || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualQuestions((prev) =>
                                    prev.map((item, idx) =>
                                      idx === qIdx ? { ...item, prompt: val } : item
                                    )
                                  );
                                }}
                                placeholder="Nhập câu hỏi hoặc nhãn vị trí (VD: 1. Main Library / Paragraph A)..."
                                className="h-9 text-xs bg-white"
                              />
                            </div>

                            <div className="sm:col-span-4 space-y-1">
                              <Label className="text-xs font-semibold text-slate-600">
                                Tiêu đề nhóm câu (Tùy chọn)
                              </Label>
                              <Input
                                value={q.groupTitle || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualQuestions((prev) =>
                                    prev.map((item, idx) =>
                                      idx === qIdx ? { ...item, groupTitle: val } : item
                                    )
                                  );
                                }}
                                placeholder="VD: Questions 1–5 / BOOKING FORM"
                                className="h-9 text-xs bg-white"
                              />
                            </div>
                          </div>

                          {currentSubtype === "LISTENING_MAP_PLAN" && (
                            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                              <span className="font-semibold text-slate-700">
                                Cách học viên trả lời trên Bản đồ:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualQuestions((prev) =>
                                      prev.map((item, idx) =>
                                        idx === qIdx
                                          ? {
                                              ...item,
                                              type: "MULTIPLE_CHOICE",
                                              correctAnswer: "A",
                                              options: ["A", "B", "C", "D", "E", "F", "G", "H"].map(
                                                (l, i) => ({
                                                  optionLabel: l,
                                                  content: `Vị trí ${l}`,
                                                  isCorrect: i === 0,
                                                })
                                              ),
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                    q.type !== "FILL_IN_BLANK"
                                      ? "bg-[#EA580C] text-white"
                                      : "bg-white text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  Chọn chữ cái (A – H)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualQuestions((prev) =>
                                      prev.map((item, idx) =>
                                        idx === qIdx
                                          ? { ...item, type: "FILL_IN_BLANK", options: [] }
                                          : item
                                      )
                                    );
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                    q.type === "FILL_IN_BLANK"
                                      ? "bg-[#EA580C] text-white"
                                      : "bg-white text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  Tự gõ từ vào ô trống
                                </button>
                              </div>
                            </div>
                          )}

                          {(q.type === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CHOICE_MULTI") && (
                            <div className="space-y-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                Các phương án lựa chọn (Tích vào nút tròn bên phải để đặt làm Đáp án đúng):
                              </span>
                              {(q.options || []).map((opt: any, optIdx: number) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span className="size-6 rounded-md bg-white border border-slate-200 text-xs font-extrabold text-slate-700 grid place-items-center shrink-0">
                                    {opt.optionLabel}
                                  </span>
                                  <Input
                                    value={opt.content}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setManualQuestions((prev) =>
                                        prev.map((item, idx) => {
                                          if (idx !== qIdx) return item;
                                          const newOpts = [...(item.options || [])];
                                          newOpts[optIdx] = { ...newOpts[optIdx], content: val };
                                          return { ...item, options: newOpts };
                                        })
                                      );
                                    }}
                                    className="h-8.5 text-xs bg-white flex-1"
                                  />
                                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-orange-300 shrink-0">
                                    <input
                                      type="radio"
                                      name={`correct-${qIdx}`}
                                      checked={
                                        q.correctAnswer === opt.optionLabel || Boolean(opt.isCorrect)
                                      }
                                      onChange={() => {
                                        setManualQuestions((prev) =>
                                          prev.map((item, idx) => {
                                            if (idx !== qIdx) return item;
                                            const newOpts = (item.options || []).map(
                                              (o: any, oi: number) => ({
                                                ...o,
                                                isCorrect: oi === optIdx,
                                              })
                                            );
                                            return {
                                              ...item,
                                              options: newOpts,
                                              correctAnswer: opt.optionLabel,
                                            };
                                          })
                                        );
                                      }}
                                      className="size-3.5 accent-[#EA580C]"
                                    />
                                    <span className="text-[11px] font-semibold text-slate-700">
                                      Đúng
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === "TRUE_FALSE_NG" && (
                            <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                Chọn đáp án đúng ({isYesNoSubtype ? "Yes / No / Not Given" : "True / False / Not Given"}):
                              </span>
                              <div className="flex items-center gap-2">
                                {(isYesNoSubtype
                                  ? ["YES", "NO", "NOT GIVEN"]
                                  : ["TRUE", "FALSE", "NOT GIVEN"]
                                ).map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      setManualQuestions((prev) =>
                                        prev.map((item, idx) =>
                                          idx === qIdx ? { ...item, correctAnswer: val } : item
                                        )
                                      );
                                    }}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-xl border transition ${
                                      q.correctAnswer === val
                                        ? "bg-[#EA580C] text-white border-[#EA580C] shadow-2xs"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50"
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {q.type === "FILL_IN_BLANK" && (
                            <div className="space-y-1.5 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
                              <Label className="text-xs font-bold text-emerald-900">
                                Từ / Cụm từ đáp án đúng (Nhiều cách viết cách nhau bởi dấu `/`, VD: `19/nineteen`):
                              </Label>
                              <Input
                                value={q.correctAnswer || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setManualQuestions((prev) =>
                                    prev.map((item, idx) =>
                                      idx === qIdx ? { ...item, correctAnswer: val } : item
                                    )
                                  );
                                }}
                                placeholder="Nhập từ đáp án chuẩn..."
                                className="h-8.5 text-xs bg-white font-mono font-bold text-emerald-800 border-emerald-300"
                              />
                            </div>
                          )}

                          {q.type === "MATCHING" && (
                            <div className="space-y-2.5 p-3.5 bg-orange-50/50 rounded-xl border border-orange-200/80">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-800">
                                  Danh sách Tiêu đề / Lựa chọn để nối (List of Headings / Options):
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const romanNums = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
                                    const curOpts = q.options && q.options.length > 0 ? q.options : [];
                                    const nextLabel = romanNums[curOpts.length] || `opt${curOpts.length + 1}`;
                                    const newOpts = [
                                      ...curOpts,
                                      { optionLabel: nextLabel, content: "", isCorrect: false },
                                    ];
                                    setManualQuestions((prev) =>
                                      prev.map((item, idx) =>
                                        idx === qIdx ? { ...item, options: newOpts } : item
                                      )
                                    );
                                  }}
                                  className="h-6 text-[10px] px-2 bg-white text-[#EA580C] border-orange-300 hover:bg-orange-100"
                                >
                                  + Thêm tiêu đề
                                </Button>
                              </div>

                              <div className="space-y-1.5">
                                {(q.options || []).map((opt: any, optIdx: number) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#EA580C] w-7 text-center font-mono bg-white py-1 rounded border border-orange-200">
                                      {opt.optionLabel}
                                    </span>
                                    <Input
                                      value={opt.content}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setManualQuestions((prev) =>
                                          prev.map((item, idx) => {
                                            if (idx !== qIdx) return item;
                                            const curOpts = [...(item.options || [])];
                                            curOpts[optIdx] = { ...curOpts[optIdx], content: val };
                                            return { ...item, options: curOpts };
                                          })
                                        );
                                      }}
                                      placeholder={`Nhập nội dung tiêu đề ${opt.optionLabel}...`}
                                      className="h-8 text-xs bg-white flex-1"
                                    />
                                    <label className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-orange-200 text-[11px] font-semibold text-slate-700 shrink-0 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`matching-correct-${qIdx}`}
                                        checked={q.correctAnswer === opt.optionLabel}
                                        onChange={() => {
                                          setManualQuestions((prev) =>
                                            prev.map((item, idx) => {
                                              if (idx !== qIdx) return item;
                                              const newOpts = (item.options || []).map(
                                                (o: any, oi: number) => ({
                                                  ...o,
                                                  isCorrect: oi === optIdx,
                                                })
                                              );
                                              return {
                                                ...item,
                                                options: newOpts,
                                                correctAnswer: opt.optionLabel,
                                              };
                                            })
                                          );
                                        }}
                                        className="size-3.5 accent-[#EA580C]"
                                      />
                                      <span>Đúng</span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-slate-500">
                              Giải thích đáp án (Tùy chọn - Hiển thị cho học viên sau khi nộp bài):
                            </Label>
                            <Input
                              value={q.explanation || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setManualQuestions((prev) =>
                                  prev.map((item, idx) =>
                                    idx === qIdx ? { ...item, explanation: val } : item
                                  )
                                );
                              }}
                              placeholder="VD: Thông tin nằm ở đoạn B, dòng 3..."
                              className="h-8.5 text-xs bg-slate-50/70 focus:bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. THANH FOOTER CỐ ĐỊNH DƯỚI ĐÁY (STICKY STUDIO FOOTER) */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
                <ShieldCheck className="size-3.5" /> Giám sát rời tab & Tự khóa khi quá hạn
              </span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline font-medium">
                Tổng cộng: <b className="text-slate-900">{manualQuestions.length} phần/câu</b>
              </span>
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-4 text-xs rounded-xl"
              >
                Hủy đóng
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={isPending}
                className="h-9 px-5 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold shadow-xs"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Lưu & Phát hành bài tập
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Cài đặt giao bài tập (CR-01, CR-02) */}
      {isConfigDialogOpen && (
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="size-4 text-[#EA580C]" /> Cài đặt thông số giao bài
              </h3>
              <p className="text-xs text-slate-500">
                Cấu hình thời gian làm bài, số lần được làm và chế độ hiển thị đáp án.
              </p>
            </div>

            <div className="py-2">
              <AssignmentConfigFields
                config={{
                  durationMinutes: manualDuration,
                  startDate: manualStartDate || "",
                  dueDate: effectiveDueDate,
                  maxAttempts: manualMaxAttempts,
                  answerVisibility: manualAnswerVisibility,
                  answerVisibleAt: manualAnswerVisibleAt,
                }}
                onChange={(patch) => {
                  if (patch.durationMinutes !== undefined) setManualDuration(patch.durationMinutes);
                  if (patch.startDate !== undefined && setManualStartDate) setManualStartDate(patch.startDate);
                  if (patch.dueDate !== undefined) handleDueDateChange(patch.dueDate);
                  if (patch.maxAttempts !== undefined && setManualMaxAttempts) setManualMaxAttempts(patch.maxAttempts);
                  if (patch.answerVisibility !== undefined && setManualAnswerVisibility) setManualAnswerVisibility(patch.answerVisibility);
                  if (patch.answerVisibleAt !== undefined && setManualAnswerVisibleAt) setManualAnswerVisibleAt(patch.answerVisibleAt);
                }}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => setIsConfigDialogOpen(false)}
                className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
              >
                Xác nhận cài đặt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Chế độ Xem thử toàn màn hình như Học viên ngay từ Studio Soạn đề */}
      {isFullPreviewOpen && (
        <IeltsExamPlayer
          assignment={{
            id: "preview-manual-exam",
            title: manualTitle || `Đề luyện tập IELTS ${manualSkill}`,
            skill: manualSkill === "ALL_SKILLS" ? "READING" : manualSkill,
            durationMinutes: manualDuration || 60,
            audioUrl: manualAudioUrl || null,
            passageText: manualSkill === "READING" ? sharedReadingPassage : undefined,
            questions: manualQuestions.map((q, idx) => ({
              ...q,
              id: `preview-q-${idx + 1}`,
              questionNumber: idx + 1,
            })),
          }}
          isPreview={true}
          onClose={() => setIsFullPreviewOpen(false)}
          onSubmit={() => setIsFullPreviewOpen(false)}
        />
      )}
    </>
  );
}
