"use client";

import React from "react";
import { ArrowRightLeft, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/common-widgets";

export interface SchoolClassSubmodalsProps {
  school: any;
  currentClass: any;
  otherClassesInSameSchool: any[];
  enrollCount: number;
  capacity: number;
  isPending: boolean;
  transferModal: { open: boolean; student: any; currentClass: any } | null;
  setTransferModal: (v: { open: boolean; student: any; currentClass: any } | null) => void;
  targetClassId: string;
  setTargetClassId: (v: string) => void;
  onConfirmTransfer: () => void;
  addStudentOpen: boolean;
  setAddStudentOpen: (v: boolean) => void;
  eligibleStudents: any[];
  isLoadingEligible: boolean;
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  selectedStudent: any;
  setSelectedStudent: (v: any) => void;
  onConfirmAddStudent: () => void;
  removeModal: { open: boolean; student: any; currentClass: any } | null;
  setRemoveModal: (v: { open: boolean; student: any; currentClass: any } | null) => void;
  onConfirmRemove: () => void;
}

export function SchoolClassSubmodals({
  school,
  currentClass,
  otherClassesInSameSchool,
  enrollCount,
  capacity,
  isPending,
  transferModal,
  setTransferModal,
  targetClassId,
  setTargetClassId,
  onConfirmTransfer,
  addStudentOpen,
  setAddStudentOpen,
  eligibleStudents,
  isLoadingEligible,
  studentSearch,
  setStudentSearch,
  selectedStudent,
  setSelectedStudent,
  onConfirmAddStudent,
  removeModal,
  setRemoveModal,
  onConfirmRemove,
}: SchoolClassSubmodalsProps) {
  return (
    <>
      {/* MODAL 1: CHUYỂN LỚP CHO HỌC VIÊN TRONG CÙNG TRƯỜNG */}
      {transferModal && (
        <Dialog open={true} onOpenChange={() => setTransferModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0F172A]">
                <ArrowRightLeft className="size-5 text-[#EA580C]" /> Chuyển lớp cho học sinh
              </DialogTitle>
              <DialogDescription className="text-xs">
                Chuyển học viên <b>{transferModal.student.profile?.fullName || transferModal.student.username}</b> (Mã:{" "}
                {transferModal.student.username}) từ lớp <b>{transferModal.currentClass.name}</b> sang lớp khác thuộc
                trường <b>{school.name}</b>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                🔒 <b>Quy tắc hệ thống:</b> Học sinh chỉ được phép chuyển giữa các lớp trong cùng trường{" "}
                <b>{school.name}</b>. Không được chuyển sang lớp của trường khác.
              </div>

              <div>
                <label className="label text-xs font-semibold block mb-1">
                  Chọn lớp đích chuyển đến (Cùng trường {school.name}):
                </label>
                {otherClassesInSameSchool.length > 0 ? (
                  <select
                    className="field text-xs bg-white border-[#CBD5E1]"
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                  >
                    <option value="">-- Chọn lớp học đích ({otherClassesInSameSchool.length} lớp) --</option>
                    {otherClassesInSameSchool.map((c: any) => {
                      const count = c.enrollments?.length || c._count?.enrollments || 0;
                      const isFull = count >= c.capacity;
                      return (
                        <option key={c.id} value={c.id} disabled={isFull}>
                          {c.name} ({c.code}) - Sĩ số: {count}/{c.capacity} {isFull ? "(Đã đầy sĩ số)" : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    Trường hiện chỉ có 1 lớp duy nhất nên không có lớp nào khác để chuyển đến. Bạn cần tạo thêm lớp mới cho
                    trường này trước.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button type="button" variant="outline" onClick={() => setTransferModal(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={onConfirmTransfer}
                disabled={!targetClassId || isPending}
                className="bg-[#EA580C] text-white text-xs font-semibold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Xác nhận chuyển lớp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: THÊM HỌC VIÊN TỪ LỚP KHÁC CÙNG TRƯỜNG SANG */}
      {addStudentOpen && currentClass && (
        <Dialog open={true} onOpenChange={() => setAddStudentOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Plus className="size-4 text-[#EA580C]" /> Thêm học sinh vào lớp {currentClass.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Chỉ hiển thị các học sinh thuộc trường <b>{school.name}</b>. Sĩ số lớp: {enrollCount}/{capacity}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  className="field field-search text-xs pl-9"
                  placeholder="Tìm học sinh theo tên, email, mã HV..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {isLoadingEligible ? (
                <div className="py-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-[#EA580C]" /> Đang tải danh sách học sinh cùng trường...
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#F1F5F9]">
                  {eligibleStudents
                    .filter((st: any) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.trim().toLowerCase();
                      return (
                        (st.profile?.fullName || "").toLowerCase().includes(q) ||
                        st.username.toLowerCase().includes(q) ||
                        st.email.toLowerCase().includes(q)
                      );
                    })
                    .map((st: any) => {
                      const classInSchool = st.classEnrollments?.find((e: any) => e.class?.schoolId === school.id);
                      const isSelected = selectedStudent?.id === st.id;
                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-orange-50/50 transition ${
                            isSelected ? "bg-orange-50 border-l-4 border-l-[#EA580C]" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="selectedEligibleStudent"
                              checked={isSelected}
                              onChange={() => setSelectedStudent(st)}
                              className="text-[#EA580C] focus:ring-[#EA580C]"
                            />
                            <div>
                              <b className="text-xs text-[#0F172A] block font-semibold">
                                {st.profile?.fullName || st.username}
                              </b>
                              <span className="text-[11px] text-[#64748B] block">
                                {st.email} • Mã: <span className="font-mono">{st.username}</span>
                              </span>
                              {classInSchool?.class?.name ? (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  Đang học tại: {classInSchool.class.name} ({classInSchool.class.code})
                                </span>
                              ) : (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                  Học sinh trường {school.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  {eligibleStudents.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#94A3B8] italic">
                      Không có học sinh nào khác trong trường {school.name} khả dụng để thêm.
                    </div>
                  )}
                </div>
              )}

              {selectedStudent && (
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900">
                  ℹ️ Xác nhận điều chuyển học viên{" "}
                  <b>{selectedStudent.profile?.fullName || selectedStudent.username}</b> vào lớp{" "}
                  <b>{currentClass.name}</b>.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button type="button" variant="outline" onClick={() => setAddStudentOpen(false)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={onConfirmAddStudent}
                disabled={!selectedStudent || isPending}
                className="bg-[#EA580C] text-white text-xs font-semibold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Xác nhận thêm vào lớp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG XÁC NHẬN GỠ HỌC VIÊN */}
      <ConfirmDialog
        open={!!removeModal}
        onOpenChange={(op) => !op && setRemoveModal(null)}
        title="Rút học sinh khỏi lớp học"
        description={`Bạn có chắc muốn rút học sinh "${removeModal?.student?.profile?.fullName || removeModal?.student?.username}" khỏi lớp "${removeModal?.currentClass?.name}"?`}
        confirmText="Rút khỏi lớp"
        isPending={isPending}
        onConfirm={onConfirmRemove}
      />
    </>
  );
}
