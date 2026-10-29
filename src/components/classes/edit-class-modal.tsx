"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateClassAction } from "@/actions/classes";
import { Field } from "@/components/shared/common-widgets";
import { SchedulePickerSection } from "@/components/classes/schedule-picker-section";

export function EditClassModal({
  classItem,
  teachers,
  tas,
  onClose,
  onDone,
}: {
  classItem: any;
  teachers: any[];
  tas?: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const initialTeacherIds =
    classItem.assignments
      ?.filter((a: any) => a.roleInClass === "TEACHER")
      .map((a: any) => a.userId) || [];
  const [teacherIds, setTeacherIds] = useState<string[]>(
    initialTeacherIds.length > 0 ? initialTeacherIds : [""]
  );

  const [startDate, setStartDate] = useState(
    classItem.startDate ? new Date(classItem.startDate).toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    classItem.endDate ? new Date(classItem.endDate).toISOString().split("T")[0] : ""
  );
  const [scheduleStr, setScheduleStr] = useState(classItem.description || "");

  const allDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
  const initialDays = allDays.filter((d: string) => classItem.description?.includes(d));
  const [selectedDays, setSelectedDays] = useState<string[]>(initialDays);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");

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

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const validTeachers = teacherIds.filter(Boolean);

    if (validTeachers.length === 0) {
      setErrorMsg("Lớp học bắt buộc phải có ít nhất 1 Giáo viên giảng dạy!");
      return;
    }

    startTransition(async () => {
      const res = await updateClassAction(classItem.id, {
        name: formData.get("name")?.toString(),
        program: formData.get("program")?.toString() as any,
        capacity: Number(formData.get("capacity")) || 30,
        status: formData.get("status")?.toString() as any,
        teacherIds: validTeachers,
        taIds: [],
        schedule: scheduleStr.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res && !res.success) {
        setErrorMsg(res.error || "Không thể cập nhật lớp học!");
        return;
      }
      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
          <DialogDescription>
            Mã lớp: <b className="font-mono text-[#0F172A]">{classItem.code}</b> • Trường:{" "}
            <b className="text-[#0F172A]">{classItem.school?.name}</b>
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <Field name="name" label="Tên lớp học" defaultValue={classItem.name} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Trạng thái
              <select name="status" className="field mt-2" defaultValue={classItem.status}>
                <option value="ACTIVE">Đang diễn ra</option>
                <option value="UPCOMING">Sắp khai giảng</option>
                <option value="FINISHED">Đã kết thúc</option>
              </select>
            </label>
            <Field name="capacity" label="Sĩ số tối đa" type="number" defaultValue={classItem.capacity} />
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
            scheduleStr={scheduleStr}
            setScheduleStr={setScheduleStr}
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

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Lưu thay đổi
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
