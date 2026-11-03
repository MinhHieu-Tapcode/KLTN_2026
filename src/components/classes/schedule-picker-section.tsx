"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { parseScheduleSlots } from "@/lib/schedule";

interface SessionRow {
  day: string;
  start: string;
  end: string;
}

const DAY_LABELS: Record<number, string> = {
  2: "Thứ 2",
  3: "Thứ 3",
  4: "Thứ 4",
  5: "Thứ 5",
  6: "Thứ 6",
  7: "Thứ 7",
  8: "Chủ nhật",
};
const DAY_OPTIONS = Object.values(DAY_LABELS);
const MAX_SESSIONS = 7;

const toTime = (m: number | null) =>
  m === null ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function rowsFromSchedule(scheduleStr: string): SessionRow[] {
  const rows = parseScheduleSlots(scheduleStr).map((s) => ({
    day: DAY_LABELS[s.day] || "",
    start: toTime(s.startMinutes),
    end: toTime(s.endMinutes),
  }));
  return rows.length > 0 ? rows : [{ day: "", start: "", end: "" }];
}

function buildSchedule(rows: SessionRow[]): string {
  return rows
    .filter((r) => r.day && r.start && r.end)
    .map((r) => `${r.day} • ${r.start} - ${r.end}`)
    .join("; ");
}

/**
 * Bộ chọn lịch học: chọn số buổi/tuần, mỗi buổi nhập thứ + giờ bắt đầu + giờ kết thúc.
 * Không còn "ca học" cấu hình sẵn. Kết quả vẫn ghi ra chuỗi lịch (setScheduleStr) để tương thích
 * với phần kiểm tra trùng lịch hiện có. Các props selectedDays/startTime/endTime được giữ lại
 * để không phải sửa component cha, nhưng không còn dùng.
 */
export function SchedulePickerSection({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  scheduleStr,
  setScheduleStr,
}: {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  selectedDays?: string[];
  setSelectedDays?: React.Dispatch<React.SetStateAction<string[]>>;
  startTime?: string;
  setStartTime?: (v: string) => void;
  endTime?: string;
  setEndTime?: (v: string) => void;
  scheduleStr: string;
  setScheduleStr: (v: string) => void;
}) {
  const [rows, setRows] = useState<SessionRow[]>(() => rowsFromSchedule(scheduleStr));
  const lastEmitted = useRef(scheduleStr);

  // Component cha xóa lịch (VD: reset form) thì đưa bộ chọn về trạng thái trống
  useEffect(() => {
    if (scheduleStr === "" && lastEmitted.current !== "") {
      lastEmitted.current = "";
      setRows([{ day: "", start: "", end: "" }]);
    }
  }, [scheduleStr]);

  const commit = (next: SessionRow[]) => {
    setRows(next);
    const str = buildSchedule(next);
    lastEmitted.current = str;
    setScheduleStr(str);
  };

  const changeCount = (n: number) => {
    const next = rows.slice(0, n);
    while (next.length < n) next.push({ day: "", start: "", end: "" });
    commit(next);
  };

  const updateRow = (idx: number, patch: Partial<SessionRow>) =>
    commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-2xl border border-orange-200/90 bg-[#FFF7ED]/50 p-4 space-y-3.5 shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-[#EA580C]" />
        <h3 className="text-sm font-bold text-[#0F172A]">Lịch học</h3>
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
          Số buổi học mỗi tuần
        </label>
        <select
          value={rows.length}
          onChange={(e) => changeCount(Number(e.target.value))}
          className="field text-sm bg-white w-40"
        >
          {Array.from({ length: MAX_SESSIONS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} buổi / tuần
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5">
        {rows.map((row, idx) => {
          const invalidTime = row.start && row.end && row.end <= row.start;
          return (
            <div
              key={idx}
              className="rounded-xl border border-orange-200 bg-white p-2.5 grid gap-2 sm:grid-cols-3"
            >
              <div>
                <label className="text-[11px] font-semibold text-[#475569] block mb-1">
                  Buổi {idx + 1} - Thứ
                </label>
                <select
                  value={row.day}
                  onChange={(e) => updateRow(idx, { day: e.target.value })}
                  className="field text-sm"
                >
                  <option value="">-- Chọn thứ --</option>
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#475569] flex items-center gap-1 mb-1">
                  <Clock className="size-3 text-[#EA580C]" /> Giờ bắt đầu
                </label>
                <input
                  type="time"
                  value={row.start}
                  onChange={(e) => updateRow(idx, { start: e.target.value })}
                  className="field text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#475569] flex items-center gap-1 mb-1">
                  <Clock className="size-3 text-[#EA580C]" /> Giờ kết thúc
                </label>
                <input
                  type="time"
                  value={row.end}
                  onChange={(e) => updateRow(idx, { end: e.target.value })}
                  className="field text-sm"
                />
              </div>
              {invalidTime && (
                <p className="sm:col-span-3 text-[11px] font-semibold text-red-600">
                  Giờ kết thúc phải sau giờ bắt đầu.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[#64748B]">
        Lịch đã chọn: <b className="text-[#0F172A]">{scheduleStr || "Chưa nhập đủ thông tin"}</b>
      </p>
    </div>
  );
}
