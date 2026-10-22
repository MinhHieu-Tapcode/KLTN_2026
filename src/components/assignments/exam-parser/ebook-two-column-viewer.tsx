"use client";

import React, { useState } from "react";
import {
  BookOpen,
  FileText,
  ShieldCheck,
  AlertCircle,
  Music,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FormattedPassageView } from "@/components/assignments/formatted-passage-view";
import { FlowchartView } from "@/components/assignments/flowchart-view";
import { TableCompletionView } from "@/components/assignments/table-completion-view";
import { MatchingHeadingsView } from "@/components/assignments/matching-headings-view";
import { SummaryCompletionView } from "@/components/assignments/summary-completion-view";
import { EbookQuestionCard } from "./ebook-question-card";

export interface EbookTwoColumnViewerProps {
  parsedEbookData: any;
  setParsedEbookData: (data: any) => void;
  selectedQuestionNumbers: number[];
  isQuestionsFinalized: boolean;
  activeEbookSectionId: string;
  setActiveEbookSectionId: (id: string) => void;
  parserAudioFileName?: string | null;
  onUploadAudio: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFinalize: () => void;
  onUnlock: () => void;
  onToggleQuestionSelection: (qNum: number) => void;
  onUpdateQuestionField: (qNum: number, field: string, value: any) => void;
  onDeleteQuestion: (qNum: number) => void;
  onAddQuestion: (sectionId: string, type: string) => void;
}

export function EbookTwoColumnViewer({
  parsedEbookData,
  setParsedEbookData,
  selectedQuestionNumbers,
  isQuestionsFinalized,
  activeEbookSectionId,
  setActiveEbookSectionId,
  parserAudioFileName,
  onUploadAudio,
  onSelectAll,
  onDeselectAll,
  onFinalize,
  onUnlock,
  onToggleQuestionSelection,
  onUpdateQuestionField,
  onDeleteQuestion,
  onAddQuestion,
}: EbookTwoColumnViewerProps) {
  const [passageViewMode, setPassageViewMode] = useState<"preview" | "edit">("preview");

  const currentSec =
    parsedEbookData.sections && parsedEbookData.sections.length > 0
      ? parsedEbookData.sections.find((s: any) => s.id === activeEbookSectionId) ||
        parsedEbookData.sections[0]
      : null;

  const isListeningSec = currentSec
    ? currentSec.skill === "LISTENING"
    : parsedEbookData.skill === "LISTENING";

  const questionsToShow =
    currentSec && currentSec.questions && currentSec.questions.length > 0
      ? currentSec.questions
      : parsedEbookData.questions || [];

  // Thu thập các câu hỏi đã thuộc về các thành phần chuyên biệt (Bảng biểu, Sơ đồ, Nối tiêu đề, Tóm tắt)
  const specializedQuestionNumbers = new Set<number>();
  (parsedEbookData?.flowcharts || []).forEach((fc: any) => {
    (fc.boxes || []).forEach((b: any) =>
      (b.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)))
    );
    (fc.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)));
  });
  (parsedEbookData?.tables || []).forEach((tbl: any) => {
    (tbl.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)));
  });
  (parsedEbookData?.matchingHeadings || []).forEach((mh: any) => {
    (mh.items || []).forEach((it: any) => specializedQuestionNumbers.add(Number(it.questionNumber)));
  });
  (parsedEbookData?.summaries || []).forEach((sm: any) => {
    (sm.questionNumbers || []).forEach((n: number) => specializedQuestionNumbers.add(Number(n)));
  });

  const standaloneQuestionsToShow = questionsToShow.filter(
    (q: any) => !specializedQuestionNumbers.has(Number(q.questionNumber))
  );

  const answersMap: Record<number, string> = {};
  (parsedEbookData.questions || []).forEach((q: any) => {
    if (q.questionNumber && q.correctAnswer) {
      answersMap[q.questionNumber] = q.correctAnswer;
    }
  });

  const validSelectedCount = selectedQuestionNumbers.filter((n: number) =>
    (parsedEbookData.questions || []).some((q: any) => q.questionNumber === n)
  ).length;
  const totalQuestionsCount = parsedEbookData.questions?.length || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[60vh]">
      {/* CỘT TRÁI: ĐỀ BÀI / PASSAGE READING / AUDIO */}
      <div className="border border-slate-200 rounded-2xl p-4 overflow-y-auto bg-slate-50/60 space-y-3 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <b className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <BookOpen className="size-4 text-[#EA580C]" /> Cột 1: Nội dung Đề bài & Bài đọc
          </b>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPassageViewMode(passageViewMode === "preview" ? "edit" : "preview")}
              className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md font-semibold transition"
            >
              {passageViewMode === "preview" ? "✏️ Sửa văn bản" : "👁️ Xem đọc chuẩn"}
            </button>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-500">
              {currentSec ? currentSec.title : "Phần 1"}
            </span>
          </div>
        </div>

        {/* NẾU LÀ PHẦN LISTENING THÌ HIỂN THỊ AUDIO PLAYER */}
        {isListeningSec && (
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Music className="size-4 text-blue-600" />
                <span>Tệp Audio Listening Section:</span>
              </div>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a"
                id="ebook-inner-audio-modal"
                className="hidden"
                onChange={onUploadAudio}
              />
              <label
                htmlFor="ebook-inner-audio-modal"
                className="px-2.5 py-1 text-[11px] bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer font-semibold transition"
              >
                {parserAudioFileName ? "Đổi tệp Audio khác" : "Chọn tệp Audio MP3..."}
              </label>
            </div>

            {parsedEbookData.audioUrl ? (
              <div className="space-y-1">
                <audio controls className="w-full h-8" src={parsedEbookData.audioUrl} />
                <p className="text-[10px] text-blue-600 font-mono truncate">
                  File âm thanh: {parserAudioFileName || parsedEbookData.audioUrl}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                ⚠️ Chưa có file Audio cho bài Nghe. Vui lòng bấm nút chọn tệp Audio MP3 ở trên.
              </p>
            )}
          </div>
        )}

        {passageViewMode === "preview" ? (
          <div className="flex-1 min-h-[300px] overflow-y-auto bg-white border border-slate-200 rounded-xl p-3">
            <FormattedPassageView
              text={currentSec ? currentSec.passageText : parsedEbookData.passageText}
            />
          </div>
        ) : (
          <textarea
            value={currentSec ? currentSec.passageText : parsedEbookData.passageText}
            onChange={(e) => {
              const val = e.target.value;
              if (currentSec && parsedEbookData.sections) {
                const updatedSections = parsedEbookData.sections.map((s: any) =>
                  s.id === currentSec.id ? { ...s, passageText: val } : s
                );
                setParsedEbookData({ ...parsedEbookData, sections: updatedSections });
              } else {
                setParsedEbookData({ ...parsedEbookData, passageText: val });
              }
            }}
            className="w-full flex-1 min-h-[300px] text-xs font-serif leading-relaxed p-3.5 bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:ring-1 focus:ring-orange-300"
            placeholder="Nội dung bài đọc / hướng dẫn làm bài..."
          />
        )}
      </div>

      {/* CỘT PHẢI: PHIẾU CÂU HỎI & ĐÁP ÁN */}
      <div className="border border-slate-200 rounded-2xl p-4 overflow-y-auto bg-white space-y-3 flex flex-col">
        <div className="border-b border-slate-100 pb-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <b className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="size-4 text-emerald-600" /> Cột 2: Phiếu câu hỏi & Đáp án chuẩn
              </b>
              <span className="text-[11px] text-slate-500">
                {currentSec ? `${currentSec.title} • ` : ""}
                {specializedQuestionNumbers.size > 0
                  ? `Bảng/Sơ đồ: ${specializedQuestionNumbers.size} câu | `
                  : ""}
                Câu độc lập: {standaloneQuestionsToShow.length} câu | Tổng: {totalQuestionsCount} câu
              </span>
            </div>

            {isQuestionsFinalized ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1.5 shadow-sm">
                <ShieldCheck className="size-3.5" /> Đã chốt {validSelectedCount} câu sử dụng
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-semibold gap-1.5"
              >
                <AlertCircle className="size-3.5 text-amber-600" /> Chưa chốt (Đang chọn{" "}
                {validSelectedCount}/{totalQuestionsCount} câu)
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              {!isQuestionsFinalized ? (
                <>
                  <button
                    type="button"
                    onClick={onSelectAll}
                    className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={onDeselectAll}
                    className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    type="button"
                    onClick={onFinalize}
                    className="px-3 py-1 text-xs bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-lg font-bold flex items-center gap-1 transition shadow-sm"
                  >
                    <span>🔒 Chốt danh sách câu hỏi sử dụng ({validSelectedCount})</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onUnlock}
                  className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center gap-1 transition shadow-sm"
                >
                  <span>🔓 Mở khóa chỉnh sửa câu hỏi</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onAddQuestion(currentSec ? currentSec.id : "reading_1", "MULTIPLE_CHOICE")
                }
                className="px-2 py-0.5 text-[10px] bg-orange-50 border border-orange-200 text-[#EA580C] rounded font-semibold hover:bg-orange-100 transition"
              >
                + Trắc nghiệm
              </button>
              <button
                type="button"
                onClick={() =>
                  onAddQuestion(currentSec ? currentSec.id : "reading_1", "FILL_IN_BLANK")
                }
                className="px-2 py-0.5 text-[10px] bg-slate-50 border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-100 transition"
              >
                + Điền từ
              </button>
              <button
                type="button"
                onClick={() =>
                  onAddQuestion(currentSec ? currentSec.id : "reading_1", "TRUE_FALSE_NG")
                }
                className="px-2 py-0.5 text-[10px] bg-slate-50 border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-100 transition"
              >
                + T/F/NG
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách câu hỏi */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {parsedEbookData?.flowcharts && parsedEbookData.flowcharts.length > 0 && (
            <div className="mb-4">
              {parsedEbookData.flowcharts.map((fc: any, fcIdx: number) => (
                <FlowchartView
                  key={fc.id || fcIdx}
                  flowchart={fc}
                  answers={answersMap}
                  isTeacherKeyMode={true}
                  isReadOnly={false}
                  onAnswerChange={(qNum, val) => onUpdateQuestionField(qNum, "correctAnswer", val)}
                />
              ))}
            </div>
          )}

          {parsedEbookData?.tables && parsedEbookData.tables.length > 0 && (
            <div className="mb-4">
              {parsedEbookData.tables.map((tbl: any, tblIdx: number) => (
                <TableCompletionView
                  key={tbl.id || tblIdx}
                  table={tbl}
                  answers={answersMap}
                  isTeacherKeyMode={true}
                  isReadOnly={false}
                  onAnswerChange={(qNum, val) => onUpdateQuestionField(qNum, "correctAnswer", val)}
                />
              ))}
            </div>
          )}

          {parsedEbookData?.matchingHeadings && parsedEbookData.matchingHeadings.length > 0 && (
            <div className="mb-4">
              {parsedEbookData.matchingHeadings.map((mh: any, mhIdx: number) => (
                <MatchingHeadingsView
                  key={mh.id || mhIdx}
                  group={mh}
                  answers={answersMap}
                  isTeacherKeyMode={true}
                  isReadOnly={false}
                  onAnswerChange={(qNum, val) => onUpdateQuestionField(qNum, "correctAnswer", val)}
                />
              ))}
            </div>
          )}

          {parsedEbookData?.summaries && parsedEbookData.summaries.length > 0 && (
            <div className="mb-4">
              {parsedEbookData.summaries.map((sm: any, smIdx: number) => (
                <SummaryCompletionView
                  key={sm.id || smIdx}
                  group={sm}
                  answers={answersMap}
                  isTeacherKeyMode={true}
                  isReadOnly={false}
                  onAnswerChange={(qNum, val) => onUpdateQuestionField(qNum, "correctAnswer", val)}
                />
              ))}
            </div>
          )}

          {standaloneQuestionsToShow.length === 0 && specializedQuestionNumbers.size > 0 && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center space-y-1 my-2">
              <CheckCircle2 className="size-5 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-800">
                Toàn bộ câu hỏi trong phần này đã được tích hợp trực tiếp vào Bảng biểu / Sơ đồ ở trên!
              </p>
              <p className="text-[11px] text-emerald-700">
                Giáo viên có thể nhập đáp án chuẩn trực tiếp vào các ô trống của Bảng/Sơ đồ hoặc tải file Excel để tự động điền.
              </p>
            </div>
          )}

          {standaloneQuestionsToShow.map((q: any, qIdx: number) => (
            <EbookQuestionCard
              key={q.questionNumber || qIdx}
              question={q}
              isSelected={selectedQuestionNumbers.includes(q.questionNumber)}
              isQuestionsFinalized={isQuestionsFinalized}
              onToggleSelection={onToggleQuestionSelection}
              onUpdateField={onUpdateQuestionField}
              onDeleteQuestion={onDeleteQuestion}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
