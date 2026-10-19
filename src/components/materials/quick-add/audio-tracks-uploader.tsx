"use client";

import React, { useRef } from "react";
import { Headphones, CheckCircle2, Trash2, KeyRound, AlertCircle, FileText } from "lucide-react";

interface AudioTracksUploaderProps {
  isRequired: boolean;
  audioFiles: File[];
  onChangeAudioFiles: (files: File[]) => void;
  answerKeyFile: File | null;
  onChangeAnswerKeyFile: (file: File | null) => void;
}

export function AudioTracksUploader({
  isRequired,
  audioFiles,
  onChangeAudioFiles,
  answerKeyFile,
  onChangeAnswerKeyFile,
}: AudioTracksUploaderProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);

  const handleAudioFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    // Ghép thêm vào danh sách hiện tại
    onChangeAudioFiles([...audioFiles, ...newFiles]);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const handleRemoveAudioFile = (index: number) => {
    const updated = audioFiles.filter((_, i) => i !== index);
    onChangeAudioFiles(updated);
  };

  return (
    <div className="space-y-3.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
      {/* 1. KHU VỰC AUDIO BÀI NGHE */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Headphones className="size-4 text-purple-600" />
            <span>File Audio bài nghe (MP3 / WAV)</span>
            {isRequired ? (
              <span className="text-rose-500 font-bold">* (Bắt buộc)</span>
            ) : (
              <span className="text-slate-400 font-normal">(Tùy chọn)</span>
            )}
          </label>
          <span className="text-[11px] text-slate-500">
            {audioFiles.length > 0 ? `Đã chọn ${audioFiles.length} file nghe` : "Chưa có file nghe"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.zip"
            multiple
            onChange={handleAudioFilesSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Headphones className="size-3.5" />
            <span>+ Chọn file Audio (.mp3, .wav)</span>
          </button>
          {audioFiles.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeAudioFiles([])}
              className="text-[11px] text-slate-400 hover:text-rose-600 hover:underline transition"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Danh sách Audio Tracks đã chọn */}
        {audioFiles.length > 0 ? (
          <div className="mt-2.5 max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {audioFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded">
                    Track {(idx + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="truncate text-slate-700 font-medium">{file.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAudioFile(idx)}
                  className="text-slate-400 hover:text-rose-500 p-1 transition"
                  title="Xóa track này"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : isRequired ? (
          <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <span>
              Sách giáo khoa IELTS bắt buộc phải có audio để học viên luyện nghe. Vui lòng tải ít nhất 1 file nghe (.mp3).
            </span>
          </div>
        ) : null}
      </div>

      {/* 2. KHU VỰC ĐÁP ÁN (ANSWER KEY - TÙY CHỌN) */}
      <div className="pt-2.5 border-t border-slate-200">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <KeyRound className="size-4 text-emerald-600" />
            <span>File Đáp án / Lời giải chi tiết (Answer Key)</span>
            <span className="text-slate-400 font-normal">(Tùy chọn)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={answerKeyInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChangeAnswerKeyFile(f);
            }}
            className="hidden"
          />

          {!answerKeyFile ? (
            <button
              type="button"
              onClick={() => answerKeyInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileText className="size-3.5" />
              <span>Đính kèm file đáp án (PDF)</span>
            </button>
          ) : (
            <div className="flex items-center justify-between w-full px-3 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-950 truncate">{answerKeyFile.name}</span>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  ({(answerKeyFile.size / (1024 * 1024)).toFixed(1)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeAnswerKeyFile(null);
                  if (answerKeyInputRef.current) answerKeyInputRef.current.value = "";
                }}
                className="text-slate-400 hover:text-rose-500 p-1 transition shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Dùng làm tài liệu tham khảo cho học viên tự đối soát. Nếu muốn giao bài chấm tự động, hãy tạo tại Module Quản lý bài tập.
        </p>
      </div>
    </div>
  );
}
