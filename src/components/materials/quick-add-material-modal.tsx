"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  BookOpen,
  GraduationCap,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { MaterialTypeSelector, MaterialTypeOption } from "./quick-add/material-type-selector";
import { AudioTracksUploader } from "./quick-add/audio-tracks-uploader";
import { ClassMultiFilterSelector } from "./quick-add/class-multi-filter-selector";

export interface QuickAddSubmitPayload {
  title: string;
  materialType: MaterialTypeOption;
  file: File;
  extraFiles?: File[];
  audioFiles: File[];
  answerKeyFile?: File | null;
  destination: "COMMON" | "CLASSES";
  targetLevel?: string;
  targetClassIds: string[];
}

interface QuickAddMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: Array<{
    id: string;
    name: string;
    code: string;
    level?: string;
    ieltsLevelId?: string;
    program?: string;
  }>;
  ieltsLevels?: Array<{ id: string; name: string; code: string }>;
  isTeacher?: boolean;
  defaultDestination?: "COMMON" | "CLASSES";
  onSubmit: (data: QuickAddSubmitPayload) => Promise<void>;
}

const DEFAULT_LEVELS = [
  { id: "lvl-basic", name: "Cơ bản (0 - 4.5)", code: "BASIC" },
  { id: "lvl-medium", name: "Trung bình (4.5 - 6.5)", code: "INTERMEDIATE" },
  { id: "lvl-advanced", name: "Nâng cao (6.5 - 9.0)", code: "ADVANCED" },
];

export function QuickAddMaterialModal({
  open,
  onOpenChange,
  classes = [],
  ieltsLevels,
  isTeacher = false,
  defaultDestination,
  onSubmit,
}: QuickAddMaterialModalProps) {
  const effectiveLevels =
    ieltsLevels && ieltsLevels.length > 0 ? ieltsLevels : DEFAULT_LEVELS;

  const [materialType, setMaterialType] = useState<MaterialTypeOption>("SUPPLEMENTARY");
  const [title, setTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [destination, setDestination] = useState<"COMMON" | "CLASSES">(
    isTeacher ? "CLASSES" : defaultDestination || "CLASSES"
  );
  const [targetLevel, setTargetLevel] = useState(effectiveLevels[0]?.id || "lvl-basic");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (isTeacher) {
        setDestination("CLASSES");
      } else if (defaultDestination) {
        setDestination(defaultDestination);
      }
      if (effectiveLevels.length > 0 && !effectiveLevels.some((l) => l.id === targetLevel)) {
        setTargetLevel(effectiveLevels[0].id);
      }
      if (classes.length === 1 && selectedClassIds.length === 0) {
        setSelectedClassIds([classes[0].id]);
      }
    }
  }, [open, defaultDestination, isTeacher, effectiveLevels, classes]);

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  // Không ép buộc phải có Audio, cho phép tải tự do mọi định dạng tệp
  const isFormValid =
    title.trim().length > 0 &&
    selectedFiles.length > 0 &&
    (destination === "COMMON" ? Boolean(targetLevel) : selectedClassIds.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        materialType,
        file: selectedFiles[0],
        extraFiles: selectedFiles.slice(1),
        audioFiles,
        answerKeyFile,
        destination,
        targetLevel: destination === "COMMON" ? targetLevel : undefined,
        targetClassIds: destination === "CLASSES" ? selectedClassIds : [],
      });
      setTitle("");
      setSelectedFiles([]);
      setAudioFiles([]);
      setAnswerKeyFile(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col rounded-2xl p-6 bg-white shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="size-5 text-[#EA580C]" />
            Thêm học liệu mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* 1. CHỌN LOẠI HỌC LIỆU */}
          <MaterialTypeSelector value={materialType} onChange={setMaterialType} />

          {/* 2. TÊN THƯ MỤC / TIÊU ĐỀ HỌC LIỆU */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              2. Tên tài liệu / Thư mục lưu trữ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Bài giảng Unit 1 - Reading / Giáo trình Mindset for IELTS..."
              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C]"
            />
          </div>

          {/* 3. CHỌN TỆP TẢI LÊN (HỖ TRỢ PDF, WORD, EXCEL, PPT, AUDIO, ẢNH PNG/JPG...) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              3. Chọn tệp tải lên (PDF, Word, Excel, Slide, Audio, Ảnh PNG/JPG...) <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-[#EA580C]/60 hover:border-[#EA580C] bg-orange-50/30 hover:bg-orange-50/70 rounded-xl cursor-pointer text-xs font-bold text-[#EA580C] transition">
                <UploadCloud className="size-4" />
                <span>Chọn tệp từ máy tính (có thể chọn nhiều tệp)</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.m4a,.ogg,.png,.jpg,.jpeg,.webp,.gif,.txt,.zip"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (files.length > 0) {
                      setSelectedFiles((prev) => [...prev, ...files]);
                      if (!title.trim()) {
                        setTitle(files[0].name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>

              {selectedFiles.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {selectedFiles.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="size-4 text-[#EA580C] shrink-0" />
                        <span className="truncate font-medium text-slate-800">{f.name}</span>
                        <span className="text-slate-400 font-mono text-[11px] shrink-0">
                          ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Chưa chọn tệp nào. Hỗ trợ đầy đủ PDF, DOCX, XLSX, PPTX, MP3, WAV, PNG, JPG...
                </p>
              )}
            </div>
          </div>

          {/* 4. KHU VỰC ĐÍNH KÈM AUDIO BÀI NGHE TÙY CHỌN */}
          {(materialType === "COURSEBOOK" || materialType === "PRACTICE_TEST") && (
            <AudioTracksUploader
              isRequired={false}
              audioFiles={audioFiles}
              onChangeAudioFiles={setAudioFiles}
              answerKeyFile={answerKeyFile}
              onChangeAnswerKeyFile={setAnswerKeyFile}
            />
          )}

          {/* 5. NƠI LƯU TRỮ */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              4. Chọn nơi lưu tài liệu:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setDestination("CLASSES")}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  destination === "CLASSES"
                    ? "border-[#EA580C] bg-orange-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="destination"
                  checked={destination === "CLASSES"}
                  onChange={() => setDestination("CLASSES")}
                  className="mt-0.5 accent-[#EA580C]"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="size-4 text-[#EA580C]" />
                    <b className="text-xs text-slate-900">Lưu vào Lớp học cụ thể</b>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Chọn một hoặc nhiều lớp học để thêm tài liệu vào kho của lớp
                  </p>
                </div>
              </label>

              {!isTeacher && (
                <label
                  onClick={() => setDestination("COMMON")}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    destination === "COMMON"
                      ? "border-[#EA580C] bg-orange-50/40 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="destination"
                    checked={destination === "COMMON"}
                    onChange={() => setDestination("COMMON")}
                    className="mt-0.5 accent-[#EA580C]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="size-4 text-[#EA580C]" />
                      <b className="text-xs text-slate-900">Lưu vào Kho giáo trình chung</b>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tự động kế thừa cho toàn bộ các lớp thuộc Trình độ tương ứng
                    </p>
                  </div>
                </label>
              )}
            </div>

            {destination === "COMMON" && !isTeacher && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Chọn Trình độ IELTS áp dụng:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {effectiveLevels.map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setTargetLevel(lvl.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        targetLevel === lvl.id
                          ? "border-[#EA580C] bg-white font-bold text-[#EA580C] shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs"
                      }`}
                    >
                      <span className="block text-xs truncate">{lvl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {destination === "CLASSES" && (
              <ClassMultiFilterSelector
                classes={classes}
                ieltsLevels={effectiveLevels}
                selectedClassIds={selectedClassIds}
                onToggleClass={handleToggleClass}
                onSelectMultipleClasses={setSelectedClassIds}
              />
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isFormValid || isSubmitting}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Đang tải lên...
                </>
              ) : (
                "Lưu & Tải lên"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
