"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteUserAction, deleteMultipleUsersAction } from "@/actions/users";
import { ConfirmDialog } from "@/components/shared/common-widgets";
import { UserTableRow } from "./user-edit-modal";

export function UsersPageView({
  users,
  currentUser,
  onRefresh,
  onEditUser,
  onViewUser,
}: {
  users: any[];
  currentUser?: any;
  schools?: any[];
  classes?: any[];
  onRefresh: () => void;
  onOpenAddUser?: () => void;
  onEditUser: (u: any) => void;
  onViewUser?: (u: any) => void;
}) {
  const [tab, setTab] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localUsers, setLocalUsers] = useState(users);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const isSchoolManager = currentUser?.role === "SCHOOL_MANAGER";
  const roleTabs = isSchoolManager
    ? ["Tất cả", "Giáo viên", "Trợ giảng", "Học sinh"]
    : ["Tất cả", "Quản trị viên", "Quản nhiệm", "Giáo viên", "Trợ giảng", "Học sinh"];

  const filtered = localUsers.filter((u) => {
    if (!u.isActive) return false;
    if (isSchoolManager && (u.role?.code === "ADMIN" || u.role?.code === "SCHOOL_MANAGER")) {
      return false;
    }

    const matchesTab =
      tab === "Tất cả" ||
      (tab === "Quản trị viên" && u.role?.code === "ADMIN") ||
      (tab === "Quản nhiệm" && u.role?.code === "SCHOOL_MANAGER") ||
      (tab === "Giáo viên" && u.role?.code === "TEACHER") ||
      (tab === "Trợ giảng" && u.role?.code === "TEACHING_ASSISTANT") ||
      (tab === "Học sinh" && u.role?.code === "STUDENT");

    const cleanSearch = search.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      u.email?.toLowerCase().includes(cleanSearch) ||
      (u.profile?.fullName || "").toLowerCase().includes(cleanSearch) ||
      u.username?.toLowerCase().includes(cleanSearch);

    return matchesTab && matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((u) => u.id));
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
      title: "Xác nhận xóa người dùng đã chọn",
      description: `Bạn có chắc chắn muốn xóa ${idsToDelete.length} người dùng đã chọn khỏi hệ thống?`,
      action: async () => {
        setLocalUsers((prev) => prev.filter((u) => !idsToDelete.includes(u.id)));
        setSelectedIds([]);
        await deleteMultipleUsersAction(idsToDelete);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (id: string, name?: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa người dùng",
      description: `Bạn có chắc chắn muốn xóa tài khoản ${name ? `"${name}"` : "này"} khỏi hệ thống?`,
      action: async () => {
        setLocalUsers((prev) => prev.filter((u) => u.id !== id));
        await deleteUserAction(id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel overflow-hidden">
      <div className="mb-4 flex gap-6 overflow-x-auto border-b border-[#E2E8F0]">
        {roleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
              tab === t ? "border-[#EA580C] text-[#EA580C]" : "border-transparent text-[#64748B]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="field field-search border-[#CBD5E1]"
            placeholder="Tìm kiếm theo họ tên, email, mã..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="rounded-xl shadow-sm"
            >
              <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) người dùng đã chọn
            </Button>
          )}
        </div>
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
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Họ và tên</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Email / Mã định danh</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Vai trò</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trường / Lớp phụ trách</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filtered.length > 0 ? (
              filtered.map((u) => (
                <UserTableRow
                  key={u.id}
                  user={u}
                  currentUser={currentUser}
                  isSchoolManager={isSchoolManager}
                  isSelected={selectedIds.includes(u.id)}
                  onToggleSelect={toggleSelect}
                  onViewUser={onViewUser}
                  onEditUser={onEditUser}
                  onDeleteSingle={handleDeleteSingle}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-[#94A3B8] italic">
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
