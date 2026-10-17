"use client";

import { useState, useEffect, useTransition } from "react";
import { Building2, CalendarDays, Edit2, Eye, GraduationCap, Plus, Search, Trash2, X, Clock, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteClassAction, deleteMultipleClassesAction } from "@/actions/classes";
import { ConfirmDialog, Status } from "@/components/shared/common-widgets";

export function ClassesPageView({
  classes,
  currentUser,
  onRefresh,
  onOpenDetail,
  onEditClass,
  schools = [],
  onOpenAddClass,
}: {
  classes: any[];
  currentUser?: any;
  onRefresh: () => void;
  onOpenDetail: (c: any) => void;
  onEditClass: (c: any) => void;
  schools?: any[];
  onOpenAddClass?: (schoolId?: string) => void;
}) {
  const canManageClass = currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER";
  const [viewMode, setViewMode] = useState<"LIST" | "TIMETABLE">("LIST");
  const [lifecycleStatus, setLifecycleStatus] = useState("ALL");
  const [selectedSchoolId, setSelectedSchoolId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localClasses, setLocalClasses] = useState(classes);

  useEffect(() => {
    setLocalClasses(classes);
  }, [classes]);

  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  const classTabs = [
    ["ALL", "Tất cả"],
    ["ACTIVE", "Đang diễn ra"],
    ["UPCOMING", "Sắp khai giảng"],
    ["FINISHED", "Đã kết thúc"],
  ] as const;

  const filtered = localClasses.filter((c) => {
    // Chỉ hiển thị lớp học còn hoạt động (không hiện thùng rác)
    if (!c.isActive) return false;

    // Lọc theo trường học
    const matchesSchool = selectedSchoolId === "ALL" || c.schoolId === selectedSchoolId;

    // Lọc theo chu kỳ lớp học
    const matchesLifecycle = lifecycleStatus === "ALL" || c.status === lifecycleStatus;

    // Tìm kiếm .trim()
    const cleanSearch = search.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      c.name.toLowerCase().includes(cleanSearch) ||
      c.code.toLowerCase().includes(cleanSearch) ||
      (c.school?.name || "").toLowerCase().includes(cleanSearch);

    return matchesSchool && matchesLifecycle && matchesSearch;
  });

  // Danh sách lớp dùng cho Thời khóa biểu tuần
  const scheduleClasses = localClasses.filter((c) => {
    if (!c.isActive || c.status === "FINISHED") return false;
    if (selectedSchoolId !== "ALL" && c.schoolId !== selectedSchoolId) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const handleBatchDelete = () => {
    const toDeleteIds = [...selectedIds];
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa các lớp học đã chọn",
      description: `Bạn có chắc chắn muốn xóa ${toDeleteIds.length} lớp học đã chọn? Các lớp học này sẽ ngừng hoạt động và bị xóa khỏi hệ thống.`,
      action: async () => {
        setLocalClasses((prev) => prev.filter((c) => !toDeleteIds.includes(c.id)));
        setSelectedIds([]);
        await deleteMultipleClassesAction(toDeleteIds);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (cls: any) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa lớp học",
      description: `Bạn có chắc chắn muốn xóa lớp học "${cls.name}" (Mã lớp: ${cls.code})? Lớp học sẽ ngừng hoạt động và bị xóa khỏi hệ thống.`,
      action: async () => {
        setLocalClasses((prev) => prev.filter((c) => c.id !== cls.id));
        await deleteClassAction(cls.id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel space-y-4">
      {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM: DANH SÁCH LỚP HỌC vs THỜI KHÓA BIỂU TUẦN */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setViewMode("LIST")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              viewMode === "LIST"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <List className="size-4" /> Danh sách lớp học
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TIMETABLE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              viewMode === "TIMETABLE"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <CalendarDays className="size-4" /> Thời khóa biểu tuần
          </button>
        </div>

        {/* Lọc nhanh theo trường học dùng chung cho cả 2 chế độ */}
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-[#94A3B8]" />
          <select
            className="field text-xs max-w-xs bg-white border-[#CBD5E1]"
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
          >
            <option value="ALL">-- Tất cả trường học ({schools.filter((s: any) => s.isActive).length} trường) --</option>
            {schools
              .filter((s: any) => s.isActive)
              .map((s: any) => {
                const count = localClasses.filter((c: any) => c.schoolId === s.id && c.isActive).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({count} lớp)
                  </option>
                );
              })}
          </select>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: DANH SÁCH LỚP HỌC (BẢNG TRUYỀN THỐNG) */}
      {viewMode === "LIST" && (
        <div className="space-y-4">
          {/* Hàng: Tabs Chu kỳ lớp học (Tất cả / Đang diễn ra / Sắp khai giảng / Đã kết thúc) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
            <div className="flex gap-2 overflow-x-auto">
              {classTabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLifecycleStatus(key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    lifecycleStatus === key
                      ? "bg-[#EA580C] text-white shadow-sm"
                      : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="relative max-w-sm flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                className="field field-search border-[#CBD5E1]"
                placeholder="Tìm theo tên lớp, mã lớp, trường..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={isDeleting}
                className="rounded-xl shadow-sm"
              >
                <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) lớp đã chọn
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={toggleSelectAll}
                      className="rounded border-[#CBD5E1]"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Mã lớp</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Tên lớp</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trường học</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Giáo viên / TA phụ trách</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Sĩ số</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {filtered.length > 0 ? (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-[#CBD5E1]"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-xs text-[#0F172A]">{c.code}</td>
                      <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                        <button
                          onClick={() => onOpenDetail(c)}
                          className="hover:text-[#EA580C] text-left transition"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-[#475569]">{c.school?.name || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-[#64748B]">
                        {c.assignments && c.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.assignments.map((a: any) => (
                              <span
                                key={a.id}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  a.roleInClass === "TEACHER"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}
                              >
                                {a.roleInClass === "TEACHER" ? "GV: " : "TA: "}
                                {a.staff?.profile?.fullName || a.staff?.username}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] italic">Chưa phân công</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                        {c._count?.enrollments || 0}/{c.capacity}
                      </td>
                      <td className="px-4 py-3.5">
                        <Status
                          tone={
                            c.status === "FINISHED" ? "neutral" : c.status === "UPCOMING" ? "warn" : "success"
                          }
                        >
                          {c.status === "ACTIVE"
                            ? "Đang diễn ra"
                            : c.status === "UPCOMING"
                            ? "Sắp khai giảng"
                            : "Đã kết thúc"}
                        </Status>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold text-[#EA580C] bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300 rounded-lg inline-flex items-center gap-1.5 transition shadow-xs"
                            onClick={() => onOpenDetail(c)}
                            title="Xem danh sách lớp"
                          >
                            <Eye className="size-3.5" />
                            <span>Xem danh sách lớp</span>
                          </Button>
                          {canManageClass && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-[#64748B] hover:text-[#0F172A]"
                                onClick={() => onEditClass(c)}
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-[#64748B] hover:text-[#EF4444]"
                                onClick={() => handleDeleteSingle(c)}
                                title="Xóa lớp học"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm">
                      {selectedSchoolId !== "ALL" ? (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
                            <Building2 className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-[#0F172A]">
                              Trường &quot;{schools.find((s: any) => s.id === selectedSchoolId)?.name}&quot; hiện chưa có lớp học nào
                            </p>
                            <p className="text-xs text-[#64748B]">
                              Mỗi trường học quản lý các lớp học riêng biệt. Bạn hãy tạo lớp học mới để gán cho trường này.
                            </p>
                          </div>
                          {canManageClass && onOpenAddClass && (
                            <Button
                              size="sm"
                              onClick={() => onOpenAddClass(selectedSchoolId)}
                              className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
                            >
                              <Plus className="size-3.5 mr-1" /> + Tạo lớp học cho trường này
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">Không tìm thấy lớp học nào.</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: THỜI KHÓA BIỂU TUẦN (GRID VIEW) */}
      {viewMode === "TIMETABLE" && (
        scheduleClasses.length === 0 ? (
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
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {daysOfWeek.map((day) => {
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
                            cls.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff
                              ?.profile?.fullName || "Chưa phân công";
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

            {/* Hiển thị các lớp học có lịch đặc thù / chưa gán cố định thứ */}
            {scheduleClasses.some((c) => !daysOfWeek.some((d) => c.description?.includes(d))) && (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B] mb-3">
                  Các lớp học đang diễn ra (Lịch học linh hoạt):
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scheduleClasses
                    .filter((c) => !daysOfWeek.some((d) => c.description?.includes(d)))
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
        )
      )}

      <ConfirmDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        isPending={isDeleting}
        onConfirm={() => {
          const action = confirmModal.action;
          setConfirmModal((prev) => ({ ...prev, open: false }));
          startTransition(async () => {
            await action();
          });
        }}
      />
    </section>
  );
}
