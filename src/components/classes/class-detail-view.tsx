"use client";

import { useState, useEffect, useTransition } from "react";
import { ChevronLeft, Edit2, GraduationCap, Plus, Trash2, ArrowRightLeft, Folder, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignStaffToClassAction,
  removeStaffFromClassAction,
  enrollStudentToClassAction,
  removeStudentFromClassAction,
  getAvailableStudentsForClassAction,
  transferStudentClassAction,
} from "@/actions/classes";
import { ClassMaterialsTab } from "@/components/materials/class-materials-tab";
import { ClassAssignmentsTab } from "@/components/assignments/class-assignments-tab";
import { InfoCard, Badge, Status } from "@/components/shared/common-widgets";
import { ClassDetailModals } from "./class-detail-modals";

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

  const [assignRole, setAssignRole] = useState<"TEACHER" | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isPending, startTransition] = useTransition();

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [removeStudentTarget, setRemoveStudentTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);

  const [transferTarget, setTransferTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<{ userId: string; roleName: string } | null>(null);

  if (!classItem) return null;

  const sameSchoolClasses = (classes || []).filter(
    (c: any) => c.schoolId === classItem.schoolId && c.id !== classItem.id && c.isActive
  );

  const assignedTeachers = classItem.assignments?.filter((a: any) => a.roleInClass === "TEACHER") || [];

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

  const confirmUnassign = () => {
    if (!unassignTarget) return;
    const target = unassignTarget;
    setUnassignTarget(null);
    startTransition(async () => {
      await removeStaffFromClassAction(classItem.id, target.userId);
      onRefreshDetail();
    });
  };

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
          <div className="grid gap-4 md:grid-cols-2">
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
                            onClick={() => setUnassignTarget({ userId: tch.userId, roleName: "giáo viên" })}
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
                                setRemoveStudentTarget({
                                  studentId: enr.studentId,
                                  studentName: enr.student?.profile?.fullName || enr.student?.username,
                                })
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

          <ClassDetailModals
            classItem={classItem}
            teachers={teachers}
            tas={tas}
            sameSchoolClasses={sameSchoolClasses}
            isPending={isPending}
            assignRole={assignRole}
            setAssignRole={setAssignRole}
            selectedStaffId={selectedStaffId}
            setSelectedStaffId={setSelectedStaffId}
            onAssignStaff={handleAssign}
            addStudentOpen={addStudentOpen}
            setAddStudentOpen={setAddStudentOpen}
            availableStudents={availableStudents}
            isLoadingStudents={isLoadingStudents}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            studentSearch={studentSearch}
            setStudentSearch={setStudentSearch}
            onEnrollStudent={handleEnrollStudent}
            unassignTarget={unassignTarget}
            setUnassignTarget={setUnassignTarget}
            onConfirmUnassign={confirmUnassign}
            removeStudentTarget={removeStudentTarget}
            setRemoveStudentTarget={setRemoveStudentTarget}
            onConfirmRemoveStudent={confirmRemoveStudent}
            transferTarget={transferTarget}
            setTransferTarget={setTransferTarget}
            targetClassId={targetClassId}
            setTargetClassId={setTargetClassId}
            transferError={transferError}
            isTransferring={isTransferring}
            onConfirmTransfer={handleConfirmTransfer}
          />
        </>
      )}
    </>
  );
}
