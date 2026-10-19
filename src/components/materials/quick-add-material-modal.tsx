"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { MaterialTypeSelector, MaterialTypeOption } from "./quick-add/material-type-selector";
import { AudioTracksUploader } from "./quick-add/audio-tracks-uploader";
import { ClassMultiFilterSelector } from "./quick-add/class-multi-filter-selector";

export interface QuickAddSubmitPayload {
  title: string;
  materialType: MaterialTypeOption;
  file: File;
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
  onSubmit: (data: QuickAddSubmitPayload) => Promise<void>;
}

export function QuickAddMaterialModal({
  open,
  onOpenChange,
  classes = [],
  ieltsLevels = [
    { id: "lvl-foundation", name: "Cơ bản (4.5 - 5.5)", code: "FOUNDATION" },
    { id: "lvl-intermediate", name: "Trung cấp (5.5 - 6.5)", code: "INTERMEDIATE" },
    { id: "lvl-advanced", name: "Nâng cao (6.5 - 7.5+)", code: "ADVANCED" },
  ],
  isTeacher = false,
  onSubmit,
}: QuickAddMaterialModalProps) {
  const [materialType, setMaterialType] = useState<MaterialTypeOption>("COURSEBOOK");
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [destination, setDestination] = useState<"COMMON" | "CLASSES">(
    isTeacher ? "CLASSES" : "COMMON"
  );
  const [targetLevel, setTargetLevel] = useState(ieltsLevels[0]?.id || "lvl-foundation");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý toggle một lớp học
  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  // Kiểm tra điều kiện nộp form hợp lệ
  const isAudioMissingForCoursebook = materialType === "COURSEBOOK" && audioFiles.length === 0;
  const isFormValid =
    title.trim().length > 0 &&
    selectedFile !== null &&
    !isAudioMissingForCoursebook &&
    (destination === "COMMON" ? Boolean(targetLevel) : selectedClassIds.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        materialType,
        file: selectedFile!,
        audioFiles,
        answerKeyFile,
        destination,
        targetLevel: destination === "COMMON" ? targetLevel : undefined,
        targetClassIds: destination === "CLASSES" ? selectedClassIds : [],
      });
      // Đặt lại trạng thái sau khi thành công
      setTitle("");
      setSelectedFile(null);
      setAudioFiles([]);
      setAnswerKeyFile(null);
      setSelectedClassIds([]);
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
            Thêm tài liệu học tập
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          {/* 1. CHỌN LOẠI HỌC LIỆU */}
          <MaterialTypeSelector value={materialType} onChange={setMaterialType} />

          {/* 2. TÊN TÀI LIỆU / TIÊU ĐỀ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên tài liệu / Tiêu đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                materialType === "COURSEBOOK"
                  ? "VD: Cambridge IELTS 18 Academic (Sách & Audio)..."
                  : materialType === "PRACTICE_TEST"
                  ? "VD: Đề thi thử IELTS Listening & Reading Mock Test 01..."
                  : "VD: Slide Bài giảng Unit 3 - Reading Matching Headings..."
              }
              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition"
            />
          </div>

          {/* 3. CHỌN FILE CHÍNH (SÁCH HOẶC TÀI LIỆU) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {materialType === "COURSEBOOK"
                ? "Chọn File Sách giáo khoa (PDF) *"
                : materialType === "PRACTICE_TEST"
                ? "Chọn File Đề thi (PDF) *"
                : "Chọn tệp tin tải lên (PDF, Word, PPTX...) *"}
            </label>
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 border border-slate-200 hover:border-[#EA580C] bg-slate-50 hover:bg-orange-50/40 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 transition">
                <span>Chọn tệp từ máy tính</span>
                <input
                  type="file"
                  required={!selectedFile}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="hidden"
                />
              </label>

              {selectedFile ? (
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium truncate">
                  <FileText className="size-4 text-[#EA580C] shrink-0" />
                  <span className="truncate">{selectedFile.name}</span>
                  <span className="text-slate-400 font-mono text-[11px] shrink-0">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Chưa chọn tệp</span>
              )}
            </div>
          </div>

          {/* 4. KHU VỰC AUDIO VÀ ĐÁP ÁN (BẮT BUỘC NẾU LÀ SGK, HOẶC TÙY CHỌN NẾU LÀ ĐỀ THI) */}
          {(materialType === "COURSEBOOK" || materialType === "PRACTICE_TEST") && (
            <AudioTracksUploader
              isRequired={materialType === "COURSEBOOK"}
              audioFiles={audioFiles}
              onChangeAudioFiles={setAudioFiles}
              answerKeyFile={answerKeyFile}
              onChangeAnswerKeyFile={setAnswerKeyFile}
            />
          )}

          {/* 5. ĐỊA CHỈ LƯU TÀI LIỆU (KHO CHUNG HAY LỚP HỌC) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              Địa chỉ lưu tài liệu:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <BookOpen className="size-4 text-purple-600" />
                      <b className="text-xs text-slate-900">Kho học liệu chung</b>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tự động kế thừa cho tất cả các lớp thuộc Trình độ tương ứng
                    </p>
                  </div>
                </label>
              )}

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
                    <GraduationCap className="size-4 text-sky-600" />
                    <b className="text-xs text-slate-900">Kho học liệu theo lớp</b>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Chọn danh sách các lớp học cụ thể để phân phối tài liệu
                  </p>
                </div>
              </label>
            </div>

            {/* Chi tiết cho Option 1: Chọn Trình độ */}
            {destination === "COMMON" && !isTeacher && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Chọn Trình độ IELTS kế thừa:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ieltsLevels.map((lvl) => (
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

            {/* Chi tiết cho Option 2: Chọn danh sách lớp có 2 bộ lọc */}
            {destination === "CLASSES" && (
              <ClassMultiFilterSelector
                classes={classes}
                ieltsLevels={ieltsLevels}
                selectedClassIds={selectedClassIds}
                onToggleClass={handleToggleClass}
                onSelectMultipleClasses={setSelectedClassIds}
              />
            )}
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
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
              disabled={isSubmitting || !isFormValid}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Đang xử lý & lưu...
                </>
              ) : (
                "Lưu & Phân phối tài liệu"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
