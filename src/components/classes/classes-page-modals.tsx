"use client";

import React from "react";
import { Building2, Clock, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export function ClassesTimetableGrid({
  scheduleClasses,
  selectedSchoolId,
  schools,
  canManageClass,
  onOpenAddClass,
  onOpenDetail,
}: {
  scheduleClasses: any[];
  selectedSchoolId: string;
  schools: any[];
  canManageClass: boolean;
  onOpenAddClass?: (schoolId?: string) => void;
  onOpenDetail: (c: any) => void;
}) {
  if (scheduleClasses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
        <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
          <Building2 className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-[#0F172A]">
            {selectedSchoolId !== "ALL"
              ? `Trường "${schools.find((s: any) => s.id === selectedSchoolId)?.name}" hiện chưa có lịch học nào`
              : "Chưa có lịch học nào trong hệ thống"}
          </p>
          <p className="text-xs text-[#64748B]">
            Tạo lớp học mới và chọn các thứ trong tuần để lịch học tự động hiển thị trên bảng thời khóa biểu.
          </p>
        </div>
        {canManageClass && onOpenAddClass && (
          <Button
            size="sm"
            onClick={() => onOpenAddClass(selectedSchoolId !== "ALL" ? selectedSchoolId : undefined)}
            className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            <Plus className="size-3.5 mr-1" /> + Tạo lớp học mới
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {DAYS_OF_WEEK.map((day) => {
          const classesForDay = scheduleClasses.filter((c) => {
            if (!c.description) return false;
            return c.description.toLowerCase().includes(day.toLowerCase());
          });

          return (
            <div
              key={day}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm flex flex-col min-h-[220px]"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
                <span className="font-bold text-sm text-[#0F172A]">{day}</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    classesForDay.length > 0
                      ? "bg-orange-100 text-[#EA580C] border border-orange-200"
                      : "bg-slate-100 text-[#94A3B8]"
                  }`}
                >
                  {classesForDay.length > 0 ? `${classesForDay.length} ca học` : "Nghỉ"}
                </span>
              </div>

              <div className="mt-3 space-y-2.5 flex-1">
                {classesForDay.length > 0 ? (
                  classesForDay.map((cls) => {
                    const teacherName =
                      cls.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff?.profile
                        ?.fullName || "Chưa phân công";
                    const taName = cls.assignments?.find(
                      (a: any) => a.roleInClass === "TEACHING_ASSISTANT"
                    )?.staff?.profile?.fullName;

                    return (
                      <div
                        key={cls.id}
                        onClick={() => onOpenDetail(cls)}
                        className="rounded-xl border border-orange-200/80 bg-[#FFF7ED]/40 p-3 hover:border-[#EA580C] hover:shadow-md transition group cursor-pointer"
                        title="Bấm để xem chi tiết lớp học này"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-mono text-[11px] font-bold text-[#EA580C] bg-orange-100/70 px-1.5 py-0.5 rounded">
                            {cls.code}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            {cls.program || "IELTS"}
                          </span>
                        </div>

                        <b className="block text-xs font-bold text-[#0F172A] group-hover:text-[#EA580C] transition leading-snug">
                          {cls.name}
                        </b>

                        <div className="mt-2 space-y-1 text-[11px] text-[#475569]">
                          <div className="flex items-center gap-1.5 font-semibold text-[#EA580C]">
                            <Clock className="size-3 shrink-0" />
                            <span>{cls.description}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#64748B]">
                            <Building2 className="size-3 shrink-0" />
                            <span className="truncate">{cls.school?.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#64748B]">
                            <GraduationCap className="size-3 shrink-0" />
                            <span className="truncate">GV: {teacherName}</span>
                          </div>
                          {taName && (
                            <div className="text-[10px] text-[#94A3B8] pl-4">TA: {taName}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="grid place-items-center h-full py-8 text-center text-xs text-[#94A3B8] italic">
                    Không có ca học
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scheduleClasses.some((c) => !DAYS_OF_WEEK.some((d) => c.description?.includes(d))) && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B] mb-3">
            Các lớp học đang diễn ra (Lịch học linh hoạt):
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduleClasses
              .filter((c) => !DAYS_OF_WEEK.some((d) => c.description?.includes(d)))
              .map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => onOpenDetail(cls)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs hover:border-[#EA580C] transition cursor-pointer"
                  title="Bấm để xem chi tiết lớp học này"
                >
                  <b className="text-[#0F172A] block font-bold hover:text-[#EA580C] transition">
                    {cls.name} ({cls.code})
                  </b>
                  <p className="text-[#64748B] mt-1">Trường: {cls.school?.name}</p>
                  <p className="text-[#EA580C] font-semibold mt-1">
                    Lịch: {cls.description || "Chưa xếp lịch cụ thể"}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
