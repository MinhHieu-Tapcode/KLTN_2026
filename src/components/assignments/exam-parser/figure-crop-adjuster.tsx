"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Crop, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FigureBox, getPdfPageCount, renderPdfPage } from "@/lib/exam-parser/pdf-crop-client";

/**
 * Hộp thoại cho GV vẽ lại vùng cắt ảnh trên trang PDF (vùng AI gợi ý chỉ gần đúng).
 * Kéo chuột trên ảnh trang để vẽ khung mới; khung lưu theo thang 0-1000 [ymin, xmin, ymax, xmax].
 */

export interface FigureCropAdjusterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfFile: File;
  groupTitle: string;
  initialPage: number;
  initialBox?: FigureBox;
  onConfirm: (page: number, box: FigureBox) => Promise<void>;
}

const FULL_PAGE: FigureBox = [0, 0, 1000, 1000];

export function FigureCropAdjuster({
  open,
  onOpenChange,
  pdfFile,
  groupTitle,
  initialPage,
  initialBox,
  onConfirm,
}: FigureCropAdjusterProps) {
  const [page, setPage] = useState(initialPage || 1);
  const [pageCount, setPageCount] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [box, setBox] = useState<FigureBox>(initialBox || FULL_PAGE);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPage(initialPage || 1);
    setBox(initialBox || FULL_PAGE);
  }, [open, initialPage, initialBox]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPageImage(null);
    setLoadError(null);
    Promise.all([getPdfPageCount(pdfFile), renderPdfPage(pdfFile, page, 1.4)])
      .then(([count, canvas]) => {
        if (cancelled) return;
        setPageCount(count);
        setPageImage(canvas.toDataURL("image/png"));
      })
      .catch(() => !cancelled && setLoadError("Không hiển thị được trang PDF. Vui lòng tải ảnh thủ công."));
    return () => {
      cancelled = true;
    };
  }, [open, pdfFile, page]);

  // Toạ độ chuột -> thang 0-1000 của trang
  const toUnits = (e: React.MouseEvent) => {
    const rect = surfaceRef.current!.getBoundingClientRect();
    const x = Math.min(1000, Math.max(0, ((e.clientX - rect.left) / rect.width) * 1000));
    const y = Math.min(1000, Math.max(0, ((e.clientY - rect.top) / rect.height) * 1000));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = toUnits(e);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const p = toUnits(e);
    const s = dragStart.current;
    setBox([Math.min(s.y, p.y), Math.min(s.x, p.x), Math.max(s.y, p.y), Math.max(s.x, p.x)]);
  };
  const handleMouseUp = () => {
    dragStart.current = null;
  };

  const boxTooSmall = box[2] - box[0] < 15 || box[3] - box[1] < 15;

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm(page, box.map((v) => Math.round(v)) as FigureBox);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[760px] max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Crop className="size-4 text-[#EA580C]" /> Chỉnh vùng ảnh đề gốc: {groupTitle}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Kéo chuột trên trang để vẽ khung bao quanh bảng / sơ đồ / biểu đồ, rồi bấm "Cắt lại ảnh".
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 text-xs">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft /> Trang trước
          </Button>
          <span className="font-semibold text-slate-700">
            Trang {page}/{pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Trang sau <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBox(FULL_PAGE)}>
            Lấy cả trang
          </Button>
        </div>

        <div className="flex justify-center bg-slate-100 rounded-xl p-2 min-h-[300px]">
          {loadError ? (
            <p className="text-xs text-rose-600 self-center">{loadError}</p>
          ) : !pageImage ? (
            <Loader2 className="size-6 animate-spin text-slate-400 self-center" />
          ) : (
            <div
              ref={surfaceRef}
              className="relative select-none cursor-crosshair w-full max-w-[680px]"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img src={pageImage} alt={`Trang ${page} của đề`} className="w-full h-auto block pointer-events-none" />
              <div
                className="absolute border-2 border-[#EA580C] bg-orange-400/10 pointer-events-none"
                style={{
                  top: `${box[0] / 10}%`,
                  left: `${box[1] / 10}%`,
                  height: `${(box[2] - box[0]) / 10}%`,
                  width: `${(box[3] - box[1]) / 10}%`,
                }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !pageImage || boxTooSmall}
            className="bg-[#EA580C] hover:bg-[#C2410C] text-white"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Crop />} Cắt lại ảnh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
