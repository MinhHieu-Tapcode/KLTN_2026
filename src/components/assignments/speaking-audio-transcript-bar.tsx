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
  Math.round(10 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)) * 32)
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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs sticky top-0 z-20 space-y-3">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 1) {
              setDurationSec(Math.round(audioRef.current.duration));
            }
          }}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Hàng 1: Nút Play + Thanh sóng âm (Waveform) + Thời gian + Nút tạo Transcript */}
      <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          onClick={handleTogglePlay}
          className="size-11 rounded-full bg-[#EA580C] hover:bg-[#c2410c] text-white flex items-center justify-center shrink-0 shadow-xs transition"
          title={isPlaying ? "Tạm dừng" : "Phát bản ghi âm của học viên"}
        >
          {isPlaying ? <Pause className="size-4.5" /> : <Play className="size-4.5 ml-0.5" />}
        </button>

        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
            handleSeek(ratio * durationSec);
          }}
          className="flex-1 flex items-center gap-[2px] h-11 cursor-pointer select-none px-1"
          title="Nhấn vào sóng âm để tua đến vị trí bất kỳ"
        >
          {WAVE_BARS.map((h, idx) => {
            const played = idx / WAVE_BARS.length < currentTimeSec / Math.max(1, durationSec);
            return (
              <i
                key={idx}
                style={{ height: `${h}px` }}
                className={`flex-1 rounded-xs transition-colors ${
                  played ? "bg-[#EA580C]" : "bg-slate-300 hover:bg-slate-400"
                }`}
              />
            );
          })}
        </div>

        <div className="text-xs font-mono font-bold text-slate-500 w-22 text-right shrink-0">
          {formatClock(currentTimeSec)} / {formatClock(durationSec)}
        </div>

        {!transcript && (
          <Button
            type="button"
            size="sm"
            disabled={isGenerating}
            onClick={handleGenerateTranscript}
            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold gap-1.5 shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span>{isGenerating ? "Đang tạo bản ghi..." : "Tạo bản ghi chữ (AI)"}</span>
          </Button>
        )}
      </div>

      {transcribeError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="size-4 text-rose-600 shrink-0" />
          <span>{transcribeError}</span>
        </div>
      )}

      {/* Hàng 2: Cảnh báo AI Whisper + Sửa văn bản + Công tắc duyệt cho học sinh xem */}
      {transcript && (
        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2 leading-relaxed">
              <AlertTriangle className="size-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Bản ghi chữ do AI (Whisper) tạo theo yêu cầu, <b>có thể bỏ sót từ đệm hoặc nghe nhầm từ phát âm sai</b>. Hãy dùng làm tham chiếu và bấm vào từng từ để nghe lại audio.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingText((v) => !v)}
                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center gap-1"
              >
                <Edit3 className="size-3" />
                <span>{isEditingText ? "Đóng sửa" : "Sửa bản ghi"}</span>
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateTranscript}
                className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center gap-1"
              >
                <RefreshCw className={`size-3 ${isGenerating ? "animate-spin" : ""}`} />
                <span>Tạo lại</span>
              </button>
            </div>
          </div>

          {isEditingText && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                Chỉnh sửa văn bản phiên âm (nếu AI nghe nhầm từ):
              </label>
              <textarea
                rows={3}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
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
                  <Check className="size-3" /> Cập nhật văn bản
                </Button>
              </div>
            </div>
          )}

          {/* Công tắc cho phép học viên xem bản phiên âm */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              {transcript.isVisibleToStudent ? (
                <Eye className="size-4 text-emerald-600 shrink-0" />
              ) : (
                <EyeOff className="size-4 text-slate-400 shrink-0" />
              )}
              <div>
                <b className="text-slate-900">
                  Hiển thị bản ghi chữ & ghi chú trực tiếp cho học viên xem
                </b>
                <span className="block text-[11px] text-slate-500">
                  {transcript.isVisibleToStudent
                    ? "Đang bật: Học viên sẽ thấy bản ghi chữ kèm các vết sửa lỗi khi xem lại bài."
                    : "Đang tắt: Học viên chỉ thấy file ghi âm, bảng điểm 4 tiêu chí và nhận xét."}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onChangeTranscript({
                  ...transcript,
                  isVisibleToStudent: !transcript.isVisibleToStudent,
                })
              }
              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition shrink-0 ${
                transcript.isVisibleToStudent
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {transcript.isVisibleToStudent ? "Cho học viên xem" : "Ẩn với học viên"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
