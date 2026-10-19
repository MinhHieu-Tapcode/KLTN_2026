"use client";

import React, { useState, useRef } from "react";
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
  FileText,
  Music,
  FileSpreadsheet,
  File,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";

interface UploadFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
}

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName?: string;
  onUpload: (files: UploadFileItem[]) => Promise<void>;
}

export function BulkUploadModal({
  open,
  onOpenChange,
  folderName,
  onUpload,
}: BulkUploadModalProps) {
  const [fileList, setFileList] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectFileType = (
    fileName: string
  ): "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER" => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "PDF";
    if (["mp3", "wav", "m4a", "aac"].includes(ext || "")) return "AUDIO";
    if (["doc", "docx", "txt", "rtf", "odt"].includes(ext || "")) return "DOCUMENT";
    if (["mp4", "mkv", "mov", "avi"].includes(ext || "")) return "VIDEO";
    return "OTHER";
  };

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newItems: UploadFileItem[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: detectFileType(file.name),
    }));
    setFileList((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (id: string) => {
    setFileList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (fileList.length === 0) return;
    setIsSubmitting(true);
    try {
      await onUpload(fileList);
      setFileList([]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFileIcon = (type: string) => {
    switch (type) {
      case "PDF":
        return <FileText className="size-4 text-rose-600 shrink-0" />;
      case "AUDIO":
        return <Music className="size-4 text-purple-600 shrink-0" />;
      case "DOCUMENT":
        return <FileSpreadsheet className="size-4 text-blue-600 shrink-0" />;
      default:
        return <File className="size-4 text-slate-500 shrink-0" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl p-6 bg-white shadow-xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Tải lên tài liệu</span>
            {folderName && (
              <span className="text-xs font-normal text-slate-500">
                Thư mục đích: <b className="text-slate-800">{folderName}</b>
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Khu vực kéo thả */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? "border-[#EA580C] bg-orange-50/50"
                : "border-slate-200 hover:border-[#EA580C]/50 hover:bg-slate-50/50"
            }`}
          >
            <div className="size-12 rounded-2xl bg-orange-100/70 text-[#EA580C] grid place-items-center mb-3">
              <UploadCloud className="size-6" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Kéo thả file vào đây hoặc <span className="text-[#EA580C] hover:underline">Chọn file</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Hỗ trợ: PDF, MP3, DOCX, XLSX, ZIP... (Tối đa 500MB/file)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Danh sách file đã chọn */}
          {fileList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Danh sách file ({fileList.length})</span>
                <button
                  type="button"
                  onClick={() => setFileList([])}
                  className="text-[11px] text-rose-600 hover:underline font-normal"
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {fileList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {renderFileIcon(item.type)}
                      <span className="font-semibold text-slate-800 truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {(item.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="size-3.5" /> Hợp lệ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="size-5 grid place-items-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || fileList.length === 0}
            className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Đang tải lên ({fileList.length})...
              </>
            ) : (
              `Tải lên (${fileList.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
