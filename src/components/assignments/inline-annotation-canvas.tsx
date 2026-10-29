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
}: InlineAnnotationCanvasProps) {
  const docTextRef = useRef<HTMLDivElement | null>(null);
  const [flashedId, setFlashedId] = useState<string | null>(null);
  const [overlapNotice, setOverlapNotice] = useState<string | null>(null);

  // State cho Popover khi bôi đen văn bản
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

  const formatSec = (s: number) => {
    const r = Math.max(0, Math.round(s));
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
  };

  const triggerFlash = (id: string) => {
    setFlashedId(id);
    const el = document.getElementById(`ann-card-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => setFlashedId((prev) => (prev === id ? null : prev)), 1200);
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

    // Tính offset bằng cách lấy toàn bộ text gốc từ đầu docTextRef tới điểm bắt đầu của range
    const preRange = document.createRange();
    preRange.selectNodeContents(docTextRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);

    // Loại bỏ text của các thẻ <ins data-suggested="true"> và thẻ pause khỏi phép tính offset
    const clone = preRange.cloneContents();
    clone.querySelectorAll('[data-ignore-offset="true"]').forEach((n) => n.remove());
    const startOffset = clone.textContent?.length ?? 0;

    const selClone = range.cloneContents();
    selClone.querySelectorAll('[data-ignore-offset="true"]').forEach((n) => n.remove());
    const cleanSelected = selClone.textContent || selectedStr;
    const endOffset = startOffset + cleanSelected.length;

    if (endOffset <= startOffset) return;

    // Kiểm tra chồng lấp (Quy tắc số 5: Không cho ghi đè lên ghi chú đã có)
    const hasOverlap = sortedAnns.some(
      (a) => Math.max(startOffset, a.startOffset) < Math.min(endOffset, a.endOffset)
    );
    if (hasOverlap) {
      setOverlapNotice(
        "Đoạn văn bản này đã có ghi chú. Vui lòng chọn đoạn khác hoặc xóa ghi chú cũ trước khi tạo mới."
      );
      sel.removeAllRanges();
      setTimeout(() => setOverlapNotice(null), 3500);
      return;
    }

    // Tìm mốc thời gian nếu là bài Speaking
    let timestampSec: number | null = null;
    if (speakingWords && speakingWords.length > 0) {
      let cursor = 0;
      for (const w of speakingWords) {
        const wEnd = cursor + w.word.length;
        if ( startOffset <= wEnd && endOffset >= cursor) {
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
    onAddAnnotation({
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startOffset: popover.startOffset,
      endOffset: popover.endOffset,
      quote: popover.quote,
      type: popType,
      criterion: popCrit,
      text: popInput.trim(),
      timestampSec: popover.timestampSec,
    });
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  // Dựng các đoạn văn bản xen kẽ với các thẻ đánh dấu (annotations)
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

    // Bản đồ mốc thời gian từng từ nếu là Speaking
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
      // Render từng từ để hỗ trợ bấm tua audio và đánh dấu từ đệm "um/uh"
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
              className={`rounded px-0.5 transition-colors ${
                onSeekAudio ? "cursor-pointer hover:bg-orange-100/70" : ""
              } ${isPlayingNow ? "bg-orange-200 text-slate-900 font-semibold" : ""} ${
                tk?.isFiller ? "italic text-amber-700 font-medium" : ""
              }`}
            >
              {p}
            </span>
            {tk?.pauseAfterSec && (
              <span
                data-ignore-offset="true"
                className="inline-flex items-center gap-1 select-none text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 mx-1 align-middle"
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
      const isFlashed = flashedId === ann.id;

      let spanStyleClass = "";
      if (ann.type === "comment") {
        spanStyleClass = `${colorCfg.softBgClass} text-slate-900`;
      } else if (ann.type === "delete" || ann.type === "replace") {
        spanStyleClass =
          "bg-rose-100/90 text-slate-800 line-through decoration-rose-600 decoration-2";
      } else if (ann.type === "insert") {
        spanStyleClass = "bg-emerald-100/70 border-b-2 border-dashed border-emerald-600";
      }

      return (
        <React.Fragment key={ann.id}>
          <span
            id={`ann-span-${ann.id}`}
            onClick={() => triggerFlash(ann.id)}
            className={`cursor-pointer rounded-xs px-0.5 transition ${spanStyleClass} ${
              isFlashed ? "ring-2 ring-amber-400" : ""
            }`}
          >
            {seg.text}
          </span>
          {(ann.type === "replace" || ann.type === "insert") && ann.text && (
            <ins
              data-ignore-offset="true"
              onClick={() => triggerFlash(ann.id)}
              className="no-underline bg-emerald-100 text-emerald-800 font-bold rounded px-1.5 py-0.5 ml-1 text-[15px] cursor-pointer border border-emerald-300/80"
            >
              {ann.text}
            </ins>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-2.5">
      {overlapNotice && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="size-4 text-amber-600 shrink-0" />
          <span>{overlapNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px] gap-5 items-start">
        {/* Khung trang giấy bài làm (.doc) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {headerTitle}
            </h4>
            {badgeText && (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  badgeVariant === "warning"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : badgeVariant === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>

          {promptText && (
            <div className="text-xs leading-relaxed text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-4 whitespace-pre-wrap">
              {promptText}
            </div>
          )}

          <div
            ref={docTextRef}
            onMouseUp={handleMouseUp}
            className="text-[16.5px] leading-[2.05] text-slate-900 whitespace-pre-wrap select-text"
          >
            {renderSegmentedText()}
          </div>
        </div>

        {/* Cột lề phải chứa các thẻ ghi chú (.rail) */}
        <div className="space-y-2.5">
          {sortedAnns.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-white/60 text-center text-xs text-slate-400">
              {readOnly
                ? "Không có ghi chú trực tiếp trên phần bài này."
                : "Quét chọn một cụm từ trong bài viết để thêm nhận xét, gạch xóa hoặc đề xuất từ thay thế."}
            </div>
          ) : (
            sortedAnns.map((ann) => {
              const colorCfg = CRITERION_COLOR_MAP[ann.criterion] || CRITERION_COLOR_MAP.TA_TR;
              const isFlashed = flashedId === ann.id;
              return (
                <div
                  key={ann.id}
                  id={`ann-card-${ann.id}`}
                  onClick={() => {
                    const sp = document.getElementById(`ann-span-${ann.id}`);
                    if (sp) sp.scrollIntoView({ behavior: "smooth", block: "center" });
                    if (ann.timestampSec != null && onSeekAudio) {
                      onSeekAudio(ann.timestampSec);
                    }
                  }}
                  className={`bg-white border border-slate-200 border-l-4 ${
                    colorCfg.borderLeftClass
                  } rounded-xl p-3 text-xs shadow-2xs cursor-pointer transition ${
                    isFlashed ? "ring-2 ring-amber-400 bg-amber-50/30" : "hover:border-slate-300"
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
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ann.timestampSec != null && (
                        <span className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Headphones className="size-3 text-slate-600" />
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
                  <q className="block text-slate-500 italic text-[11.5px] my-1 line-clamp-2">
                    {ann.quote}
                  </q>
                  {(ann.type === "replace" || ann.type === "insert") && ann.text && (
                    <div className="text-emerald-700 font-bold mt-1">
                      → <span className="underline decoration-emerald-400">{ann.text}</span>
                    </div>
                  )}
                  {(ann.type === "comment" || ann.type === "delete") && ann.text && (
                    <div className="text-slate-700 mt-1 leading-relaxed">{ann.text}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Popover nổi khi Giáo viên bôi đen chữ */}
      {!readOnly && popover && (
        <div
          style={{ left: popover.x, top: popover.y }}
          className="fixed z-50 w-[345px] bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xl space-y-2.5"
        >
          <div className="text-xs text-slate-500 italic line-clamp-1 border-b border-slate-100 pb-1.5">
            “{popover.quote}”
          </div>
          <div className="grid grid-cols-4 gap-1.5">
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
                    ? "border-[#EA580C] bg-orange-50 text-[#EA580C]"
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
            className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
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
              className="px-3.5 py-1.5 rounded-lg bg-[#EA580C] hover:bg-[#c2410c] text-white text-xs font-bold"
            >
              Thêm ghi chú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
