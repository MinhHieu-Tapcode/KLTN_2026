"use client";

import React from "react";
import { MapPin, Navigation } from "lucide-react";

export interface MapLabelQuestion {
  questionNumber: number;
  placeName: string;
}

export interface MapPinItem {
  letter: string;
  xPercent: number; // Tọa độ % ngang trên bản đồ
  yPercent: number; // Tọa độ % dọc trên bản đồ
}

interface ListeningMapViewProps {
  mapTitle?: string;
  mapImageUrl?: string | null;
  availableLetters?: string[];
  pins?: MapPinItem[];
  questions: MapLabelQuestion[];
  answers: Record<number, string>;
  onSelectAnswer: (qNum: number, letter: string) => void;
  disabled?: boolean;
}

const DEFAULT_PINS: MapPinItem[] = [
  { letter: "A", xPercent: 20, yPercent: 22 },
  { letter: "B", xPercent: 55, yPercent: 18 },
  { letter: "C", xPercent: 32, yPercent: 52 },
  { letter: "D", xPercent: 74, yPercent: 42 },
  { letter: "E", xPercent: 48, yPercent: 68 },
  { letter: "F", xPercent: 62, yPercent: 84 },
];

export function ListeningMapView({
  mapTitle = "2.3 Map / Plan / Diagram Labeling",
  mapImageUrl,
  availableLetters = ["A", "B", "C", "D", "E", "F"],
  pins = DEFAULT_PINS,
  questions = [
    { questionNumber: 11, placeName: "Cafe" },
    { questionNumber: 12, placeName: "Library" },
    { questionNumber: 13, placeName: "Restrooms" },
    { questionNumber: 14, placeName: "Gym" },
    { questionNumber: 15, placeName: "Administration" },
  ],
  answers,
  onSelectAnswer,
  disabled = false,
}: ListeningMapViewProps) {
  return (
    <div className="space-y-3.5 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <span className="px-2.5 py-1 rounded-md bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider">
          {mapTitle}
        </span>
        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          Nhìn sơ đồ và chọn chữ cái tương ứng cho từng địa điểm
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Cột trái: Bản đồ / Sơ đồ kèm các ghim vị trí A, B, C, D... */}
        <div className="md:col-span-7 relative min-h-[300px] rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
          {mapImageUrl ? (
            <img src={mapImageUrl} alt="Bản đồ đề thi" className="w-full h-auto object-contain" />
          ) : (
            <div className="w-full h-[320px] bg-gradient-to-br from-emerald-50/50 via-slate-100 to-amber-50/40 relative">
              {/* Lưới giả lập mặt bằng campus */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Navigation className="size-3 text-[#EA580C]" />
                <span>Bắc (North)</span>
              </div>

              {/* Các khối công trình trên sơ đồ */}
              <div className="absolute top-8 left-6 w-24 h-16 rounded-lg bg-slate-300/60 border border-slate-400/40 flex items-center justify-center text-[10px] text-slate-600 font-semibold">
                Building 1
              </div>
              <div className="absolute top-6 right-8 w-28 h-20 rounded-lg bg-slate-300/60 border border-slate-400/40 flex items-center justify-center text-[10px] text-slate-600 font-semibold">
                Main Hall
              </div>
              <div className="absolute bottom-10 left-12 w-28 h-18 rounded-lg bg-emerald-200/50 border border-emerald-400/40 flex items-center justify-center text-[10px] text-emerald-800 font-semibold">
                Sports Field
              </div>
              <div className="absolute bottom-8 right-10 w-24 h-20 rounded-lg bg-slate-300/60 border border-slate-400/40 flex items-center justify-center text-[10px] text-slate-600 font-semibold">
                Science Lab
              </div>

              {/* Ghim vị trí chữ cái A, B, C, D... */}
              {pins.map((pin) => (
                <div
                  key={pin.letter}
                  style={{ top: `${pin.yPercent}%`, left: `${pin.xPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 size-7 rounded-full bg-[#EA580C] text-white font-extrabold text-xs flex items-center justify-center shadow-md ring-2 ring-white cursor-pointer hover:scale-110 transition-transform"
                >
                  {pin.letter}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cột phải: Danh sách câu hỏi ghép địa điểm */}
        <div className="md:col-span-5 space-y-2.5">
          <div className="text-xs font-bold text-slate-800 pb-1">
            Match the places with the correct letter:
          </div>

          <div className="space-y-2">
            {questions.map((q) => {
              const selectedVal = answers[q.questionNumber] || "";
              return (
                <div
                  key={q.questionNumber}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-bold text-slate-900">{q.questionNumber}.</span>
                    <span className="truncate">{q.placeName}</span>
                  </span>

                  <select
                    disabled={disabled}
                    value={selectedVal}
                    onChange={(e) => onSelectAnswer(q.questionNumber, e.target.value)}
                    className="h-7 text-xs font-bold rounded-lg border border-slate-300 bg-white px-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C] min-w-[110px]"
                  >
                    <option value="">Chọn vị trí...</option>
                    {availableLetters.map((l) => (
                      <option key={l} value={l}>
                        Vị trí {l}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
