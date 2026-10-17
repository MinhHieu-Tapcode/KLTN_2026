"use client";

import { useState, useEffect, useTransition } from "react";
import { Building2, CalendarDays, Edit2, Eye, Plus, Search, Trash2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteClassAction, deleteMultipleClassesAction } from "@/actions/classes";
import { ConfirmDialog, Status } from "@/components/shared/common-widgets";
import { ClassesTimetableGrid } from "./classes-page-modals";

const CLASS_TABS = [
  ["ALL", "Tất cả"],
  ["ACTIVE", "Đang diễn ra"],
  ["UPCOMING", "Sắp khai giảng"],
  ["FINISHED", "Đã kết thúc"],
] as const;

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

  const filtered = localClasses.filter((c) => {
    if (!c.isActive) return false;
    const matchesSchool = selectedSchoolId === "ALL" || c.schoolId === selectedSchoolId;
    const matchesLifecycle = lifecycleStatus === "ALL" || c.status === lifecycleStatus;
    const cleanSearch = search.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      c.name.toLowerCase().includes(cleanSearch) ||
      c.code.toLowerCase().includes(cleanSearch) ||
      (c.school?.name || "").toLowerCase().includes(cleanSearch);

    return matchesSchool && matchesLifecycle && matchesSearch;
  });

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

        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-[#94A3B8]" />
          <select
            className="field text-xs max-w-xs bg-white border-[#CBD5E1]"
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
          >
            <option value="ALL">
              -- Tất cả trường học ({schools.filter((s: any) => s.isActive).length} trường) --
            </option>
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

      {viewMode === "LIST" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
            <div className="flex gap-2 overflow-x-auto">
              {CLASS_TABS.map(([key, label]) => (
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

      {viewMode === "TIMETABLE" && (
        <ClassesTimetableGrid
          scheduleClasses={scheduleClasses}
          selectedSchoolId={selectedSchoolId}
          schools={schools}
          canManageClass={canManageClass}
          onOpenAddClass={onOpenAddClass}
          onOpenDetail={onOpenDetail}
        />
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
