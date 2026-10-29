"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { RoleCode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateUserAction } from "@/actions/users";
import { Field } from "@/components/shared/common-widgets";

export function EditUserModal({
  user,
  schools = [],
  classes = [],
  onClose,
  onDone,
}: {
  user: any;
  schools?: any[];
  classes?: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleCode>(user.role?.code || "STUDENT");

  const initialSchools =
    user.managedSchools?.map((s: any) => s.id) || (user.managedSchools?.length ? [] : [""]);
  const initialClasses =
    user.role?.code === "STUDENT"
      ? user.classEnrollments?.map((e: any) => e.classId) || [""]
      : user.classAssignments?.map((a: any) => a.classId) || [""];

  const [managerSchools, setManagerSchools] = useState<string[]>(
    initialSchools.length > 0 ? initialSchools : [""]
  );
  const [assignedClasses, setAssignedClasses] = useState<string[]>(
    initialClasses.length > 0 ? initialClasses : [""]
  );

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);

    const schoolIds = managerSchools.filter(Boolean);
    const classIds = assignedClasses.filter(Boolean);

    if (selectedRole === "SCHOOL_MANAGER" && schoolIds.length === 0) {
      setErrorMsg("Quản nhiệm bắt buộc phải được phân công ít nhất 1 trường học phụ trách!");
      return;
    }
    if (selectedRole === "TEACHER" && classIds.length === 0) {
      setErrorMsg("Giáo viên bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!");
      return;
    }
    if (selectedRole === "STUDENT" && classIds.length === 0) {
      setErrorMsg("Học sinh bắt buộc phải được ghi danh vào ít nhất 1 lớp học!");
      return;
    }

    startTransition(async () => {
      const res = await updateUserAction(user.id, {
        fullName: formData.get("fullName")?.toString()?.trim(),
        email: formData.get("email")?.toString()?.trim(),
        phoneNumber: formData.get("phoneNumber")?.toString()?.trim(),
        address: formData.get("address")?.toString()?.trim(),
        dateOfBirth: formData.get("dateOfBirth")?.toString() || undefined,
        gender: (formData.get("gender")?.toString() as any) || undefined,
        roleCode: selectedRole,
        schoolIds: selectedRole === "SCHOOL_MANAGER" ? schoolIds : undefined,
        classIds:
          selectedRole === "TEACHER" || selectedRole === "STUDENT"
            ? classIds
            : undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể cập nhật người dùng!");
        return;
      }

      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin người dùng</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin hồ sơ, địa chỉ email, vai trò và phân công phụ trách.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              name="fullName"
              label="Họ và tên *"
              defaultValue={user.profile?.fullName || user.username}
              required
            />
            <Field
              name="email"
              type="email"
              label="Địa chỉ Email *"
              defaultValue={user.email}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block">
                Mã tài khoản (Cố định)
                <input
                  name="username"
                  defaultValue={user.username}
                  disabled
                  readOnly
                  className="field mt-2 bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
                  title="Mã tài khoản định danh không thể chỉnh sửa"
                />
              </label>
            </div>
            <Field
              name="phoneNumber"
              label="Số điện thoại"
              defaultValue={user.profile?.phoneNumber || ""}
              placeholder="0987xxxxxx"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                Ngày sinh
              </label>
              <input
                name="dateOfBirth"
                type="date"
                className="field"
                defaultValue={
                  user.profile?.dateOfBirth
                    ? new Date(user.profile.dateOfBirth).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                Giới tính
              </label>
              <select name="gender" className="field" defaultValue={user.profile?.gender || ""}>
                <option value="">-- Chọn giới tính --</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <Field
            name="address"
            label="Địa chỉ thường trú"
            defaultValue={user.profile?.address || ""}
            placeholder="Số nhà, đường, quận/huyện..."
          />

          <label className="block text-sm font-semibold">
            Vai trò
            <select
              name="roleCode"
              className="field mt-2"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleCode)}
            >
              <option value="STUDENT">Học sinh</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="SCHOOL_MANAGER">Quản nhiệm</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>

          {selectedRole === "SCHOOL_MANAGER" && (
            <div className="space-y-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs">
              <div className="flex justify-between items-center">
                <b className="text-slate-800">Trường học phụ trách (Quản lý đa trường):</b>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManagerSchools((prev) => [...prev, ""])}
                  className="h-6 text-[11px] border-[#EA580C] text-[#EA580C]"
                >
                  <Plus className="size-3 mr-1" /> Thêm trường
                </Button>
              </div>
              {managerSchools.map((schId, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="field text-xs"
                    value={schId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManagerSchools((prev) => {
                        const next = [...prev];
                        next[idx] = val;
                        return next;
                      });
                    }}
                  >
                    <option value="">-- Chọn trường học phụ trách --</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  {managerSchools.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setManagerSchools((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="size-7 text-slate-400 hover:text-rose-500 shrink-0"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {(selectedRole === "TEACHER" || selectedRole === "STUDENT") && (
            <div className="space-y-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs">
              <div className="flex justify-between items-center">
                <b className="text-slate-800">
                  {selectedRole === "STUDENT"
                    ? "Lớp học theo học (Ghi danh đa lớp):"
                    : "Lớp học phụ trách (Đảm nhiệm đa lớp):"}
                </b>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignedClasses((prev) => [...prev, ""])}
                  className="h-6 text-[11px] border-[#EA580C] text-[#EA580C]"
                >
                  <Plus className="size-3 mr-1" /> Thêm lớp
                </Button>
              </div>
              {assignedClasses.map((cId, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="field text-xs"
                    value={cId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignedClasses((prev) => {
                        const next = [...prev];
                        next[idx] = val;
                        return next;
                      });
                    }}
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) - {c.school?.name}
                      </option>
                    ))}
                  </select>
                  {assignedClasses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setAssignedClasses((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="size-7 text-slate-400 hover:text-rose-500 shrink-0"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-1.5 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-semibold text-blue-800">
              <ShieldCheck className="size-4 text-blue-600 shrink-0" />
              <span>Chính sách bảo mật tài khoản & Mật khẩu</span>
            </div>
            <p className="text-[12px] text-blue-700 leading-relaxed">
              Quản trị viên chỉ có quyền chỉnh sửa Email và hồ sơ cá nhân của người dùng. Để bảo đảm an toàn dữ liệu, Quản trị viên <b>không được phép xem hoặc thay đổi mật khẩu</b> của tài khoản khác. Người dùng tự đổi mật khẩu qua trang Cá nhân hoặc thông qua luồng Xác thực Email.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3">
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
