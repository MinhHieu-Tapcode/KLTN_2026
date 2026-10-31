"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  Server,
  ShieldCheck,
  Headphones,
  BookOpen,
  Code2,
} from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <DialogHeader className="border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-100 text-[#EA580C]">
              <HelpCircle className="size-5.5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-[#0F172A]">
                Trợ giúp & Thông tin hệ thống
              </DialogTitle>
              <DialogDescription className="text-xs text-[#64748B]">
                Hệ thống LMS Quản lý đào tạo Tiếng Anh liên kết SIMPACE
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 text-sm">
          {/* Thông tin đồ án */}
          <div className="rounded-xl border border-orange-200/80 bg-[#FFF7ED] p-3.5 space-y-1.5">
            <b className="flex items-center gap-2 text-xs font-bold text-[#EA580C] uppercase tracking-wider">
              <BookOpen className="size-4" /> Đề tài Khóa luận tốt nghiệp (MIS 2026)
            </b>
            <p className="text-xs text-[#334155] leading-relaxed">
              <b>Đơn vị ứng dụng:</b> Công ty Cổ phần SIMPACE Việt Nam (Chương trình IELTS liên kết các trường THPT/THCS).
            </p>
            <p className="text-xs text-[#334155]">
              <b>Nhóm phát triển:</b> Nhóm sinh viên ngành Hệ thống Thông tin Quản lý (MIS).
            </p>
          </div>

          {/* Công nghệ nền tảng */}
          <div className="rounded-xl border border-slate-200 p-3.5 space-y-2 bg-slate-50/60">
            <b className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
              <Code2 className="size-4 text-blue-600" /> Nền tảng công nghệ (Tech Stack)
            </b>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#475569]">
              <div>• <b>Framework:</b> Next.js 14 App Router</div>
              <div>• <b>Ngôn ngữ:</b> 100% TypeScript</div>
              <div>• <b>CSDL:</b> PostgreSQL (Supabase)</div>
              <div>• <b>ORM:</b> Prisma ORM 5.x</div>
              <div>• <b>Xác thực:</b> Session JWT Secure</div>
              <div>• <b>Phân quyền:</b> Dynamic RBAC Matrix</div>
            </div>
          </div>

          {/* Kênh hỗ trợ */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5">
            <b className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <Headphones className="size-4 text-emerald-600" /> Kênh hỗ trợ kỹ thuật
            </b>
            <p className="text-xs text-emerald-900">
              <b>Email hỗ trợ:</b> support@simpace.vn hoặc toilamotcongau@gmail.com
            </p>
            <p className="text-xs text-emerald-900">
              <b>Hotline kỹ thuật:</b> 0987.654.321 (Hỗ trợ 8:00 - 18:00 các ngày trong tuần)
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#F1F5F9]">
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs px-5"
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
