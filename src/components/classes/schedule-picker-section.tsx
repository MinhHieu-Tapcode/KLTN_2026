"use client";

import React, { useState } from "react";
import { CalendarDays, Clock, Plus, X } from "lucide-react";

interface ShiftItem {
  id: string;
  label: string;
  start: string;
  end: string;
}

const defaultShifts: ShiftItem[] = [
  { id: "s1", label: "Ca 1 (17:30 - 19:30)", start: "17:30", end: "19:30" },
  { id: "s2", label: "Ca 2 (18:00 - 20:00)", start: "18:00", end: "20:00" },
  { id: "s3", label: "Ca 3 (19:30 - 21:30)", start: "19:30", end: "21:30" },
  { id: "s4", label: "Ca Sáng (08:30 - 10:30)", start: "08:30", end: "10:30" },
];

export function SchedulePickerSection({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedDays,
  setSelectedDays,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  scheduleStr,
  setScheduleStr,
}: {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  selectedDays: string[];
  setSelectedDays: React.Dispatch<React.SetStateAction<string[]>>;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  scheduleStr: string;
  setScheduleStr: (v: string) => void;
}) {
  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  const [shifts, setShifts] = useState<ShiftItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("simpace_shifts");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return defaultShifts;
  });

  const [isAddingShift, setIsAddingShift] = useState(false);
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("14:00");
  const [newShiftEnd, setNewShiftEnd] = useState("16:00");

  const applyShift = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    if (selectedDays.length > 0) {
      setScheduleStr(`${selectedDays.join(", ")} • ${start} - ${end}`);
    } else {
      setScheduleStr(`18:00 - 20:00`);
    }
  };

  const handleAddShift = () => {
    if (!newShiftName.trim() || !newShiftStart || !newShiftEnd) return;
    const label = `${newShiftName.trim()} (${newShiftStart} - ${newShiftEnd})`;
    const updated = [
      ...shifts,
      {
        id: `shift_${Date.now()}`,
        label,
        start: newShiftStart,
        end: newShiftEnd,
      },
    ];
    setShifts(updated);
    try {
      localStorage.setItem("simpace_shifts", JSON.stringify(updated));
    } catch {}
    applyShift(newShiftStart, newShiftEnd);
    setNewShiftName("");
    setIsAddingShift(false);
  };

  const handleDeleteShift = (id: string) => {
    const updated = shifts.filter((s) => s.id !== id);
    setShifts(updated);
    try {
      localStorage.setItem("simpace_shifts", JSON.stringify(updated));
    } catch {}
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      if (next.length > 0) {
        const timePart = startTime && endTime ? ` • ${startTime} - ${endTime}` : "";
        setScheduleStr(`${next.join(", ")}${timePart}`);
      } else {
        setScheduleStr("");
      }
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-orange-200/90 bg-[#FFF7ED]/50 p-4 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#EA580C]" />
          <h3 className="text-sm font-bold text-[#0F172A]">Bộ chọn Lịch học &amp; Thời khóa biểu</h3>
        </div>
        <span className="text-[11px] font-semibold text-[#EA580C] bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
          Chọn tương tác
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-[#475569] block mb-1">
            Ngày khai giảng / bắt đầu
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="field text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#475569] block mb-1">
            Ngày bế giảng / kết thúc
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="field text-sm bg-white"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#475569] block mb-1.5">
          1. Bấm chọn các buổi học trong tuần:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {daysOfWeek.map((day) => {
            const active = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  active
                    ? "bg-[#EA580C] text-white shadow-orange-200"
                    : "bg-white border border-[#CBD5E1] text-[#64748B] hover:border-[#EA580C] hover:text-[#EA580C]"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[#475569] block">
            2. Chọn nhanh ca học hoặc chỉnh giờ tùy ý:
          </label>
          <button
            type="button"
            onClick={() => setIsAddingShift(!isAddingShift)}
            className="text-[11px] font-semibold text-[#EA580C] hover:underline flex items-center gap-1"
          >
            <Plus className="size-3" /> {isAddingShift ? "Đóng form" : "Tự thêm ca học"}
          </button>
        </div>

        {isAddingShift && (
          <div className="mb-2.5 p-2.5 rounded-xl border border-orange-200 bg-white shadow-xs space-y-2">
            <div className="text-xs font-bold text-[#0F172A]">Thêm ca học tùy chọn:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Tên ca (VD: Ca Chiều)"
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
                className="field text-xs py-1 px-2.5"
              />
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#64748B]">Từ:</span>
                <input
                  type="time"
                  value={newShiftStart}
                  onChange={(e) => setNewShiftStart(e.target.value)}
                  className="field text-xs py-1 px-1.5"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#64748B]">Đến:</span>
                <input
                  type="time"
                  value={newShiftEnd}
                  onChange={(e) => setNewShiftEnd(e.target.value)}
                  className="field text-xs py-1 px-1.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingShift(false)}
                className="px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddShift}
                className="px-3 py-1 bg-[#EA580C] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#EA580C]/90"
              >
                Lưu ca học
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {shifts.map((shift) => {
            const isMatch = startTime === shift.start && endTime === shift.end;
            return (
              <div
                key={shift.id}
                className={`group inline-flex items-center rounded-lg border text-[11px] font-semibold transition overflow-hidden ${
                  isMatch
                    ? "bg-[#0F172A] border-[#0F172A] text-white"
                    : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => applyShift(shift.start, shift.end)}
                  className="px-2.5 py-1"
                >
                  {shift.label}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteShift(shift.id);
                  }}
                  className={`pr-2 pl-0.5 py-1 text-xs opacity-60 hover:opacity-100 hover:text-red-500 transition ${
                    isMatch ? "text-slate-300" : "text-[#94A3B8]"
                  }`}
                  title="Xóa ca học này"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#475569] flex items-center gap-1 mb-1">
            <Clock className="size-3.5 text-[#EA580C]" /> Giờ bắt đầu
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              if (selectedDays.length > 0) {
                setScheduleStr(`${selectedDays.join(", ")} • ${e.target.value} - ${endTime}`);
              }
            }}
            className="field text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#475569] flex items-center gap-1 mb-1">
            <Clock className="size-3.5 text-[#EA580C]" /> Giờ kết thúc
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              if (selectedDays.length > 0) {
                setScheduleStr(`${selectedDays.join(", ")} • ${startTime} - ${e.target.value}`);
              }
            }}
            className="field text-sm bg-white"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#475569] block mb-1">
          Khung giờ học dự kiến (Đồng bộ theo thứ và ca học đã chọn):
        </label>
        <input
          type="text"
          value={scheduleStr}
          onChange={(e) => setScheduleStr(e.target.value)}
          placeholder="VD: Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00 (hoặc chỉnh giờ học tùy ý)"
          className="field text-sm bg-white font-semibold text-[#0F172A] border-orange-300 focus:border-[#EA580C]"
        />
      </div>
    </div>
  );
}
