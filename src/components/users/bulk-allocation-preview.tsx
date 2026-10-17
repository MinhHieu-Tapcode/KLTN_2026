"use client";

import React, { useState } from "react";
import { AlertTriangle, ArrowRightLeft, Check, ChevronLeft, Eye, Loader2, RotateCcw, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BulkAllocationSuggestion,
  InvalidStudentRow,
  LevelAllocationPlan,
  ProposedClass,
  ValidatedStudentRow,
  commitBulkAllocationAction,
  rebalanceOnClassCountChangeAction,
  rebalanceOnStudentTransferAction,
} from "@/actions/bulk-allocation";

export interface BulkAllocationPreviewProps {
  excelFileName: string;
  selectedSchoolId: string;
  schools: any[];
  allocationSuggestion: BulkAllocationSuggestion;
  invalidRowsList: InvalidStudentRow[];
  onUpdateSuggestion: (next: BulkAllocationSuggestion) => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
  onResetUpload: () => void;
  onBackToStep1: () => void;
  onCommittedSuccess: (summaryPayload: any) => void;
}

export function BulkAllocationPreview({
  excelFileName,
  selectedSchoolId,
  schools,
  allocationSuggestion,
  invalidRowsList,
  onUpdateSuggestion,
  onNotify,
  onError,
  onResetUpload,
  onBackToStep1,
  onCommittedSuccess,
}: BulkAllocationPreviewProps) {
  const [selectedClassDetail, setSelectedClassDetail] = useState<ProposedClass | null>(null);
  const [transferStudent, setTransferStudent] = useState<ValidatedStudentRow | null>(null);
  const [targetClassTempId, setTargetClassTempId] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");
  const [adjustClassLevel, setAdjustClassLevel] = useState<LevelAllocationPlan | null>(null);
  const [newClassCountInput, setNewClassCountInput] = useState<number>(1);
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);
  const [showInvalidListModal, setShowInvalidListModal] = useState(false);
  const [committingExcel, setCommittingExcel] = useState(false);

  const selectedSchoolName = schools.find((s) => s.id === selectedSchoolId)?.name || "Chưa chọn";

  const getSchoolCode = () => {
    const school = schools.find((s) => s.id === selectedSchoolId);
    return school ? school.code.replace(/[^a-zA-Z0-9]/g, "") : "TD";
  };

  const handleConfirmAdjustClassCount = async () => {
    if (!adjustClassLevel) return;
    const count = Math.floor(newClassCountInput);
    if (count < 1) return;

    const res = await rebalanceOnClassCountChangeAction(adjustClassLevel, count, getSchoolCode());
    if (!res.success || !res.updatedPlan) {
      alert(res.error || "Không thể điều chỉnh số lớp!");
      return;
    }

    const nextPlans = allocationSuggestion.levelPlans.map((p) =>
      p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
    );
    const newTotalClasses = nextPlans.reduce((acc, p) => acc + p.classes.length, 0);

    onUpdateSuggestion({
      ...allocationSuggestion,
      summary: { ...allocationSuggestion.summary, totalClasses: newTotalClasses },
      levelPlans: nextPlans,
    });
    onNotify(res.message || "Đã điều chỉnh số lớp và phân bổ lại toàn bộ học sinh!");
    setAdjustClassLevel(null);
  };

  const handleConfirmTransfer = async () => {
    if (!transferStudent || !targetClassTempId) return;
    setTransferError("");

    const currentPlan = allocationSuggestion.levelPlans.find((p) => p.levelId === transferStudent.levelId);
    if (!currentPlan) {
      setTransferError("Không tìm thấy kế hoạch phân lớp cho trình độ này!");
      return;
    }
    if (!currentPlan.classes.some((c) => c.tempId === targetClassTempId)) {
      setTransferError("Chỉ được chuyển học sinh sang lớp cùng trình độ IELTS!");
      return;
    }

    const res = await rebalanceOnStudentTransferAction(
      currentPlan,
      transferStudent.email,
      targetClassTempId,
      getSchoolCode()
    );
    if (!res.success || !res.updatedPlan) {
      setTransferError(res.error || "Lỗi khi chuyển lớp!");
      return;
    }

    const nextPlans = allocationSuggestion.levelPlans.map((p) =>
      p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
    );
    onUpdateSuggestion({ ...allocationSuggestion, levelPlans: nextPlans });

    if (selectedClassDetail) {
      const updatedClass = res.updatedPlan.classes.find((c) => c.classIndex === selectedClassDetail.classIndex);
      if (updatedClass) setSelectedClassDetail(updatedClass);
    }

    onNotify(res.message || "Đã chuyển học sinh và tự động cân bằng lại sĩ số các lớp trong trình độ!");
    setTransferStudent(null);
    setTargetClassTempId("");
  };

  const handleCommitAllocation = async () => {
    if (!selectedSchoolId) return;
    setCommittingExcel(true);
    try {
      const res = await commitBulkAllocationAction(
        allocationSuggestion.levelPlans,
        selectedSchoolId,
        excelFileName || "import_ielts.xlsx"
      );
      if (!res.success) {
        onError(res.error || "Lỗi khi lưu dữ liệu phân lớp!");
        setConfirmCommitOpen(false);
      } else {
        setConfirmCommitOpen(false);
        onCommittedSuccess({
          fullName: `Đã phân lớp và khởi tạo thành công ${allocationSuggestion.summary.totalAllocatedStudents} học viên vào ${allocationSuggestion.summary.totalClasses} lớp IELTS`,
          username: "HV...",
          email: "Đã gửi thông tin tài khoản qua email",
          role: "Học sinh",
          mailResult: { sent: true },
        });
      }
    } catch (err: any) {
      onError("Lỗi hệ thống khi phân lớp: " + (err.message || String(err)));
      setConfirmCommitOpen(false);
    } finally {
      setCommittingExcel(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-600">
            Đang xử lý tệp: <b className="text-slate-800">{excelFileName}</b> — Trường học:{" "}
            <b className="text-slate-800">{selectedSchoolName}</b>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onResetUpload} className="text-xs h-7 gap-1">
            <RotateCcw className="size-3" /> Tải tệp khác
          </Button>
        </div>

        {/* 6 chỉ số tổng quan */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-emerald-700">1. HS hợp lệ</span>
            <b className="text-xl text-emerald-800 mt-1">{allocationSuggestion.summary.totalValid}</b>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-rose-700">2. HS chưa hợp lệ</span>
              {invalidRowsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInvalidListModal(true)}
                  className="text-[10px] text-rose-600 underline hover:text-rose-800"
                >
                  Xem lỗi
                </button>
              )}
            </div>
            <b className="text-xl text-rose-800 mt-1">{invalidRowsList.length}</b>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-indigo-700">3. Số trình độ</span>
            <b className="text-xl text-indigo-800 mt-1">{allocationSuggestion.levelPlans.length}</b>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-[#EA580C]">4. Tổng lớp dự kiến</span>
            <b className="text-xl text-orange-800 mt-1">{allocationSuggestion.summary.totalClasses}</b>
          </div>
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-sky-700">5. Đã phân lớp</span>
            <b className="text-xl text-sky-800 mt-1">{allocationSuggestion.summary.totalAllocatedStudents}</b>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-600">6. Chưa phân lớp</span>
            <b className="text-xl text-slate-800 mt-1">
              {Math.max(0, allocationSuggestion.summary.totalValid - allocationSuggestion.summary.totalAllocatedStudents)}
            </b>
          </div>
        </div>

        {/* Danh sách lớp theo trình độ */}
        <div className="space-y-4 pt-1">
          {allocationSuggestion.levelPlans.map((plan) => (
            <div key={plan.levelId} className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white shadow-sm">
              <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-3.5 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 bg-orange-100 text-[#EA580C] font-bold text-xs rounded-lg">
                    {plan.levelCode}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Trình độ: {plan.levelName}</h3>
                    <p className="text-xs text-[#64748B]">
                      Tổng số học sinh: <b>{plan.studentCount}</b> — Số lớp hiện tại: <b>{plan.classCount}</b> (Sĩ số
                      trung bình ~{Math.round(plan.studentCount / Math.max(1, plan.classCount))} HV/lớp)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAdjustClassLevel(plan);
                    setNewClassCountInput(plan.classCount);
                  }}
                  className="text-xs border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C] h-7 gap-1"
                >
                  <Sliders className="size-3.5 text-[#EA580C]" /> Điều chỉnh số lớp
                </Button>
              </div>

              <div className="p-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plan.classes.map((c) => (
                  <div
                    key={c.tempId}
                    className="rounded-xl border border-slate-200 bg-[#FAFAFA] hover:bg-white hover:border-[#EA580C]/50 transition p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-xs text-[#0F172A] line-clamp-1">{c.name}</h4>
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-200 text-slate-700">
                          {c.students.length} HV
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[#64748B] mt-0.5">{c.code}</p>
                      <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1.5">
                        {c.students.slice(0, 2).map((s, idx) => (
                          <div key={idx} className="truncate">
                            • {s.fullName} ({s.ieltsScore}đ)
                          </div>
                        ))}
                        {c.students.length > 2 && (
                          <div className="text-[10px] text-slate-400 italic">
                            ... và {c.students.length - 2} học sinh khác
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClassDetail(c)}
                        className="text-xs text-[#EA580C] hover:bg-orange-50 h-7 px-2.5 gap-1 font-semibold"
                      >
                        <Eye className="size-3.5" /> Chi tiết lớp
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0]">
          <Button type="button" variant="outline" onClick={onBackToStep1} className="text-xs">
            <ChevronLeft className="size-3.5 mr-1" /> Quay lại Bước 1
          </Button>
          <Button
            type="button"
            onClick={() => setConfirmCommitOpen(true)}
            disabled={committingExcel || allocationSuggestion.summary.totalAllocatedStudents === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 gap-1.5 font-bold shadow-sm"
          >
            <Check className="size-4" /> Xác nhận phân lớp & Khởi tạo ({allocationSuggestion.summary.totalAllocatedStudents} học viên)
          </Button>
        </div>
      </div>

      {/* SUB-MODAL 1: CHI TIẾT LỚP HỌC */}
      {selectedClassDetail && (
        <Dialog open={true} onOpenChange={() => setSelectedClassDetail(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center justify-between">
                <span>Chi tiết: {selectedClassDetail.name}</span>
                <span className="font-mono text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedClassDetail.code}
                </span>
              </DialogTitle>
              <DialogDescription>
                Trình độ: <b>{selectedClassDetail.levelName}</b> — Sĩ số dự kiến:{" "}
                <b>{selectedClassDetail.students.length} học sinh</b>
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2.5 font-bold text-slate-600">STT</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">Họ và tên</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">Email</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-center">Điểm IELTS</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">SĐT</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-center">Giới tính</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedClassDetail.students.map((st, idx) => (
                    <tr key={st.email} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{st.fullName}</td>
                      <td className="px-3 py-2 text-slate-600">{st.email}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 bg-orange-100 text-[#EA580C] font-bold rounded font-mono">
                          {st.ieltsScore}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{st.phoneNumber || "—"}</td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {st.gender === "FEMALE" ? "Nữ" : st.gender === "MALE" ? "Nam" : "Khác"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTransferStudent(st);
                            setTargetClassTempId("");
                            setTransferError("");
                          }}
                          className="text-[11px] h-6 px-2 border-slate-200 text-[#EA580C] hover:bg-orange-50 gap-1"
                        >
                          <ArrowRightLeft className="size-3" /> Chuyển lớp
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={() => setSelectedClassDetail(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SUB-MODAL 2: CHUYỂN LỚP */}
      {transferStudent && (
        <Dialog open={true} onOpenChange={() => setTransferStudent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-[#EA580C]" /> Chuyển lớp cho học sinh
              </DialogTitle>
              <DialogDescription>
                Chỉ cho phép chuyển học sinh sang lớp khác thuộc cùng trình độ IELTS ({transferStudent.levelName}).
              </DialogDescription>
            </DialogHeader>
            {transferError && (
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-200">
                {transferError}
              </div>
            )}
            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Học sinh: <b className="text-slate-900">{transferStudent.fullName}</b> ({transferStudent.email})
                </div>
                <div>
                  Điểm IELTS: <b className="text-[#EA580C]">{transferStudent.ieltsScore}</b> — Trình độ:{" "}
                  <b className="text-slate-900">{transferStudent.levelName}</b>
                </div>
                <div>
                  Lớp hiện tại: <b className="text-slate-800">{selectedClassDetail?.name}</b>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn lớp đích (Cùng trình độ IELTS) *
                </label>
                {(() => {
                  const currentPlan = allocationSuggestion.levelPlans.find((p) => p.levelId === transferStudent.levelId);
                  const candidateClasses =
                    currentPlan?.classes.filter((c) => c.tempId !== selectedClassDetail?.tempId) || [];
                  if (candidateClasses.length === 0) {
                    return (
                      <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
                        Trình độ này hiện chỉ có 1 lớp duy nhất. Nếu muốn chia thêm lớp để chuyển học sinh, vui lòng
                        dùng tính năng "Điều chỉnh số lớp".
                      </div>
                    );
                  }
                  return (
                    <select
                      className="field text-xs"
                      value={targetClassTempId}
                      onChange={(e) => setTargetClassTempId(e.target.value)}
                    >
                      <option value="">-- Chọn lớp tiếp nhận --</option>
                      {candidateClasses.map((cls) => (
                        <option key={cls.tempId} value={cls.tempId}>
                          {cls.name} ({cls.code}) — Hiện có {cls.students.length} HV
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-2.5 text-[11px] text-blue-800">
                <b>Quy tắc tự động chia lại:</b> Khi chuyển học sinh, hệ thống sẽ tự động tính toán và phân bổ lại toàn
                bộ học sinh thuộc trình độ này để đảm bảo sĩ số các lớp luôn cân bằng nhất.
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setTransferStudent(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                disabled={!targetClassTempId}
                onClick={handleConfirmTransfer}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white text-xs"
              >
                Xác nhận chuyển & Phân bổ lại
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SUB-MODAL 3: ĐIỀU CHỈNH SỐ LỚP */}
      {adjustClassLevel && (
        <Dialog open={true} onOpenChange={() => setAdjustClassLevel(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Sliders className="size-4 text-[#EA580C]" /> Điều chỉnh số lớp: {adjustClassLevel.levelName}
              </DialogTitle>
              <DialogDescription>
                Thay đổi số lớp phân bổ cho trình độ này. Hệ thống sẽ tự động chia đều lại toàn bộ học sinh.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Trình độ: <b className="text-slate-900">{adjustClassLevel.levelName}</b> ({adjustClassLevel.levelCode})
                </div>
                <div>
                  Tổng số học sinh thuộc trình độ: <b>{adjustClassLevel.studentCount}</b>
                </div>
                <div>
                  Số lớp hiện tại: <b>{adjustClassLevel.classCount}</b>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số lớp mới mong muốn (Số nguyên dương &ge; 1) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="field text-sm"
                  value={newClassCountInput}
                  onChange={(e) => setNewClassCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                <b>Cảnh báo:</b> Khi thay đổi số lớp, toàn bộ {adjustClassLevel.studentCount} học sinh của trình độ này
                sẽ được tự động chia đều lại vào {newClassCountInput} lớp mới (sĩ số ~
                {Math.floor(adjustClassLevel.studentCount / Math.max(1, newClassCountInput))} đến{" "}
                {Math.ceil(adjustClassLevel.studentCount / Math.max(1, newClassCountInput))} HV/lớp).
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAdjustClassLevel(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAdjustClassCount}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white text-xs"
              >
                Lưu & Phân bổ lại toàn bộ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SUB-MODAL 4: DANH SÁCH DÒNG LỖI */}
      {showInvalidListModal && (
        <Dialog open={true} onOpenChange={() => setShowInvalidListModal(false)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="size-4" /> Danh sách học sinh chưa hợp lệ ({invalidRowsList.length})
              </DialogTitle>
              <DialogDescription>
                Các dòng dữ liệu bị từ chối do thiếu thông tin hoặc sai định dạng theo quy tắc hệ thống.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-x-auto rounded-xl border border-rose-200 mt-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-rose-50 border-b border-rose-200">
                    <th className="px-3 py-2 font-bold text-rose-700">Dòng</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Họ và tên</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Email</th>
                    <th className="px-3 py-2 font-bold text-rose-700 text-center">Điểm thô</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Lý do từ chối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 bg-white">
                  {invalidRowsList.map((err, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/50">
                      <td className="px-3 py-2 font-mono text-slate-500">{err.rowNumber}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{err.fullName || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{err.email || "—"}</td>
                      <td className="px-3 py-2 text-center font-mono">{String(err.rawScore ?? "—")}</td>
                      <td className="px-3 py-2 text-rose-600 font-medium">{err.errorReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={() => setShowInvalidListModal(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* SUB-MODAL 5: XÁC NHẬN PHÂN LỚP & KHỞI TẠO */}
      {confirmCommitOpen && (
        <Dialog open={true} onOpenChange={() => setConfirmCommitOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Check className="size-5 text-emerald-600" /> Xác nhận phân lớp và khởi tạo
              </DialogTitle>
              <DialogDescription>
                Vui lòng kiểm tra lại phương án trước khi hệ thống ghi nhận vào cơ sở dữ liệu chính thức.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div>
                  Trường học tiếp nhận: <b className="text-slate-900">{selectedSchoolName}</b>
                </div>
                <div>
                  Tổng số tài khoản học viên sẽ tạo:{" "}
                  <b className="text-emerald-700">{allocationSuggestion.summary.totalAllocatedStudents}</b>
                </div>
                <div>
                  Tổng số lớp học IELTS sẽ khởi tạo:{" "}
                  <b className="text-[#EA580C]">{allocationSuggestion.summary.totalClasses}</b>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <b className="text-slate-800 block">Chi tiết phân bổ theo trình độ:</b>
                {allocationSuggestion.levelPlans.map((p) => (
                  <div
                    key={p.levelId}
                    className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-1"
                  >
                    <span>
                      Trình độ <b>{p.levelName}</b>:
                    </span>
                    <span>
                      <b>{p.classCount}</b> lớp ({p.studentCount} học viên)
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
                <b>Bảo mật & Cấp tài khoản:</b> Mật khẩu khởi tạo chuẩn <code>Simpace@2026</code> sẽ được băm bảo mật và
                gửi tự động qua email cho từng học viên. Học viên sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={committingExcel}
                onClick={() => setConfirmCommitOpen(false)}
              >
                Quay lại kiểm tra
              </Button>
              <Button
                type="button"
                disabled={committingExcel}
                onClick={handleCommitAllocation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold"
              >
                {committingExcel ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Đồng ý khởi tạo & Phân lớp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
