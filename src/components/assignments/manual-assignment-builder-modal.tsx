"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Copy,
  Edit3,
  Loader2,
  Music,
  Plus,
  Tag,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getIeltsSubtypesBySkill } from "@/lib/ielts-report-config";

// 7 Dạng câu hỏi IELTS chuẩn quốc tế (quy định cơ chế nhập và chấm)
export const IELTS_QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm 1 đáp án (A, B, C, D)" },
  { value: "MULTIPLE_CHOICE_MULTI", label: "Trắc nghiệm nhiều đáp án (Chọn 2-3 đáp án)" },
  { value: "TRUE_FALSE_NG", label: "True / False / Not Given" },
  { value: "FILL_IN_BLANK", label: "Điền từ vào chỗ trống (Fill in the Blank)" },
  { value: "MATCHING", label: "Nối thông tin / Tiêu đề (Matching Headings)" },
  { value: "ESSAY", label: "Tự luận Viết (Writing Task 1 & 2)" },
  { value: "SPEAKING_RECORD", label: "Ghi âm Nói (Speaking Part 1, 2, 3)" },
];

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
  manualAudioSourceType,
  setManualAudioSourceType,
  manualAudioUrl,
  setManualAudioUrl,
  manualAudioFileName,
  manualAudioFileSize,
  onAudioUpload,
  manualQuestions,
  setManualQuestions,
  onAddQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onSave,
}: ManualAssignmentBuilderModalProps) {
  const [localDueDate, setLocalDueDate] = useState("");
  const [localStartDate, setLocalStartDate] = useState("");

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Edit3 className="size-5 text-[#EA580C]" /> Soạn & Giao bài tập IELTS ( Chuẩn 16 Dạng bài & Quy đổi Band)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Thiết lập thông tin đề thi, hạn nộp lớp và gắn nhãn dạng câu hỏi IELTS phục vụ Báo cáo phân tích chuyên sâu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-bold text-slate-700">
                Tiêu đề bài tập <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="VD: IELTS Academic Reading Mock Test 01 (Đủ 40 câu tự bật Band ước tính)"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Kỹ năng IELTS (BR-12)</Label>
              <select
                value={manualSkill}
                onChange={(e) => setManualSkill(e.target.value as any)}
                className="w-full h-9 text-xs rounded-xl border border-slate-200 px-3 bg-white"
              >
                <option value="READING">Reading (Đọc - 10 dạng bài)</option>
                <option value="LISTENING">Listening (Nghe - 6 dạng bài)</option>
                <option value="WRITING">Writing (Viết - 4 tiêu chí & Task 1/2)</option>
                <option value="SPEAKING">Speaking (Nói - 4 tiêu chí & Part 1/2/3)</option>
                <option value="ALL_SKILLS">Tổng hợp 4 kỹ năng</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Thời lượng làm bài (phút)</Label>
              <Input
                type="number"
                value={manualDuration}
                onChange={(e) => setManualDuration(Number(e.target.value))}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="size-3.5 text-slate-400" /> Ngày bắt đầu mở bài (startDate)
              </Label>
              <Input
                type="datetime-local"
                value={effectiveStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-9 text-xs rounded-xl bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="size-3.5 text-[#EA580C]" /> Hạn chót nộp bài của lớp (dueDate - BR-05)
              </Label>
              <Input
                type="datetime-local"
                value={effectiveDueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="h-9 text-xs rounded-xl bg-white border-orange-200"
              />
            </div>

            {(manualSkill === "LISTENING" || manualSkill === "ALL_SKILLS") && (
              <div className="col-span-2 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Music className="size-4 text-blue-600" />
                    <span>
                      Đính kèm tệp Audio Nghe <span className="text-rose-600">* (Bắt buộc với bài Nghe)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] bg-white p-0.5 rounded-lg border border-blue-200">
                    <button
                      type="button"
                      onClick={() => setManualAudioSourceType("file")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition ${
                        manualAudioSourceType === "file"
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Tải tệp từ máy
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
                      Dán URL ngoài
                    </button>
                  </div>
                </div>

                {manualAudioSourceType === "file" ? (
                  <div className="space-y-2">
                    <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center bg-white hover:bg-blue-50/30 transition">
                      <Upload className="size-6 text-blue-500 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-800">
                        {manualAudioFileName || "Nhấn để chọn tệp âm thanh (.mp3, .wav, .m4a)"}
                      </p>
                      {manualAudioFileSize && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Dung lượng: {manualAudioFileSize}</p>
                      )}
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a"
                        id="manual-audio-input"
                        className="hidden"
                        onChange={onAudioUpload}
                      />
                      <label
                        htmlFor="manual-audio-input"
                        className="inline-block mt-2.5 px-3.5 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 cursor-pointer transition"
                      >
                        {manualAudioUrl ? "Đổi tệp âm thanh khác" : "Duyệt tìm tệp Audio trên máy..."}
                      </label>
                    </div>
                  </div>
                ) : (
                  <Input
                    value={manualAudioUrl}
                    onChange={(e) => setManualAudioUrl(e.target.value)}
                    placeholder="Dán link audio (VD: https://domain.com/audio.mp3)"
                    className="h-9 text-xs rounded-xl bg-white border-blue-200 font-mono text-[11px]"
                  />
                )}

                {manualAudioUrl && (
                  <div className="p-2.5 bg-slate-900 rounded-xl text-white space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-purple-300">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="size-3.5" /> Nghe thử tệp âm thanh đã chọn:
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {manualAudioFileName || manualAudioUrl}
                      </span>
                    </div>
                    <audio controls className="w-full h-8" src={manualAudioUrl} />
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <b className="text-xs text-slate-800 block">Giám sát rời tab & Tuân thủ hạn nộp (BR-05, Mục 6.7)</b>
                <span className="text-[11px] text-slate-500">
                  Tự động ghi nhận số lần chuyển tab (cảnh báo gian lận khi vượt ngưỡng 3 lần) và khóa nộp khi quá hạn nộp lớp.
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="size-3.5" /> Đang bật
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <b className="text-xs font-bold text-slate-900">
                  Danh sách câu hỏi ({manualQuestions.length} câu)
                  {manualQuestions.length === 40 &&
                  (manualSkill === "READING" || manualSkill === "LISTENING") ? (
                    <span className="ml-2 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Đủ 40 câu: Tự động bật quy đổi Band Academic (BR-01)
                    </span>
                  ) : null}
                </b>
                <p className="text-[11px] text-slate-500">
                  Chọn đúng Dạng bài IELTS cho từng câu để hiển thị trên biểu đồ Phân tích theo dạng bài (Mục 6.6).
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddQuestion("MULTIPLE_CHOICE")}
                  className="h-8 text-xs rounded-xl border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold gap-1"
                >
                  <Plus className="size-3.5" /> + Trắc nghiệm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddQuestion("FILL_IN_BLANK")}
                  className="h-8 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1"
                >
                  <Plus className="size-3.5" /> + Điền từ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddQuestion("TRUE_FALSE_NG")}
                  className="h-8 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1"
                >
                  <Plus className="size-3.5" /> + T/F/NG
                </Button>
                {(manualSkill === "WRITING" || manualSkill === "SPEAKING") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onAddQuestion(manualSkill === "WRITING" ? "ESSAY" : "SPEAKING_RECORD")
                    }
                    className="h-8 text-xs rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold gap-1"
                  >
                    <Plus className="size-3.5" /> + Câu {manualSkill === "WRITING" ? "Viết" : "Nói"} (9.0đ)
                  </Button>
                )}
              </div>
            </div>

            {manualQuestions.map((q, qIdx) => {
              const isSubjective = q.type === "ESSAY" || q.type === "SPEAKING_RECORD";
              return (
                <div
                  key={qIdx}
                  className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 transition"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Câu {qIdx + 1}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const isSubj = newType === "ESSAY" || newType === "SPEAKING_RECORD";
                          setManualQuestions((prev) =>
                            prev.map((item, idx) => {
                              if (idx !== qIdx) return item;
                              if (newType === "MATCHING" && (!item.options || item.options.length === 0)) {
                                return {
                                  ...item,
                                  type: newType,
                                  ieltsQuestionType: "READING_MATCHING_HEADINGS",
                                  points: 1.0,
                                  correctAnswer: "i",
                                  options: [
                                    { optionLabel: "i", content: "", isCorrect: true },
                                    { optionLabel: "ii", content: "", isCorrect: false },
                                    { optionLabel: "iii", content: "", isCorrect: false },
                                  ],
                                };
                              }
                              return {
                                ...item,
                                type: newType,
                                points: isSubj ? 9.0 : item.points || 1.0,
                              };
                            })
                          );
                        }}
                        className="h-7 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 px-2"
                      >
                        {IELTS_QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>Điểm:</span>
                        <input
                          type="number"
                          step="0.5"
                          disabled={isSubjective}
                          value={isSubjective ? 9.0 : q.points}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setManualQuestions((prev) =>
                              prev.map((item, idx) => (idx === qIdx ? { ...item, points: val } : item))
                            );
                          }}
                          title={
                            isSubjective
                              ? "Câu Writing/Speaking cố định thang điểm 9.0 (Mục 8.5)"
                              : "Điểm số của câu hỏi"
                          }
                          className="w-12 h-7 text-xs text-center border border-slate-200 rounded-md bg-white font-bold disabled:bg-slate-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => onDuplicateQuestion(qIdx)}
                        className="size-7 grid place-items-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition"
                        title="Nhân bản câu hỏi này"
                      >
                        <Copy className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(qIdx)}
                        className="size-7 grid place-items-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* DẠNG BÀI IELTS CHI TIẾT & NHÓM CÂU HỎI (MỤC 6.6 & 10.2) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-orange-50/50 border border-orange-200/70 rounded-xl">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-[#EA580C] flex items-center gap-1">
                        <Tag className="size-3" /> Dạng bài IELTS (ieltsQuestionType - BR-04, BR-12) *
                      </Label>
                      <select
                        value={q.ieltsQuestionType || subtypeOptions[0]?.code || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestions((prev) =>
                            prev.map((item, idx) =>
                              idx === qIdx ? { ...item, ieltsQuestionType: val } : item
                            )
                          );
                        }}
                        className="w-full h-7 text-xs rounded-lg border border-orange-200 bg-white font-semibold text-slate-800 px-2"
                      >
                        {subtypeOptions.map((sub) => (
                          <option key={sub.code} value={sub.code}>
                            {sub.viLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">
                        Nhóm câu hỏi (groupTitle - tùy chọn)
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
                        placeholder="VD: Questions 1–5: Matching Headings"
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <BookOpen className="size-3 text-slate-400" />
                      Đoạn văn mô tả / Hướng dẫn đề bài (Passage snippet / Instructions)
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
                      placeholder="VD: Paragraph A: Architecture has always been an accurate reflection..."
                      className="w-full h-14 p-2 text-xs bg-white border border-slate-200 rounded-xl resize-none font-serif text-slate-700 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Nội dung câu hỏi (Question prompt)
                    </Label>
                    <Input
                      value={q.prompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualQuestions((prev) =>
                          prev.map((item, idx) => (idx === qIdx ? { ...item, prompt: val } : item))
                        );
                      }}
                      placeholder="Nhập nội dung đề bài câu hỏi..."
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Các lựa chọn đáp án (Chọn 1 nút tròn để đặt làm đáp án đúng):
                      </span>
                      {q.options?.map((opt: any, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 w-4">{opt.optionLabel}.</span>
                          <Input
                            value={opt.content}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualQuestions((prev) =>
                                prev.map((item, idx) => {
                                  if (idx !== qIdx) return item;
                                  const newOpts = [...item.options];
                                  newOpts[optIdx].content = val;
                                  return { ...item, options: newOpts };
                                })
                              );
                            }}
                            className="h-7 text-xs bg-white flex-1"
                          />
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={opt.isCorrect}
                            onChange={() => {
                              setManualQuestions((prev) =>
                                prev.map((item, idx) => {
                                  if (idx !== qIdx) return item;
                                  const newOpts = item.options.map((o: any, oi: number) => ({
                                    ...o,
                                    isCorrect: oi === optIdx,
                                  }));
                                  return { ...item, options: newOpts, correctAnswer: opt.optionLabel };
                                })
                              );
                            }}
                            title="Chọn làm đáp án đúng"
                            className="size-4 accent-[#EA580C]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "TRUE_FALSE_NG" && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Chọn đáp án đúng chuẩn IELTS:
                      </span>
                      <div className="flex items-center gap-2">
                        {["TRUE", "FALSE", "NOT GIVEN"].map((val) => (
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
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                              q.correctAnswer === val
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === "FILL_IN_BLANK" && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[11px] font-semibold text-slate-500">
                        Đáp án chuẩn cần điền:
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
                        placeholder="VD: central library"
                        className="h-8 text-xs bg-white font-mono"
                      />
                    </div>
                  )}

                  {q.type === "MATCHING" && (
                    <div className="space-y-2.5 pt-1 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          📋 Danh sách các Tiêu đề / Thông tin để nối (List of Headings):
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const romanNums = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
                            const curOpts =
                              q.options && q.options.length > 0
                                ? q.options
                                : [
                                    { optionLabel: "i", content: "", isCorrect: true },
                                    { optionLabel: "ii", content: "", isCorrect: false },
                                    { optionLabel: "iii", content: "", isCorrect: false },
                                  ];
                            const nextLabel = romanNums[curOpts.length] || `opt${curOpts.length + 1}`;
                            const newOpts = [
                              ...curOpts,
                              { optionLabel: nextLabel, content: "", isCorrect: false },
                            ];
                            setManualQuestions((prev) =>
                              prev.map((item, idx) => (idx === qIdx ? { ...item, options: newOpts } : item))
                            );
                          }}
                          className="h-6 text-[10px] px-2 bg-white text-amber-800 border-amber-300 hover:bg-amber-100"
                        >
                          + Thêm Tiêu đề
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        {(q.options && q.options.length > 0
                          ? q.options
                          : [
                              { optionLabel: "i", content: "", isCorrect: true },
                              { optionLabel: "ii", content: "", isCorrect: false },
                              { optionLabel: "iii", content: "", isCorrect: false },
                            ]
                        ).map((opt: any, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-900 w-6 text-center font-mono">
                              {opt.optionLabel}.
                            </span>
                            <Input
                              value={opt.content}
                              onChange={(e) => {
                                const val = e.target.value;
                                setManualQuestions((prev) =>
                                  prev.map((item, idx) => {
                                    if (idx !== qIdx) return item;
                                    const curOpts =
                                      item.options && item.options.length > 0
                                        ? [...item.options]
                                        : [
                                            { optionLabel: "i", content: "", isCorrect: true },
                                            { optionLabel: "ii", content: "", isCorrect: false },
                                            { optionLabel: "iii", content: "", isCorrect: false },
                                          ];
                                    curOpts[optIdx] = { ...curOpts[optIdx], content: val };
                                    return { ...item, options: curOpts };
                                  })
                                );
                              }}
                              placeholder={`Nhập nội dung tiêu đề ${opt.optionLabel}...`}
                              className="h-7 text-xs bg-white flex-1"
                            />
                            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 shrink-0 cursor-pointer">
                              <input
                                type="radio"
                                name={`matching-correct-${qIdx}`}
                                checked={q.correctAnswer === opt.optionLabel}
                                onChange={() => {
                                  setManualQuestions((prev) =>
                                    prev.map((item, idx) => {
                                      if (idx !== qIdx) return item;
                                      const curOpts =
                                        item.options && item.options.length > 0
                                          ? [...item.options]
                                          : [
                                              { optionLabel: "i", content: "", isCorrect: true },
                                              { optionLabel: "ii", content: "", isCorrect: false },
                                              { optionLabel: "iii", content: "", isCorrect: false },
                                            ];
                                      const newOpts = curOpts.map((o: any, oi: number) => ({
                                        ...o,
                                        isCorrect: oi === optIdx,
                                      }));
                                      return { ...item, options: newOpts, correctAnswer: opt.optionLabel };
                                    })
                                  );
                                }}
                                className="size-4 accent-[#EA580C]"
                              />
                              <span className="text-[10px]">Đáp án đúng</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSubjective && (
                    <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl text-[11px] text-purple-900">
                      ℹ️ Câu hỏi <b>{q.type === "ESSAY" ? "Tự luận Viết (Writing)" : "Ghi âm Nói (Speaking)"}</b> dùng thang điểm chuẩn <b>9.0</b>. Khi chấm bài, Giáo viên bắt buộc nhập đủ <b>4 tiêu chí IELTS</b> để hệ thống tự tính Band câu (làm tròn 0.5 - Quy tắc BR-07).
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">
                      Lời giải thích chi tiết (Hiển thị cho học viên sau khi nộp bài):
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
                      placeholder="Giải thích vì sao đáp án này đúng dựa trên ngữ cảnh bài đọc/bài nghe..."
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isPending}
            className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Lưu & Phát hành bài tập
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
