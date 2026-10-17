"use client";

import { useState, useEffect, useTransition } from "react";
import { ChevronLeft, Edit2, GraduationCap, Plus, Search, Trash2, X, Loader2, ArrowRightLeft, AlertTriangle, Folder, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { assignStaffToClassAction, removeStaffFromClassAction, enrollStudentToClassAction, removeStudentFromClassAction, getAvailableStudentsForClassAction, transferStudentClassAction } from "@/actions/classes";
import { ClassMaterialsTab } from "@/components/materials/class-materials-tab";
import { ClassAssignmentsTab } from "@/components/assignments/class-assignments-tab";
import { ConfirmDialog, InfoCard, Badge, Status } from "@/components/shared/common-widgets";

export function ClassDetailView({
  classItem,
  classes = [],
  teachers,
  tas,
  currentUser,
  initialTab = "info",
  onBack,
  onRefreshDetail,
  onEditClass,
}: {
  classItem: any;
  classes?: any[];
  teachers: any[];
  tas: any[];
  currentUser?: any;
  initialTab?: "info" | "materials" | "assignments";
  onBack: () => void;
  onRefreshDetail: () => void;
  onEditClass?: (c: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "materials" | "assignments">(initialTab || "info");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [assignRole, setAssignRole] = useState<"TEACHER" | "TEACHING_ASSISTANT" | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isPending, startTransition] = useTransition();

  // State quản lý thêm / bớt học viên
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [removeStudentTarget, setRemoveStudentTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);

  // State chuyển lớp cho học viên
  const [transferTarget, setTransferTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  if (!classItem) return null;

  const sameSchoolClasses = (classes || []).filter(
    (c: any) => c.schoolId === classItem.schoolId && c.id !== classItem.id && c.isActive
  );

  const assignedTeachers = classItem.assignments?.filter((a: any) => a.roleInClass === "TEACHER") || [];
  const assignedTAs = classItem.assignments?.filter((a: any) => a.roleInClass === "TEACHING_ASSISTANT") || [];

  const handleAssign = () => {
    if (!assignRole || !selectedStaffId) return;
    startTransition(async () => {
      const res = await assignStaffToClassAction(classItem.id, selectedStaffId, assignRole);
      if (res.success) {
        setAssignRole(null);
        setSelectedStaffId("");
        onRefreshDetail();
      } else {
        alert(res.error || "Không thể gán nhân sự vào lớp!");
      }
    });
  };

  const handleConfirmTransfer = async () => {
    if (!transferTarget || !targetClassId) return;
    setTransferError(null);
    setIsTransferring(true);
    try {
      const res = await transferStudentClassAction(
        classItem.id,
        targetClassId,
        transferTarget.studentId
      );
      if (res.success) {
        setTransferTarget(null);
        onRefreshDetail();
      } else {
        setTransferError(res.error || "Không thể chuyển lớp cho học viên!");
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const [unassignTarget, setUnassignTarget] = useState<{ userId: string; roleName: string } | null>(null);

  const handleUnassign = (userId: string, roleName: string) => {
    setUnassignTarget({ userId, roleName });
  };

  const confirmUnassign = () => {
    if (!unassignTarget) return;
    const target = unassignTarget;
    setUnassignTarget(null);
    startTransition(async () => {
      await removeStaffFromClassAction(classItem.id, target.userId);
      onRefreshDetail();
    });
  };

  // Mở modal thêm học viên vào lớp
  const handleOpenAddStudent = async () => {
    setAddStudentOpen(true);
    setIsLoadingStudents(true);
    setSelectedStudentId("");
    setStudentSearch("");
    const res = await getAvailableStudentsForClassAction(classItem.id);
    if (res && res.success) {
      setAvailableStudents(res.students);
    }
    setIsLoadingStudents(false);
  };

  // Xác nhận thêm học viên
  const handleEnrollStudent = () => {
    if (!selectedStudentId) return;
    startTransition(async () => {
      const res = await enrollStudentToClassAction(classItem.id, selectedStudentId);
      if (res.success) {
        setAddStudentOpen(false);
        setSelectedStudentId("");
        onRefreshDetail();
      } else {
        alert(res.error || "Không thể thêm học viên!");
      }
    });
  };

  // Rút học viên khỏi lớp
  const handleRemoveStudent = (studentId: string, studentName: string) => {
    setRemoveStudentTarget({ studentId, studentName });
  };

  const confirmRemoveStudent = () => {
    if (!removeStudentTarget) return;
    const target = removeStudentTarget;
    setRemoveStudentTarget(null);
    startTransition(async () => {
      await removeStudentFromClassAction(classItem.id, target.studentId);
      onRefreshDetail();
    });
  };

  const statusLabel =
    classItem.status === "ACTIVE"
      ? "Đang diễn ra"
      : classItem.status === "UPCOMING"
      ? "Sắp khai giảng"
      : "Đã kết thúc";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#EA580C] transition"
        >
          <ChevronLeft className="size-4" /> Quay lại danh sách lớp học
        </button>

        {onEditClass && (
          <Button
            onClick={() => onEditClass(classItem)}
            className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            <Edit2 className="size-3.5 mr-1.5" /> Chỉnh sửa thông tin lớp
          </Button>
        )}
      </div>

      {/* ========================================================
          THANH 3 SUB-TABS TRỌNG TÂM TRONG CHI TIẾT LỚP HỌC (VỊ TRÍ 1)
          ======================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "info"
              ? "bg-[#EA580C] text-white shadow-sm"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        >
          <GraduationCap className="size-4" />
          <span>Thông tin lớp & Học viên</span>
        </button>

        <button
          onClick={() => setActiveTab("materials")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "materials"
              ? "bg-[#EA580C] text-white shadow-sm"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        >
          <Folder className="size-4" />
          <span>Quản lý học liệu</span>
        </button>

        <button
          onClick={() => setActiveTab("assignments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === "assignments"
              ? "bg-[#EA580C] text-white shadow-sm"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          }`}
        >
          <FileText className="size-4" />
          <span>Quản lý bài tập</span>
        </button>
      </div>

      {activeTab === "materials" && (
        <ClassMaterialsTab
          classId={classItem.id}
          className={classItem.name}
          currentUser={currentUser || { role: "ADMIN" }}
        />
      )}

      {activeTab === "assignments" && (
        <ClassAssignmentsTab
          classId={classItem.id}
          className={classItem.name}
          currentUser={currentUser || { role: "ADMIN" }}
        />
      )}

      {activeTab === "info" && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Thông tin lớp học & Thời khóa biểu"
          items={[
            `Mã lớp: ${classItem.code}`,
            `Khóa học: ${classItem.program || "IELTS"}`,
            `Trường học: ${classItem.school?.name || "Chưa gán"}`,
            `Sĩ số: ${classItem.enrollments?.length || 0}/${classItem.capacity} học viên`,
            `Lịch học: ${classItem.description || "Chưa xếp lịch cụ thể"}`,
            ...(classItem.startDate || classItem.endDate
              ? [
                  `Thời gian: ${
                    classItem.startDate
                      ? new Date(classItem.startDate).toLocaleDateString("vi-VN")
                      : "---"
                  } → ${
                    classItem.endDate
                      ? new Date(classItem.endDate).toLocaleDateString("vi-VN")
                      : "---"
                  }`,
                ]
              : []),
            `Trạng thái: ${statusLabel}`,
          ]}
        />

        {/* Card Giáo viên với nút Gán thêm giáo viên */}
        <section className="panel flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-base text-[#0F172A]">
                Giáo viên phụ trách ({assignedTeachers.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-lg text-[#EA580C] border-orange-200 hover:bg-orange-50"
                onClick={() => {
                  setAssignRole("TEACHER");
                  setSelectedStaffId("");
                }}
              >
                <Plus className="size-3 mr-1" /> Gán thêm GV
              </Button>
            </div>
            {assignedTeachers.length > 0 ? (
              <div className="space-y-2.5">
                {assignedTeachers.map((tch: any) => (
                  <div
                    key={tch.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex justify-between items-start"
                  >
                    <div className="space-y-1 text-sm">
                      <b className="text-[#0F172A] block text-sm">
                        {tch.staff?.profile?.fullName || tch.staff?.username}
                      </b>
                      <p className="text-[#64748B] text-xs">{tch.staff?.email}</p>
                      <Badge>Giáo viên giảng dạy</Badge>
                    </div>
                    {assignedTeachers.length > 1 && (
                      <button
                        onClick={() => handleUnassign(tch.userId, "giáo viên")}
                        className="text-xs font-semibold text-rose-600 hover:underline ml-2"
                        title="Hủy phân công giáo viên này"
                      >
                        Gỡ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] italic">Chưa phân công giáo viên</p>
            )}
          </div>
        </section>

        {/* Card Trợ giảng với nút Gán thêm trợ giảng */}
        <section className="panel flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-base text-[#0F172A]">
                Trợ giảng (TA) phụ trách ({assignedTAs.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-lg text-purple-600 border-purple-200 hover:bg-purple-50"
                onClick={() => {
                  setAssignRole("TEACHING_ASSISTANT");
                  setSelectedStaffId("");
                }}
              >
                <Plus className="size-3 mr-1" /> Gán thêm TA
              </Button>
            </div>
            {assignedTAs.length > 0 ? (
              <div className="space-y-2.5">
                {assignedTAs.map((ta: any) => (
                  <div
                    key={ta.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex justify-between items-start"
                  >
                    <div className="space-y-1 text-sm">
                      <b className="text-[#0F172A] block text-sm">
                        {ta.staff?.profile?.fullName || ta.staff?.username}
                      </b>
                      <p className="text-[#64748B] text-xs">{ta.staff?.email}</p>
                      <Badge>Trợ giảng hỗ trợ lớp</Badge>
                    </div>
                    {assignedTAs.length > 1 && (
                      <button
                        onClick={() => handleUnassign(ta.userId, "trợ giảng")}
                        className="text-xs font-semibold text-rose-600 hover:underline ml-2"
                        title="Hủy phân công trợ giảng này"
                      >
                        Gỡ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] italic">Chưa phân công trợ giảng</p>
            )}
          </div>
        </section>
      </div>

      <section className="panel mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-base text-[#0F172A]">
              Danh sách học viên theo học ({classItem.enrollments?.length || 0}/{classItem.capacity})
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Quản lý và cập nhật danh sách học sinh ghi danh trong lớp học này
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddStudent}
            className="text-xs rounded-xl text-[#EA580C] border-orange-200 hover:bg-orange-50 font-semibold shadow-xs"
          >
            <Plus className="size-3.5 mr-1" /> Thêm học viên vào lớp
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Họ và tên</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Email</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Mã học viên</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Ngày vào lớp</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] bg-white">
              {classItem.enrollments?.length > 0 ? (
                classItem.enrollments.map((enr: any) => (
                  <tr key={enr.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                      {enr.student?.profile?.fullName || enr.student?.username}
                    </td>
                    <td className="px-4 py-3.5 text-[#475569]">{enr.student?.email}</td>
                    <td className="px-4 py-3.5 font-mono text-xs">{enr.student?.username}</td>
                    <td className="px-4 py-3.5 text-[#64748B]">
                      {new Date(enr.enrolledAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Status tone="success">
                        {enr.status === "STUDYING" ? "Đang học" : enr.status}
                      </Status>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end items-center gap-3">
                        {sameSchoolClasses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferTarget({
                                studentId: enr.studentId,
                                studentName: enr.student?.profile?.fullName || enr.student?.username,
                              });
                              setTransferError(null);
                              setTargetClassId(sameSchoolClasses[0].id);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                            title={`Chuyển học viên sang lớp khác thuộc cùng trường ${classItem.school?.name || ""}`}
                          >
                            <ArrowRightLeft className="size-3.5" /> Chuyển lớp
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleRemoveStudent(
                              enr.studentId,
                              enr.student?.profile?.fullName || enr.student?.username
                            )
                          }
                          className="text-xs font-semibold text-rose-600 hover:underline inline-flex items-center gap-1"
                          title="Rút học viên khỏi lớp"
                        >
                          <Trash2 className="size-3.5" /> Gỡ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-[#94A3B8] italic">
                    Chưa có học viên trong lớp. Bấm &quot;Thêm học viên vào lớp&quot; hoặc dùng tính năng Import Excel để thêm học viên!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DIALOG GÁN NHÂN SỰ */}
      {assignRole && (
        <Dialog open={true} onOpenChange={() => setAssignRole(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {assignRole === "TEACHER" ? "Gán thêm Giáo viên" : "Gán thêm Trợ giảng (TA)"}
              </DialogTitle>
              <DialogDescription>
                Chọn nhân sự để gán thêm vào lớp {classItem.name} ({classItem.code})
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <label className="block text-sm font-semibold mb-2">Chọn nhân sự</label>
              <select
                className="field"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">-- Chọn nhân sự --</option>
                {(assignRole === "TEACHER" ? teachers : tas)
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
                onClick={handleAssign}
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
                Chọn học viên để ghi danh vào lớp {classItem.name} ({classItem.code}). Sĩ số: {classItem.enrollments?.length || 0}/{classItem.capacity}.
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
                              {st.classEnrollments?.[0]?.class?.school?.name ? ` • Trường: ${st.classEnrollments[0].class.school.name}` : ""}
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
                onClick={handleEnrollStudent}
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
        onConfirm={confirmUnassign}
      />

      {/* DIALOG XÁC NHẬN RÚT HỌC VIÊN */}
      <ConfirmDialog
        open={!!removeStudentTarget}
        onOpenChange={(open) => !open && setRemoveStudentTarget(null)}
        title="Rút học viên khỏi lớp học"
        description={`Bạn có chắc muốn rút học viên "${removeStudentTarget?.studentName}" khỏi lớp "${classItem.name}"? Thao tác này sẽ hủy ghi danh của học viên trong lớp.`}
        confirmText="Rút khỏi lớp"
        isPending={isPending}
        onConfirm={confirmRemoveStudent}
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
                  <b className="text-slate-800">{classItem.name} ({classItem.code})</b>
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
                onClick={handleConfirmTransfer}
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
      )}
    </>
  );
}

