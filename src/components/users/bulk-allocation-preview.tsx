"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  BulkAllocationSuggestion,
  InvalidStudentRow,
  LevelAllocationPlan,
  ProposedClass,
  ValidatedStudentRow,
  commitBulkAllocationAction,
  rebalanceByCapacityAction,
  rebalanceOnClassCountChangeAction,
  rebalanceOnStudentTransferAction,
  removeClassAndRebalanceAction,
  updateClassCapacitiesAndRebalanceAction,
} from "@/actions/bulk-allocation";
import {
  AdjustClassCountModal,
  ClassDetailModal,
  ConfigureClassCapacitiesModal,
  ConfirmCommitModal,
  DeleteClassModal,
  InvalidRowsModal,
  StudentTransferModal,
} from "./bulk-ielts-modals";
import { BulkAllocationDashboard } from "./bulk-allocation-dashboard";
import { BulkClassCardsGrid } from "./bulk-class-cards-grid";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BulkAllocationPreviewProps {
  excelFileName: string;
  selectedSchoolId: string;
  schools: any[];
  allocationSuggestion: BulkAllocationSuggestion;
  invalidRowsList: InvalidStudentRow[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
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
  isFullscreen = false,
  onToggleFullscreen,
  onUpdateSuggestion,
  onNotify,
  onError,
  onResetUpload,
  onBackToStep1,
  onCommittedSuccess,
}: BulkAllocationPreviewProps) {
  const [activeTab, setActiveTab] = useState<"classes" | "out_of_level" | "invalid">("classes");
  const [belowCutoffList, setBelowCutoffList] = useState<ValidatedStudentRow[]>(
    allocationSuggestion.belowCutoffStudents || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [maxCapacity, setMaxCapacity] = useState<number>(30);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [sortOption, setSortOption] = useState<
    "score_desc" | "score_asc" | "name_asc" | "name_desc"
  >("score_desc");

  const [selectedClassDetail, setSelectedClassDetail] = useState<ProposedClass | null>(null);
  const [transferStudent, setTransferStudent] = useState<ValidatedStudentRow | null>(null);
  const [transferCurrentClassName, setTransferCurrentClassName] = useState<string>("");
  const [adjustClassLevel, setAdjustClassLevel] = useState<LevelAllocationPlan | null>(null);
  const [deleteTargetClass, setDeleteTargetClass] = useState<ProposedClass | null>(null);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<ValidatedStudentRow | null>(null);
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);
  const [showInvalidListModal, setShowInvalidListModal] = useState(false);
  const [configureCapacitiesOpen, setConfigureCapacitiesOpen] = useState(false);
  const [committingExcel, setCommittingExcel] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const selectedSchoolName = selectedSchool?.name || "Chưa chọn trường";
  const schoolCode = selectedSchool?.code?.replace(/[^a-zA-Z0-9]/g, "") || "TD";

  const sortedLevelPlans = useMemo(() => {
    const order: Record<string, number> = { ADVANCED: 3, MEDIUM: 2, BASIC: 1 };
    return [...allocationSuggestion.levelPlans].sort((a, b) => {
      return (order[b.levelCode] ?? 0) - (order[a.levelCode] ?? 0);
    });
  }, [allocationSuggestion]);

  const allClassesList = useMemo(() => {
    const list: ProposedClass[] = [];
    for (const plan of sortedLevelPlans) {
      list.push(...plan.classes);
    }
    return list;
  }, [sortedLevelPlans]);

  const studentRows = useMemo(() => {
    const rows: { student: ValidatedStudentRow; currentClass: ProposedClass }[] = [];
    for (const plan of sortedLevelPlans) {
      for (const cls of plan.classes) {
        for (const st of cls.students) {
          rows.push({ student: st, currentClass: cls });
        }
      }
    }
    return rows;
  }, [sortedLevelPlans]);

  const filteredValidRows = useMemo(() => {
    let rows = [...studentRows];
    if (filterLevel !== "all") {
      rows = rows.filter((r) => r.student.levelId === filterLevel);
    }
    if (filterClass !== "all") {
      rows = rows.filter((r) => r.currentClass.tempId === filterClass);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.student.fullName.toLowerCase().includes(q) ||
          r.student.email.toLowerCase().includes(q) ||
          (r.student.phoneNumber && r.student.phoneNumber.includes(q)) ||
          r.currentClass.name.toLowerCase().includes(q) ||
          r.student.levelName.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      if (sortOption === "score_desc") {
        const diff = b.student.ieltsScore - a.student.ieltsScore;
        if (diff !== 0) return diff;
        return a.student.fullName.localeCompare(b.student.fullName);
      }
      if (sortOption === "score_asc") {
        const diff = a.student.ieltsScore - b.student.ieltsScore;
        if (diff !== 0) return diff;
        return a.student.fullName.localeCompare(b.student.fullName);
      }
      if (sortOption === "name_asc") {
        return a.student.fullName.localeCompare(b.student.fullName);
      }
      if (sortOption === "name_desc") {
        return b.student.fullName.localeCompare(a.student.fullName);
      }
      return 0;
    });
    return rows;
  }, [studentRows, filterLevel, filterClass, searchQuery, sortOption]);

  const filteredInvalidRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return invalidRowsList;
    return invalidRowsList.filter(
      (r) =>
        (r.fullName && r.fullName.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        r.errorReason.toLowerCase().includes(q)
    );
  }, [invalidRowsList, searchQuery]);

  const handleApproveOutOfLevel = (st: ValidatedStudentRow, targetClassId: string, reason: string) => {
    const targetClass = allClassesList.find((c) => c.tempId === targetClassId);
    if (!targetClass) return;

    const updatedStudent: ValidatedStudentRow = {
      ...st,
      levelId: targetClass.levelId,
      levelCode: targetClass.levelCode,
      levelName: targetClass.levelName,
      status: "NGOAI_LE",
      overrideReason: `Duyệt vào ${targetClass.name}: ${reason}`,
    };

    const nextPlans = allocationSuggestion.levelPlans.map((plan) => {
      const updatedClasses = plan.classes.map((cls) => {
        if (cls.tempId === targetClassId) {
          const existingWithout = cls.students.filter(
            (s) => s.email.toLowerCase() !== st.email.toLowerCase()
          );
          return { ...cls, students: [...existingWithout, updatedStudent] };
        }
        return cls;
      });
      return {
        ...plan,
        classes: updatedClasses,
        studentCount: updatedClasses.reduce((sum, c) => sum + c.students.length, 0),
      };
    });

    onUpdateSuggestion({
      ...allocationSuggestion,
      levelPlans: nextPlans,
      summary: {
        ...allocationSuggestion.summary,
        totalAllocatedStudents: allocationSuggestion.summary.totalAllocatedStudents + 1,
      },
    });

    setBelowCutoffList((prev) =>
      prev.map((item) =>
        item.email.toLowerCase() === st.email.toLowerCase()
          ? { ...item, status: "NGOAI_LE", overrideReason: `Duyệt vào ${targetClass.name}: ${reason}` }
          : item
      )
    );

    onNotify(`Đã gán học sinh ${st.fullName} vào lớp ${targetClass.name}!`);
  };

  const handleRejectOutOfLevel = (st: ValidatedStudentRow) => {
    setBelowCutoffList((prev) =>
      prev.map((item) =>
        item.email.toLowerCase() === st.email.toLowerCase()
          ? { ...item, status: "TU_CHOI", overrideReason: "Từ chối nhập học do dưới điểm sàn" }
          : item
      )
    );
    onNotify(`Đã xóa học sinh ${st.fullName} khỏi đợt phân lớp!`);
  };

  const handleInlineClassChange = async (student: ValidatedStudentRow, targetClassTempId: string) => {
    const sourcePlan =
      allocationSuggestion.levelPlans.find((p) =>
        p.classes.some((c) => c.students.some((s) => s.email.toLowerCase() === student.email.toLowerCase()))
      ) || allocationSuggestion.levelPlans.find((p) => p.levelId === student.levelId);

    if (!sourcePlan) {
      onError("Không tìm thấy thông tin lớp học hiện tại của học sinh!");
      return;
    }

    const targetPlan = allocationSuggestion.levelPlans.find((p) =>
      p.classes.some((c) => c.tempId === targetClassTempId)
    );

    if (!targetPlan) {
      onError("Không tìm thấy lớp học đích!");
      return;
    }

    if (sourcePlan.levelId === targetPlan.levelId) {
      const res = await rebalanceOnStudentTransferAction(
        sourcePlan,
        student.email,
        targetClassTempId,
        schoolCode
      );
      if (!res.success || !res.updatedPlan) {
        onError(res.error || "Lỗi khi chuyển lớp!");
        return;
      }
      const nextPlans = allocationSuggestion.levelPlans.map((p) =>
        p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
      );
      onUpdateSuggestion({ ...allocationSuggestion, levelPlans: nextPlans });
      onNotify(res.message || `Đã chuyển lớp cho học sinh ${student.fullName}`);
    } else {
      let movedStudent: ValidatedStudentRow | undefined;
      let srcClassName = "";
      let tgtClassName = "";

      const updatedSourceClasses = sourcePlan.classes.map((c) => {
        const found = c.students.find((s) => s.email.toLowerCase() === student.email.toLowerCase());
        if (found) {
          movedStudent = found;
          srcClassName = c.name;
          return {
            ...c,
            students: c.students.filter((s) => s.email.toLowerCase() !== student.email.toLowerCase()),
          };
        }
        return c;
      });

      if (!movedStudent) {
        onError("Không tìm thấy học sinh trong lớp hiện tại!");
        return;
      }

      const updatedTargetClasses = targetPlan.classes.map((c) => {
        if (c.tempId === targetClassTempId) {
          tgtClassName = c.name;
          return {
            ...c,
            students: [
              ...c.students,
              {
                ...movedStudent!,
                levelId: targetPlan.levelId,
                levelCode: targetPlan.levelCode,
                levelName: targetPlan.levelName,
                status: "NGOAI_LE" as const,
                overrideReason: `Chuyển trình độ sang ${c.name} (${targetPlan.levelName})`,
              },
            ],
          };
        }
        return c;
      });

      const nextPlans = allocationSuggestion.levelPlans.map((p) => {
        if (p.levelId === sourcePlan.levelId) {
          const cleanSourceClasses = updatedSourceClasses.filter((c) => c.students.length > 0);
          return {
            ...p,
            classes: cleanSourceClasses,
            classCount: cleanSourceClasses.length,
            studentCount: cleanSourceClasses.reduce((sum, c) => sum + c.students.length, 0),
          };
        }
        if (p.levelId === targetPlan.levelId) {
          const cleanTargetClasses = updatedTargetClasses.filter((c) => c.students.length > 0);
          return {
            ...p,
            classes: cleanTargetClasses,
            classCount: cleanTargetClasses.length,
            studentCount: cleanTargetClasses.reduce((sum, c) => sum + c.students.length, 0),
          };
        }
        return p;
      });

      const newTotalClasses = nextPlans.reduce((sum, p) => sum + p.classes.length, 0);

      onUpdateSuggestion({
        ...allocationSuggestion,
        levelPlans: nextPlans,
        summary: {
          ...allocationSuggestion.summary,
          totalClasses: newTotalClasses,
        },
      });
      onNotify(`Đã chuyển học sinh ${student.fullName} từ ${srcClassName} sang ${tgtClassName} thành công!`);
    }
  };

  const handleUpdateCapacity = async (newCap: number) => {
    setIsRebalancing(true);
    setMaxCapacity(newCap);
    try {
      const res = await rebalanceByCapacityAction(
        allocationSuggestion.levelPlans,
        newCap,
        schoolCode
      );
      if (!res.success || !res.updatedPlans) {
        onError(res.error || "Không thể chia lại lớp theo sĩ số mới!");
      } else {
        const newTotalClasses = res.updatedPlans.reduce((acc, p) => acc + p.classes.length, 0);
        onUpdateSuggestion({
          ...allocationSuggestion,
          summary: { ...allocationSuggestion.summary, totalClasses: newTotalClasses },
          levelPlans: res.updatedPlans,
        });
        onNotify(res.message || `Đã chia lại theo sĩ số tối đa ${newCap} học sinh/lớp.`);
      }
    } finally {
      setIsRebalancing(false);
    }
  };

  const handleDeleteStudentConfirm = () => {
    if (!deleteTargetStudent) return;
    const student = deleteTargetStudent;

    const nextPlans = allocationSuggestion.levelPlans.map((plan) => {
      const updatedClasses = plan.classes
        .map((cls) => {
          const nextStudents = cls.students.filter(
            (s) => s.email.toLowerCase() !== student.email.toLowerCase()
          );
          return { ...cls, students: nextStudents };
        })
        .filter((cls) => cls.students.length > 0);

      return {
        ...plan,
        classes: updatedClasses,
        classCount: updatedClasses.length,
        studentCount: updatedClasses.reduce((sum, c) => sum + c.students.length, 0),
      };
    });

    const newTotalClasses = nextPlans.reduce((sum, p) => sum + p.classes.length, 0);

    onUpdateSuggestion({
      ...allocationSuggestion,
      levelPlans: nextPlans,
      summary: {
        ...allocationSuggestion.summary,
        totalClasses: newTotalClasses,
        totalAllocatedStudents: Math.max(
          0,
          allocationSuggestion.summary.totalAllocatedStudents - 1
        ),
      },
    });

    onNotify(`Đã xóa học sinh ${student.fullName} khỏi danh sách phân lớp.`);
    setDeleteTargetStudent(null);
  };

  const handleDeleteClassConfirm = async () => {
    if (!deleteTargetClass) return;
    const plan = allocationSuggestion.levelPlans.find((p) => p.levelId === deleteTargetClass.levelId);
    if (!plan) return;

    const res = await removeClassAndRebalanceAction(plan, deleteTargetClass.tempId, schoolCode);
    if (!res.success || !res.updatedPlan) {
      onError(res.error || "Lỗi khi xóa lớp!");
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
    setDeleteTargetClass(null);
    onNotify(res.message || `Đã xóa lớp và phân bổ lại học sinh.`);
  };

  const handleConfirmAdjustClassCount = async (count: number) => {
    if (!adjustClassLevel) return;
    const res = await rebalanceOnClassCountChangeAction(adjustClassLevel, count, schoolCode);
    if (!res.success || !res.updatedPlan) {
      onError(res.error || "Không thể điều chỉnh số lớp!");
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
    setAdjustClassLevel(null);
    onNotify(res.message || "Đã điều chỉnh số lớp thành công.");
  };

  const handleSaveClassCapacities = async (
    classSettings: Record<string, { capacity: number; isRemoved?: boolean }>
  ) => {
    setIsRebalancing(true);
    try {
      const res = await updateClassCapacitiesAndRebalanceAction(
        allocationSuggestion.levelPlans,
        classSettings,
        schoolCode
      );
      if (!res.success || !res.updatedPlans) {
        onError(res.error || "Không thể cập nhật cấu hình sĩ số lớp!");
      } else {
        const newTotalClasses = res.updatedPlans.reduce((acc, p) => acc + p.classes.length, 0);
        const newTotalAllocated = res.updatedPlans.reduce(
          (acc, p) => acc + p.classes.reduce((sub, c) => sub + c.students.length, 0),
          0
        );
        onUpdateSuggestion({
          ...allocationSuggestion,
          summary: {
            ...allocationSuggestion.summary,
            totalClasses: newTotalClasses,
            totalAllocatedStudents: newTotalAllocated,
          },
          levelPlans: res.updatedPlans,
        });
        onNotify(res.message || "Đã cập nhật cấu hình lớp thành công.");
      }
    } finally {
      setIsRebalancing(false);
    }
  };

  const handleExportInvalidRows = () => {
    if (invalidRowsList.length === 0) return;
    const exportData = invalidRowsList.map((r) => ({
      "Dòng Excel": r.rowNumber,
      "Họ và tên": r.fullName || "",
      Email: r.email || "",
      "Điểm đầu vào nhập": r.rawScore ?? "",
      "Nguyên nhân lỗi": r.errorReason,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dong_Loi");
    XLSX.writeFile(wb, `Danh_Sach_Loi_${excelFileName || "ielts"}.xlsx`);
  };

  const handleCommit = async () => {
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
          fullName: `Đã phân lớp và khởi tạo thành công ${allocationSuggestion.summary.totalAllocatedStudents} học sinh vào ${allocationSuggestion.summary.totalClasses} lớp IELTS`,
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

  const warningPlans = useMemo(() => {
    return sortedLevelPlans.filter((p) => {
      const confirmedCount = p.classes.reduce(
        (sum, c) => sum + c.students.filter((s) => s.status !== "TU_CHOI").length,
        0
      );
      return confirmedCount > 0 && confirmedCount < 12;
    });
  }, [sortedLevelPlans]);

  const totalValid = allocationSuggestion.summary.totalValid;
  const totalAllocated = allocationSuggestion.summary.totalAllocatedStudents;
  const totalInvalid = invalidRowsList.length;
  const totalClasses = allocationSuggestion.summary.totalClasses;
  const totalLevels = allocationSuggestion.levelPlans.length;
  const allocationRate = totalValid > 0 ? Math.round((totalAllocated / totalValid) * 100) : 100;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Quản lý người dùng</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span>Học sinh</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-[#EA580C] font-semibold">Nhập hàng loạt</span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Đề xuất phân lớp IELTS</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Trường: <b className="text-slate-800">{selectedSchoolName}</b> • Tệp:{" "}
              <b className="text-slate-800">{excelFileName}</b> ({totalValid + totalInvalid} dòng)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetUpload}
            className="h-8 px-3 text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <RotateCcw className="size-3.5 text-[#EA580C]" /> Tải tệp khác
          </Button>

          {onToggleFullscreen && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Mở rộng toàn màn hình"}
              className="size-8 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* 2. HÀNG 6 THẺ CHỈ SỐ KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <UserCheck className="size-3.5" /> Đủ điều kiện (≥ 3.5)
          </div>
          <b className="text-2xl font-black text-emerald-800 my-0.5">{studentRows.length}</b>
          <span className="text-[10px] text-emerald-600 font-medium">100% sẵn sàng</span>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <ShieldAlert className="size-3.5" /> Chưa được gán lớp
          </div>
          <b className="text-2xl font-black text-amber-800 my-0.5">{belowCutoffList.length}</b>
          {belowCutoffList.length > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTab("out_of_level")}
              className="text-[10px] font-bold text-amber-600 hover:underline"
            >
              Xem danh sách →
            </button>
          ) : (
            <span className="text-[10px] text-amber-500 font-medium">Đã gán hết</span>
          )}
        </div>

        <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-700">
            <AlertCircle className="size-3.5" /> Dòng lỗi format
          </div>
          <b className="text-2xl font-black text-rose-800 my-0.5">{totalInvalid}</b>
          {totalInvalid > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTab("invalid")}
              className="text-[10px] font-bold text-rose-600 hover:underline"
            >
              Xem chi tiết lỗi →
            </button>
          ) : (
            <span className="text-[10px] text-rose-500 font-medium">Không có lỗi</span>
          )}
        </div>

        <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
            <GraduationCap className="size-3.5" /> Trình độ IELTS
          </div>
          <b className="text-2xl font-black text-indigo-800 my-0.5">{totalLevels}</b>
          <span className="text-[10px] text-indigo-600 font-medium">Phân theo band</span>
        </div>

        <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#EA580C]">
            <LayoutGrid className="size-3.5" /> Số lớp đề xuất
          </div>
          <b className="text-2xl font-black text-[#EA580C] my-0.5">{totalClasses}</b>
          <span className="text-[10px] text-orange-600 font-medium">Chia đều sĩ số</span>
        </div>

        <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-700">
            <CheckCircle2 className="size-3.5" /> Đã phân lớp
          </div>
          <b className="text-2xl font-black text-sky-800 my-0.5">{totalAllocated}</b>
          <span className="text-[10px] text-sky-600 font-medium">Học sinh gán lớp</span>
        </div>

        <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-teal-700">
            <Layers className="size-3.5" /> Tỷ lệ phân lớp
          </div>
          <b className="text-2xl font-black text-teal-800 my-0.5">{allocationRate}%</b>
          <span className="text-[10px] text-teal-600 font-medium">Tối ưu hoàn toàn</span>
        </div>
      </div>

      {/* CẢNH BÁO SĨ SỐ TỐI THIỂU NẾU CÓ */}
      {warningPlans.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Cảnh báo sĩ số tối thiểu (dưới 12 học sinh/lớp): </span>
              <span>
                {warningPlans
                  .map(
                    (p) =>
                      `${p.levelName} (${p.classes.reduce(
                        (sum, c) => sum + c.students.filter((s) => s.status !== "TU_CHOI").length,
                        0
                      )} HS)`
                  )
                  .join(", ")}
                . Đề xuất: Gộp vào trình độ liền kề hoặc Hoãn mở lớp đợt này.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. SPLIT-VIEW MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        <BulkClassCardsGrid
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          studentRowsCount={studentRows.length}
          belowCutoffList={belowCutoffList}
          totalInvalid={totalInvalid}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterLevel={filterLevel}
          setFilterLevel={setFilterLevel}
          filterClass={filterClass}
          setFilterClass={setFilterClass}
          sortOption={sortOption}
          setSortOption={setSortOption}
          sortedLevelPlans={sortedLevelPlans}
          allClassesList={allClassesList}
          allocationSuggestion={allocationSuggestion}
          filteredValidRows={filteredValidRows}
          filteredInvalidRows={filteredInvalidRows}
          onExportInvalidRows={handleExportInvalidRows}
          onApproveOutOfLevel={handleApproveOutOfLevel}
          onRejectOutOfLevel={handleRejectOutOfLevel}
          onInlineClassChange={handleInlineClassChange}
          onDeleteStudentClick={setDeleteTargetStudent}
        />

        <div className="lg:col-span-4">
          <BulkAllocationDashboard
            levelPlans={allocationSuggestion.levelPlans}
            totalValid={totalValid}
            totalClasses={totalClasses}
            maxCapacity={maxCapacity}
            isRebalancing={isRebalancing}
            onUpdateCapacity={handleUpdateCapacity}
            onOpenConfigureModal={() => setConfigureCapacitiesOpen(true)}
            onSelectClassDetail={(cls) => setSelectedClassDetail(cls)}
            onSelectDeleteClass={(cls) => setDeleteTargetClass(cls)}
          />
        </div>
      </div>

      {/* 4. FOOTER ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          {totalInvalid > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              <AlertTriangle className="size-4 shrink-0" />
              Lưu ý: Hệ thống sẽ tự động bỏ qua {totalInvalid} dòng lỗi khi khởi tạo tài khoản.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              Tất cả {totalValid} học sinh hợp lệ và sẵn sàng phân lớp.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToStep1}
            className="h-10 px-4 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
          >
            Hủy
          </Button>

          <Button
            type="button"
            onClick={() => setConfirmCommitOpen(true)}
            disabled={totalValid === 0 || committingExcel}
            className="h-10 px-5 text-xs font-bold bg-[#EA580C] hover:bg-[#D94E07] text-white shadow-md shadow-orange-500/20 rounded-xl transition"
          >
            Xác nhận & khởi tạo phân lớp
          </Button>
        </div>
      </div>

      {/* 5. SUB-MODALS */}
      <ClassDetailModal
        open={Boolean(selectedClassDetail)}
        onClose={() => setSelectedClassDetail(null)}
        classData={selectedClassDetail}
        onTransferStudent={(student) => {
          setSelectedClassDetail(null);
          setTransferStudent(student);
          setTransferCurrentClassName(selectedClassDetail?.name || "");
        }}
      />

      <StudentTransferModal
        open={Boolean(transferStudent)}
        onClose={() => setTransferStudent(null)}
        student={transferStudent}
        currentClassName={transferCurrentClassName}
        availableClasses={
          transferStudent
            ? (
                allocationSuggestion.levelPlans.find((p) =>
                  p.classes.some((c) =>
                    c.students.some(
                      (s) => s.email.toLowerCase() === transferStudent.email.toLowerCase()
                    )
                  )
                ) || allocationSuggestion.levelPlans.find((p) => p.levelId === transferStudent.levelId)
              )?.classes || []
            : []
        }
        onConfirmTransfer={async (targetClassTempId) => {
          if (!transferStudent) return;
          await handleInlineClassChange(transferStudent, targetClassTempId);
          setTransferStudent(null);
        }}
      />

      <AdjustClassCountModal
        open={Boolean(adjustClassLevel)}
        onClose={() => setAdjustClassLevel(null)}
        levelName={adjustClassLevel?.levelName || ""}
        studentCount={adjustClassLevel?.studentCount || 0}
        currentClassCount={adjustClassLevel?.classCount || 1}
        onConfirmAdjust={handleConfirmAdjustClassCount}
      />

      <ConfirmCommitModal
        open={confirmCommitOpen}
        onClose={() => setConfirmCommitOpen(false)}
        totalValid={totalValid}
        totalClasses={totalClasses}
        totalInvalid={totalInvalid}
        isCommitting={committingExcel}
        onConfirm={handleCommit}
      />

      <InvalidRowsModal
        open={showInvalidListModal}
        onClose={() => setShowInvalidListModal(false)}
        invalidRows={invalidRowsList}
      />

      <DeleteClassModal
        open={Boolean(deleteTargetClass)}
        onClose={() => setDeleteTargetClass(null)}
        targetClass={deleteTargetClass}
        onConfirmDelete={handleDeleteClassConfirm}
      />

      <ConfigureClassCapacitiesModal
        open={configureCapacitiesOpen}
        onClose={() => setConfigureCapacitiesOpen(false)}
        levelPlans={allocationSuggestion.levelPlans}
        onConfirmSave={handleSaveClassCapacities}
      />

      <Dialog open={Boolean(deleteTargetStudent)} onOpenChange={(v) => !v && setDeleteTargetStudent(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-2 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <Trash2 className="size-5" />
              Xác nhận xóa học sinh
            </DialogTitle>
          </DialogHeader>

          {deleteTargetStudent && (
            <div className="py-3 text-xs text-slate-600 space-y-3">
              <p>
                Bạn có chắc chắn muốn xóa học sinh{" "}
                <b className="text-slate-900 font-bold">{deleteTargetStudent.fullName}</b> khỏi đợt phân lớp này không?
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div>
                  <span className="text-slate-400">Email:</span>{" "}
                  <span className="font-semibold text-slate-800">{deleteTargetStudent.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">Điểm đầu vào:</span>{" "}
                  <span className="font-bold text-[#EA580C]">
                    {Number(deleteTargetStudent.ieltsScore).toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Trình độ:</span>{" "}
                  <span className="font-semibold text-slate-800">{deleteTargetStudent.levelName}</span>
                </div>
              </div>
              <p className="text-slate-400 text-[11px] italic">
                * Học sinh sẽ bị loại bỏ khỏi lớp học đề xuất và sĩ số lớp sẽ tự động giảm đi 1.
              </p>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTargetStudent(null)}
              className="h-8 px-3 text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteStudentConfirm}
              className="h-8 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
