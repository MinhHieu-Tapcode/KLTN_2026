"use client";

import React from "react";
import { BookOpen, Loader2, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { View } from "@/components/simpace-app";

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Xác nhận xóa",
  description = "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?",
  confirmText = "Xóa",
  cancelText = "Hủy",
  onConfirm,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Trash2 className="size-5" />
          </div>
          <div className="flex-1 space-y-1">
            <DialogTitle className="text-base font-bold text-[#0F172A]">{title}</DialogTitle>
            <DialogDescription className="text-sm text-[#64748B] leading-relaxed pt-1">
              {description}
            </DialogDescription>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-[#CBD5E1]"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700 shadow-sm"
          >
            {isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  name,
  label,
  placeholder,
  required,
  type = "text",
  defaultValue,
  disabled,
}: {
  name?: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-[#0F172A]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="field mt-2 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
      />
    </label>
  );
}

export function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel">
      <h2 className="font-bold text-base text-[#0F172A]">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((x, i) => (
          <div key={x} className="flex items-center gap-3 text-sm">
            <span className="grid size-8 place-items-center rounded-xl bg-[#FFF1EB] text-[#EA580C] shrink-0">
              {i === 0 ? <UserRound className="size-4" /> : <BookOpen className="size-4" />}
            </span>
            <span className="truncate text-[#334155]">{x}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#FFF1EB] px-2.5 py-1 text-xs font-bold text-[#EA580C]">
      {children}
    </span>
  );
}

export function Status({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: "success" | "warn" | "neutral";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        tone === "success"
          ? "bg-emerald-50 text-emerald-700"
          : tone === "warn"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function subtitle(view: View) {
  const map: Record<View, string> = {
    users: "Quản lý tài khoản, phân quyền và dữ liệu học viên/giáo viên trên toàn hệ thống.",
    schools: "Quản lý thông tin và phân công quản nhiệm tại các trường học đối tác.",
    classes: "Theo dõi lớp đang diễn ra, sắp khai giảng và lịch sử các khóa học đã bế giảng.",
    "class-detail": "Thông tin chi tiết lớp học, nhân sự phụ trách và danh sách học viên.",
    schedule: "Thời khóa biểu các lớp học đang diễn ra trong kỳ học.",
    import: "Tải lên file Excel chuẩn 7 cột để thêm học viên và ghi danh vào lớp tự động.",
    settings: "Thiết lập cấu hình hệ thống, hồ sơ cá nhân và ma trận phân quyền RBAC.",
    "custom-module": "Màn hình chức năng mở rộng được phân quyền động từ cơ sở dữ liệu.",
    "materials-global": "Quản lý kho tài liệu, giáo trình, slide bài giảng và file nghe IELTS.",
    "assignments-global": "Danh sách bài tập, hạn nộp, chấm điểm tự luận và giám sát thi trực tuyến.",
    dashboard: "",
  };
  return map[view] || "";
}
