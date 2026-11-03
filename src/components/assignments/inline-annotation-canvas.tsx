"use client";

import React, { useState, useRef } from "react";
import {
  MessageSquare,
  Scissors,
  ArrowLeftRight,
  Plus,
  X,
  Headphones,
  AlertCircle,
  PauseCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  Volume2,
} from "lucide-react";
import {
  ANNOTATION_TYPE_LABELS,
  CRITERION_COLOR_MAP,
  IeltsCriterionConfig,
  InlineAnnotationType,
  InlineGradingAnnotation,
  SpeakingWordToken,
} from "@/lib/ielts-report-config";

export interface InlineAnnotationCanvasProps {
  headerTitle: string;
  badgeText?: string;
  badgeVariant?: "warning" | "success" | "neutral";
  promptText?: string | null;
  contentText: string;
  annotations: InlineGradingAnnotation[];
  criteriaDefs: IeltsCriterionConfig[];
  readOnly?: boolean;
  onAddAnnotation?: (ann: InlineGradingAnnotation) => void;
  onRemoveAnnotation?: (annId: string) => void;
  speakingWords?: SpeakingWordToken[];
  currentAudioTimeSec?: number;
  onSeekAudio?: (sec: number) => void;
  activeCriterionFilter?: string | null;
  onChangeCriterionFilter?: (critCode: string | null) => void;
}

export function InlineAnnotationCanvas({
  headerTitle,
  badgeText,
  badgeVariant = "neutral",
  promptText,
  contentText,
  annotations,
  criteriaDefs,
  readOnly = false,
  onAddAnnotation,
  onRemoveAnnotation,
  speakingWords,
  currentAudioTimeSec = -1,
  onSeekAudio,
  activeCriterionFilter: externalFilter,
  onChangeCriterionFilter,
}: InlineAnnotationCanvasProps) {
  const docTextRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [internalFilter, setInternalFilter] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState<boolean>(false);
  const [overlapNotice, setOverlapNotice] = useState<string | null>(null);

  const activeFilter = externalFilter !== undefined ? externalFilter : internalFilter;
  const setFilter = (code: string | null) => {
    if (onChangeCriterionFilter) onChangeCriterionFilter(code);
    else setInternalFilter(code);
  };

  // State cho Popover khi Giáo viên bôi đen văn bản
  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    startOffset: number;
    endOffset: number;
    quote: string;
    timestampSec: number | null;
  } | null>(null);
  const [popType, setPopType] = useState<InlineAnnotationType>("comment");
  const [popCrit, setPopCrit] = useState<string>(criteriaDefs[0]?.code || "TA_TR");
  const [popInput, setPopInput] = useState<string>("");

  const sortedAnns = [...(annotations || [])].sort((a, b) => a.startOffset - b.startOffset);
  const filteredAnns = activeFilter
    ? sortedAnns.filter(
        (a) =>
          a.criterion === activeFilter ||
          (activeFilter === "TA_TR" && a.criterion === "TA")
      )
    : sortedAnns;

  const formatSec = (s: number) => {
    const r = Math.max(0, Math.round(s));
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
  };

  const handleSelectAnnotation = (id: string, scrollTarget: "card" | "span") => {
    setSelectedId((prev) => (prev === id ? null : id));
    const targetDomId = scrollTarget === "card" ? `ann-card-${id}` : `ann-span-${id}`;
    const el = document.getElementById(targetDomId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Tính vị trí ký tự (character offset) trong contentText từ Selection
  const handleMouseUp = () => {
    if (readOnly || !docTextRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    if (!docTextRef.current.contains(range.commonAncestorContainer)) return;

    const selectedStr = range.toString();
    if (!selectedStr.trim()) return;

    const preRange = document.createRange();
    preRange.selectNodeContents(docTextRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);

    const clone = preRange.cloneContents();
    clone.querySelectorAll('[data-ignore-offset="true"]').forEach((n) => n.remove());
    const startOffset = clone.textContent?.length ?? 0;

    const selClone = range.cloneContents();
    selClone.querySelectorAll('[data-ignore-offset="true"]').forEach((n) => n.remove());
    const cleanSelected = selClone.textContent || selectedStr;
    const endOffset = startOffset + cleanSelected.length;

    if (endOffset <= startOffset) return;

    const hasOverlap = sortedAnns.some(
      (a) => Math.max(startOffset, a.startOffset) < Math.min(endOffset, a.endOffset)
    );
    if (hasOverlap) {
      setOverlapNotice(
        "Đoạn văn bản này đã có ghi chú. Hãy bấm vào ghi chú hiện có để xem hoặc xóa trước khi tạo mới."
      );
      sel.removeAllRanges();
      setTimeout(() => setOverlapNotice(null), 3500);
      return;
    }

    let timestampSec: number | null = null;
    if (speakingWords && speakingWords.length > 0) {
      let cursor = 0;
      for (const w of speakingWords) {
        const wEnd = cursor + w.word.length;
        if (startOffset <= wEnd && endOffset >= cursor) {
          timestampSec = w.startSec;
          break;
        }
        cursor = wEnd + 1;
      }
    }

    const rect = range.getBoundingClientRect();
    setOverlapNotice(null);
    setPopType("comment");
    setPopCrit(criteriaDefs[0]?.code || "TA_TR");
    setPopInput("");
    setPopover({
      x: Math.min(window.innerWidth - 360, Math.max(12, rect.left)),
      y: Math.min(window.innerHeight - 280, rect.bottom + 8),
      startOffset,
      endOffset,
      quote: cleanSelected.trim(),
      timestampSec,
    });
  };

  const handleConfirmAdd = () => {
    if (!popover || !onAddAnnotation) return;
    if ((popType === "replace" || popType === "insert" || popType === "comment") && !popInput.trim()) {
      return;
    }
    const newId = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onAddAnnotation({
      id: newId,
      startOffset: popover.startOffset,
      endOffset: popover.endOffset,
      quote: popover.quote,
      type: popType,
      criterion: popCrit,
      text: popInput.trim(),
      timestampSec: popover.timestampSec,
    });
    setSelectedId(newId);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderSegmentedText = () => {
    if (!contentText) {
      return <span className="text-slate-400 italic">(Chưa có nội dung văn bản)</span>;
    }

    const segments: Array<{
      start: number;
      end: number;
      text: string;
      ann?: InlineGradingAnnotation;
    }> = [];

    let cursor = 0;
    for (const ann of sortedAnns) {
      const s = Math.max(cursor, Math.min(contentText.length, ann.startOffset));
      const e = Math.max(s, Math.min(contentText.length, ann.endOffset));
      if (s > cursor) {
        segments.push({ start: cursor, end: s, text: contentText.slice(cursor, s) });
      }
      if (e > s) {
        segments.push({ start: s, end: e, text: contentText.slice(s, e), ann });
      }
      cursor = e;
    }
    if (cursor < contentText.length) {
      segments.push({ start: cursor, end: contentText.length, text: contentText.slice(cursor) });
    }

    const wordRanges: Array<{ start: number; end: number; token: SpeakingWordToken }> = [];
    if (speakingWords && speakingWords.length > 0) {
      let wPos = 0;
      for (const tk of speakingWords) {
        wordRanges.push({ start: wPos, end: wPos + tk.word.length, token: tk });
        wPos += tk.word.length + 1;
      }
    }

    const renderPlainChunk = (chunkText: string, baseStart: number) => {
      if (wordRanges.length === 0) return chunkText;
      const nodes: React.ReactNode[] = [];
      let localPos = baseStart;
      const parts = chunkText.split(/(\s+)/);
      parts.forEach((p, idx) => {
        const pStart = localPos;
        localPos += p.length;
        if (!p.trim()) {
          nodes.push(<span key={idx}>{p}</span>);
          return;
        }
        const matched = wordRanges.find((wr) => Math.abs(wr.start - pStart) <= 2);
        const tk = matched?.token;
        const isPlayingNow =
          tk && currentAudioTimeSec >= tk.startSec && currentAudioTimeSec < tk.endSec + 0.15;
        nodes.push(
          <React.Fragment key={idx}>
            <span
              onClick={() => {
                if (tk && onSeekAudio && window.getSelection()?.isCollapsed) {
                  onSeekAudio(tk.startSec);
                }
              }}
              title={tk && onSeekAudio ? `Nhấn để nghe từ giây ${formatSec(tk.startSec)}` : undefined}
              className={`relative group/word rounded-md px-0.5 transition-all duration-150 ${
                onSeekAudio
                  ? "cursor-pointer hover:bg-[#FFF7ED] hover:text-[#EA580C] hover:ring-1 hover:ring-orange-300"
                  : ""
              } ${
                isPlayingNow
                  ? "bg-[#EA580C] text-white font-bold px-1 shadow-2xs ring-2 ring-orange-300"
                  : ""
              } ${
                tk?.isFiller
                  ? "italic text-amber-700 bg-amber-50/80 border-b border-dashed border-amber-400"
                  : ""
              }`}
            >
              {p}
              {tk && onSeekAudio && (
                <span
                  data-ignore-offset="true"
                  className="pointer-events-none opacity-0 group-hover/word:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap"
                >
                  ▶ {formatSec(tk.startSec)}
                </span>
              )}
            </span>
            {tk?.pauseAfterSec && (
              <span
                data-ignore-offset="true"
                className="inline-flex items-center gap-1 select-none text-[10.5px] font-bold bg-orange-50 text-[#EA580C] border border-orange-200 rounded-full px-2 py-0.5 mx-1 align-middle"
              >
                <PauseCircle className="size-3" /> {tk.pauseAfterSec.toFixed(1)}s
              </span>
            )}
          </React.Fragment>
        );
      });
      return nodes;
    };

    return segments.map((seg, idx) => {
      if (!seg.ann) {
        return <React.Fragment key={idx}>{renderPlainChunk(seg.text, seg.start)}</React.Fragment>;
      }
      const ann = seg.ann;
      const colorCfg = CRITERION_COLOR_MAP[ann.criterion] || CRITERION_COLOR_MAP.TA_TR;
      const isSelected = selectedId === ann.id;
      const isHovered = hoveredId === ann.id;
      const isDimmed =
        activeFilter !== null &&
        ann.criterion !== activeFilter &&
        !(activeFilter === "TA_TR" && ann.criterion === "TA");

      let spanStyleClass = "";
      if (ann.type === "comment") {
        spanStyleClass = `${colorCfg.softBgClass} text-slate-900`;
      } else if (ann.type === "delete" || ann.type === "replace") {
        spanStyleClass =
          "bg-rose-100/90 text-rose-900 line-through decoration-rose-600 decoration-2";
      } else if (ann.type === "insert") {
        spanStyleClass = "bg-emerald-100/80 border-b-2 border-dashed border-emerald-600";
      }

      return (
        <React.Fragment key={ann.id}>
          <span
            id={`ann-span-${ann.id}`}
            onMouseEnter={() => setHoveredId(ann.id)}
            onMouseLeave={() => setHoveredId((prev) => (prev === ann.id ? null : prev))}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAnnotation(ann.id, "card");
              if (ann.timestampSec != null && onSeekAudio) {
                onSeekAudio(ann.timestampSec);
              }
            }}
            className={`relative inline group/ann cursor-pointer rounded-md px-1 py-0.5 transition-all duration-150 ${spanStyleClass} ${
              isDimmed ? "opacity-35" : ""
            } ${
              isSelected
                ? "ring-2 ring-[#EA580C] bg-orange-200/80 font-semibold shadow-sm"
                : isHovered
                ? "ring-2 ring-orange-400/80 shadow-xs"
                : "hover:brightness-95"
            }`}
          >
            {/* Nhãn nhỏ gắn ngay đầu cụm chữ khi Hover hoặc Đang chọn */}
            <sup
              data-ignore-offset="true"
              style={{ backgroundColor: colorCfg.hex }}
              className={`inline-flex items-center text-[9px] font-extrabold text-white px-1 py-0 rounded mr-1 align-super select-none transition-transform ${
                isSelected || isHovered ? "scale-110 shadow-2xs" : "opacity-85"
              }`}
            >
              {colorCfg.shortCode}
            </sup>
            {seg.text}

            {/* Floating Tooltip nổi ngay trên dòng chữ khi Hover hoặc Click chọn */}
            {(isHovered || isSelected) && (
              <span
                data-ignore-offset="true"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 w-64 sm:w-72 p-2.5 rounded-xl bg-slate-900/95 text-white text-xs shadow-xl border border-slate-700 leading-snug block animate-in fade-in zoom-in-95 duration-150"
              >
                <span className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      style={{ backgroundColor: colorCfg.hex }}
                      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white"
                    >
                      {colorCfg.shortCode}
                    </span>
                    <b className="text-orange-300 font-bold text-[11px]">
                      {ANNOTATION_TYPE_LABELS[ann.type]}
                    </b>
                  </span>
                  {ann.timestampSec != null && (
                    <span className="text-[10px] font-mono text-slate-300">
                      ▶ {formatSec(ann.timestampSec)}
                    </span>
                  )}
                </span>
                {(ann.type === "replace" || ann.type === "insert") && ann.text && (
                  <span className="block text-emerald-300 font-bold">→ {ann.text}</span>
                )}
                {ann.text && ann.type !== "replace" && ann.type !== "insert" && (
                  <span className="block text-slate-100 font-normal">{ann.text}</span>
                )}
                <span className="block text-[10px] text-slate-400 mt-1">
                  Nhấn để ghim và đối chiếu thẻ nhận xét bên phải
                </span>
              </span>
            )}
          </span>

          {(ann.type === "replace" || ann.type === "insert") && ann.text && (
            <ins
              data-ignore-offset="true"
              onMouseEnter={() => setHoveredId(ann.id)}
              onMouseLeave={() => setHoveredId((prev) => (prev === ann.id ? null : prev))}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAnnotation(ann.id, "card");
              }}
              className={`no-underline bg-emerald-100 text-emerald-800 font-bold rounded-md px-1.5 py-0.5 ml-1 text-[14.5px] cursor-pointer border transition-all ${
                isSelected || isHovered
                  ? "border-emerald-600 ring-2 ring-emerald-400 shadow-xs"
                  : "border-emerald-300/90 hover:bg-emerald-200/70"
              }`}
            >
              → {ann.text}
            </ins>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-3" onClick={() => setSelectedId(null)}>
      {overlapNotice && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="size-4 text-amber-600 shrink-0" />
          <span>{overlapNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_285px] gap-4 items-start">
        {/* Khung trang giấy bài làm chuẩn SIMPACE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
          {/* Thanh tiêu đề phần bài làm + Nút đóng/mở Đề bài */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#EA580C]" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                {headerTitle}
              </h4>
              {badgeText && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    badgeVariant === "warning"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : badgeVariant === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-orange-50 text-[#EA580C] border border-orange-200"
                  }`}
                >
                  {badgeText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!readOnly && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                  <Sparkles className="size-3 text-[#EA580C]" />
                  Quét chọn chữ để nhận xét / sửa lỗi
                </span>
              )}
              {promptText && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPromptExpanded((v) => !v);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-orange-200 bg-[#FFF7ED] text-[#EA580C] hover:bg-orange-100/70 transition"
                >
                  <FileText className="size-3" />
                  <span>{isPromptExpanded ? "Ẩn đề bài" : "Xem đề bài"}</span>
                  {isPromptExpanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Đề bài thu gọn / mở rộng để không chiếm diện tích bài chấm */}
          {promptText && isPromptExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="text-xs leading-relaxed text-slate-700 bg-[#FFF7ED]/70 border border-orange-200/80 rounded-xl p-3.5 mb-4 whitespace-pre-wrap"
            >
              <b className="text-[#EA580C] block mb-1 text-[11px] uppercase tracking-wider">
                Nội dung đề bài / Cue Card:
              </b>
              {promptText}
            </div>
          )}

          {speakingWords && speakingWords.length > 0 && onSeekAudio && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-2">
              <Volume2 className="size-3.5 text-[#EA580C] shrink-0" />
              <span>
                Rê chuột vào từ bất kỳ để xem mốc giây và <b>nhấn vào từ để nghe lại</b> đúng đoạn phát âm đó.
              </span>
            </div>
          )}

          {/* Văn bản bài viết / bản phiên âm */}
          <div
            ref={docTextRef}
            onMouseUp={handleMouseUp}
            onClick={(e) => e.stopPropagation()}
            className="text-[16px] leading-[2.1] text-slate-900 whitespace-pre-wrap select-text font-normal"
          >
            {renderSegmentedText()}
          </div>
        </div>

        {/* Cột lề phải chứa Bộ lọc tiêu chí & Danh sách thẻ ghi chú (.rail) */}
        <div className="space-y-2.5 sticky top-3" onClick={(e) => e.stopPropagation()}>
          {/* Thanh lọc nhanh ghi chú theo 4 tiêu chí */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <b className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-[#EA580C]" />
                <span>Nhận xét trên bài ({sortedAnns.length})</span>
              </b>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="text-[11px] font-semibold text-[#EA580C] hover:underline"
                >
                  Bỏ ghim
                </button>
              )}
            </div>

            {sortedAnns.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition ${
                    activeFilter === null
                      ? "bg-[#EA580C] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({sortedAnns.length})
                </button>
                {criteriaDefs.map((c) => {
                  const count = sortedAnns.filter(
                    (a) => a.criterion === c.code || (c.code === "TA_TR" && a.criterion === "TA")
                  ).length;
                  if (count === 0) return null;
                  const isOn = activeFilter === c.code;
                  const cfg = CRITERION_COLOR_MAP[c.code] || CRITERION_COLOR_MAP.TA_TR;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setFilter(isOn ? null : c.code)}
                      style={isOn ? { backgroundColor: cfg.hex, color: "#fff" } : undefined}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition ${
                        isOn
                          ? "shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {c.shortLabel} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {filteredAnns.length === 0 ? (
            <div className="p-5 rounded-2xl border border-dashed border-slate-200 bg-white/80 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Chưa có ghi chú nào</p>
              <p className="text-[11px] text-slate-400">
                {readOnly
                  ? "Giáo viên không gắn ghi chú trực tiếp trên phần bài này."
                  : "Hãy bôi đen bất kỳ cụm từ nào bên trái để thêm nhận xét hoặc sửa lỗi."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
              {filteredAnns.map((ann) => {
                const colorCfg = CRITERION_COLOR_MAP[ann.criterion] || CRITERION_COLOR_MAP.TA_TR;
                const isSelected = selectedId === ann.id;
                const isHovered = hoveredId === ann.id;

                return (
                  <div
                    key={ann.id}
                    id={`ann-card-${ann.id}`}
                    onMouseEnter={() => setHoveredId(ann.id)}
                    onMouseLeave={() => setHoveredId((prev) => (prev === ann.id ? null : prev))}
                    onClick={() => {
                      handleSelectAnnotation(ann.id, "span");
                      if (ann.timestampSec != null && onSeekAudio) {
                        onSeekAudio(ann.timestampSec);
                      }
                    }}
                    className={`bg-white border border-l-4 ${
                      colorCfg.borderLeftClass
                    } rounded-xl p-3 text-xs cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "border-[#EA580C] ring-2 ring-[#EA580C]/80 bg-[#FFF7ED] shadow-md -translate-x-1"
                        : isHovered
                        ? "border-orange-300 ring-1 ring-orange-300 bg-orange-50/40 shadow-sm -translate-x-0.5"
                        : "border-slate-200 shadow-2xs hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${colorCfg.badgeBgClass}`}
                        >
                          {colorCfg.shortCode}
                        </span>
                        <b className="text-slate-800 font-bold">
                          {ANNOTATION_TYPE_LABELS[ann.type]}
                        </b>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#EA580C] bg-orange-100 px-1.5 py-0.5 rounded">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {ann.timestampSec != null && (
                          <span className="text-[10.5px] font-mono font-bold text-[#EA580C] flex items-center gap-1 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                            <Headphones className="size-3" />
                            {formatSec(ann.timestampSec)}
                          </span>
                        )}
                        {!readOnly && onRemoveAnnotation && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAnnotation(ann.id);
                            }}
                            title="Xóa ghi chú"
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <q className="block text-slate-500 italic text-[11px] my-1 line-clamp-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      {ann.quote}
                    </q>

                    {(ann.type === "replace" || ann.type === "insert") && ann.text && (
                      <div className="text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                        <span>→</span>
                        <span className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded underline decoration-emerald-400">
                          {ann.text}
                        </span>
                      </div>
                    )}
                    {(ann.type === "comment" || ann.type === "delete") && ann.text && (
                      <div className="text-slate-800 font-medium mt-1.5 leading-relaxed">
                        {ann.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Popover nổi khi Giáo viên bôi đen chữ */}
      {!readOnly && popover && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: popover.x, top: popover.y }}
          className="fixed z-50 w-[345px] bg-white border border-orange-200 rounded-2xl p-3.5 shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="text-xs text-slate-600 italic line-clamp-1 border-b border-slate-100 pb-1.5 bg-[#FFF7ED] -mx-3.5 -mt-3.5 px-3.5 py-2 rounded-t-2xl">
            Đoạn chọn: <b className="text-[#EA580C]">“{popover.quote}”</b>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {(
              [
                ["comment", "Nhận xét", MessageSquare],
                ["delete", "Xóa", Scissors],
                ["replace", "Thay", ArrowLeftRight],
                ["insert", "Thêm", Plus],
              ] as const
            ).map(([tKey, label, Icon]) => (
              <button
                key={tKey}
                type="button"
                onClick={() => setPopType(tKey)}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg border text-[11.5px] font-bold transition ${
                  popType === tKey
                    ? "border-[#EA580C] bg-[#FFF7ED] text-[#EA580C]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {criteriaDefs.map((c) => {
              const cfg = CRITERION_COLOR_MAP[c.code] || CRITERION_COLOR_MAP.TA_TR;
              const active = popCrit === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setPopCrit(c.code)}
                  style={{
                    borderColor: cfg.hex,
                    backgroundColor: active ? cfg.hex : "#ffffff",
                    color: active ? "#ffffff" : cfg.hex,
                  }}
                  className="px-2.5 py-0.5 rounded-full border-2 text-[11px] font-extrabold transition"
                >
                  {c.shortLabel}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            autoFocus
            value={popInput}
            onChange={(e) => setPopInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmAdd();
              if (e.key === "Escape") setPopover(null);
            }}
            placeholder={
              popType === "comment"
                ? "Nhập nhận xét cho đoạn này..."
                : popType === "delete"
                ? "Lý do đề xuất xóa (không bắt buộc)..."
                : popType === "replace"
                ? "Nhập từ/cụm từ đề xuất thay thế..."
                : "Nhập từ/cụm từ đề xuất thêm vào sau..."
            }
            className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
          />
          <div className="flex items-center justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setPopover(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              className="px-3.5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#c2410c] text-white text-xs font-bold shadow-xs"
            >
              Lưu ghi chú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
