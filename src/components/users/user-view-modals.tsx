"use client";

import React, { useState } from "react";
import { Check, CircleCheck, Copy, Eye, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AccountCreatedEmailDialog({
  info,
  onClose,
}: {
  info: any;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(
      `Tài khoản SIMPACE LMS:\nEmail: ${info.email}\nTên đăng nhập: ${info.username}\nMật khẩu khởi tạo: Đã gửi bảo mật đến email ${info.email}\nLink đăng nhập: http://localhost:3000`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="size-5" /> Thông tin khởi tạo tài khoản
          </DialogTitle>
          <DialogDescription>
            Tài khoản đã được tạo thành công. Mật khẩu khởi tạo được gửi bảo mật trực tiếp đến email người dùng.
          </DialogDescription>
        </DialogHeader>

        {info.mailResult?.sent ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
            <CircleCheck className="size-5 text-emerald-600 shrink-0" />
            <span>
              <b>Email đã được gửi thành công:</b> Hệ thống đã gửi thư kèm mật khẩu khởi tạo và hướng dẫn đăng nhập trực tiếp đến hòm thư <b>{info.email}</b>.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-bold text-blue-800">
              <ShieldCheck className="size-4 text-blue-600 shrink-0" />
              <span>Chính sách bảo mật mật khẩu khởi tạo</span>
            </div>
            <p className="text-[11.5px] text-blue-700 leading-relaxed">
              Mật khẩu khởi tạo được gửi bảo mật trực tiếp về hòm thư <b>{info.email}</b> của người dùng. Quản trị viên không thể xem mật khẩu này nhằm bảo vệ quyền riêng tư và an toàn thông tin theo chuẩn bảo mật.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm space-y-2.5 font-sans">
          <p className="text-[#64748B]">
            Người nhận: <b>{info.fullName}</b> ({info.role})
          </p>
          <div className="border-t border-[#E2E8F0] pt-2.5 space-y-1.5">
            <p>
              Tên đăng nhập / Mã: <b className="font-mono text-[#0F172A]">{info.username}</b>
            </p>
            <p>
              Email đăng ký: <b className="font-mono text-[#0F172A]">{info.email}</b>
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-700 pt-1">
              <Lock className="size-3.5 text-amber-600 shrink-0" />
              <span>
                Mật khẩu khởi tạo:{" "}
                <b className="font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Đã gửi bảo mật về email người nhận
                </b>
              </span>
            </p>
            <p className="text-xs text-[#64748B] italic pt-1">
              * Người dùng sẽ sử dụng mật khẩu nhận trong email để đăng nhập lần đầu, sau đó hệ thống sẽ yêu cầu xác thực OTP và đổi mật khẩu mới.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3">
          <Button variant="outline" size="sm" onClick={copyText} className="gap-1.5">
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            {copied ? "Đã sao chép!" : "Sao chép thông tin"}
          </Button>
          <Button onClick={onClose} className="bg-[#EA580C] text-white">
            Hoàn tất
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ViewUserModal({
  user,
  open,
  onOpenChange,
  schools,
  classes,
}: {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schools?: any[];
  classes?: any[];
}) {
  if (!user) return null;

  const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị viên toàn hệ thống",
    SCHOOL_MANAGER: "Quản nhiệm trường học",
    TEACHER: "Giáo viên giảng dạy",
    TEACHING_ASSISTANT: "Trợ giảng",
    STUDENT: "Học viên",
  };

  const managedSchools =
    user.managedSchools?.length > 0
      ? user.managedSchools
      : schools?.filter((s) => s.managerId === user.id) || [];

  const assignedClasses =
    user.classAssignments?.length > 0
      ? user.classAssignments.map((a: any) => a.class).filter(Boolean)
      : classes?.filter((c) =>
          c.assignments?.some((a: any) => a.userId === user.id)
        ) || [];

  const enrolledClasses =
    user.classEnrollments?.length > 0
      ? user.classEnrollments.map((e: any) => e.class).filter(Boolean)
      : classes?.filter((c) =>
          c.enrollments?.some((e: any) => e.studentId === user.id)
        ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-[#EA580C] rounded-xl">
              <Eye className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Chi tiết thông tin người dùng</DialogTitle>
              <DialogDescription>
                Chế độ chỉ xem thông tin tài khoản • Không chỉnh sửa dữ liệu
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-[#EA580C] text-white font-bold text-lg shadow-sm">
                {user.profile?.fullName ? user.profile.fullName.trim()[0].toUpperCase() : user.username[0].toUpperCase()}
              </span>
              <div>
                <b className="text-base text-[#0F172A] block leading-tight">
                  {user.profile?.fullName || user.username}
                </b>
                <span className="text-xs text-[#EA580C] font-semibold mt-0.5 block">
                  {roleLabels[user.role?.code] || user.role?.name || user.role?.code}
                </span>
                <span className="font-mono text-xs text-[#64748B]">Mã tài khoản: {user.username}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Đang hoạt động
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[#E2E8F0] p-4 bg-[#F8FAFC] text-sm">
            <div>
              <span className="text-xs text-[#64748B] block">Email đăng ký:</span>
              <b className="text-[#0F172A] font-mono">{user.email}</b>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Số điện thoại:</span>
              <b className="text-[#0F172A]">{user.profile?.phoneNumber || "Chưa cập nhật"}</b>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-[#64748B] block">Địa chỉ cư trú:</span>
              <b className="text-[#0F172A]">{user.profile?.address || "Chưa cập nhật"}</b>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Ngày sinh:</span>
              <b className="text-[#0F172A]">
                {user.profile?.dateOfBirth
                  ? new Date(user.profile.dateOfBirth).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "Chưa cập nhật"}
              </b>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Giới tính:</span>
              <b className="text-[#0F172A]">
                {user.profile?.gender === "MALE"
                  ? "Nam"
                  : user.profile?.gender === "FEMALE"
                  ? "Nữ"
                  : user.profile?.gender === "OTHER"
                  ? "Khác"
                  : "Chưa cập nhật"}
              </b>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white text-sm space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B]">
              Phạm vi phụ trách / Lớp theo học
            </h4>
            {user.role?.code === "ADMIN" && (
              <p className="text-xs text-[#64748B]">
                Toàn hệ thống (Quản trị viên có toàn quyền quản lý toàn bộ trường học và lớp học).
              </p>
            )}

            {user.role?.code === "SCHOOL_MANAGER" && (
              <div>
                <p className="text-xs text-[#64748B] mb-1.5">Các trường học đang quản lý:</p>
                {managedSchools.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {managedSchools.map((s: any) => (
                      <span
                        key={s.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {s.name} ({s.code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] italic">Chưa phụ trách trường nào</span>
                )}
              </div>
            )}

            {(user.role?.code === "TEACHER" || user.role?.code === "TEACHING_ASSISTANT") && (
              <div>
                <p className="text-xs text-[#64748B] mb-1.5">Các lớp học được phân công:</p>
                {assignedClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {assignedClasses.map((c: any) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                      >
                        {c.name} ({c.code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] italic">Chưa phân công lớp nào</span>
                )}
              </div>
            )}

            {user.role?.code === "STUDENT" && (
              <div>
                <p className="text-xs text-[#64748B] mb-1.5">Các lớp học đang theo học:</p>
                {enrolledClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {enrolledClasses.map((c: any) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        {c.name} ({c.code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] italic">Chưa ghi danh vào lớp nào</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
          <Button onClick={() => onOpenChange(false)} className="bg-[#0F172A] text-white">
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
