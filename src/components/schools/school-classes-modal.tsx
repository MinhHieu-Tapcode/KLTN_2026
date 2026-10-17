"use client";

import React, { useState, useEffect, useTransition } from "react";
import { BookOpen, Building2, Edit2, Plus, Search, Trash2, Users, X, Loader2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enrollStudentToClassAction, removeStudentFromClassAction, transferStudentClassAction, getSchoolClassesWithStudentsAction, getEligibleSchoolStudentsForClassAction } from "@/actions/classes";
import { ConfirmDialog } from "@/components/shared/common-widgets";

export function SchoolClassesModal({
  school,
  open,
  onOpenChange,
  onEditClass,
  onOpenAddClass,
  onRefresh,
}: {
  school: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClass?: (cls: any) => void;
  onOpenAddClass?: (schoolId: string) => void;
  onRefresh: () => void;
}) {
  const [activeClassId, setActiveClassId] = useState<string>("");
  const [schoolData, setSchoolData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal chuyển lớp
  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    student: any;
    currentClass: any;
  } | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");

  // Modal rút học viên
  const [removeModal, setRemoveModal] = useState<{
    open: boolean;
    student: any;
    currentClass: any;
  } | null>(null);

  // Modal thêm học viên cùng trường
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);

  // Tải chi tiết trường và danh sách học sinh theo lớp
  const loadSchoolClasses = React.useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const res = await getSchoolClassesWithStudentsAction(school.id);
      if (res.success && res.school) {
        setSchoolData(res.school);
        const classesList = res.school.classes || [];
        if (classesList.length > 0) {
          setActiveClassId((prev) => {
            const exists = classesList.some((c: any) => c.id === prev);
            return exists ? prev : classesList[0].id;
          });
        } else {
          setActiveClassId("");
        }
      }
    } catch (err) {
      console.error("Lỗi tải danh sách lớp của trường:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id]);

  useEffect(() => {
    if (open && school?.id) {
      loadSchoolClasses();
      setNotice(null);
    }
  }, [open, school?.id, loadSchoolClasses]);

  if (!open || !school) return null;

  const classes: any[] = schoolData?.classes || school.classes || [];
  const currentClass = classes.find((c: any) => c.id === activeClassId) || classes[0];
  const otherClassesInSameSchool = classes.filter(
    (c: any) => c.id !== currentClass?.id && c.isActive
  );

  const assignedTeachers = currentClass?.assignments?.filter((a: any) => a.roleInClass === "TEACHER") || [];
  const assignedTAs = currentClass?.assignments?.filter((a: any) => a.roleInClass === "TEACHING_ASSISTANT") || [];
  const enrollments = currentClass?.enrollments || [];
  const capacity = currentClass?.capacity || 30;
  const enrollCount = enrollments.length;

  // Thực hiện chuyển lớp học sinh
  const handleConfirmTransfer = () => {
    if (!transferModal || !targetClassId) return;
    startTransition(async () => {
      const res = await transferStudentClassAction(
        transferModal.currentClass.id,
        targetClassId,
        transferModal.student.id
      );
      if (res.success) {
        setNotice({ type: "success", message: res.message || "Chuyển lớp học sinh thành công!" });
        setTransferModal(null);
        setTargetClassId("");
        await loadSchoolClasses();
        onRefresh();
      } else {
        setNotice({ type: "error", message: res.error || "Không thể chuyển lớp cho học sinh!" });
      }
    });
  };

  // Thực hiện rút học sinh khỏi lớp
  const handleConfirmRemove = () => {
    if (!removeModal) return;
    startTransition(async () => {
      const res = await removeStudentFromClassAction(
        removeModal.currentClass.id,
        removeModal.student.id
      );
      if (res.success) {
        setNotice({
          type: "success",
          message: `Đã rút học viên "${removeModal.student.profile?.fullName || removeModal.student.username}" khỏi lớp!`,
        });
        setRemoveModal(null);
        await loadSchoolClasses();
        onRefresh();
      } else {
        setNotice({ type: "error", message: res.error || "Không thể rút học viên khỏi lớp!" });
      }
    });
  };

  // Mở modal thêm học sinh cùng trường
  const handleOpenAddStudent = async () => {
    if (!currentClass) return;
    setAddStudentOpen(true);
    setStudentSearch("");
    setSelectedStudent(null);
    setIsLoadingEligible(true);
    try {
      const res = await getEligibleSchoolStudentsForClassAction(currentClass.id);
      if (res.success) {
        setEligibleStudents(res.students || []);
      } else {
        setEligibleStudents([]);
      }
    } catch (e) {
      console.error(e);
      setEligibleStudents([]);
    } finally {
      setIsLoadingEligible(false);
    }
  };

  // Xác nhận thêm / chuyển học sinh từ lớp khác cùng trường
  const handleConfirmAddStudent = () => {
    if (!selectedStudent || !currentClass) return;
    startTransition(async () => {
      const studentClassInSameSchool = selectedStudent.classEnrollments?.find(
        (e: any) => e.class?.schoolId === school.id
      );

      let res;
      if (studentClassInSameSchool?.classId) {
        // Học sinh đã ở lớp khác trong cùng trường -> Chuyển lớp
        res = await transferStudentClassAction(
          studentClassInSameSchool.classId,
          currentClass.id,
          selectedStudent.id
        );
      } else {
        // Ghi danh mới vào lớp
        res = await enrollStudentToClassAction(
          currentClass.id,
          selectedStudent.id
        );
      }

      if (res.success) {
        setNotice({
          type: "success",
          message: `Đã thêm học viên "${selectedStudent.profile?.fullName || selectedStudent.username}" vào lớp "${currentClass.name}" thành công!`,
        });
        setAddStudentOpen(false);
        setSelectedStudent(null);
        await loadSchoolClasses();
        onRefresh();
      } else {
        setNotice({ type: "error", message: res.error || "Không thể thêm học viên vào lớp!" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* HEADER MODAL */}
        <DialogHeader className="border-b border-[#F1F5F9] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
                  {school.code}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {school.type}
                </span>
                <span className="text-xs text-[#64748B]">
                  • Quản nhiệm: <b className="text-[#0F172A]">{school.manager?.profile?.fullName || school.manager?.username || "Chưa phân công"}</b>
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-[#0F172A] mt-1.5 flex items-center gap-2">
                <Building2 className="size-5 text-[#EA580C]" />
                Danh sách lớp học tại {school.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#64748B]">
                Xem cấu hình chi tiết các lớp học và quản lý điều chuyển học sinh giữa các lớp trong trường.
              </DialogDescription>
            </div>

            {onOpenAddClass && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenAddClass(school.id);
                }}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Plus className="size-3.5 mr-1" /> Mở lớp học mới
              </Button>
            )}
          </div>

          {/* Thông báo Alert */}
          {notice && (
            <div
              className={`mt-3 p-3 rounded-xl text-xs flex items-center justify-between transition ${
                notice.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <span>{notice.message}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-[#EA580C]" /> Đang tải dữ liệu lớp học và học sinh...
          </div>
        ) : classes.length === 0 ? (
          /* TRƯỜNG HỢP CHƯA CÓ LỚP NÀO */
          <div className="py-16 text-center space-y-4">
            <div className="size-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-[#EA580C]">
              <BookOpen className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#0F172A]">Chưa có lớp học nào tại trường</h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Trường {school.name} hiện chưa mở lớp đào tạo nào. Bạn có thể bấm nút bên dưới để tạo lớp học đầu tiên.
              </p>
            </div>
            {onOpenAddClass && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenAddClass(school.id);
                }}
                className="bg-[#EA580C] text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="size-4 mr-1.5" /> Tạo lớp học mới cho trường này
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-3">
            {/* THANH CHỌN LỚP (TABS / PILLS) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-[#64748B] uppercase shrink-0 mr-1">
                Các lớp ({classes.length}):
              </span>
              {classes.map((cls: any) => {
                const enrCount = cls.enrollments?.length || cls._count?.enrollments || 0;
                const isActive = cls.id === currentClass?.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setActiveClassId(cls.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-2 ${
                      isActive
                        ? "bg-[#EA580C] text-white border-[#EA580C] shadow-xs"
                        : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-orange-50/50 hover:border-orange-200"
                    }`}
                  >
                    <span>{cls.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {cls.code}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        isActive ? "text-orange-100" : "text-[#EA580C]"
                      }`}
                    >
                      ({enrCount}/{cls.capacity})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* KHU VỰC 1: THÔNG TIN CẤU HÌNH LỚP (DẠNG VIEW) */}
            {currentClass && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
                      {currentClass.code}
                    </span>
                    <h3 className="font-bold text-base text-[#0F172A]">{currentClass.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                      {currentClass.program}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        currentClass.status === "IN_PROGRESS"
                          ? "bg-emerald-100 text-emerald-800"
                          : currentClass.status === "UPCOMING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {currentClass.status === "IN_PROGRESS"
                        ? "Đang diễn ra"
                        : currentClass.status === "UPCOMING"
                        ? "Sắp khai giảng"
                        : "Đã kết thúc"}
                    </span>
                  </div>

                  {onEditClass && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditClass(currentClass)}
                      className="h-7 text-xs font-semibold text-[#EA580C] border-orange-200 hover:bg-orange-100 rounded-lg shadow-xs"
                    >
                      <Edit2 className="size-3 mr-1" /> Chỉnh sửa cấu hình lớp
                    </Button>
                  )}
                </div>

                {/* Grid chi tiết cấu hình lớp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Giáo viên phụ trách:</span>
                    <div className="font-semibold text-slate-800">
                      {assignedTeachers.length > 0 ? (
                        assignedTeachers.map((t: any) => (
                          <div key={t.id} className="truncate">
                            {t.staff?.profile?.fullName || t.staff?.username}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Trợ giảng (TA):</span>
                    <div className="font-semibold text-slate-800">
                      {assignedTAs.length > 0 ? (
                        assignedTAs.map((ta: any) => (
                          <div key={ta.id} className="truncate">
                            {ta.staff?.profile?.fullName || ta.staff?.username}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Lịch học / Thời gian:</span>
                    <div className="font-semibold text-slate-800">
                      <div>{currentClass.description || "Chưa thiết lập"}</div>
                      {currentClass.startDate && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {new Date(currentClass.startDate).toLocaleDateString("vi-VN")}
                          {currentClass.endDate ? ` → ${new Date(currentClass.endDate).toLocaleDateString("vi-VN")}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-400 font-medium">Sĩ số học viên:</span>
                      <span className="font-bold text-[#EA580C]">
                        {enrollCount}/{capacity}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          enrollCount >= capacity ? "bg-rose-500" : "bg-[#EA580C]"
                        }`}
                        style={{ width: `${Math.min(100, (enrollCount / (capacity || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {enrollCount >= capacity ? "⚠️ Lớp đã đầy sĩ số" : `Còn trống ${capacity - enrollCount} chỗ`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* KHU VỰC 2: DANH SÁCH HỌC SINH CỦA LỚP & ĐIỀU CHUYỂN */}
            {currentClass && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                      <Users className="size-4 text-[#EA580C]" />
                      Danh sách học sinh trong lớp ({enrollCount})
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Học sinh có thể được chuyển sang lớp khác cùng trường hoặc thêm học sinh từ các lớp khác sang.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddStudent}
                    disabled={enrollCount >= capacity}
                    className="text-xs rounded-xl text-[#EA580C] border-orange-200 hover:bg-orange-50 font-semibold shadow-xs"
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm học sinh từ lớp khác sang
                  </Button>
                </div>

                {/* BẢNG DANH SÁCH HỌC SINH */}
                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                  <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="px-3.5 py-3 w-10 text-slate-500 uppercase font-bold">#</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Họ và tên</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Mã học viên</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Email</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Ngày vào lớp</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Trạng thái</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] bg-white">
                      {enrollments.length > 0 ? (
                        enrollments.map((enr: any, idx: number) => {
                          const student = enr.student;
                          const studentName = student?.profile?.fullName || student?.username;
                          return (
                            <tr key={enr.id} className="hover:bg-[#F8FAFC] transition">
                              <td className="px-3.5 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="px-3.5 py-2.5 font-bold text-[#0F172A]">{studentName}</td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-600">{student?.username}</td>
                              <td className="px-3.5 py-2.5 text-slate-500">{student?.email}</td>
                              <td className="px-3.5 py-2.5 text-slate-500">
                                {new Date(enr.enrolledAt).toLocaleDateString("vi-VN")}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {enr.status === "STUDYING" ? "Đang học" : enr.status}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* NÚT CHUYỂN LỚP TRONG CÙNG TRƯỜNG */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTransferModal({
                                        open: true,
                                        student,
                                        currentClass,
                                      });
                                      setTargetClassId("");
                                    }}
                                    className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition inline-flex items-center gap-1"
                                    title="Chuyển học viên sang lớp khác trong cùng trường"
                                  >
                                    <ArrowRightLeft className="size-3" /> Chuyển lớp
                                  </button>

                                  {/* NÚT GỠ KHỎI LỚP */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRemoveModal({
                                        open: true,
                                        student,
                                        currentClass,
                                      })
                                    }
                                    className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition inline-flex items-center gap-1"
                                    title="Rút học viên khỏi lớp"
                                  >
                                    <Trash2 className="size-3" /> Gỡ
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-xs text-[#94A3B8] italic">
                            Chưa có học viên nào trong lớp này. Hãy bấm &quot;Thêm học sinh từ lớp khác sang&quot; để gán học sinh vào lớp!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9] mt-auto">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>

      {/* MODAL 1: CHUYỂN LỚP CHO HỌC VIÊN TRONG CÙNG TRƯỜNG */}
      {transferModal && (
        <Dialog open={true} onOpenChange={() => setTransferModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0F172A]">
                <ArrowRightLeft className="size-5 text-[#EA580C]" /> Chuyển lớp cho học sinh
              </DialogTitle>
              <DialogDescription className="text-xs">
                Chuyển học viên <b>{transferModal.student.profile?.fullName || transferModal.student.username}</b> (Mã: {transferModal.student.username}) từ lớp <b>{transferModal.currentClass.name}</b> sang lớp khác thuộc trường <b>{school.name}</b>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                🔒 <b>Quy tắc hệ thống:</b> Học sinh chỉ được phép chuyển giữa các lớp trong cùng trường <b>{school.name}</b>. Không được chuyển sang lớp của trường khác.
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
                    Trường hiện chỉ có 1 lớp duy nhất nên không có lớp nào khác để chuyển đến. Bạn cần tạo thêm lớp mới cho trường này trước.
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
                onClick={handleConfirmTransfer}
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
                      const classInSchool = st.classEnrollments?.find(
                        (e: any) => e.class?.schoolId === school.id
                      );
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
                  ℹ️ Xác nhận điều chuyển học viên <b>{selectedStudent.profile?.fullName || selectedStudent.username}</b> vào lớp <b>{currentClass.name}</b>.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button type="button" variant="outline" onClick={() => setAddStudentOpen(false)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAddStudent}
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
        onConfirm={handleConfirmRemove}
      />
    </Dialog>
  );
}

