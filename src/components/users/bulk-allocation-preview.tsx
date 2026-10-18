"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Sliders,
  UserCheck,
  Users,
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
  // Tabs & filters
  const [activeTab, setActiveTab] = useState<"all" | "invalid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxCapacity, setMaxCapacity] = useState<number>(30);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [sortOption, setSortOption] = useState<"score_desc" | "score_asc" | "name_asc" | "name_desc">("score_desc");

  // Modals state
  const [selectedClassDetail, setSelectedClassDetail] = useState<ProposedClass | null>(null);
  const [transferStudent, setTransferStudent] = useState<ValidatedStudentRow | null>(null);
  const [transferCurrentClassName, setTransferCurrentClassName] = useState<string>("");
  const [adjustClassLevel, setAdjustClassLevel] = useState<LevelAllocationPlan | null>(null);
  const [deleteTargetClass, setDeleteTargetClass] = useState<ProposedClass | null>(null);
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);
  const [showInvalidListModal, setShowInvalidListModal] = useState(false);
  const [configureCapacitiesOpen, setConfigureCapacitiesOpen] = useState(false);
  const [committingExcel, setCommittingExcel] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);
  const selectedSchoolName = selectedSchool?.name || "Chưa chọn trường";
  const schoolCode = selectedSchool?.code?.replace(/[^a-zA-Z0-9]/g, "") || "TD";

  // Danh sách các nhóm trình độ sắp xếp từ CAO xuống THẤP (Nâng cao -> Trung bình -> Cơ bản)
  const sortedLevelPlans = useMemo(() => {
    const order: Record<string, number> = { ADVANCED: 3, MEDIUM: 2, BASIC: 1 };
    return [...allocationSuggestion.levelPlans].sort((a, b) => {
      return (order[b.levelCode] ?? 0) - (order[a.levelCode] ?? 0);
    });
  }, [allocationSuggestion]);

  // Danh sách toàn bộ các lớp (sắp xếp từ Nâng cao -> Trung bình -> Cơ bản)
  const allClassesList = useMemo(() => {
    const list: ProposedClass[] = [];
    for (const plan of sortedLevelPlans) {
      list.push(...plan.classes);
    }
    return list;
  }, [sortedLevelPlans]);

  // Flatten students with assigned class (sắp xếp trình độ từ CAO xuống THẤP)
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

  // Filtered & Sorted rows for Table
  const filteredValidRows = useMemo(() => {
    let rows = [...studentRows];

    // Lọc theo trình độ
    if (filterLevel !== "all") {
      rows = rows.filter((r) => r.student.levelId === filterLevel);
    }

    // Lọc theo lớp học
    if (filterClass !== "all") {
      rows = rows.filter((r) => r.currentClass.tempId === filterClass);
    }

    // Tìm kiếm theo từ khóa
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

    // Sắp xếp
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

  // Actions
  const handleInlineClassChange = async (student: ValidatedStudentRow, targetClassTempId: string) => {
    const currentPlan = allocationSuggestion.levelPlans.find((p) => p.levelId === student.levelId);
    if (!currentPlan) return;

    const res = await rebalanceOnStudentTransferAction(currentPlan, student.email, targetClassTempId, schoolCode);
    if (!res.success || !res.updatedPlan) {
      onError(res.error || "Lỗi khi chuyển lớp!");
      return;
    }

    const nextPlans = allocationSuggestion.levelPlans.map((p) =>
      p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
    );
    onUpdateSuggestion({ ...allocationSuggestion, levelPlans: nextPlans });
    onNotify(res.message || `Đã chuyển lớp cho học sinh ${student.fullName}`);
  };

  const handleUpdateCapacity = async (newCap: number) => {
    setIsRebalancing(true);
    setMaxCapacity(newCap);
    try {
      const res = await rebalanceByCapacityAction(allocationSuggestion.levelPlans, newCap, schoolCode);
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
      "Điểm IELTS nhập": r.rawScore ?? "",
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

  const totalValid = allocationSuggestion.summary.totalValid;
  const totalAllocated = allocationSuggestion.summary.totalAllocatedStudents;
  const totalInvalid = invalidRowsList.length;
  const totalClasses = allocationSuggestion.summary.totalClasses;
  const totalLevels = allocationSuggestion.levelPlans.length;
  const allocationRate = totalValid > 0 ? Math.round((totalAllocated / totalValid) * 100) : 100;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. TOP HEADER & BREADCRUMBS (Ảnh 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Quản lý người dùng</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span>Học sinh</span>
            <ChevronRight className="size-3 text-slate-400" />
            <span className="text-[#EA580C] font-semibold">Nhập hàng loạt</span>
          </div>
          <div className="flex items-center gap-2.5">
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

      {/* 2. HÀNG 6 THẺ CHỈ SỐ KPI (Ảnh 2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <UserCheck className="size-3.5" /> Học sinh hợp lệ
          </div>
          <b className="text-2xl font-black text-emerald-800 my-0.5">{totalValid}</b>
          <span className="text-[10px] text-emerald-600 font-medium">100% sẵn sàng</span>
        </div>

        <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-700">
            <AlertCircle className="size-3.5" /> Dòng lỗi
          </div>
          <b className="text-2xl font-black text-rose-800 my-0.5">{totalInvalid}</b>
          {totalInvalid > 0 ? (
            <button
              type="button"
              onClick={() => setShowInvalidListModal(true)}
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

      {/* 3. SPLIT-VIEW MAIN CONTENT (Ảnh 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* CỘT TRÁI: DATA GRID TABLE (Chiếm 7-8 phần, lấp đầy chiều cao) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col h-full min-h-[680px]">
          {/* Thanh công cụ bảng: Tabs & Tìm kiếm & Xuất lỗi */}
          <div className="space-y-2.5 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* 2 Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    activeTab === "all"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả học sinh ({totalValid})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("invalid")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === "invalid"
                      ? "bg-white text-rose-700 shadow-sm"
                      : "text-slate-600 hover:text-rose-700"
                  }`}
                >
                  Chỉ hiển thị dòng lỗi
                  {totalInvalid > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                      {totalInvalid}
                    </span>
                  )}
                </button>
              </div>

              {/* Ô tìm kiếm & Tải danh sách lỗi */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên, email, lớp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] w-48 sm:w-56"
                  />
                </div>

                {totalInvalid > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportInvalidRows}
                    className="h-8 px-2.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 gap-1 font-medium"
                  >
                    <Download className="size-3.5" /> Xuất DS lỗi
                  </Button>
                )}
              </div>
            </div>

            {/* Hàng bộ lọc đa năng: Lọc theo Trình độ, Lọc theo Lớp học & Sắp xếp điểm số */}
            {activeTab === "all" && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px]">
                  <Filter className="size-3.5 text-[#EA580C]" />
                  <span>Lọc & Sắp xếp:</span>
                </div>

                {/* Dropdown Lọc theo trình độ */}
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C] hover:border-slate-300 transition"
                >
                  <option value="all">Tất cả trình độ</option>
                  {sortedLevelPlans.map((p) => (
                    <option key={p.levelId} value={p.levelId}>
                      {p.levelName} ({p.studentCount} HS)
                    </option>
                  ))}
                </select>

                {/* Dropdown Lọc theo lớp học */}
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C] hover:border-slate-300 transition max-w-[200px]"
                >
                  <option value="all">Tất cả lớp học ({allClassesList.length} lớp)</option>
                  {allClassesList.map((c) => (
                    <option key={c.tempId} value={c.tempId}>
                      {c.name} ({c.students.length} HS)
                    </option>
                  ))}
                </select>

                {/* Dropdown Sắp xếp */}
                <div className="flex items-center gap-1 sm:ml-auto">
                  <ArrowUpDown className="size-3.5 text-slate-400" />
                  <select
                    value={sortOption}
                    onChange={(e: any) => setSortOption(e.target.value)}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C] hover:border-slate-300 transition"
                  >
                    <option value="score_desc">Điểm: Cao → Thấp (Mặc định)</option>
                    <option value="score_asc">Điểm: Thấp → Cao</option>
                    <option value="name_asc">Tên học sinh: A → Z</option>
                    <option value="name_desc">Tên học sinh: Z → A</option>
                  </select>
                </div>

                {/* Nút đặt lại bộ lọc */}
                {(filterLevel !== "all" || filterClass !== "all" || searchQuery) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterLevel("all");
                      setFilterClass("all");
                      setSearchQuery("");
                    }}
                    className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold"
                  >
                    Đặt lại
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Data Grid Table (Lấp đầy không gian, không để khoảng trống thừa) */}
          <div className="flex-1 overflow-y-auto min-h-[480px] mt-3 border border-slate-100 rounded-xl">
            {activeTab === "all" ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-center">Điểm IELTS</th>
                    <th className="py-2.5 px-3">Trình độ</th>
                    <th className="py-2.5 px-3 min-w-[280px]">Lớp đề xuất (Tự động)</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredValidRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <p className="font-medium text-slate-600 mb-2">
                          Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                        </p>
                        {(filterLevel !== "all" || filterClass !== "all" || searchQuery) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFilterLevel("all");
                              setFilterClass("all");
                              setSearchQuery("");
                            }}
                            className="h-8 px-3 text-xs border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold"
                          >
                            Đặt lại toàn bộ bộ lọc
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredValidRows.map((r, idx) => {
                      const levelPlan = allocationSuggestion.levelPlans.find(
                        (p) => p.levelId === r.student.levelId
                      );
                      const availableClassesInLevel = levelPlan ? levelPlan.classes : [];

                      return (
                        <tr key={r.student.email} className="hover:bg-slate-50/80 transition group">
                          <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {r.student.fullName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{r.student.email}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-orange-100 text-[#EA580C]">
                              {Number(r.student.ieltsScore).toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {r.student.levelName}
                            </span>
                          </td>
                          <td className="py-2 px-3 min-w-[280px]">
                            {/* Dropdown chọn lớp trực quan với badge màu và hiển thị rõ ràng */}
                            <div className="relative flex items-center">
                              <span className="size-2 rounded-full bg-[#EA580C] absolute left-3 z-10 pointer-events-none" />
                              <select
                                value={r.currentClass.tempId}
                                onChange={(e) => handleInlineClassChange(r.student, e.target.value)}
                                className="w-full h-8 pl-7 pr-3 text-xs font-bold rounded-xl border border-orange-200 bg-orange-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] hover:bg-orange-50 hover:border-[#EA580C] transition cursor-pointer shadow-sm"
                              >
                                {availableClassesInLevel.map((c) => (
                                  <option key={c.tempId} value={c.tempId}>
                                    {c.name} • Sĩ số: {c.students.length}/{c.capacity || 25} HV
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setTransferStudent(r.student);
                                setTransferCurrentClassName(r.currentClass.name);
                              }}
                              className="h-7 px-2 text-[11px] text-[#EA580C] hover:bg-orange-50 font-medium"
                            >
                              <ArrowRightLeft className="size-3 mr-1" /> Chuyển lớp
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              /* TAB DÒNG LỖI */
              <table className="w-full text-xs text-left">
                <thead className="bg-rose-50/70 text-rose-800 font-semibold sticky top-0 border-b border-rose-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-20">Dòng Excel</th>
                    <th className="py-2.5 px-3">Học sinh</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-center">Điểm IELTS</th>
                    <th className="py-2.5 px-3">Nguyên nhân lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/60">
                  {filteredInvalidRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Không có dòng dữ liệu lỗi nào.
                      </td>
                    </tr>
                  ) : (
                    filteredInvalidRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/40 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-800">Dòng {r.rowNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {r.fullName || <i className="text-slate-400">Trống</i>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{r.email || "--"}</td>
                        <td className="py-2.5 px-3 text-center text-slate-700">
                          {r.rawScore !== undefined ? String(r.rawScore) : "--"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700">
                            {r.errorReason}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: DASHBOARD (Chiếm 4-5 phần) */}
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

      {/* 4. FOOTER ACTIONS (Ảnh 2) */}
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

      {/* ======================================================== */}
      {/* 5. TÍCH HỢP 6 SUB-MODALS TỪ bulk-ielts-modals.tsx */}
      {/* ======================================================== */}

      {/* Modal 1: Chi tiết lớp học */}
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

      {/* Modal 2: Chuyển lớp cho học sinh */}
      <StudentTransferModal
        open={Boolean(transferStudent)}
        onClose={() => setTransferStudent(null)}
        student={transferStudent}
        currentClassName={transferCurrentClassName}
        availableClasses={
          transferStudent
            ? allocationSuggestion.levelPlans.find((p) => p.levelId === transferStudent.levelId)?.classes || []
            : []
        }
        onConfirmTransfer={async (targetClassTempId) => {
          if (!transferStudent) return;
          await handleInlineClassChange(transferStudent, targetClassTempId);
          setTransferStudent(null);
        }}
      />

      {/* Modal 3: Điều chỉnh số lớp */}
      <AdjustClassCountModal
        open={Boolean(adjustClassLevel)}
        onClose={() => setAdjustClassLevel(null)}
        levelName={adjustClassLevel?.levelName || ""}
        studentCount={adjustClassLevel?.studentCount || 0}
        currentClassCount={adjustClassLevel?.classCount || 1}
        onConfirmAdjust={handleConfirmAdjustClassCount}
      />

      {/* Modal 4: Xác nhận khởi tạo phân lớp */}
      <ConfirmCommitModal
        open={confirmCommitOpen}
        onClose={() => setConfirmCommitOpen(false)}
        totalValid={totalValid}
        totalClasses={totalClasses}
        totalInvalid={totalInvalid}
        isCommitting={committingExcel}
        onConfirm={handleCommit}
      />

      {/* Modal 5: Chi tiết dòng dữ liệu lỗi */}
      <InvalidRowsModal
        open={showInvalidListModal}
        onClose={() => setShowInvalidListModal(false)}
        invalidRows={invalidRowsList}
      />

      {/* Modal 6: Xóa lớp học & phân bổ lại */}
      <DeleteClassModal
        open={Boolean(deleteTargetClass)}
        onClose={() => setDeleteTargetClass(null)}
        targetClass={deleteTargetClass}
        onConfirmDelete={handleDeleteClassConfirm}
      />

      {/* Modal 7: Cấu hình sĩ số từng lớp (hoặc xóa lớp khi về 0) */}
      <ConfigureClassCapacitiesModal
        open={configureCapacitiesOpen}
        onClose={() => setConfigureCapacitiesOpen(false)}
        levelPlans={allocationSuggestion.levelPlans}
        onConfirmSave={handleSaveClassCapacities}
      />
    </div>
  );
}
