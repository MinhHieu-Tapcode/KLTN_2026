"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Music,
  File,
  Image as ImageIcon,
  Download,
  ExternalLink,
  PanelLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Loader2,
} from "lucide-react";
import { isImageFile } from "@/lib/upload-material-client";

export interface PreviewableMaterial {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
  mimeType?: string;
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

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5];

export function MaterialPreviewModal({
  open,
  onOpenChange,
  material,
  siblingMaterials = [],
  currentFolderName = "Tài liệu & Sách",
  onSelectMaterial,
  onDownload,
}: MaterialPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const allItems = siblingMaterials.length > 0 ? siblingMaterials : material ? [material] : [];
  const docItems = allItems.filter((m) => m.fileType !== "AUDIO");
  const audioItems = allItems.filter((m) => m.fileType === "AUDIO");

  // Tài liệu đọc đang hiển thị ở khung chính & File nghe đang gắn trên thanh Audio
  const [activeDoc, setActiveDoc] = useState<PreviewableMaterial | null>(null);
  const [activeAudio, setActiveAudio] = useState<PreviewableMaterial | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);

  // Trạng thái trình phát Audio tích hợp
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Nội dung HTML nếu là file Word (.docx)
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loadingDocx, setLoadingDocx] = useState(false);

  useEffect(() => {
    if (!material) return;
    setZoom(100);
    setSidebarOpen(allItems.length > 2);

    if (material.fileType === "AUDIO") {
      setActiveAudio(material);
      setActiveDoc(docItems[0] || null);
    } else {
      setActiveDoc(material);
      setActiveAudio(audioItems[0] || null);
    }
  }, [material, siblingMaterials]);

  // Tự động đọc nội dung nếu activeDoc là file .docx
  useEffect(() => {
    const target = activeDoc;
    if (!target) {
      setDocxHtml(null);
      return;
    }
    const ext = (target.fileName?.split(".").pop() || "").toLowerCase();
    if (ext === "docx" && target.fileUrl.startsWith("/uploads/materials/")) {
      setLoadingDocx(true);
      fetch(`/api/materials/docx-preview?url=${encodeURIComponent(target.fileUrl)}`)
        .then((r) => r.json())
        .then((res) => {
          setDocxHtml(res.success ? res.html : null);
        })
        .catch(() => setDocxHtml(null))
        .finally(() => setLoadingDocx(false));
    } else {
      setDocxHtml(null);
    }
  }, [activeDoc]);

  if (!material) return null;

  const displayDoc = activeDoc || material;
  const isImg = isImageFile(displayDoc.fileName, displayDoc.mimeType);

  const getSafeUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("blob:") || url.startsWith("/") || url.startsWith("data:")) {
      return url;
    }
    return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekBy = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(duration || 0, audioRef.current.currentTime + delta)
    );
  };

  const cycleSpeed = () => {
    const nextIdx = (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={containerRef}
        className="w-[96vw] max-w-7xl h-[93vh] flex flex-col rounded-2xl p-0 bg-white shadow-2xl overflow-hidden border border-slate-200 [&>button]:hidden"
      >
        {/* 1. THANH TOP BAR & TIÊU ĐỀ GỌN GÀNG CHUẨN THIẾT KẾ MẪU */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#EA580C] transition shrink-0"
            >
              <ArrowLeft className="size-4" />
              <span>Quay lại</span>
            </button>

            <span className="text-slate-300">/</span>

            {allItems.length > 1 && (
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition shrink-0 ${
                  sidebarOpen
                    ? "bg-orange-50 text-[#EA580C] border-orange-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <PanelLeft className="size-3.5" />
                <span>Tệp trong thư mục ({allItems.length})</span>
              </button>
            )}

            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {displayDoc.title}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 truncate">
                {displayDoc.fileType} • {formatSize(displayDoc.fileSize)} • {currentFolderName}
              </p>
            </div>
          </div>

          {/* Cụm điều khiển bên phải: Đã lưu tiến độ + Zoom + Mở tab + Toàn màn hình + Tải xuống */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              Đang xem trực tuyến
            </span>

            {(displayDoc.fileType === "PDF" || isImg || docxHtml) && (
              <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1 border border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(60, z - 15))}
                  title="Thu nhỏ"
                  className="p-1 text-slate-600 hover:text-slate-900 transition"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="text-xs font-mono font-semibold text-slate-700 w-11 text-center">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(175, z + 15))}
                  title="Phóng to"
                  className="p-1 text-slate-600 hover:text-slate-900 transition"
                >
                  <ZoomIn className="size-3.5" />
                </button>
              </div>
            )}

            {(displayDoc.fileType === "PDF" || isImg) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getSafeUrl(displayDoc.fileUrl), "_blank")}
                title="Mở sang tab mới"
                className="text-xs rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold gap-1.5 h-8.5 px-2.5"
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden lg:inline">Mở tab mới</span>
              </Button>
            )}

            <button
              type="button"
              onClick={handleToggleFullscreen}
              title="Phóng toàn màn hình"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            >
              <Maximize2 className="size-3.5" />
            </button>

            <Button
              size="sm"
              onClick={() => onDownload(displayDoc)}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 h-8.5 shadow-sm"
            >
              <Download className="size-3.5" /> Tải xuống
            </Button>
          </div>
        </div>

        {/* 2. THANH NGHE AUDIO TÍCH HỢP (HIỆN RA KHI THƯ MỤC CÓ KÈM FILE NGHE VÀ CÓ TÀI LIỆU ĐỌC) */}
        {activeAudio && activeDoc && (
          <div className="px-5 py-2.5 bg-orange-50/70 border-b border-orange-200/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <audio
              ref={audioRef}
              src={activeAudio.fileUrl}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Chọn file nghe */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-lg bg-[#EA580C] text-white grid place-items-center shrink-0">
                <Music className="size-3.5" />
              </div>
              {audioItems.length > 1 ? (
                <select
                  value={activeAudio.id}
                  onChange={(e) => {
                    const found = audioItems.find((a) => a.id === e.target.value);
                    if (found) {
                      setActiveAudio(found);
                      setIsPlaying(false);
                    }
                  }}
                  className="h-8 px-2.5 rounded-lg border border-orange-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-[#EA580C] max-w-[240px]"
                >
                  {audioItems.map((a) => (
                    <option key={a.id} value={a.id}>
                      🎧 {a.title}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-slate-800 truncate max-w-[240px]">
                  {activeAudio.title}
                </span>
              )}
            </div>

            {/* Điều khiển phát, tua -5s/+5s và thanh thời gian */}
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <button
                type="button"
                onClick={() => seekBy(-5)}
                title="Tua lùi 5 giây"
                className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-700 transition text-[11px] font-bold inline-flex items-center gap-0.5"
              >
                <RotateCcw className="size-3.5" /> 5s
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="size-8 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white grid place-items-center shadow-sm transition shrink-0"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => seekBy(5)}
                title="Tua tới 5 giây"
                className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-700 transition text-[11px] font-bold inline-flex items-center gap-0.5"
              >
                5s <RotateCw className="size-3.5" />
              </button>

              <span className="text-[11px] font-mono text-slate-600 shrink-0">
                {formatTime(currentTime)}
              </span>

              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="flex-1 h-1.5 accent-[#EA580C] cursor-pointer"
              />

              <span className="text-[11px] font-mono text-slate-500 shrink-0">
                {formatTime(duration)}
              </span>
            </div>

            {/* Tốc độ nghe & Tải file nghe */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cycleSpeed}
                title="Đổi tốc độ nghe"
                className="px-2 py-1 rounded-lg bg-white border border-orange-200 text-xs font-mono font-bold text-[#EA580C] hover:bg-orange-50 transition"
              >
                {playbackRate}x
              </button>
              <button
                type="button"
                onClick={() => onDownload(activeAudio)}
                title="Tải file nghe này về máy"
                className="p-1.5 rounded-lg bg-white border border-orange-200 text-slate-600 hover:text-[#EA580C] transition"
              >
                <Download className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 3. KHÔNG GIAN ĐỌC CHÍNH (NỀN SÁNG #F1F5F9 + TRANG GIẤY TRẮNG) */}
        <div className="flex-1 flex min-h-0 overflow-hidden bg-[#F1F5F9]">
          {/* Cột danh sách tệp bên trái (chỉ mở khi người dùng bật và có nhiều tệp) */}
          {sidebarOpen && allItems.length > 1 && (
            <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto p-3 space-y-4">
              {docItems.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1.5">
                    Tài liệu đọc ({docItems.length})
                  </span>
                  <div className="space-y-1">
                    {docItems.map((m) => {
                      const isCurrent = activeDoc?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setActiveDoc(m);
                            onSelectMaterial?.(m);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                            isCurrent
                              ? "bg-orange-50 text-[#EA580C] font-bold border border-orange-200/80"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <FileText className="size-4 text-[#EA580C] shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {audioItems.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1.5">
                    File nghe Audio ({audioItems.length})
                  </span>
                  <div className="space-y-1">
                    {audioItems.map((m) => {
                      const isCurrent = activeAudio?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setActiveAudio(m);
                            if (!activeDoc) onSelectMaterial?.(m);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2 transition ${
                            isCurrent
                              ? "bg-orange-50 text-[#EA580C] font-bold border border-orange-200/80"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Music className="size-4 text-[#EA580C] shrink-0" />
                          <span className="truncate">{m.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vùng tờ giấy trắng hiển thị nội dung ở trung tâm */}
          <div className="flex-1 overflow-auto p-3 sm:p-5 flex justify-center">
            {!activeDoc && activeAudio ? (
              /* Trường hợp thư mục CHỈ có file Audio mà không có tài liệu đọc nào */
              <div className="my-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-lg w-full text-center space-y-5">
                <div className="size-16 rounded-2xl bg-orange-50 border border-orange-200 text-[#EA580C] grid place-items-center mx-auto">
                  <Music className="size-8" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">{activeAudio.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{activeAudio.fileName}</p>
                </div>
                <audio controls autoPlay src={activeAudio.fileUrl} className="w-full" />
              </div>
            ) : displayDoc.fileType === "PDF" ? (
              <div
                style={{ width: `${Math.min(100, Math.max(65, zoom))}%` }}
                className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200/90 overflow-hidden transition-all"
              >
                <iframe
                  key={`${displayDoc.fileUrl}-${zoom}`}
                  src={`${getSafeUrl(displayDoc.fileUrl)}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&zoom=${zoom}`}
                  className="w-full h-full border-0 bg-white"
                  title={displayDoc.title}
                />
              </div>
            ) : isImg ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200/90 p-6 my-auto max-w-full overflow-auto flex items-center justify-center">
                <img
                  src={getSafeUrl(displayDoc.fileUrl)}
                  alt={displayDoc.title}
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg transition-transform"
                />
              </div>
            ) : loadingDocx ? (
              <div className="my-auto flex flex-col items-center gap-2 text-slate-500">
                <Loader2 className="size-6 animate-spin text-[#EA580C]" />
                <span className="text-xs font-medium">Đang tải nội dung văn bản...</span>
              </div>
            ) : docxHtml ? (
              <div
                style={{ fontSize: `${zoom}%` }}
                className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-slate-200/90 p-8 sm:p-12 overflow-y-auto prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            ) : (
              <div className="my-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
                <div className="size-14 rounded-2xl bg-orange-50 text-[#EA580C] grid place-items-center mx-auto border border-orange-200">
                  <File className="size-7" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{displayDoc.title}</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    {displayDoc.fileName} ({formatSize(displayDoc.fileSize)})
                  </p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tệp này ở định dạng văn phòng chuyên dụng. Hãy bấm tải xuống để mở đầy đủ trên máy tính của bạn.
                </p>
                <Button
                  size="sm"
                  onClick={() => onDownload(displayDoc)}
                  className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold px-5 h-9 gap-1.5"
                >
                  <Download className="size-4" /> Tải tệp xuống
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
