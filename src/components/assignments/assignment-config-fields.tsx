"use client";

import React from "react";
import { Calendar, Clock, Eye, Hash, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ANSWER_VISIBILITY_LABELS,
  ANSWER_VISIBILITY_MODES,
  AnswerVisibilityMode,
  MAX_ATTEMPTS,
  MIN_ATTEMPTS,
} from "@/lib/assignment-config";

export interface AssignmentConfigState {
  durationMinutes: number;
  startDate: string;
  dueDate: string;
  maxAttempts: number;
  answerVisibility: AnswerVisibilityMode;
  answerVisibleAt: string;
}

export interface AssignmentConfigFieldsProps {
  config: AssignmentConfigState;
  onChange: (patch: Partial<AssignmentConfigState>) => void;
  compact?: boolean;
}

export function AssignmentConfigFields({
  config,
  onChange,
  compact = false,
}: AssignmentConfigFieldsProps) {
  const isFromDate = config.answerVisibility === "FROM_DATE";

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. THỜI GIAN LÀM BÀI */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="size-3.5 text-[#EA580C]" /> Thời gian làm bài (phút)
          </Label>
          <Input
            type="number"
            min={1}
            max={360}
            value={config.durationMinutes || ""}
            onChange={(e) => onChange({ durationMinutes: Number(e.target.value) || 0 })}
            placeholder="VD: 60"
            className="h-8.5 text-xs rounded-xl mt-1 bg-white"
          />
        </div>

        {/* 2. SỐ LẦN ĐƯỢC LÀM BÀI */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Hash className="size-3.5 text-[#EA580C]" /> Số lần được làm bài
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              ({MIN_ATTEMPTS} - {MAX_ATTEMPTS} lần)
            </span>
          </Label>
          <Input
            type="number"
            min={MIN_ATTEMPTS}
            max={MAX_ATTEMPTS}
            value={config.maxAttempts || ""}
            onChange={(e) => onChange({ maxAttempts: Number(e.target.value) || 0 })}
            placeholder="1"
            className="h-8.5 text-xs rounded-xl mt-1 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 3. THỜI ĐIỂM BẮT ĐẦU */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="size-3.5 text-slate-500" /> Thời điểm bắt đầu mở bài
          </Label>
          <Input
            type="datetime-local"
            value={config.startDate || ""}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="h-8.5 text-xs rounded-xl mt-1 bg-white"
          />
        </div>

        {/* 4. HẠN NỘP BÀI */}
        <div>
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="size-3.5 text-[#EA580C]" /> Hạn chót nộp bài
          </Label>
          <Input
            type="datetime-local"
            value={config.dueDate || ""}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className="h-8.5 text-xs rounded-xl mt-1 bg-white"
          />
        </div>
      </div>

      {/* 5. CHẾ ĐỘ HIỂN THỊ ĐÁP ÁN */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Eye className="size-3.5 text-[#EA580C]" /> Chế độ hiển thị đáp án cho học sinh
        </Label>

        <select
          value={config.answerVisibility}
          onChange={(e) =>
            onChange({ answerVisibility: e.target.value as AnswerVisibilityMode })
          }
          className="w-full h-8.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
        >
          {ANSWER_VISIBILITY_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {ANSWER_VISIBILITY_LABELS[mode]}
            </option>
          ))}
        </select>

        {isFromDate && (
          <div className="pt-1.5 space-y-1">
            <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              Thời điểm bắt đầu cho xem đáp án <span className="text-rose-500">*</span>:
            </Label>
            <Input
              type="datetime-local"
              value={config.answerVisibleAt || ""}
              onChange={(e) => onChange({ answerVisibleAt: e.target.value })}
              className="h-8 text-xs rounded-lg bg-white border-orange-200"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
          <Info className="size-3 text-slate-400 shrink-0" />
          <span>
            {config.answerVisibility === "AFTER_SUBMIT" &&
              "Học sinh sẽ xem được đáp án ngay sau khi nộp bài."}
            {config.answerVisibility === "AFTER_GRADED" &&
              "Học sinh chỉ xem được đáp án khi bài nộp đã được chấm điểm hoàn tất."}
            {config.answerVisibility === "NEVER" &&
              "Học sinh sẽ không xem được đáp án chuẩn của bài tập này."}
            {config.answerVisibility === "FROM_DATE" &&
              "Học sinh chỉ được phép xem đáp án sau thời điểm chỉ định ở trên."}
          </span>
        </div>
      </div>
    </div>
  );
}
