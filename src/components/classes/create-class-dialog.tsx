"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClassAction, getNextClassCodeAction } from "@/actions/classes";
import { SchedulePickerSection } from "@/components/classes/schedule-picker-section";

export function ClassDialog({
  open,
  onOpenChange,
  schools,
  teachers,
  tas,
  defaultSchoolId,
  onAddSchoolShortcut,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: any[];
  teachers: any[];
  tas?: any[];
  defaultSchoolId?: string;
  onAddSchoolShortcut: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("IELTS");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);

  useEffect(() => {
    if (open) {
      if (defaultSchoolId) {
        setSelectedSchoolId(defaultSchoolId);
      } else {
        setSelectedSchoolId("");
      }
      setErrorMsg("");
      setName("");
      setSelectedDays([]);
      setCustomSchedule("");
    }
  }, [open, defaultSchoolId]);

  const [teacherIds, setTeacherIds] = useState<string[]>([""]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [customSchedule, setCustomSchedule] = useState("");

  useEffect(() => {
    if (selectedDays.length > 0) {
      const dayStr = selectedDays.join(", ");
      const timeStr = startTime && endTime ? ` • ${startTime} - ${endTime}` : "";
      setCustomSchedule(`${dayStr}${timeStr}`);
    }
  }, [selectedDays, startTime, endTime]);

  useEffect(() => {
    if (selectedSchoolId) {
      getNextClassCodeAction(selectedSchoolId, selectedProgram).then((res) => {
        if (res && res.success && res.code) {
          setCode(res.code);
        }
      });
    } else {
      setCode("");
    }
  }, [selectedSchoolId, selectedProgram]);

  const handleAddTeacher = () => setTeacherIds((prev) => [...prev, ""]);
  const handleRemoveTeacher = (idx: number) =>
    setTeacherIds((prev) => prev.filter((_, i) => i !== idx));
  const handleTeacherChange = (idx: number, val: string) => {
    setTeacherIds((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    const validTeachers = teacherIds.filter(Boolean);

    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên lớp học!");
      return;
    }
    if (!selectedSchoolId) {
      setErrorMsg("Vui lòng chọn trường học đối tác!");
      return;
    }
    if (validTeachers.length === 0) {
      setErrorMsg("Lớp học bắt buộc phải có ít nhất 1 Giáo viên giảng dạy!");
      return;
    }

    startTransition(async () => {
      const res = await createClassAction({
        name: name.trim(),
        schoolId: selectedSchoolId,
        program: selectedProgram as any,
        capacity: Number(capacity) || 30,
        teacherIds: validTeachers,
        taIds: [],
        schedule: customSchedule.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể tạo lớp học!");
        return;
      }

      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo lớp học mới</DialogTitle>
          <DialogDescription>
            Lớp học sẽ trực thuộc trường học đối tác, tự động sinh mã lớp, bộ chọn lịch học thông minh và gán giáo viên giảng dạy.
            {code ? ` (Mã dự kiến: ${code})` : ""}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Tên lớp học *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: IELTS Bứt Phá - 10A1"
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                Trường học đối tác *
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="field flex-1"
                >
                  <option value="">-- Chọn trường học đối tác --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onAddSchoolShortcut}
                  title="Thêm nhanh trường học mới"
                  className="shrink-0"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Chương trình đào tạo
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="field"
              >
                <option value="IELTS">IELTS</option>
                <option value="SAT">SAT</option>
                <option value="CAMBRIDGE">Cambridge</option>
                <option value="OTHER">Chương trình khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Sĩ số tối đa
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="field"
              />
            </div>
          </div>

          <SchedulePickerSection
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            scheduleStr={customSchedule}
            setScheduleStr={setCustomSchedule}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Giáo viên giảng dạy *
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTeacher}
                  className="h-6 text-xs text-[#EA580C] hover:bg-orange-50 font-semibold px-2"
                >
                  <Plus className="size-3 mr-1" /> Thêm GV (+)
                </Button>
              </div>
              {teacherIds.map((tid, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <select
                    value={tid}
                    onChange={(e) => handleTeacherChange(idx, e.target.value)}
                    className="field text-sm flex-1"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.profile?.fullName || t.username} ({t.username})
                      </option>
                    ))}
                  </select>
                  {teacherIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTeacher(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa giáo viên này"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Tạo lớp học
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
