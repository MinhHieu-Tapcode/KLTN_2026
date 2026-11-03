"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Play, Pause, Clock, User, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadMaterialFileClient } from "@/lib/upload-material-client";

interface SpeakingPartViewProps {
  part: "PART_1" | "PART_2" | "PART_3";
  questionText: string;
  imageUrl?: string | null;
  cueCardBulletPoints?: string[];
  initialAudioUrl?: string | null;
  onRecordingComplete?: (audioBlob: Blob | null, durationSec: number, dataUrl?: string) => void;
  disabled?: boolean;
}

function parseCueCardFromText(rawText: string, explicitBullets?: string[]) {
  if (explicitBullets && explicitBullets.length > 0) {
    return { mainTopic: rawText, bullets: explicitBullets };
  }
  const lines = (rawText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bullets: string[] = [];
  const topicLines: string[] = [];

  for (const line of lines) {
    if (/^(?:[-•*]|you should say)/i.test(line)) {
      if (!/^you should say/i.test(line)) {
        bullets.push(line.replace(/^[-•*]\s*/, ""));
      }
    } else if (bullets.length > 0 && /^and explain/i.test(line)) {
      bullets.push(line);
    } else {
      topicLines.push(line);
    }
  }

  return {
    mainTopic: topicLines.join(" ") || "Talk about a place you would like to visit.",
    bullets:
      bullets.length > 0
        ? bullets
        : [
            "Where it is",
            "What you can do there",
            "Who you would go with",
            "And explain why you like it",
          ],
  };
}

export function SpeakingPartView({
  part,
  questionText,
  imageUrl,
  cueCardBulletPoints,
  initialAudioUrl,
  onRecordingComplete,
  disabled = false,
}: SpeakingPartViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const [prepTimeLeft, setPrepTimeLeft] = useState(60);
  const [speakTimeLeft, setSpeakTimeLeft] = useState(120);
  const [cuePhase, setCuePhase] = useState<"PREP" | "SPEAK">("PREP");
  const [notes, setNotes] = useState("");

  const { mainTopic, bullets } = parseCueCardFromText(questionText, cueCardBulletPoints);

  useEffect(() => {
    if (part !== "PART_2") return;
    const interval = setInterval(() => {
      if (cuePhase === "PREP") {
        setPrepTimeLeft((prev) => {
          if (prev <= 1) {
            setCuePhase("SPEAK");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setSpeakTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [part, cuePhase]);

  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const saveAudioBlobToServer = async (blob: Blob, duration: number) => {
    setIsUploadingAudio(true);
    const file = new File([blob], `speaking_response_${Date.now()}.webm`, {
      type: blob.type || "audio/webm",
    });
    const res = await uploadMaterialFileClient(file);
    setIsUploadingAudio(false);

    if (res.success && res.fileUrl) {
      setAudioUrl(res.fileUrl);
      onRecordingComplete?.(blob, duration, res.fileUrl);
      return;
    }

    // Dự phòng nếu mất mạng tạm thời
    const reader = new FileReader();
    reader.onloadend = () => {
      const fallbackUrl =
        typeof reader.result === "string" ? reader.result : URL.createObjectURL(blob);
      setAudioUrl(fallbackUrl);
      onRecordingComplete?.(blob, duration, fallbackUrl);
    };
    reader.readAsDataURL(blob);
  };

  const startRecording = async () => {
    if (disabled) return;
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        saveAudioBlobToServer(audioBlob, recordSeconds);
      };
      recorder.start();
      setIsRecording(true);
      setCuePhase("SPEAK");
      setRecordSeconds(0);
      setAudioUrl(null);
    } catch {
      setIsRecording(true);
      setRecordSeconds(0);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  };

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudio(true);
    const res = await uploadMaterialFileClient(file);
    setIsUploadingAudio(false);
    if (res.success && res.fileUrl) {
      setAudioUrl(res.fileUrl);
      onRecordingComplete?.(file, 60, res.fileUrl);
    }
    e.target.value = "";
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {part !== "PART_2" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">
              Speaking
            </span>
            <span className="text-xs font-extrabold text-slate-900">
              {part === "PART_1" ? "Part 1 — Introduction & Interview" : "Part 3 — Two-way Discussion"}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-orange-200/80 flex items-start gap-3">
            <div className="size-9 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
              <User className="size-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider block mb-0.5">
                Examiner Question
              </span>
              <p className="text-sm font-bold text-slate-900 leading-relaxed">
                {questionText || "Do you live in a house or an apartment? Why do you prefer it?"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* GIAO DIỆN PART 2 - CUE CARD CHUẨN SIMPACE */
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">
              Speaking
            </span>
            <h3 className="text-base font-extrabold text-slate-900 pt-0.5">Part 2 – Cue Card</h3>
            <p className="text-xs text-slate-500">
              Your cue card is below. You have 1 minute to prepare and up to 2 minutes to speak.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Khung trái: Thẻ Cue Card nền cam nhạt (kèm ảnh nếu có) */}
            <div className="md:col-span-8 p-5 rounded-2xl bg-[#FFF7ED] border border-orange-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Cue card topic"
                    className="w-full sm:w-40 h-32 object-cover rounded-xl border border-orange-200 shrink-0"
                  />
                )}
                <div className="space-y-2 flex-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#EA580C]">
                    Cue Card Topic
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{mainTopic}</h4>
                  <p className="text-xs font-semibold text-slate-700">You should say:</p>
                  <ul className="text-xs text-slate-800 space-y-1 pl-4 list-disc leading-relaxed">
                    {bullets.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-orange-200/60">
                <textarea
                  disabled={disabled}
                  maxLength={250}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú nhanh từ khóa trong 1 phút chuẩn bị (Notes / Scratchpad)..."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border border-orange-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C] resize-none"
                />
              </div>
            </div>

            {/* Khung phải: Đồng hồ tròn SIMPACE */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4">
              <div className="size-36 rounded-full border-8 border-orange-100 border-t-[#EA580C] border-r-[#EA580C] flex flex-col items-center justify-center bg-white shadow-sm">
                <span className="text-2xl font-extrabold font-mono text-slate-900">
                  {isRecording
                    ? formatTimer(recordSeconds)
                    : cuePhase === "PREP"
                    ? formatTimer(prepTimeLeft)
                    : formatTimer(speakTimeLeft)}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isRecording
                    ? "Recording..."
                    : cuePhase === "PREP"
                    ? "Preparation"
                    : "Speaking Time"}
                </span>
              </div>
              {cuePhase === "PREP" && !isRecording && (
                <button
                  type="button"
                  onClick={() => setCuePhase("SPEAK")}
                  className="mt-2 text-[11px] font-semibold text-[#EA580C] hover:underline"
                >
                  Bỏ qua chuẩn bị → Bắt đầu nói ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thanh điều khiển Ghi âm & Tải file âm thanh */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 h-8 px-3 rounded-xl bg-slate-50 border border-slate-200">
            {[6, 12, 20, 14, 24, 10, 18, 22, 12, 8].map((h, i) => (
              <div
                key={i}
                style={{
                  height: isRecording
                    ? `${Math.max(5, (h * ((recordSeconds % 3) + 1)) % 24)}px`
                    : "5px",
                }}
                className={`w-1 rounded-full transition-all ${
                  isRecording ? "bg-[#EA580C]" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
          <div className="text-xs">
            {isUploadingAudio ? (
              <span className="font-bold text-[#EA580C] flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> Đang lưu bản thu âm...
              </span>
            ) : isRecording ? (
              <span className="font-bold text-[#EA580C] animate-pulse">
                ● Đang thu âm ({formatTimer(recordSeconds)})
              </span>
            ) : audioUrl ? (
              <span className="font-bold text-emerald-700">
                ✓ Đã lưu bản thu âm trả lời
              </span>
            ) : (
              <span className="text-slate-600 font-medium">
                Bấm <b>Start Speaking</b> để thu âm hoặc tải file ghi âm lên
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {!isRecording ? (
            <Button
              type="button"
              onClick={startRecording}
              disabled={disabled || isUploadingAudio}
              className="bg-[#EA580C] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl px-5 h-9 gap-1.5 shadow-sm"
            >
              <Mic className="size-3.5" />
              {audioUrl ? "Thu âm lại" : "Start Speaking"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={stopRecording}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl px-5 h-9 gap-1.5 shadow-sm"
            >
              <Square className="size-3.5 fill-white" />
              Dừng & Lưu bài nói
            </Button>
          )}

          {audioUrl && !isRecording && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (playbackAudioRef.current) {
                  if (isPlayingBack) {
                    playbackAudioRef.current.pause();
                    setIsPlayingBack(false);
                  } else {
                    playbackAudioRef.current.play();
                    setIsPlayingBack(true);
                  }
                }
              }}
              className="border-slate-300 text-xs font-semibold rounded-xl px-3 h-9 gap-1.5 text-slate-700"
            >
              {isPlayingBack ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {isPlayingBack ? "Tạm dừng" : "Nghe lại"}
            </Button>
          )}

          {!isRecording && (
            <label className="px-3 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition">
              <Upload className="size-3.5 text-slate-500" />
              <span>Tải file âm thanh</span>
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm"
                className="hidden"
                disabled={disabled || isUploadingAudio}
                onChange={handleUploadAudioFile}
              />
            </label>
          )}
        </div>

        {audioUrl && (
          <audio
            ref={playbackAudioRef}
            src={audioUrl}
            onEnded={() => setIsPlayingBack(false)}
            className="hidden"
          />
        )}
      </div>
    </div>
  );
}
