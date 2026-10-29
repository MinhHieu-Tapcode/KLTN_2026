"use client";

import React, { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { RoleCode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { roleLabel } from "@/components/shared/common-widgets";

export function AddPermissionModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (data: {
    featureKey: string;
    name: string;
    category?: string;
    allowedRoles: RoleCode[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [category, setCategory] = useState("Đào tạo");
  const [selectedRoles, setSelectedRoles] = useState<RoleCode[]>([
    "ADMIN",
    "SCHOOL_MANAGER",
  ]);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  const handleNameChange = (val: string) => {
    setName(val);
    const clean = val
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    setFeatureKey("VIEW_" + clean);
  };

  const toggleRole = (rc: RoleCode) => {
    setSelectedRoles((prev) =>
      prev.includes(rc) ? prev.filter((r) => r !== rc) : [...prev, rc]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !featureKey.trim()) {
      setErr("Vui lòng điền đủ tên và mã tính năng!");
      return;
    }
    startTransition(async () => {
      try {
        await onCreated({
          featureKey,
          name: name.trim(),
          category: category.trim(),
          allowedRoles: selectedRoles,
        });
      } catch (e: any) {
        setErr(e.message || "Lỗi tạo tính năng");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm tính năng / Màn hình mới</DialogTitle>
          <DialogDescription>
            Tạo mới tính năng trực tiếp trên hệ thống mà không cần sửa code. Phân quyền sẽ được lưu vào cơ sở dữ liệu.
          </DialogDescription>
        </DialogHeader>

        {err && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-[#0F172A]">
            Tên tính năng / Màn hình *
            <input
              className="field mt-1.5"
              placeholder="VD: Quản lý Điểm danh & Chuyên cần"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-semibold text-[#0F172A]">
            Mã định danh (Feature Key) *
            <input
              className="field mt-1.5 font-mono"
              placeholder="VD: VIEW_ATTENDANCE"
              value={featureKey}
              onChange={(e) => setFeatureKey(e.target.value.toUpperCase())}
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Quy ước viết hoa không dấu, nối bằng dấu gạch dưới (VD: VIEW_EXAM).
            </span>
          </label>

          <label className="block text-sm font-semibold text-[#0F172A]">
            Phân nhóm
            <select
              className="field mt-1.5"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Đào tạo">Đào tạo</option>
              <option value="Học viên">Học viên</option>
              <option value="Khảo thí & Điểm số">Khảo thí & Điểm số</option>
              <option value="Báo cáo">Báo cáo</option>
              <option value="Hệ thống">Hệ thống</option>
              <option value="Mở rộng">Mở rộng khác</option>
            </select>
          </label>

          <div>
            <span className="block text-sm font-semibold text-[#0F172A] mb-2">
              Các vai trò được phép truy cập ban đầu:
            </span>
            <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
              {[
                { code: "ADMIN" as RoleCode, label: "Quản trị viên" },
                { code: "SCHOOL_MANAGER" as RoleCode, label: "Quản nhiệm" },
                { code: "TEACHER" as RoleCode, label: "Giáo viên" },
                { code: "STUDENT" as RoleCode, label: "Học sinh" },
              ].map((r) => (
                <label key={r.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.code)}
                    onChange={() => toggleRole(r.code)}
                    className="size-4 rounded text-[#EA580C] focus:ring-[#EA580C]"
                  />
                  <span className="text-xs font-medium text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Thêm tính năng
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomModuleView({
  perm,
  currentUser,
  onNavigateBack,
}: {
  perm: any;
  currentUser: any;
  onNavigateBack: () => void;
}) {
  return (
    <section className="panel max-w-3xl">
      <div className="flex items-center gap-3.5 border-b border-[#E2E8F0] pb-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-orange-100 text-[#EA580C]">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">{perm.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
              Nhóm: {perm.category || "Mở rộng"}
            </span>
            <code className="text-xs text-slate-400 font-mono">Mã: {perm.featureKey}</code>
          </div>
        </div>
      </div>

      <div className="py-6 space-y-4">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <p className="font-semibold">
            ✓ Vai trò của bạn ({roleLabel(currentUser.role)}) đã được cấp quyền truy cập màn hình này.
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Màn hình này được khởi tạo và phân quyền hoàn toàn thông qua giao diện Quản trị viên (Dynamic RBAC), không cần can thiệp mã nguồn.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm">
          <h3 className="font-bold text-[#0F172A] mb-2">Các vai trò được phép truy cập theo CSDL:</h3>
          <div className="flex flex-wrap gap-2">
            {perm.allowedRoles?.map((r: string) => (
              <span
                key={r}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-[#0F172A]"
              >
                {roleLabel(r)}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 italic">
          * Tính năng này đang được hoàn thiện.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] pt-4">
        <Button variant="outline" onClick={onNavigateBack} className="rounded-xl">
          ← Quay lại Tổng quan
        </Button>
      </div>
    </section>
  );
}
