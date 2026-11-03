"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Music,
  Edit3,
  Sparkles,
} from "lucide-react";
import { createAssignmentAction } from "@/actions/assignments";
import {
  AssignmentConfigFields,
  AssignmentConfigState,
} from "./assignment-config-fields";
import { validateAssignmentConfig } from "@/lib/assignment-config";

interface MultiClassAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessibleClasses: any[];
  currentUser: any;
  onSuccess: () => void;
  onOpenManualBuilder?: (classIds: string[]) => void;
  onOpenSmartParser?: (classIds: string[]) => void;
}

export function MultiClassAssignmentModal({
  open,
  onOpenChange,
  accessibleClasses,
  currentUser,
  onSuccess,
  onOpenManualBuilder,
  onOpenSmartParser,
}: MultiClassAssignmentModalProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [searchClassQuery, setSearchClassQuery] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("ALL");

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState<string>("READING");
  const [type, setType] = useState<string>("HOMEWORK");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [enableProctoring, setEnableProctoring] = useState<boolean>(true);
  const [maxTabSwitches, setMaxTabSwitches] = useState<number>(3);

  // Bộ cấu hình thống nhất CR-02
  const [config, setConfig] = useState<AssignmentConfigState>({
    durationMinutes: 60,
    startDate: "",
    dueDate: "",
    maxAttempts: 1,
    answerVisibility: "AFTER_SUBMIT",
    answerVisibleAt: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const uniqueLevels = Array.from(
    new Set(accessibleClasses.map((c) => c.program || c.level || "IELTS").filter(Boolean))
  );

  const filteredClasses = accessibleClasses.filter((c) => {
    if (!c.isActive) return false;
    const matchSearch =
      c.name.toLowerCase().includes(searchClassQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchClassQuery.toLowerCase()) ||
      (c.school?.name && c.school.name.toLowerCase().includes(searchClassQuery.toLowerCase()));
    const matchLevel =
      selectedLevelFilter === "ALL" || (c.program || c.level) === selectedLevelFilter;
    return matchSearch && matchLevel;
  });

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSelectAll = () => {
    const allIds = filteredClasses.map((c) => c.id);
    setSelectedClassIds(Array.from(new Set([...selectedClassIds, ...allIds])));
  };

  const handleDeselectAll = () => {
    const filteredIdSet = new Set(filteredClasses.map((c) => c.id));
    setSelectedClassIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
  };

  const handleSubmit = () => {
    setErrorMessage("");
    if (selectedClassIds.length === 0) {
      setErrorMessage("Vui lòng tích chọn ít nhất 1 lớp học để giao bài!");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("Tiêu đề bài tập không được để trống!");
      return;
    }
    if ((skill === "LISTENING" || skill === "ALL_SKILLS") && !audioUrl.trim()) {
      setErrorMessage("Kỹ năng Nghe (Listening) bắt buộc phải có link hoặc tệp Audio MP3!");
      return;
    }

    const valResult = validateAssignmentConfig(config);
    if (valResult.error) {
      setErrorMessage(valResult.error);
      return;
    }

    startTransition(async () => {
      const initialQuestions = [
        {
          questionNumber: 1,
          prompt:
            skill === "WRITING"
              ? "Viết bài luận theo đề bài yêu cầu."
              : skill === "SPEAKING"
              ? "Ghi âm bài nói theo chủ đề được giao."
              : "Câu hỏi 1: Lựa chọn đáp án đúng nhất.",
          type:
            skill === "WRITING"
              ? "ESSAY"
              : skill === "SPEAKING"
              ? "SPEAKING_RECORD"
              : "MULTIPLE_CHOICE",
          points: 1.0,
          correctAnswer: skill === "WRITING" || skill === "SPEAKING" ? "" : "A",
          explanation: "Hướng dẫn làm bài",
          options:
            skill === "WRITING" || skill === "SPEAKING"
              ? []
              : [
                  { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
                  { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
                  { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
                  { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
                ],
        },
      ];

      const res = await createAssignmentAction({
        targetClassIds: selectedClassIds,
        title: title.trim(),
        description: description.trim() || undefined,
        skill,
        type,
        durationMinutes: config.durationMinutes || 60,
        startDate: config.startDate || null,
        dueDate: config.dueDate ? new Date(config.dueDate).toISOString() : null,
        maxAttempts: valResult.maxAttempts,
        answerVisibility: valResult.answerVisibility,
        answerVisibleAt: valResult.answerVisibleAt ? valResult.answerVisibleAt.toISOString() : null,
        audioUrl: audioUrl.trim() || null,
        enableProctoring,
        maxTabSwitches: Number(maxTabSwitches) || 3,
        questions: initialQuestions,
      });

      if (res.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setErrorMessage(res.error || "Giao bài tập thất bại!");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="size-5 text-[#EA580C]" /> Giao bài tập
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Chọn một hoặc nhiều lớp học mục tiêu và cấu hình thông tin đề thi để giao bài.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* BƯỚC 1: CHỌN CÁC LỚP HỌC ÁP DỤNG */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-[#EA580C]" /> 1. Chọn các lớp học nhận bài:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-semibold text-[#EA580C] hover:underline"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-semibold text-slate-500 hover:underline"
                >
                  Bỏ chọn
                </button>
                <Badge variant="outline" className="bg-white text-[#EA580C] border-orange-300 font-bold ml-1">
                  Đã chọn {selectedClassIds.length} lớp
                </Badge>
              </div>
            </div>

            {/* Tìm kiếm & Lọc trình độ */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchClassQuery}
                  onChange={(e) => setSearchClassQuery(e.target.value)}
                  placeholder="Tìm lớp theo tên hoặc mã lớp..."
                  className="w-full h-7.5 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                className="h-7.5 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
              >
                <option value="ALL">Mọi trình độ</option>
                {uniqueLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Danh sách lớp checkbox */}
            <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 border border-slate-200 rounded-lg">
              {filteredClasses.length === 0 ? (
                <p className="text-center text-slate-400 py-3">Không tìm thấy lớp học nào!</p>
              ) : (
                filteredClasses.map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition ${
                        isChecked ? "bg-orange-50/70 text-slate-900 font-medium" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleClass(cls.id)}
                          className="size-3.5 rounded accent-[#EA580C] cursor-pointer"
                        />
                        <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                          {cls.code}
                        </span>
                        <span className="truncate">{cls.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {cls.school?.name || cls.program || "IELTS"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* CHUYỂN NHANH SANG SOẠN THỦ CÔNG HOẶC BÓC TÁCH EBOOK CHO CÁC LỚP ĐÃ CHỌN */}
          {(onOpenManualBuilder || onOpenSmartParser) && (
            <div className="p-3 rounded-xl border border-orange-200 bg-orange-50/40 space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                Hoặc chọn phương thức soạn đề nâng cao cho các lớp đã chọn:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onOpenManualBuilder && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedClassIds.length === 0}
                    onClick={() => {
                      onOpenChange(false);
                      onOpenManualBuilder(selectedClassIds);
                    }}
                    className="h-8.5 justify-start text-xs border-orange-200 hover:bg-orange-100/60 font-semibold text-slate-800"
                  >
                    <Edit3 className="size-3.5 text-[#EA580C] mr-1.5" /> Soạn bài tập thủ công (Studio)
                  </Button>
                )}
                {onOpenSmartParser && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedClassIds.length === 0}
                    onClick={() => {
                      onOpenChange(false);
                      onOpenSmartParser(selectedClassIds);
                    }}
                    className="h-8.5 justify-start text-xs border-orange-200 hover:bg-orange-100/60 font-semibold text-[#EA580C]"
                  >
                    <Sparkles className="size-3.5 text-[#EA580C] mr-1.5" /> Bóc tách đề thi từ Ebook / PDF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* BƯỚC 2: THÔNG TIN VÀ CẤU HÌNH GIAO BÀI TẬP */}
          <div className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Tiêu đề bài tập <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Reading Mini Test 01 - Passage 1"
                className="h-8.5 text-xs rounded-xl mt-1 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Kỹ năng</Label>
                <select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  className="w-full h-8.5 px-3 mt-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                >
                  <option value="READING">📖 Reading (Đọc)</option>
                  <option value="LISTENING">🎧 Listening (Nghe)</option>
                  <option value="WRITING">✍️ Writing (Viết)</option>
                  <option value="SPEAKING">🎙️ Speaking (Nói)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Loại bài tập</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-8.5 px-3 mt-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                >
                  <option value="HOMEWORK">Bài tập về nhà (Homework)</option>
                  <option value="MINI_TEST">Bài kiểm tra ngắn (Mini Test)</option>
                  <option value="MOCK_TEST">Đề thi thử (Mock Test)</option>
                </select>
              </div>
            </div>

            {(skill === "LISTENING" || skill === "ALL_SKILLS") && (
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1 text-blue-600">
                  <Music className="size-3.5" /> Đường dẫn Audio MP3 <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://... hoặc /sample.mp3"
                  className="h-8.5 text-xs rounded-xl mt-1 border-blue-200 bg-blue-50/30"
                />
              </div>
            )}

            {/* BỘ CẤU HÌNH THỜI GIAN, SỐ LẦN LÀM, VÀ ĐÁP ÁN (CR-02) */}
            <AssignmentConfigFields
              config={config}
              onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
            />

            {/* Giám sát Out Tab */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableProctoring}
                  onChange={(e) => setEnableProctoring(e.target.checked)}
                  className="size-4 rounded accent-[#EA580C] cursor-pointer"
                />
                <span className="font-semibold text-slate-800">
                  Ghi nhận hành vi Out Tab (rời màn hình làm bài)
                </span>
              </label>
              {enableProctoring && (
                <span className="text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Tự động ghi nhận (tối đa 3 lần cảnh báo)
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={isPending || selectedClassIds.length === 0}
            onClick={handleSubmit}
            className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold gap-1.5 shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Đang giao bài...
              </>
            ) : (
              <>
                <FileText className="size-3.5" /> Giao bài cho {selectedClassIds.length} lớp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
