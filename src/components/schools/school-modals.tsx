"use client";

import React, { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSchoolAction, updateSchoolAction } from "@/actions/schools";
import { Field } from "@/components/shared/common-widgets";

export function SchoolSheet({
  open,
  onOpenChange,
  managers = [],
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  managers?: any[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [schoolName, setSchoolName] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const managerId = formData.get("managerId")?.toString();
    const contactName = formData.get("contactName")?.toString()?.trim();
    const contactPhone = formData.get("contactPhone")?.toString()?.trim();
    const address = formData.get("address")?.toString()?.trim();

    if (!schoolName.trim()) {
      setErrorMsg("Vui lòng nhập tên trường học!");
      return;
    }
    if (!managerId) {
      setErrorMsg("Trường học bắt buộc phải có Quản nhiệm phụ trách!");
      return;
    }
    if (!contactName) {
      setErrorMsg("Vui lòng nhập tên Đại diện BGH / Giáo vụ liên hệ!");
      return;
    }
    if (!contactPhone) {
      setErrorMsg("Vui lòng nhập Số điện thoại liên hệ BGH!");
      return;
    }
    if (!address) {
      setErrorMsg("Vui lòng nhập Địa chỉ trường học!");
      return;
    }

    startTransition(async () => {
      const res = await createSchoolAction({
        name: schoolName.trim(),
        type: (formData.get("type")?.toString() as any) || "THPT",
        managerId,
        contactName,
        contactPhone,
        address,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể tạo trường học!");
        return;
      }

      form.reset();
      setSchoolName("");
      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm trường học mới</DialogTitle>
          <DialogDescription>
            Tạo trường học đối tác mới (Mã trường sẽ được hệ thống tự động sinh).
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-semibold text-[#0F172A] block">
              Tên trường học *
              <input
                name="name"
                required
                className="field mt-2"
                placeholder="VD: THPT Trương Định"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Khối / Cấp học *
            <select name="type" className="field mt-2" defaultValue="THPT">
              <option value="THPT">THPT</option>
              <option value="THCS">THCS</option>
              <option value="UNIVERSITY">Đại học</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Quản nhiệm phụ trách *
            <select name="managerId" required className="field mt-2" defaultValue="">
              <option value="">-- Chọn Quản nhiệm phụ trách --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.fullName || m.username} ({m.username})
                </option>
              ))}
            </select>
          </label>

          <Field name="contactName" label="Đại diện liên hệ BGH / Giáo vụ *" placeholder="Thầy/Cô..." required />
          <Field name="contactPhone" label="Số điện thoại liên hệ BGH *" placeholder="0987xxxxxx" required />
          <Field name="address" label="Địa chỉ trường học *" placeholder="Địa chỉ chi tiết..." required />

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Thêm trường
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditSchoolModal({
  school,
  managers,
  onClose,
  onDone,
}: {
  school: any;
  managers: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const managerId = formData.get("managerId")?.toString();
    const contactName = formData.get("contactName")?.toString()?.trim();
    const contactPhone = formData.get("contactPhone")?.toString()?.trim();
    const address = formData.get("address")?.toString()?.trim();

    if (!managerId) {
      setErrorMsg("Trường học bắt buộc phải có Quản nhiệm phụ trách!");
      return;
    }
    if (!contactName) {
      setErrorMsg("Vui lòng nhập tên Đại diện BGH / Giáo vụ liên hệ!");
      return;
    }
    if (!contactPhone) {
      setErrorMsg("Vui lòng nhập Số điện thoại liên hệ BGH!");
      return;
    }
    if (!address) {
      setErrorMsg("Vui lòng nhập Địa chỉ trường học!");
      return;
    }

    startTransition(async () => {
      const res = await updateSchoolAction(school.id, {
        name: formData.get("name")?.toString(),
        type: formData.get("type")?.toString() as any,
        managerId,
        contactName,
        contactPhone,
        address,
      });
      if (res && !res.success) {
        setErrorMsg(res.error || "Không thể cập nhật trường học!");
        return;
      }
      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa trường học</DialogTitle>
          <DialogDescription>Mã trường: {school.code}</DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <Field name="name" label="Tên trường học *" defaultValue={school.name} required />
          <label className="block text-sm font-semibold">
            Khối / Cấp học *
            <select name="type" className="field mt-2" defaultValue={school.type}>
              <option value="THPT">THPT</option>
              <option value="THCS">THCS</option>
              <option value="UNIVERSITY">Đại học</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Quản nhiệm phụ trách *
            <select name="managerId" required className="field mt-2" defaultValue={school.managerId || ""}>
              <option value="">-- Chọn Quản nhiệm --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.fullName || m.username} ({m.username})
                </option>
              ))}
            </select>
          </label>
          <Field name="contactName" label="Đại diện liên hệ BGH / Giáo vụ *" defaultValue={school.contactName} required />
          <Field name="contactPhone" label="Số điện thoại liên hệ BGH *" defaultValue={school.contactPhone} required />
          <Field name="address" label="Địa chỉ trường học *" defaultValue={school.address} required />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
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
