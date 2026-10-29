"use client";
import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Clock, User, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
interface SpeakingPartViewProps {
  part: "PART_1" | "PART_2" | "PART_3";
  questionText: string;
  cueCardBulletPoints?: string[];
  onRecordingComplete?: (audioBlob: Blob, durationSec: number, dataUrl?: string) => void;
  disabled?: boolean;
}
export function SpeakingPartView({
  part,
  questionText,
  cueCardBulletPoints = [
    "Who the person is",
    "When you met them",
    "Why they inspired you",
    "And explain how they have influenced you",
  ],
  onRecordingComplete,
  disabled = false,
}: SpeakingPartViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);
  const [speakTimeLeft, setSpeakTimeLeft] = useState(120);
  const [cuePhase, setCuePhase] = useState<"PREP" | "SPEAK">("PREP");
  const [notes, setNotes] = useState("");
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
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : URL.createObjectURL(audioBlob);
          setAudioUrl(dataUrl);
          onRecordingComplete?.(audioBlob, recordSeconds, dataUrl);
        };
        reader.readAsDataURL(audioBlob);
      };
      recorder.start();
      setIsRecording(true);
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
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };
  return (
    <div className="space-y-4">
      {/* 4.1 Part 1 & Part 3 (Q&A) */}
      {part !== "PART_2" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
            <span className="px-2.5 py-1 rounded-md bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider">
              {part === "PART_1" ? "4.1 Part 1 (Q&A Phỏng vấn)" : "4.1 Part 3 (Q&A Thảo luận chuyên sâu)"}
            </span>
          </div>
          {/* Bong bóng câu hỏi Giám khảo (Examiner) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <div className="size-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
              <User className="size-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Examiner (Giám khảo)
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed font-sans">
                {questionText || "Do you live in a house or an apartment? Why do you prefer it?"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 4.2 Part 2 (Cue Card) */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="px-2.5 py-1 rounded-md bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider">
              4.2 Part 2 (Cue Card - Thuyết trình độc thoại)
            </span>
          </div>
          {/* 2 Đồng hồ đếm ngược */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-3 rounded-xl border text-center transition-all ${
                cuePhase === "PREP"
                  ? "bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-400/30"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 mb-1">
                <Clock className="size-3 text-amber-600" /> Thời gian chuẩn bị
              </div>
              <div className="text-base font-extrabold font-mono text-amber-700">
                {formatTimer(prepTimeLeft)}
              </div>
            </div>
            <div
              className={`p-3 rounded-xl border text-center transition-all ${
                cuePhase === "SPEAK"
                  ? "bg-emerald-50 border-emerald-300 shadow-sm ring-1 ring-emerald-400/30"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 mb-1">
                <Mic className="size-3 text-emerald-600" /> Thời gian nói
              </div>
              <div className="text-base font-extrabold font-mono text-emerald-700">
                {formatTimer(speakTimeLeft)}
              </div>
            </div>
          </div>
          {/* Thẻ đề bài Cue Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-2xs font-serif">
            <h4 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              {questionText || "Describe a person who inspired you."}
            </h4>
            <p className="text-xs text-slate-600 font-sans italic">You should say:</p>
            <ul className="text-xs text-slate-800 space-y-1 pl-4 list-disc font-sans leading-relaxed">
              {cueCardBulletPoints.map((pt, idx) => (
                <li key={idx}>{pt}</li>
              ))}
            </ul>
          </div>
          {/* Khung ghi chú nháp (Scratchpad) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Ghi chú nháp (Scratchpad):</span>
              <span className="font-mono text-slate-400">{notes.length}/200</span>
            </div>
            <textarea
              disabled={disabled}
              maxLength={200}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Viết các ý chính hoặc từ khóa chuẩn bị tại đây..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#EA580C] resize-none"
            />
          </div>
        </div>
      )}

      {/* Khung ghi âm micro dùng chung cho cả Part 1, Part 2 và Part 3 */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white text-center space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-center gap-1.5 h-12">
          {[4, 8, 14, 22, 16, 26, 12, 18, 24, 10, 6, 16, 20, 8].map((height, i) => (
            <div
              key={i}
              style={{
                height: isRecording
                  ? `${Math.max(6, (height * ((recordSeconds % 3) + 1)) % 32)}px`
                  : "6px",
              }}
              className={`w-1 rounded-full transition-all duration-200 ${
                isRecording ? "bg-[#EA580C]" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <div className="text-xs font-semibold text-slate-600">
          {isRecording ? (
            <span className="text-[#EA580C] animate-pulse font-bold">● Đang ghi âm bài nói...</span>
          ) : audioUrl ? (
            <span className="text-emerald-700 font-bold">Đã ghi âm xong bài nói</span>
          ) : (
            <span>Nhấn nút bên dưới để bắt đầu thu âm trả lời</span>
          )}
        </div>
        <div className="text-sm font-mono font-bold text-slate-800">
          {formatTimer(recordSeconds)} / 02:00
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          {!isRecording ? (
            <Button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="bg-[#EA580C] hover:bg-[#c2410c] text-white text-xs font-bold rounded-xl px-4 py-2 gap-1.5 shadow-sm"
            >
              <Mic className="size-3.5" />
              Bắt đầu ghi âm
            </Button>
          ) : (
            <Button
              type="button"
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl px-4 py-2 gap-1.5 shadow-sm"
            >
              <Square className="size-3.5 fill-white" />
              Dừng ghi âm
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
              className="border-slate-300 text-xs font-semibold rounded-xl px-3 gap-1.5 text-slate-700 hover:bg-slate-50"
            >
              {isPlayingBack ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {isPlayingBack ? "Tạm dừng" : "Nghe lại"}
            </Button>
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