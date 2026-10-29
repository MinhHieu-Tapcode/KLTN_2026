"use client";

import React from "react";
import { AlertTriangle, ArrowRightLeft, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/common-widgets";

export interface ClassDetailModalsProps {
  classItem: any;
  teachers: any[];
  tas?: any[];
  sameSchoolClasses: any[];
  isPending: boolean;
  assignRole: "TEACHER" | null;
  setAssignRole: (v: "TEACHER" | null) => void;
  selectedStaffId: string;
  setSelectedStaffId: (v: string) => void;
  onAssignStaff: () => void;
  addStudentOpen: boolean;
  setAddStudentOpen: (v: boolean) => void;
  availableStudents: any[];
  isLoadingStudents: boolean;
  selectedStudentId: string;
  setSelectedStudentId: (v: string) => void;
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  onEnrollStudent: () => void;
  unassignTarget: { userId: string; roleName: string } | null;
  setUnassignTarget: (v: { userId: string; roleName: string } | null) => void;
  onConfirmUnassign: () => void;
  removeStudentTarget: { studentId: string; studentName: string } | null;
  setRemoveStudentTarget: (v: { studentId: string; studentName: string } | null) => void;
  onConfirmRemoveStudent: () => void;
  transferTarget: { studentId: string; studentName: string } | null;
  setTransferTarget: (v: { studentId: string; studentName: string } | null) => void;
  targetClassId: string;
  setTargetClassId: (v: string) => void;
  transferError: string | null;
  isTransferring: boolean;
  onConfirmTransfer: () => void;
}

export function ClassDetailModals({
  classItem,
  teachers,
  tas,
  sameSchoolClasses,
  isPending,
  assignRole,
  setAssignRole,
  selectedStaffId,
  setSelectedStaffId,
  onAssignStaff,
  addStudentOpen,
  setAddStudentOpen,
  availableStudents,
  isLoadingStudents,
  selectedStudentId,
  setSelectedStudentId,
  studentSearch,
  setStudentSearch,
  onEnrollStudent,
  unassignTarget,
  setUnassignTarget,
  onConfirmUnassign,
  removeStudentTarget,
  setRemoveStudentTarget,
  onConfirmRemoveStudent,
  transferTarget,
  setTransferTarget,
  targetClassId,
  setTargetClassId,
  transferError,
  isTransferring,
  onConfirmTransfer,
}: ClassDetailModalsProps) {
  return (
    <>
      {/* DIALOG GÁN NHÂN SỰ */}
      {assignRole && (
        <Dialog open={true} onOpenChange={() => setAssignRole(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gán thêm Giáo viên</DialogTitle>
              <DialogDescription>
                Chọn giáo viên để gán thêm vào lớp {classItem.name} ({classItem.code})
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <label className="block text-sm font-semibold mb-2">Chọn giáo viên</label>
              <select
                className="field"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">-- Chọn giáo viên --</option>
                {teachers
                  .filter((s: any) => !classItem.assignments?.some((a: any) => a.userId === s.id))
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.profile?.fullName || s.username} ({s.email})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" onClick={() => setAssignRole(null)}>
                Hủy
              </Button>
              <Button
                onClick={onAssignStaff}
                disabled={!selectedStaffId || isPending}
                className="bg-[#EA580C] text-white"
              >
                {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Xác nhận phân công
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL THÊM HỌC VIÊN VÀO LỚP */}
      {addStudentOpen && (
        <Dialog open={true} onOpenChange={() => setAddStudentOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm học viên vào lớp</DialogTitle>
              <DialogDescription>
                Chọn học viên để ghi danh vào lớp {classItem.name} ({classItem.code}). Sĩ số:{" "}
                {classItem.enrollments?.length || 0}/{classItem.capacity}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  className="field field-search text-xs pl-9"
                  placeholder="Tìm học viên theo họ tên, email, mã HV..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {isLoadingStudents ? (
                <div className="py-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Đang tải danh sách học viên...
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#F1F5F9]">
                  {availableStudents
                    .filter((st: any) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.trim().toLowerCase();
                      return (
                        (st.profile?.fullName || "").toLowerCase().includes(q) ||
                        st.username.toLowerCase().includes(q) ||
                        st.email.toLowerCase().includes(q)
                      );
                    })
                    .map((st: any) => (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-orange-50/50 transition ${
                          selectedStudentId === st.id ? "bg-orange-50 border-l-4 border-l-[#EA580C]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedStudent"
                            checked={selectedStudentId === st.id}
                            onChange={() => setSelectedStudentId(st.id)}
                            className="text-[#EA580C] focus:ring-[#EA580C]"
                          />
                          <div>
                            <b className="text-xs text-[#0F172A] block font-semibold">
                              {st.profile?.fullName || st.username}
                            </b>
                            <span className="text-[11px] text-[#64748B] block">
                              {st.email} • Mã: <span className="font-mono">{st.username}</span>
                              {st.classEnrollments?.[0]?.class?.school?.name
                                ? ` • Trường: ${st.classEnrollments[0].class.school.name}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  {availableStudents.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#94A3B8] italic">
                      Không có học viên nào khả dụng để thêm.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button variant="outline" onClick={() => setAddStudentOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={onEnrollStudent}
                disabled={!selectedStudentId || isPending}
                className="bg-[#EA580C] text-white"
              >
                {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Xác nhận thêm vào lớp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG XÁC NHẬN HỦY PHÂN CÔNG NHÂN SỰ */}
      <ConfirmDialog
        open={!!unassignTarget}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
        title={`Hủy phân công ${unassignTarget?.roleName || "nhân sự"}`}
        description={`Bạn có chắc muốn hủy phân công ${unassignTarget?.roleName || "nhân sự này"} khỏi lớp học? Thao tác này sẽ gỡ nhân sự khỏi lớp.`}
        confirmText="Hủy phân công"
        isPending={isPending}
        onConfirm={onConfirmUnassign}
      />

      {/* DIALOG XÁC NHẬN RÚT HỌC VIÊN */}
      <ConfirmDialog
        open={!!removeStudentTarget}
        onOpenChange={(open) => !open && setRemoveStudentTarget(null)}
        title="Rút học viên khỏi lớp học"
        description={`Bạn có chắc muốn rút học viên "${removeStudentTarget?.studentName}" khỏi lớp "${classItem.name}"? Thao tác này sẽ hủy ghi danh của học viên trong lớp.`}
        confirmText="Rút khỏi lớp"
        isPending={isPending}
        onConfirm={onConfirmRemoveStudent}
      />

      {/* DIALOG CHUYỂN LỚP HỌC VIÊN CÙNG TRƯỜNG */}
      {transferTarget && (
        <Dialog open={true} onOpenChange={() => !isTransferring && setTransferTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="size-5 text-[#EA580C]" /> Chuyển học viên sang lớp khác
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Chuyển học viên sang lớp khác trong cùng trường <b>{classItem.school?.name}</b>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                <div>
                  <span className="text-slate-500">Học viên:</span>{" "}
                  <b className="text-slate-800">{transferTarget.studentName}</b>
                </div>
                <div>
                  <span className="text-slate-500">Lớp hiện tại:</span>{" "}
                  <b className="text-slate-800">
                    {classItem.name} ({classItem.code})
                  </b>
                </div>
                <div>
                  <span className="text-slate-500">Trường học:</span>{" "}
                  <b className="text-[#EA580C]">{classItem.school?.name}</b>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn lớp chuyển đến (Cùng trường {classItem.school?.name}):
                </label>
                {sameSchoolClasses.length > 0 ? (
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full text-xs font-medium px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                    {sameSchoolClasses.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code}) • {cls.description || "Chưa có lịch"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 italic">
                    Trường này hiện không có lớp học nào khác đang hoạt động để chuyển học sinh.
                  </p>
                )}
              </div>

              {transferError && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <b className="block">Không thể chuyển lớp:</b>
                    <p className="mt-0.5">{transferError}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isTransferring}
                onClick={() => setTransferTarget(null)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                disabled={!targetClassId || isTransferring || sameSchoolClasses.length === 0}
                onClick={onConfirmTransfer}
                className="text-xs font-semibold bg-[#EA580C] hover:bg-[#C2410C] text-white"
              >
                {isTransferring ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                Xác nhận chuyển lớp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
