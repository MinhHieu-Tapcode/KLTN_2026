"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Image as ImageIcon,
  File,
  CheckCircle2,
  X,
  Loader2,
  FolderPlus,
} from "lucide-react";
import { detectFileCategory, isImageFile } from "@/lib/upload-material-client";

export interface UploadFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
}

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolder?: { id: string; name: string } | null;
  availableFolders?: Array<{ id: string; name: string; isInherited?: boolean }>;
  onUpload: (
    files: UploadFileItem[],
    targetFolderOption: { folderId?: string; newFolderName?: string }
  ) => Promise<void>;
}

export function BulkUploadModal({
  open,
  onOpenChange,
  currentFolder,
  availableFolders = [],
  onUpload,
}: BulkUploadModalProps) {
  const [fileList, setFileList] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Các thư mục của lớp (không phải thư mục kế thừa bị khóa)
  const writableFolders = availableFolders.filter((f) => !f.isInherited);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("__NEW__");
  const [newFolderName, setNewFolderName] = useState<string>("Tài liệu học tập chung");

  useEffect(() => {
    if (open) {
      if (currentFolder && !(currentFolder as any).isInherited) {
        setSelectedFolderId(currentFolder.id);
      } else if (writableFolders.length > 0) {
        setSelectedFolderId(writableFolders[0].id);
      } else {
        setSelectedFolderId("__NEW__");
        setNewFolderName("Tài liệu học tập chung");
      }
    }
  }, [open, currentFolder, availableFolders.length]);

  const handleFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newItems: UploadFileItem[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: detectFileCategory(file.name, file.type),
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
      await onUpload(fileList, {
        folderId: selectedFolderId === "__NEW__" ? undefined : selectedFolderId,
        newFolderName:
          selectedFolderId === "__NEW__"
            ? newFolderName.trim() || "Tài liệu học tập chung"
            : undefined,
      });
      setFileList([]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFileIcon = (item: UploadFileItem) => {
    if (isImageFile(item.name, item.file.type)) {
      return <ImageIcon className="size-4 text-emerald-600 shrink-0" />;
    }
    switch (item.type) {
      case "PDF":
        return <FileText className="size-4 text-[#EA580C] shrink-0" />;
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
          <DialogTitle className="text-base font-bold text-slate-900">
            Tải lên tài liệu lớp học
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Chọn thư mục lưu trữ (nếu đang ở ngoài thư mục gốc hoặc có thể tạo thư mục mới) */}
          {!currentFolder || (currentFolder as any).isInherited ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <label className="text-xs font-bold text-slate-800 block">
                Lưu vào thư mục:
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#EA580C]"
              >
                {writableFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
                <option value="__NEW__">+ Tạo thư mục mới để lưu các tệp này</option>
              </select>

              {selectedFolderId === "__NEW__" && (
                <div className="flex items-center gap-2 pt-1">
                  <FolderPlus className="size-4 text-[#EA580C] shrink-0" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nhập tên thư mục mới..."
                    className="flex-1 h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-600 bg-orange-50/60 border border-orange-200/70 px-3 py-2 rounded-xl">
              Thư mục đích: <b className="text-[#EA580C]">📁 {currentFolder.name}</b>
            </div>
          )}

          {/* Khu vực kéo thả hoặc chọn tệp */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
              isDragging
                ? "border-[#EA580C] bg-orange-50/50"
                : "border-slate-200 hover:border-[#EA580C]/50 hover:bg-slate-50/50"
            }`}
          >
            <div className="size-11 rounded-2xl bg-orange-100/70 text-[#EA580C] grid place-items-center mb-2.5">
              <UploadCloud className="size-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Kéo thả tệp vào đây hoặc <span className="text-[#EA580C] hover:underline">Bấm để chọn tệp</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Hỗ trợ: PDF, Word (.doc, .docx), Excel (.xlsx), Slide (.pptx), Audio (.mp3, .wav), Ảnh (.png, .jpg)...
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp3,.wav,.m4a,.ogg,.png,.jpg,.jpeg,.webp,.gif,.txt,.zip"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Danh sách tệp đã chọn */}
          {fileList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Danh sách tệp đã chọn ({fileList.length})</span>
                <button
                  type="button"
                  onClick={() => setFileList([])}
                  className="text-[11px] text-rose-600 hover:underline font-normal"
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {fileList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {renderFileIcon(item)}
                      <span className="font-semibold text-slate-800 truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {(item.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
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
            className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold px-5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Đang tải lên ({fileList.length})...
              </>
            ) : (
              `Tải lên (${fileList.length} tệp)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
