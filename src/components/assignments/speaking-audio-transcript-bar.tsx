"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Edit3,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SpeakingTranscriptPayload,
  buildWordTokensFromRawText,
} from "@/lib/ielts-report-config";
import { transcribeSpeakingAnswerAction } from "@/actions/assignments";

export interface SpeakingAudioTranscriptBarProps {
  audioUrl?: string | null;
  questionPrompt?: string;
  transcript?: SpeakingTranscriptPayload | null;
  onChangeTranscript: (next: SpeakingTranscriptPayload) => void;
  currentTimeSec: number;
  onTimeChange: (sec: number) => void;
}

const WAVE_BARS = Array.from({ length: 68 }, (_, i) =>
  Math.round(8 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)) * 28)
);

export function SpeakingAudioTranscriptBar({
  audioUrl,
  questionPrompt,
  transcript,
  onChangeTranscript,
  currentTimeSec,
  onTimeChange,
}: SpeakingAudioTranscriptBarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState<number>(transcript?.durationSec || 112);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [isEditingText, setIsEditingText] = useState(false);
  const [draftText, setDraftText] = useState(transcript?.rawText || "");

  useEffect(() => {
    if (transcript?.durationSec) {
      setDurationSec(transcript.durationSec);
    }
    setDraftText(transcript?.rawText || "");
  }, [transcript?.rawText, transcript?.durationSec]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      if (audioRef.current && !audioRef.current.paused && audioRef.current.duration > 0) {
        onTimeChange(audioRef.current.currentTime);
      } else {
        onTimeChange(Math.min(durationSec, currentTimeSec + 0.5));
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isPlaying, currentTimeSec, durationSec, onTimeChange]);

  const formatClock = (s: number) => {
    const r = Math.max(0, Math.round(s));
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    if (audioRef.current && audioUrl) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleSeek = (targetSec: number) => {
    const clamped = Math.max(0, Math.min(durationSec, targetSec));
    onTimeChange(clamped);
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      try {
        audioRef.current.currentTime = clamped;
      } catch {}
    }
  };

  const handleGenerateTranscript = async () => {
    setIsGenerating(true);
    setTranscribeError(null);
    const res = await transcribeSpeakingAnswerAction({
      audioUrl,
      questionPrompt,
    });
    setIsGenerating(false);
    if (res.success && res.transcript) {
      onChangeTranscript(res.transcript);
    } else {
      setTranscribeError(
        res.error || "Không thể tạo bản ghi chữ từ tệp âm thanh này!"
      );
    }
  };

  const handleSaveEditedText = () => {
    if (!transcript) return;
    const clean = draftText.trim();
    const updatedWords = buildWordTokensFromRawText(clean, durationSec);
    onChangeTranscript({
      ...transcript,
      rawText: updatedWords.map((w) => w.word).join(" "),
      words: updatedWords,
    });
    setIsEditingText(false);
  };

  return (
    <div className="bg-white border border-orange-200/80 rounded-2xl p-3.5 sm:px-5 shadow-2xs sticky top-0 z-20 space-y-2.5">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => {
            if (
              audioRef.current &&
              Number.isFinite(audioRef.current.duration) &&
              audioRef.current.duration > 1
            ) {
              setDurationSec(Math.round(audioRef.current.duration));
            }
          }}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Hàng 1: Nút Play + Thanh sóng âm (Waveform) + Thời gian + Nút tạo Transcript */}
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={handleTogglePlay}
          className="size-10 rounded-full bg-[#EA580C] hover:bg-[#c2410c] text-white flex items-center justify-center shrink-0 shadow-xs transition"
          title={isPlaying ? "Tạm dừng" : "Phát bản ghi âm của học viên"}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>

        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
            handleSeek(ratio * durationSec);
          }}
          className="flex-1 flex items-center gap-[2px] h-9 cursor-pointer select-none px-2 py-1 rounded-xl bg-[#FFF7ED]/70 border border-orange-100"
          title="Nhấn vào sóng âm để tua đến vị trí bất kỳ"
        >
          {WAVE_BARS.map((h, idx) => {
            const played = idx / WAVE_BARS.length < currentTimeSec / Math.max(1, durationSec);
            return (
              <i
                key={idx}
                style={{ height: `${h}px` }}
                className={`flex-1 rounded-xs transition-colors ${
                  played ? "bg-[#EA580C]" : "bg-orange-200/70 hover:bg-orange-300"
                }`}
              />
            );
          })}
        </div>

        <div className="text-xs font-mono font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
          {formatClock(currentTimeSec)} / {formatClock(durationSec)}
        </div>

        {!transcript && (
          <Button
            type="button"
            size="sm"
            disabled={isGenerating}
            onClick={handleGenerateTranscript}
            className="h-9 px-3.5 rounded-xl bg-[#EA580C] hover:bg-[#c2410c] text-white text-xs font-bold gap-1.5 shrink-0 shadow-xs"
          >
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span>{isGenerating ? "Đang phân tích AI..." : "Bóc tách chữ (AI Whisper)"}</span>
          </Button>
        )}
      </div>

      {transcribeError && (
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="size-4 text-rose-600 shrink-0" />
          <span>{transcribeError}</span>
        </div>
      )}

      {/* Hàng 2: Thanh công cụ gọn trên 1 hàng duy nhất */}
      {transcript && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Sparkles className="size-3.5 text-[#EA580C] shrink-0" />
              <span>
                Bản ghi AI Whisper (tham chiếu) · <b className="text-slate-700">Nhấn vào từng từ</b> dưới bài để nghe lại đúng mốc giây
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsEditingText((v) => !v)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition ${
                  isEditingText
                    ? "border-[#EA580C] bg-[#FFF7ED] text-[#EA580C]"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <Edit3 className="size-3" />
                <span>{isEditingText ? "Đóng sửa chữ" : "Sửa bản ghi"}</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateTranscript}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                title="Chạy lại AI Whisper"
              >
                <RefreshCw className={`size-3 ${isGenerating ? "animate-spin text-[#EA580C]" : ""}`} />
                <span>Tạo lại</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeTranscript({
                    ...transcript,
                    isVisibleToStudent: !transcript.isVisibleToStudent,
                  })
                }
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border flex items-center gap-1 transition ${
                  transcript.isVisibleToStudent
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="Bật/tắt hiển thị bản phiên âm cho học viên khi xem kết quả"
              >
                {transcript.isVisibleToStudent ? (
                  <>
                    <Eye className="size-3 text-emerald-600" />
                    <span>HV được xem chữ</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="size-3 text-slate-500" />
                    <span>Đang ẩn chữ với HV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isEditingText && (
            <div className="p-3 rounded-xl bg-[#FFF7ED]/60 border border-orange-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                Chỉnh sửa văn bản phiên âm (nếu AI nghe nhầm từ):
              </label>
              <textarea
                rows={3}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingText(false)}
                  className="h-7 text-xs rounded-lg"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEditedText}
                  className="h-7 text-xs rounded-lg bg-[#EA580C] hover:bg-[#c2410c] text-white gap-1"
                >
                  <Check className="size-3" /> Lưu văn bản
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
