"use client";

import React, { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { RoleCode } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getNextUserCodeAction } from "@/actions/users";
import { SingleUserTab } from "./single-user-tab";
import { BulkIeltsWizard } from "./bulk-ielts-wizard";

const ROLE_OPTIONS: { code: RoleCode; label: string; desc: string; prefix: string }[] = [
  { code: "STUDENT", label: "Học sinh", desc: "Theo học các lớp đối tác", prefix: "HV" },
  { code: "TEACHER", label: "Giáo viên", desc: "Giảng dạy chuyên môn", prefix: "GV" },
  { code: "TEACHING_ASSISTANT", label: "Trợ giảng (TA)", desc: "Hỗ trợ học tập & lớp", prefix: "TG" },
  { code: "SCHOOL_MANAGER", label: "Quản nhiệm", desc: "Quản lý trường học đối tác", prefix: "QN" },
  { code: "ADMIN", label: "Quản trị viên", desc: "Toàn quyền hệ thống", prefix: "AD" },
];

export function UserDialog({
  open,
  onOpenChange,
  schools,
  classes,
  users = [],
  ieltsLevels = [],
  onAddClassShortcut,
  onAddSchoolShortcut,
  onCreatedSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: any[];
  classes: any[];
  users?: any[];
  ieltsLevels?: any[];
  onAddClassShortcut: () => void;
  onAddSchoolShortcut?: () => void;
  onCreatedSuccess: (acc: any) => void;
}) {
  const [modalMode, setModalMode] = useState<"manual" | "excel">("manual");
  const [selectedRole, setSelectedRole] = useState<RoleCode>("STUDENT");
  const [previewCode, setPreviewCode] = useState<string>("HV1001");
  const [excelStep, setExcelStep] = useState<"upload" | "suggestion">("upload");

  useEffect(() => {
    let active = true;
    getNextUserCodeAction(selectedRole).then((res) => {
      if (active && res.success && res.code) {
        setPreviewCode(res.code);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedRole]);

  const isSuggestionView = selectedRole === "STUDENT" && modalMode === "excel" && excelStep === "suggestion";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`transition-all duration-200 ${
          isSuggestionView ? "max-w-5xl" : "max-w-2xl"
        } max-h-[92vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0F172A]">
            {isSuggestionView ? "Phương án đề xuất phân lớp học sinh IELTS" : "Thêm người dùng mới"}
          </DialogTitle>
          <DialogDescription>
            {isSuggestionView
              ? "Kiểm tra sĩ số, điều chỉnh số lớp, chuyển học sinh giữa các lớp cùng trình độ và xác nhận khởi tạo."
              : "Tạo tài khoản đơn lẻ theo vai trò hoặc tải danh sách học sinh hàng loạt để tự động phân lớp IELTS."}
          </DialogDescription>
        </DialogHeader>

        {/* BƯỚC 1: CHỌN VAI TRÒ NGƯỜI DÙNG */}
        <div className="pt-1">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              1. Chọn Vai trò người dùng *
            </label>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-orange-50 text-[#EA580C] rounded-lg border border-orange-200">
              Mã dự kiến: <b className="font-mono">{previewCode}</b>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.code}
                type="button"
                onClick={() => {
                  setSelectedRole(r.code);
                  if (r.code !== "STUDENT") {
                    setModalMode("manual");
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedRole === r.code
                    ? "border-[#EA580C] bg-[#FFF1EB] text-[#EA580C] shadow-sm ring-1 ring-[#EA580C]"
                    : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]"
                }`}
              >
                <span className="font-bold text-xs">{r.label}</span>
                <span className="text-[10px] text-[#64748B] mt-0.5 line-clamp-1">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CHỈ KHI CHỌN HỌC SINH MỚI HIỂN THỊ TAB NHẬP HÀNG LOẠT */}
        {selectedRole === "STUDENT" && (
          <div className="flex border-b border-[#E2E8F0] gap-4 text-sm font-semibold pt-1">
            <button
              type="button"
              onClick={() => {
                setModalMode("manual");
                setExcelStep("upload");
              }}
              className={`pb-2.5 transition border-b-2 ${
                modalMode === "manual"
                  ? "border-[#EA580C] text-[#EA580C]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Thêm thủ công (Từng người)
            </button>
            <button
              type="button"
              onClick={() => setModalMode("excel")}
              className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
                modalMode === "excel"
                  ? "border-[#EA580C] text-[#EA580C]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              <FileSpreadsheet className="size-4" /> Nhập hàng loạt & Phân lớp IELTS
            </button>
          </div>
        )}

        {!(selectedRole === "STUDENT" && modalMode === "excel") ? (
          <SingleUserTab
            selectedRole={selectedRole}
            schools={schools}
            classes={classes}
            ieltsLevels={ieltsLevels}
            onAddClassShortcut={onAddClassShortcut}
            onAddSchoolShortcut={onAddSchoolShortcut}
            onCancel={() => onOpenChange(false)}
            onCreatedSuccess={onCreatedSuccess}
          />
        ) : (
          <BulkIeltsWizard
            excelStep={excelStep}
            setExcelStep={setExcelStep}
            schools={schools}
            users={users}
            ieltsLevels={ieltsLevels}
            onAddSchoolShortcut={onAddSchoolShortcut}
            onCommittedSuccess={(summaryPayload) => {
              onOpenChange(false);
              onCreatedSuccess(summaryPayload);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
