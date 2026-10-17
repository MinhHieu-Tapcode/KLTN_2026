"use client";

import React from "react";
import { BookOpen, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SchoolDetailDrawer({
  school,
  open,
  onOpenChange,
  onEditSchool,
  onViewClasses,
}: {
  school: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditSchool?: (s: any) => void;
  onViewClasses?: (s: any) => void;
}) {
  if (!school) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
              {school.code}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
              {school.type}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-[#0F172A] mt-1">
            {school.name}
          </DialogTitle>
          <DialogDescription>
            Thông tin đối tác đào tạo và thông tin liên hệ đại diện trường.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2">
            <b className="text-xs uppercase text-slate-500 tracking-wider block">
              Thông tin liên hệ trường học
            </b>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Đại diện BGH / Giáo vụ:</span>
                <span className="font-semibold text-slate-800">
                  {school.contactName || "Chưa cập nhật"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
                <span className="font-semibold text-slate-800">
                  {school.contactPhone || "Chưa cập nhật"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Địa chỉ:</span>
                <span className="font-semibold text-slate-800">
                  {school.address || "Chưa cập nhật"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#FFF1EB] border border-orange-200 p-4 space-y-1">
            <b className="text-xs uppercase text-[#EA580C] tracking-wider block">
              Quản nhiệm phụ trách
            </b>
            <p className="font-bold text-slate-900 text-sm">
              {school.manager?.profile?.fullName ||
                school.manager?.username ||
                "Chưa phân công quản nhiệm"}
            </p>
            {school.manager?.email && (
              <p className="text-xs text-slate-600">
                Email: {school.manager.email}
              </p>
            )}
            {school.manager?.profile?.phone && (
              <p className="text-xs text-slate-600">
                SĐT Quản nhiệm: {school.manager.profile.phone}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <b className="text-xs uppercase text-slate-500 tracking-wider">
                Danh sách lớp học tại trường ({school.classes?.length || 0})
              </b>
              {onViewClasses && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onViewClasses(school);
                  }}
                  className="text-xs font-semibold text-[#EA580C] hover:underline inline-flex items-center gap-1"
                >
                  <BookOpen className="size-3.5" /> Quản lý danh sách lớp & học sinh
                </button>
              )}
            </div>
            {school.classes && school.classes.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {school.classes.map((cls: any) => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#EA580C] transition text-xs flex justify-between items-center"
                  >
                    <div>
                      <b className="text-slate-900 font-bold block">{cls.name}</b>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {cls.code} • {cls.program}
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded bg-slate-100 font-semibold text-slate-700">
                      Sĩ số: {cls.capacity || 30}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có lớp học nào được mở tại trường này.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            {onEditSchool && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onEditSchool(school);
                }}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white"
              >
                <Edit2 className="size-4 mr-1.5" /> Chỉnh sửa thông tin
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
