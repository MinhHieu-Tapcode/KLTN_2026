"use client";

import { useState, useEffect, useTransition } from "react";
import { Edit2, Eye, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteSchoolAction,
  deleteMultipleSchoolsAction,
  getSchoolManagersAction,
  checkSchoolManagerScheduleConflictAction,
  changeSchoolManagerAction,
} from "@/actions/schools";
import { ConfirmDialog } from "@/components/shared/common-widgets";
import { SchoolDetailDrawer } from "@/components/schools/school-detail-drawer";
import { SchoolClassesModal } from "@/components/schools/school-classes-modal";
import {
  ConflictErrorModalState,
  ManagerChangeModalState,
  SchoolUpsertModals,
} from "@/components/schools/school-upsert-modals";

export function SchoolsPageView({
  schools,
  managers = [],
  onRefresh,
  onEditSchool,
  onEditClass,
  onOpenAddClass,
}: {
  schools: any[];
  managers?: any[];
  currentUser?: any;
  onRefresh: () => void;
  onAdd: () => void;
  onEditSchool: (s: any) => void;
  onEditClass?: (cls: any) => void;
  onOpenAddClass?: (schoolId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localSchools, setLocalSchools] = useState(schools);
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<any>(null);
  const [selectedSchoolForClasses, setSelectedSchoolForClasses] = useState<any>(null);
  const [managersList, setManagersList] = useState<any[]>(managers);

  const [managerChangeModal, setManagerChangeModal] = useState<ManagerChangeModalState | null>(null);
  const [conflictErrorModal, setConflictErrorModal] = useState<ConflictErrorModalState | null>(null);
  const [isChangingManager, setIsChangingManager] = useState(false);

  useEffect(() => {
    setLocalSchools(schools);
  }, [schools]);

  useEffect(() => {
    if (managers && managers.length > 0) {
      setManagersList(managers);
    } else {
      getSchoolManagersAction().then((m) => {
        if (m) setManagersList(m);
      });
    }
  }, [managers]);

  const handleManagerChangeRequest = async (school: any, newManagerId: string) => {
    if (!newManagerId || newManagerId === school.managerId) return;

    const checkRes = await checkSchoolManagerScheduleConflictAction(school.id, newManagerId);
    if (checkRes.hasConflict) {
      setConflictErrorModal({
        open: true,
        title: "Không thể đổi quản nhiệm (Xung đột lịch học)",
        message:
          checkRes.error ||
          "Phát hiện xung đột lịch học giữa các trường mà quản nhiệm đang phụ trách!",
      });
      return;
    }

    const newMgr = managersList.find((m: any) => m.id === newManagerId);
    const otherSchools = checkRes.otherSchools || newMgr?.managedSchools || [];

    setManagerChangeModal({
      school,
      newManager: newMgr || { id: newManagerId, username: checkRes.managerName },
      otherSchools,
      selectedSwapSchoolId: otherSchools.length > 0 ? otherSchools[0].id : "",
    });
  };

  const executeChangeManager = async (actionType: "SWAP" | "OVERWRITE") => {
    if (!managerChangeModal) return;
    setIsChangingManager(true);
    try {
      const res = await changeSchoolManagerAction({
        schoolId: managerChangeModal.school.id,
        newManagerId: managerChangeModal.newManager.id,
        actionType,
        swapWithSchoolId:
          actionType === "SWAP" ? managerChangeModal.selectedSwapSchoolId : undefined,
      });

      if (res.success) {
        setManagerChangeModal(null);
        onRefresh();
      } else {
        setConflictErrorModal({
          open: true,
          title: "Không thể đổi quản nhiệm",
          message: res.error || "Đã xảy ra lỗi khi thay đổi quản nhiệm!",
        });
      }
    } finally {
      setIsChangingManager(false);
    }
  };

  const filtered = localSchools.filter((s) => {
    if (statusFilter === "ACTIVE" && !s.isActive) return false;
    if (statusFilter === "INACTIVE" && s.isActive) return false;

    const cleanSearch = search.trim().toLowerCase();
    if (!cleanSearch) return true;
    return (
      s.name.toLowerCase().includes(cleanSearch) ||
      s.code.toLowerCase().includes(cleanSearch) ||
      (s.address || "").toLowerCase().includes(cleanSearch)
    );
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((s) => s.id));
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
    const idsToDelete = [...selectedIds];
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa các trường học đã chọn",
      description: `Bạn có chắc chắn muốn xóa ${idsToDelete.length} trường học đã chọn khỏi hệ thống?`,
      action: async () => {
        setLocalSchools((prev) => prev.filter((s) => !idsToDelete.includes(s.id)));
        setSelectedIds([]);
        await deleteMultipleSchoolsAction(idsToDelete);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (id: string, name: string, code: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa trường học",
      description: `Bạn có chắc chắn muốn xóa trường "${name}" (Mã trường: ${code}) khỏi hệ thống?`,
      action: async () => {
        setLocalSchools((prev) => prev.filter((s) => s.id !== id));
        await deleteSchoolAction(id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel">
      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="field field-search border-[#CBD5E1]"
            placeholder="Tìm kiếm trường học theo tên, mã, địa chỉ..."
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
            <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) trường đã chọn
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[750px] border-collapse text-left text-sm">
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
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Tên trường</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Mã trường</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Khối học</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Quản nhiệm phụ trách</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Số lớp</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filtered.length > 0 ? (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-[#F8FAFC] transition cursor-pointer"
                  onClick={() => setSelectedSchoolDetail(s)}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="rounded border-[#CBD5E1]"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                    <span>{s.name}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#64748B]">{s.code}</td>
                  <td className="px-4 py-3.5 text-[#475569]">{s.type}</td>
                  <td className="px-4 py-3.5 text-[#0F172A] font-medium" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={s.managerId || ""}
                      onChange={(e) => handleManagerChangeRequest(s, e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-orange-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800 transition max-w-[210px] truncate shadow-xs cursor-pointer"
                      title="Nhấp để thay đổi Quản nhiệm phụ trách trường"
                    >
                      {!s.managerId && <option value="">-- Chưa phân công --</option>}
                      {managersList.map((m: any) => {
                        const mName = m.profile?.fullName || m.username;
                        const schoolCount = m.managedSchools?.length || 0;
                        return (
                          <option key={m.id} value={m.id}>
                            {mName} {schoolCount > 0 ? `(${schoolCount} trường)` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#EA580C]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSchoolForClasses(s);
                      }}
                      className="hover:underline inline-flex items-center gap-1 font-semibold text-[#EA580C]"
                      title="Xem danh sách lớp của trường này"
                    >
                      {s._count?.classes || s.classes?.length || 0} lớp
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#64748B] hover:text-[#EA580C]"
                        onClick={() => setSelectedSchoolDetail(s)}
                        title="Xem thông tin trường học (Cấu hình BGH, SĐT, Quản nhiệm)"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#64748B] hover:text-[#0F172A]"
                        onClick={() => onEditSchool(s)}
                        title="Chỉnh sửa thông tin trường học"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#64748B] hover:text-[#EF4444]"
                        onClick={() => handleDeleteSingle(s.id, s.name, s.code)}
                        title="Xóa trường học"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-[#94A3B8] italic">
                  Không tìm thấy trường học phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SchoolDetailDrawer
        school={selectedSchoolDetail}
        open={!!selectedSchoolDetail}
        onOpenChange={(op) => !op && setSelectedSchoolDetail(null)}
        onEditSchool={onEditSchool}
        onViewClasses={(sch) => setSelectedSchoolForClasses(sch)}
      />

      <SchoolClassesModal
        school={selectedSchoolForClasses}
        open={!!selectedSchoolForClasses}
        onOpenChange={(op) => !op && setSelectedSchoolForClasses(null)}
        onEditClass={onEditClass}
        onOpenAddClass={onOpenAddClass}
        onRefresh={onRefresh}
      />

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

      <SchoolUpsertModals
        managerChangeModal={managerChangeModal}
        setManagerChangeModal={setManagerChangeModal}
        isChangingManager={isChangingManager}
        onExecuteChangeManager={executeChangeManager}
        conflictErrorModal={conflictErrorModal}
        setConflictErrorModal={setConflictErrorModal}
      />
    </section>
  );
}
