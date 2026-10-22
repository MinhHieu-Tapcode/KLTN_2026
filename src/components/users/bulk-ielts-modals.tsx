"use client";

import React, { useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRightLeft, Info, Minus, Plus, User, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvalidStudentRow, LevelAllocationPlan, ProposedClass, ValidatedStudentRow } from "@/actions/bulk-allocation";

// ========================================================
// 1. POPUP CHI TIẾT LỚP HỌC (Ảnh 1 - Góc trên trái)
// ========================================================
export function ClassDetailModal({
  open,
  onClose,
  classData,
  onTransferStudent,
}: {
  open: boolean;
  onClose: () => void;
  classData: ProposedClass | null;
  onTransferStudent: (student: ValidatedStudentRow) => void;
}) {
  if (!classData) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 pr-6">
          <div className="space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900">
              Chi tiết lớp học – {classData.name}
            </DialogTitle>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Users className="size-3.5 text-slate-400" />
                {classData.students.length} học sinh
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-[#EA580C] border border-orange-200">
                Trình độ: {classData.levelName}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">STT</th>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3 text-center">Điểm đầu vào</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classData.students.map((st, idx) => (
                <tr key={st.email} className="hover:bg-slate-50/80 transition">
                  <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3 font-medium text-slate-900">{st.fullName}</td>
                  <td className="py-2 px-3 text-slate-500">{st.email}</td>
                  <td className="py-2 px-3 text-center font-bold text-slate-800">
                    {Number(st.ieltsScore).toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onTransferStudent(st)}
                      className="h-7 px-2.5 text-[11px] border-orange-200 text-[#EA580C] hover:bg-orange-50 font-medium"
                    >
                      <ArrowRightLeft className="size-3 mr-1" /> Chuyển lớp
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-8 text-xs">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================================
// 2. POPUP CHUYỂN LỚP CHO HỌC SINH (Ảnh 1 - Góc trên giữa)
// ========================================================
export function StudentTransferModal({
  open,
  onClose,
  student,
  currentClassName,
  availableClasses,
  onConfirmTransfer,
}: {
  open: boolean;
  onClose: () => void;
  student: ValidatedStudentRow | null;
  currentClassName: string;
  availableClasses: ProposedClass[];
  onConfirmTransfer: (targetClassTempId: string) => void;
}) {
  const [targetId, setTargetId] = useState("");

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">
            Chuyển lớp cho học sinh
          </DialogTitle>
        </DialogHeader>

        {/* Khối tóm tắt thông tin học sinh */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3.5">
          <div className="size-10 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center font-bold text-sm shrink-0">
            <User className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-slate-900 truncate">{student.fullName}</h4>
            <p className="text-xs text-slate-500 truncate">{student.email}</p>
          </div>
          <div className="flex items-center gap-4 text-center shrink-0 pr-2">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-medium">Điểm đầu vào</span>
              <b className="text-sm text-slate-800">{Number(student.ieltsScore).toFixed(1)}</b>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-medium">Trình độ</span>
              <b className="text-xs text-slate-800">{student.levelName}</b>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-medium">Lớp hiện tại</span>
              <b className="text-xs text-[#EA580C]">{currentClassName}</b>
            </div>
          </div>
        </div>

        {/* Form chọn lớp đích */}
        <div className="space-y-1.5 py-2">
          <label className="text-xs font-bold text-slate-800 block">
            Lớp đích <span className="text-rose-500">*</span>
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
          >
            <option value="">-- Chọn lớp đích tiếp nhận --</option>
            {availableClasses.map((c) => (
              <option key={c.tempId} value={c.tempId}>
                {c.name} ({c.code}) • Hiện có {c.students.length} học viên
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <Info className="size-3 text-[#EA580C]" /> Chỉ hiển thị lớp cùng trình độ IELTS ({student.levelName})
          </p>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-xs">
            Hủy
          </Button>
          <Button
            type="button"
            disabled={!targetId}
            onClick={() => onConfirmTransfer(targetId)}
            className="h-9 px-4 text-xs font-semibold bg-[#EA580C] hover:bg-[#D94E07] text-white"
          >
            Xác nhận chuyển lớp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================================
// 3. POPUP ĐIỀU CHỈNH SỐ LỚP (Ảnh 1 - Góc trên phải)
// ========================================================
export function AdjustClassCountModal({
  open,
  onClose,
  levelName,
  studentCount,
  currentClassCount,
  onConfirmAdjust,
}: {
  open: boolean;
  onClose: () => void;
  levelName: string;
  studentCount: number;
  currentClassCount: number;
  onConfirmAdjust: (newCount: number) => void;
}) {
  const [count, setCount] = useState<number>(currentClassCount || 1);

  React.useEffect(() => {
    setCount(currentClassCount || 1);
  }, [currentClassCount]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">
            Điều chỉnh số lớp
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Trình độ: <b className="text-slate-800">{levelName}</b> • <b className="text-slate-800">{studentCount} học sinh</b>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Số lớp mong muốn
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={count <= 1}
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                className="size-9 rounded-xl border-slate-200"
              >
                <Minus className="size-4" />
              </Button>
              <input
                type="number"
                min={1}
                max={Math.max(1, studentCount)}
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24 h-9 text-center font-bold text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={count >= studentCount}
                onClick={() => setCount((c) => c + 1)}
                className="size-9 rounded-xl border-slate-200"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
            <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <span>Hệ thống sẽ chia lại toàn bộ học sinh để sĩ số giữa các lớp chênh lệch tối đa 1.</span>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Thay đổi này sẽ ghi đè phương án phân lớp hiện tại.</span>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-xs">
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => onConfirmAdjust(count)}
            className="h-9 px-4 text-xs font-semibold bg-[#EA580C] hover:bg-[#D94E07] text-white"
          >
            Chia lại tự động
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================================
// 4. POPUP XÁC NHẬN KHỞI TẠO PHÂN LỚP (Ảnh 1 - Góc dưới trái)
// ========================================================
export function ConfirmCommitModal({
  open,
  onClose,
  totalValid,
  totalClasses,
  totalInvalid,
  isCommitting,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  totalValid: number;
  totalClasses: number;
  totalInvalid: number;
  isCommitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isCommitting && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">
            Xác nhận khởi tạo phân lớp
          </DialogTitle>
        </DialogHeader>

        {/* 3 thẻ chỉ số */}
        <div className="grid grid-cols-3 gap-2.5 py-3 text-center">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col items-center">
            <span className="size-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <User className="size-4" />
            </span>
            <b className="text-lg text-emerald-800">{totalValid}</b>
            <span className="text-[10px] text-emerald-700 font-medium">học sinh hợp lệ</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center">
            <span className="size-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1">
              <Users className="size-4" />
            </span>
            <b className="text-lg text-blue-800">{totalClasses}</b>
            <span className="text-[10px] text-blue-700 font-medium">lớp sẽ được tạo</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center">
            <span className="size-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mb-1">
              <AlertCircle className="size-4" />
            </span>
            <b className="text-lg text-rose-800">{totalInvalid}</b>
            <span className="text-[10px] text-rose-700 font-medium">dòng lỗi sẽ bị loại</span>
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Sau khi xác nhận, hệ thống sẽ tạo tài khoản học sinh và ghi danh vào lớp. Vui lòng kiểm tra phương án trước khi tiếp tục.
          </span>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isCommitting}
            onClick={onClose}
            className="h-9 px-4 text-xs"
          >
            Quay lại kiểm tra
          </Button>
          <Button
            type="button"
            disabled={isCommitting}
            onClick={onConfirm}
            className="h-9 px-4 text-xs font-semibold bg-[#EA580C] hover:bg-[#D94E07] text-white"
          >
            {isCommitting ? "Đang xử lý..." : "Xác nhận khởi tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================================
// 5. POPUP CHI TIẾT DÒNG DỮ LIỆU LỖI (Ảnh 1 - Góc dưới giữa)
// ========================================================
export function InvalidRowsModal({
  open,
  onClose,
  invalidRows,
}: {
  open: boolean;
  onClose: () => void;
  invalidRows: InvalidStudentRow[];
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">
            Chi tiết dòng dữ liệu lỗi
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-800 my-1">
          <AlertTriangle className="size-4 text-rose-600 shrink-0" />
          <span>{invalidRows.length} dòng dữ liệu chưa hợp lệ</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Dòng Excel</th>
                <th className="py-2.5 px-3">Học sinh</th>
                <th className="py-2.5 px-3">Trường lỗi</th>
                <th className="py-2.5 px-3">Nguyên nhân</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invalidRows.map((row, idx) => {
                let fieldError = "Dữ liệu";
                const reason = row.errorReason || "";
                if (reason.toLowerCase().includes("email")) fieldError = "Email";
                else if (reason.toLowerCase().includes("điểm") || reason.toLowerCase().includes("ielts"))
                  fieldError = "Điểm đầu vào";
                else if (reason.toLowerCase().includes("số điện thoại") || reason.toLowerCase().includes("sđt"))
                  fieldError = "Số điện thoại";
                else if (reason.toLowerCase().includes("tên")) fieldError = "Họ và tên";

                return (
                  <tr key={idx} className="hover:bg-rose-50/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      Dòng {row.rowNumber}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {row.fullName || <i className="text-slate-400">Chưa có tên</i>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{fieldError}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700">
                        {reason}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-xs font-medium">
            Đóng danh sách lỗi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================================
// 6. POPUP XÓA LỚP HỌC (Ảnh 1 - Góc dưới phải)
// ========================================================
export function DeleteClassModal({
  open,
  onClose,
  targetClass,
  onConfirmDelete,
}: {
  open: boolean;
  onClose: () => void;
  targetClass: ProposedClass | null;
  onConfirmDelete: () => void;
}) {
  if (!targetClass) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">
            Xóa lớp {targetClass.name}?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Tất cả học sinh trong lớp này sẽ được phân bổ lại vào các lớp còn lại cùng trình độ IELTS.
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa lớp?
          </p>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-xs">
            Hủy
          </Button>
          <Button
            type="button"
            onClick={onConfirmDelete}
            className="h-9 px-4 text-xs font-semibold bg-[#EA580C] hover:bg-[#D94E07] text-white"
          >
            Xóa lớp & chia lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================================================
// 7. POPUP CẤU HÌNH SĨ SỐ TỪNG LỚP (Ảnh 1 người dùng gửi)
// ========================================================
export function ConfigureClassCapacitiesModal({
  open,
  onClose,
  levelPlans,
  onConfirmSave,
}: {
  open: boolean;
  onClose: () => void;
  levelPlans: LevelAllocationPlan[];
  onConfirmSave: (classSettings: Record<string, { capacity: number; isRemoved?: boolean }>) => void;
}) {
  const [capacities, setCapacities] = useState<Record<string, number>>({});

  React.useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      for (const plan of levelPlans) {
        for (const cls of plan.classes) {
          initial[cls.tempId] = cls.capacity || 25;
        }
      }
      setCapacities(initial);
    }
  }, [open, levelPlans]);

  const handleUpdate = (tempId: string, val: number) => {
    setCapacities((prev) => ({
      ...prev,
      [tempId]: Math.max(0, val),
    }));
  };

  const hasAnyZero = Object.values(capacities).some((c) => c === 0);

  const handleSubmit = () => {
    const settings: Record<string, { capacity: number; isRemoved?: boolean }> = {};
    for (const [tempId, cap] of Object.entries(capacities)) {
      settings[tempId] = {
        capacity: cap,
        isRemoved: cap === 0,
      };
    }
    onConfirmSave(settings);
    onClose();
  };

  const sortedPlans = React.useMemo(() => {
    const order: Record<string, number> = { ADVANCED: 3, MEDIUM: 2, BASIC: 1 };
    return [...levelPlans].sort((a, b) => {
      const oA = order[a.levelCode] ?? 0;
      const oB = order[b.levelCode] ?? 0;
      return oB - oA;
    });
  }, [levelPlans]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900">
            Cấu hình sĩ số từng lớp học
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Tăng giảm sĩ số tối đa cho từng lớp. Nếu đặt <b>sĩ số = 0</b>, lớp sẽ bị giải thể và toàn bộ học sinh được tự động chuyển sang các lớp khác cùng trình độ.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {sortedPlans.map((plan) => {
            const isSingleClassInLevel = plan.classes.length <= 1;
            return (
              <div key={plan.levelId} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{plan.levelName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-[#EA580C] font-semibold">
                      {plan.levelCode}
                    </span>
                  </div>
                  <span className="text-slate-500 font-medium text-[11px]">
                    {plan.studentCount} học sinh • {plan.classes.length} lớp
                  </span>
                </div>

                <div className="space-y-2">
                  {plan.classes.map((cls) => {
                    const currentVal =
                      capacities[cls.tempId] !== undefined ? capacities[cls.tempId] : cls.capacity || 25;
                    const isZero = currentVal === 0;

                    return (
                      <div
                        key={cls.tempId}
                        className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                          isZero
                            ? "bg-rose-50/70 border-rose-300"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{cls.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">({cls.code})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Hiện có: <b className="text-slate-800">{cls.students.length} học sinh</b>
                            {isZero && (
                              <span className="ml-2 font-bold text-rose-600 block sm:inline">
                                ⚠ Sĩ số = 0: Lớp sẽ bị xóa & {cls.students.length} HS sẽ dồn sang lớp còn lại
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Stepper điều chỉnh sĩ số */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={isSingleClassInLevel && currentVal <= 1}
                            onClick={() => handleUpdate(cls.tempId, Math.max(0, currentVal - 1))}
                            className="size-8 rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100"
                          >
                            <Minus className="size-3.5" />
                          </Button>

                          <input
                            type="number"
                            min={isSingleClassInLevel ? 1 : 0}
                            max={60}
                            value={currentVal}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              handleUpdate(cls.tempId, isNaN(v) ? 0 : Math.max(isSingleClassInLevel ? 1 : 0, v));
                            }}
                            className={`w-14 h-8 text-center font-bold text-xs rounded-lg border focus:outline-none ${
                              isZero
                                ? "bg-rose-100 border-rose-400 text-rose-800"
                                : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={currentVal >= 60}
                            onClick={() => handleUpdate(cls.tempId, Math.min(60, currentVal + 1))}
                            className="size-8 rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100"
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {hasAnyZero && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <b>Lưu ý:</b> Các lớp có sĩ số đặt về 0 sẽ bị xóa khỏi phương án. Tất cả học sinh thuộc lớp đó sẽ tự động được phân bổ lại vào các lớp còn lại cùng trình độ IELTS.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-xs">
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="h-9 px-4 text-xs font-semibold bg-[#EA580C] hover:bg-[#D94E07] text-white"
          >
            Xác nhận & Cập nhật
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
