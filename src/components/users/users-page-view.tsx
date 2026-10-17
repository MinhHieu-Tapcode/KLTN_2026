"use client";

import { useState, useEffect, useTransition } from "react";
import { Edit2, Eye, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteUserAction, deleteMultipleUsersAction } from "@/actions/users";
import { ConfirmDialog, Badge } from "@/components/shared/common-widgets";

export function UsersPageView({
  users,
  currentUser,
  schools,
  classes,
  onRefresh,
  onOpenAddUser,
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

  // Nếu là Quản nhiệm: Không cho lọc và xem Admin hay Quản nhiệm khác (BUG_01)
  const isSchoolManager = currentUser?.role === "SCHOOL_MANAGER";
  const roleTabs = isSchoolManager
    ? ["Tất cả", "Giáo viên", "Trợ giảng", "Học sinh"]
    : ["Tất cả", "Quản trị viên", "Quản nhiệm", "Giáo viên", "Trợ giảng", "Học sinh"];

  const filtered = localUsers.filter((u) => {
    // 1. Chỉ hiển thị tài khoản đang hoạt động (Bỏ trạng thái & thùng rác theo phản hồi)
    if (!u.isActive) return false;

    // 2. Lọc theo quyền của Quản nhiệm: Ẩn tuyệt đối Admin và QN khác
    if (isSchoolManager && (u.role?.code === "ADMIN" || u.role?.code === "SCHOOL_MANAGER")) {
      return false;
    }

    // 3. Lọc theo Tab vai trò
    const matchesTab =
      tab === "Tất cả" ||
      (tab === "Quản trị viên" && u.role?.code === "ADMIN") ||
      (tab === "Quản nhiệm" && u.role?.code === "SCHOOL_MANAGER") ||
      (tab === "Giáo viên" && u.role?.code === "TEACHER") ||
      (tab === "Trợ giảng" && u.role?.code === "TEACHING_ASSISTANT") ||
      (tab === "Học sinh" && u.role?.code === "STUDENT");

    // 4. Tìm kiếm tự động .trim() (BUG_11)
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
      {/* Tab vai trò */}
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

      {/* Toolbar: Tìm kiếm & Xóa chọn */}
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
              filtered.map((u) => {
                // Kiểm tra quyền thao tác trên từng người dùng (BUG_01)
                const isTargetAdmin = u.role?.code === "ADMIN";
                const isSelf = currentUser && u.id === currentUser.userId;
                const canEdit = !isSchoolManager || !isTargetAdmin;
                const canDelete = (!isSchoolManager || !isTargetAdmin) && !isSelf;

                // Chuỗi hiển thị phân công trường / lớp đa nhiệm
                let assignmentText = "Chưa phân công";
                if (u.role?.code === "ADMIN") {
                  assignmentText = "Toàn hệ thống";
                } else if (u.role?.code === "SCHOOL_MANAGER" && u.managedSchools?.length > 0) {
                  assignmentText = u.managedSchools.map((s: any) => s.name).join(", ");
                } else if (
                  (u.role?.code === "TEACHER" || u.role?.code === "TEACHING_ASSISTANT") &&
                  u.classAssignments?.length > 0
                ) {
                  assignmentText = u.classAssignments
                    .map((a: any) => {
                      const sch = a.class?.school?.name;
                      const cls = a.class?.name || a.class?.code;
                      return sch ? `${sch} - ${cls}` : cls;
                    })
                    .filter(Boolean)
                    .join(", ");
                } else if (u.role?.code === "STUDENT") {
                  if (u.classEnrollments?.length > 0) {
                    assignmentText = u.classEnrollments
                      .map((e: any) => {
                        const sch = e.class?.school?.name;
                        const cls = e.class?.name || e.class?.code;
                        return sch ? `${sch} - ${cls}` : cls;
                      })
                      .filter(Boolean)
                      .join(", ");
                  } else if (u.school?.name || u.profile?.school?.name) {
                    assignmentText = `${u.school?.name || u.profile?.school?.name} (Chờ xếp lớp)`;
                  } else {
                    assignmentText = "Chưa xếp lớp";
                  }
                } else if (u.classEnrollments?.length > 0) {
                  assignmentText = u.classEnrollments
                    .map((e: any) => {
                      const sch = e.class?.school?.name;
                      const cls = e.class?.name || e.class?.code;
                      return sch ? `${sch} - ${cls}` : cls;
                    })
                    .filter(Boolean)
                    .join(", ");
                }

                return (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="rounded border-[#CBD5E1]"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-full bg-[#FFF1EB] text-[#EA580C] font-bold text-xs uppercase">
                          {u.profile?.fullName ? u.profile.fullName.trim()[0] : u.username[0]}
                        </span>
                        <div>
                          <span>{u.profile?.fullName || u.username}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {u.profile?.phoneNumber && (
                              <span className="text-xs font-normal text-[#94A3B8]">
                                {u.profile.phoneNumber}
                              </span>
                            )}
                            {u.role?.code === "STUDENT" && u.profile?.entryIeltsScore !== null && u.profile?.entryIeltsScore !== undefined && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#EA580C]">
                                IELTS {Number(u.profile.entryIeltsScore).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#475569]">
                      <div>
                        <span>{u.email}</span>
                        <code className="block text-[11px] font-mono text-[#94A3B8]">
                          {u.username}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge>{u.role?.name || u.role?.code}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs max-w-[280px]">
                      {assignmentText === "Chưa phân công" || assignmentText === "Chưa xếp lớp" ? (
                        <span className="text-amber-600 font-medium italic">{assignmentText}</span>
                      ) : assignmentText === "Toàn hệ thống" ? (
                        <span className="text-[#64748B] font-medium">Toàn hệ thống</span>
                      ) : (
                        <span className="text-[#0F172A] font-medium block truncate" title={assignmentText}>
                          {assignmentText}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[#64748B] hover:text-[#EA580C]"
                          onClick={() => onViewUser?.(u)}
                          title="Xem chi tiết tài khoản (Chỉ xem)"
                        >
                          <Eye className="size-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[#64748B] hover:text-[#0F172A]"
                            onClick={() => onEditUser(u)}
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[#64748B] hover:text-[#EF4444]"
                            onClick={() => handleDeleteSingle(u.id, u.profile?.fullName || u.username)}
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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

