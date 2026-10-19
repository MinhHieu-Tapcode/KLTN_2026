"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Music,
  File,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Folder,
} from "lucide-react";

export interface PreviewableMaterial {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
}

interface MaterialPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: PreviewableMaterial | null;
  siblingMaterials?: PreviewableMaterial[];
  currentFolderName?: string;
  onSelectMaterial?: (mat: PreviewableMaterial) => void;
  onDownload: (mat: PreviewableMaterial) => void;
}

export function MaterialPreviewModal({
  open,
  onOpenChange,
  material,
  siblingMaterials = [],
  currentFolderName = "Tài liệu học tập",
  onSelectMaterial,
  onDownload,
}: MaterialPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 130; // Giả lập số trang chuẩn sách IELTS

  if (!material) return null;

  // Lọc an toàn URL xem PDF
  const getSafePdfUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("blob:") || url.startsWith("/") || url.startsWith("data:")) {
      return url;
    }
    return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  };

  const pdfMaterials = siblingMaterials.filter((m) => m.fileType === "PDF");
  const audioMaterials = siblingMaterials.filter((m) => m.fileType === "AUDIO");
  const otherMaterials = siblingMaterials.filter(
    (m) => m.fileType !== "PDF" && m.fileType !== "AUDIO"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-7xl h-[94vh] flex flex-col rounded-2xl p-4 sm:p-6 bg-white shadow-2xl">
        {/* Header M4.4 */}
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2 truncate">
                {material.fileType === "PDF" ? (
                  <FileText className="size-5 text-rose-600 shrink-0" />
                ) : (
                  <Music className="size-5 text-purple-600 shrink-0" />
                )}
                <span className="truncate">{material.title}</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {material.fileName} • {(material.fileSize / (1024 * 1024)).toFixed(2)} MB • {material.fileType}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {material.fileType === "PDF" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getSafePdfUrl(material.fileUrl), "_blank")}
                  className="text-xs rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold gap-1.5 h-8.5"
                >
                  <ExternalLink className="size-3.5" /> Mở toàn màn hình
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => onDownload(material)}
                className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 h-8.5 shadow-sm"
              >
                <Download className="size-3.5" /> Tải về máy
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Nội dung 2 CỘT M4.4 */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 py-2 overflow-hidden">
          {/* CỘT TRÁI: DANH SÁCH MỤC LỤC & TÀI LIỆU CÙNG THƯ MỤC */}
          <div className="w-full md:w-64 lg:w-72 border border-slate-200 rounded-xl bg-slate-50 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-2 text-xs font-bold text-slate-800">
              <Folder className="size-4 text-amber-500" />
              <span className="truncate">{currentFolderName}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* Nhóm PDF Sách */}
              {pdfMaterials.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                    Sách giáo khoa (PDF)
                  </span>
                  <div className="space-y-1">
                    {pdfMaterials.map((m) => {
                      const isSelected = m.id === material.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onSelectMaterial?.(m)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2 transition ${
                            isSelected
                              ? "bg-rose-50 text-rose-950 font-bold border border-rose-200"
                              : "hover:bg-slate-200/60 text-slate-700"
                          }`}
                        >
                          <FileText className="size-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nhóm Audio bài nghe */}
              {audioMaterials.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                    Audio bài nghe (Tracks)
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {audioMaterials.map((m) => {
                      const isSelected = m.id === material.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onSelectMaterial?.(m)}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2 transition ${
                            isSelected
                              ? "bg-purple-50 text-purple-950 font-bold border border-purple-200"
                              : "hover:bg-slate-200/60 text-slate-700"
                          }`}
                        >
                          <Music className="size-3.5 text-purple-600 shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nhóm tài liệu khác */}
              {otherMaterials.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                    Tài liệu khác
                  </span>
                  <div className="space-y-1">
                    {otherMaterials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelectMaterial?.(m)}
                        className={`w-full text-left p-2 rounded-lg text-xs flex items-center gap-2 transition ${
                          m.id === material.id
                            ? "bg-blue-50 text-blue-950 font-bold border border-blue-200"
                            : "hover:bg-slate-200/60 text-slate-700"
                        }`}
                      >
                        <File className="size-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{m.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: KHUNG ĐỌC PDF TRỰC TIẾP HOẶC TRÌNH PHÁT AUDIO */}
          <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-slate-900 min-h-0 relative">
            {material.fileType === "AUDIO" ? (
              <div className="h-full flex flex-col items-center justify-center text-white space-y-6 p-8">
                <div className="size-20 rounded-full bg-purple-600/30 border border-purple-500/40 grid place-items-center text-purple-400 animate-pulse">
                  <Music className="size-10" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-base">{material.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">Trình phát Audio IELTS SIMPACE</p>
                </div>
                <audio
                  controls
                  className="w-full max-w-lg mt-4"
                  src={material.fileUrl}
                  autoPlay
                >
                  Trình duyệt không hỗ trợ thẻ phát âm thanh.
                </audio>
              </div>
            ) : material.fileType === "PDF" ? (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 overflow-hidden relative">
                  <object
                    data={`${getSafePdfUrl(material.fileUrl)}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                    type="application/pdf"
                    className="w-full h-full border-0"
                  >
                    <iframe
                      src={`${getSafePdfUrl(material.fileUrl)}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                      className="w-full h-full border-0"
                      title={material.title}
                    />
                  </object>
                </div>

                {/* Thanh chuyển trang dưới đáy M4.4 */}
                <div className="h-10 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between text-xs text-slate-300 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="font-mono text-xs">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 transition"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Sử dụng phím cuộn chuột hoặc thanh trượt để xem chi tiết
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 text-slate-700">
                <File className="size-12 text-slate-400 mb-3" />
                <p className="text-sm font-bold">Định dạng {material.fileType}</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Vui lòng tải tệp tin về máy tính để mở bằng ứng dụng Microsoft Word/Excel tương ứng.
                </p>
                <Button
                  size="sm"
                  onClick={() => onDownload(material)}
                  className="mt-4 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
                >
                  Tải về ngay
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
