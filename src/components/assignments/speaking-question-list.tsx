"use client";

import React from "react";
import { Clock, MessageCircleQuestion } from "lucide-react";

/**
 * Danh sách câu hỏi Speaking theo chủ đề (Part 1, Part 3, câu hỏi phụ Part 2).
 * Quy ước chữ do bộ bóc tách tạo (src/lib/exam-parser/claude/speaking-builder.ts):
 *   "## Topic 1: Study" = tiêu đề chủ đề; "1. ..." = câu hỏi; dòng khác = đoạn chữ thường.
 */

export const SPEAKING_PART_INFO: Record<"PART_1" | "PART_2" | "PART_3", { title: string; vi: string; duration: string; hint: string }> = {
  PART_1: {
    title: "Part 1 – Introduction and Interview",
    vi: "Giới thiệu và phỏng vấn",
    duration: "4–5 phút",
    hint: "Trả lời ngắn gọn mỗi câu khoảng 2–3 câu về bản thân, gia đình, học tập, sở thích.",
  },
  PART_2: {
    title: "Part 2 – Individual Long Turn",
    vi: "Lượt nói cá nhân",
    duration: "3–4 phút",
    hint: "1 phút chuẩn bị (được ghi chú), nói liên tục 1–2 phút theo thẻ, giám khảo có thể hỏi thêm 1–2 câu.",
  },
  PART_3: {
    title: "Part 3 – Discussion",
    vi: "Thảo luận chiều sâu",
    duration: "4–5 phút",
    hint: "Nêu quan điểm, phân tích, so sánh hoặc dự đoán; mỗi câu trả lời khoảng 4–6 câu (~1 phút).",
  },
};

export function SpeakingPartHeader({ part }: { part: "PART_1" | "PART_2" | "PART_3" }) {
  const info = SPEAKING_PART_INFO[part];
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-0.5 rounded-full bg-[#EA580C] text-white font-bold text-[11px]">Speaking</span>
        <h3 className="text-base font-extrabold text-slate-900">{info.title}</h3>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          <Clock className="size-3" /> {info.duration}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        <b className="text-slate-700">{info.vi}:</b> {info.hint}
      </p>
    </div>
  );
}

export function SpeakingQuestionList({ text, emptyText }: { text: string; emptyText?: string }) {
  const lines = (text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText || "Chưa có câu hỏi."}</p>;
  }
  return (
    <div className="space-y-2.5">
      {lines.map((line, idx) => {
        if (line.startsWith("## ")) {
          return (
            <h4 key={idx} className="pt-1.5 text-xs font-extrabold uppercase tracking-wide text-[#EA580C] first:pt-0">
              {line.slice(3)}
            </h4>
          );
        }
        const m = line.match(/^(\d+)[.)]\s+(.*)$/);
        if (m) {
          return (
            <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-orange-100 bg-white px-3 py-2">
              <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-[#EA580C]" />
              <p className="text-sm font-semibold leading-relaxed text-slate-900">{m[2]}</p>
            </div>
          );
        }
        return (
          <p key={idx} className="text-sm leading-relaxed text-slate-800">
            {line}
          </p>
        );
      })}
    </div>
  );
}
