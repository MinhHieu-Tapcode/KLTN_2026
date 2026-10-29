"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { RoleCode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import {
  createSystemPermissionAction,
  deleteSystemPermissionAction,
  updateSystemPermissionAction,
} from "@/actions/permissions";
import { ConfirmDialog } from "@/components/shared/common-widgets";
import { AddPermissionModal } from "@/components/settings/permission-widgets";

export const ROLES_LIST: { code: RoleCode; label: string }[] = [
  { code: "ADMIN", label: "Quản trị viên" },
  { code: "SCHOOL_MANAGER", label: "Quản nhiệm" },
  { code: "TEACHER", label: "Giáo viên" },
  { code: "STUDENT", label: "Học sinh" },
];

export function RbacMatrixSection({
  permissions,
  onRefreshPermissions,
}: {
  permissions: any[];
  onRefreshPermissions: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [saveMsg, setSaveMsg] = useState("");
  const [addPermOpen, setAddPermOpen] = useState(false);
  const [deletePermData, setDeletePermData] = useState<{ featureKey: string; name: string } | null>(null);
  const [permError, setPermError] = useState("");

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const togglePermission = (featureKey: string, roleCode: RoleCode) => {
    setLocalPermissions((prev) =>
      prev.map((p) => {
        if (p.featureKey !== featureKey) return p;
        const exists = p.allowedRoles.includes(roleCode);
        const newRoles = exists
          ? p.allowedRoles.filter((r: any) => r !== roleCode)
          : [...p.allowedRoles, roleCode];
        return { ...p, allowedRoles: newRoles };
      })
    );
  };

  const handleSavePermissionMatrix = () => {
    setSaveMsg("");
    startTransition(async () => {
      for (const p of localPermissions) {
        await updateSystemPermissionAction(p.featureKey, p.allowedRoles);
      }
      onRefreshPermissions();
      setSaveMsg("Đã lưu ma trận phân quyền thành công vào cơ sở dữ liệu!");
    });
  };

  const handleCreatePermission = async (data: {
    featureKey: string;
    name: string;
    category?: string;
    allowedRoles: RoleCode[];
  }) => {
    setPermError("");
    const res = await createSystemPermissionAction(data);
    if (!res.success) {
      setPermError(res.error || "Không thể tạo tính năng mới!");
      return;
    }
    setSaveMsg(`Đã thêm màn hình '${data.name}' (${data.featureKey}) thành công!`);
    onRefreshPermissions();
    setAddPermOpen(false);
  };

  const confirmDeletePermission = async () => {
    if (!deletePermData) return;
    setPermError("");
    const { featureKey, name } = deletePermData;
    const res = await deleteSystemPermissionAction(featureKey);
    setDeletePermData(null);
    if (!res.success) {
      setPermError(res.error || "Không thể xóa quyền này!");
      return;
    }
    setSaveMsg(`Đã xóa quyền '${name}' thành công!`);
    onRefreshPermissions();
  };

  return (
    <section className="panel">
      <div className="mb-4 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-bold text-base text-[#0F172A]">Ma trận phân quyền hệ thống</h2>
          <p className="text-xs text-[#64748B]">
            Tích chọn quyền truy cập cho từng vai trò trên giao diện. Quản trị viên bấm &quot;Lưu phân quyền&quot; sau khi điều chỉnh.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={handleSavePermissionMatrix}
            disabled={isPending}
            className="bg-[#EA580C] text-white rounded-xl shadow-sm"
          >
            {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Lưu phân quyền
          </Button>
        </div>
      </div>

      {permError && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium">
          {permError}
        </div>
      )}

      {saveMsg && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl font-medium">
          {saveMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[700px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Tính năng / Màn hình</th>
              {ROLES_LIST.map((r) => (
                <th key={r.code} className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-center">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {localPermissions.map((p) => {
              const isBasePerm = DEFAULT_PERMISSIONS.some(
                (dp) => dp.featureKey === p.featureKey
              );
              return (
                <tr key={p.featureKey} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <b className="block text-[#0F172A]">{p.name}</b>
                          {p.category && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <code className="text-[11px] text-[#94A3B8] font-mono">{p.featureKey}</code>
                      </div>
                      {!isBasePerm && (
                        <button
                          type="button"
                          onClick={() => setDeletePermData({ featureKey: p.featureKey, name: p.name })}
                          title="Xóa quyền này khỏi hệ thống"
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  {ROLES_LIST.map((r) => {
                    const checked = p.allowedRoles.includes(r.code);
                    return (
                      <td key={r.code} className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.featureKey, r.code)}
                          className="size-4 rounded border-[#CBD5E1] text-[#EA580C] focus:ring-[#EA580C]"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AddPermissionModal
        open={addPermOpen}
        onOpenChange={setAddPermOpen}
        onCreated={handleCreatePermission}
      />

      <ConfirmDialog
        open={!!deletePermData}
        onOpenChange={(open) => !open && setDeletePermData(null)}
        title="Xóa quyền / màn hình hệ thống"
        description={`Bạn có chắc chắn muốn xóa màn hình / quyền "${deletePermData?.name}" (${deletePermData?.featureKey}) khỏi hệ thống?`}
        confirmText="Xóa quyền"
        onConfirm={confirmDeletePermission}
      />
    </section>
  );
}
