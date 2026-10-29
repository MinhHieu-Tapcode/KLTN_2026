"use client";

import React, { useState } from "react";
import { Building2, CalendarDays, Clock, GraduationCap, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/shared/common-widgets";

export function SchedulePageView({
  classes,
  currentUser,
  schools = [],
  onOpenAddClass,
}: {
  classes: any[];
  currentUser: any;
  schools?: any[];
  onOpenAddClass?: (schoolId?: string) => void;
}) {
  const [selectedSchool, setSelectedSchool] = useState("ALL");
  const [viewMode, setViewMode] = useState<"TIMETABLE" | "LIST">("TIMETABLE");

  const currentUid = currentUser?.userId || currentUser?.id;

  const relevantClasses = classes.filter((c) => {
    if (c.status === "FINISHED" || !c.isActive) return false;

    if (currentUser?.role === "ADMIN") return true;

    if (currentUser?.role === "SCHOOL_MANAGER") {
      return c.school?.managerId === currentUid;
    }

    if (currentUser?.role === "TEACHER") {
      return c.assignments?.some(
        (a: any) =>
          a.userId === currentUid ||
          a.staff?.id === currentUid ||
          a.staff?.username === currentUser?.username
      );
    }

    if (currentUser?.role === "STUDENT") {
      if (c.enrollments && c.enrollments.length > 0) {
        return c.enrollments.some(
          (e: any) =>
            e.studentId === currentUid ||
            e.student?.id === currentUid ||
            e.student?.username === currentUser?.username
        );
      }
      return true;
    }

    return true;
  });

  const displayed = relevantClasses.filter(
    (c) => selectedSchool === "ALL" || c.schoolId === selectedSchool
  );

  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#EA580C] text-white shadow-md shadow-orange-500/20">
              <CalendarDays className="size-6" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                {currentUser?.role === "STUDENT"
                  ? "Thời khóa biểu học tập của bạn"
                  : "Lịch học & Giảng dạy các lớp"}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {currentUser?.role === "STUDENT"
                  ? `Xin chào ${currentUser?.fullName || "Học viên"}! Bạn đang theo học ${displayed.length} lớp học tại SIMPACE.`
                  : "Thời khóa biểu các lớp học đang hoạt động trong phạm vi phụ trách của bạn."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-white border border-[#E2E8F0] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("TIMETABLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "TIMETABLE"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <CalendarDays className="size-3.5" /> Bảng thời khóa biểu tuần
              </button>
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "LIST"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <List className="size-3.5" /> Danh sách lớp học
              </button>
            </div>

            {(currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER") && (
              <select
                className="field text-xs max-w-xs bg-white border-[#CBD5E1]"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
              >
                <option value="ALL">-- Tất cả các trường ({schools.filter((s: any) => s.isActive).length} trường) --</option>
                {schools
                  .filter((s: any) => s.isActive)
                  .map((s: any) => {
                    const count = relevantClasses.filter((c: any) => c.schoolId === s.id && c.isActive).length;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({count} lớp)
                      </option>
                    );
                  })}
              </select>
            )}
          </div>
        </div>
      </div>

      {viewMode === "TIMETABLE" && (
        displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
            <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-[#0F172A]">
                {selectedSchool !== "ALL"
                  ? `Trường "${schools.find((s: any) => s.id === selectedSchool)?.name}" hiện chưa có lịch học nào`
                  : "Chưa có lịch học nào trong phạm vi quản lý của bạn"}
              </p>
              <p className="text-xs text-[#64748B]">
                Tạo lớp học mới và chọn các thứ trong tuần để lịch học tự động hiển thị trên bảng thời khóa biểu.
              </p>
            </div>
            {onOpenAddClass && (
              <Button
                size="sm"
                onClick={() => onOpenAddClass(selectedSchool !== "ALL" ? selectedSchool : undefined)}
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                <Plus className="size-3.5 mr-1" /> + Tạo lớp học mới
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {daysOfWeek.map((day) => {
                const classesForDay = displayed.filter((c) => {
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
                            cls.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff
                              ?.profile?.fullName || "Chưa phân công";

                          return (
                            <div
                              key={cls.id}
                              className="rounded-xl border border-orange-200/80 bg-[#FFF7ED]/40 p-3 hover:border-[#EA580C] transition group shadow-xs"
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

            {displayed.some((c) => !daysOfWeek.some((d) => c.description?.includes(d))) && (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B] mb-3">
                  Các lớp học đang diễn ra (Lịch học linh hoạt):
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {displayed
                    .filter((c) => !daysOfWeek.some((d) => c.description?.includes(d)))
                    .map((cls) => (
                      <div
                        key={cls.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                      >
                        <b className="text-[#0F172A] block font-bold">{cls.name} ({cls.code})</b>
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
        )
      )}

      {viewMode === "LIST" && (
        <div className="panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Lớp học</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trường học</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Thời gian học</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Giáo viên phụ trách</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {displayed.length > 0 ? (
                  displayed.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                        {c.name} <code className="text-xs text-[#64748B] font-mono">({c.code})</code>
                      </td>
                      <td className="px-4 py-3.5 text-[#475569]">{c.school?.name}</td>
                      <td className="px-4 py-3.5 text-xs text-[#0F172A] font-medium">
                        <div className="font-semibold text-[#EA580C]">{c.description || "Chưa xếp lịch cụ thể"}</div>
                        {(c.startDate || c.endDate) && (
                          <div className="text-[11px] text-[#64748B] mt-0.5 font-normal">
                            {c.startDate ? new Date(c.startDate).toLocaleDateString("vi-VN") : "---"}
                            {" → "}
                            {c.endDate ? new Date(c.endDate).toLocaleDateString("vi-VN") : "---"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#475569]">
                        {c.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff?.profile
                          ?.fullName || "Chưa phân công"}
                      </td>
                      <td className="px-4 py-3.5">
                        <Status tone="success">Đang diễn ra</Status>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm">
                      {selectedSchool !== "ALL" ? (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
                            <Building2 className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-[#0F172A]">
                              Trường &quot;{schools.find((s: any) => s.id === selectedSchool)?.name}&quot; hiện chưa có lớp học nào
                            </p>
                            <p className="text-xs text-[#64748B]">
                              Tạo lớp học mới và chọn ngày giờ để lịch học tự động xuất hiện tại đây.
                            </p>
                          </div>
                          {onOpenAddClass && (
                            <Button
                              size="sm"
                              onClick={() => onOpenAddClass(selectedSchool)}
                              className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
                            >
                              <Plus className="size-3.5 mr-1" /> + Tạo lớp học cho trường này
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">
                          Không có lịch học nào phù hợp với phạm vi quản lý của bạn.
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
