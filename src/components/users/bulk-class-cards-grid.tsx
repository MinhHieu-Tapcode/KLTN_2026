"use client";

import React from "react";
import { ArrowUpDown, Download, Filter, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BulkAllocationSuggestion,
  InvalidStudentRow,
  LevelAllocationPlan,
  ProposedClass,
  ValidatedStudentRow,
} from "@/actions/bulk-allocation";
import { OutOfLevelTab } from "./out-of-level-tab";

export interface BulkClassCardsGridProps {
  activeTab: "classes" | "out_of_level" | "invalid";
  setActiveTab: (tab: "classes" | "out_of_level" | "invalid") => void;
  studentRowsCount: number;
  belowCutoffList: ValidatedStudentRow[];
  totalInvalid: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterLevel: string;
  setFilterLevel: (lvl: string) => void;
  filterClass: string;
  setFilterClass: (cls: string) => void;
  sortOption: "score_desc" | "score_asc" | "name_asc" | "name_desc";
  setSortOption: (opt: "score_desc" | "score_asc" | "name_asc" | "name_desc") => void;
  sortedLevelPlans: LevelAllocationPlan[];
  allClassesList: ProposedClass[];
  allocationSuggestion: BulkAllocationSuggestion;
  filteredValidRows: { student: ValidatedStudentRow; currentClass: ProposedClass }[];
  filteredInvalidRows: InvalidStudentRow[];
  onExportInvalidRows: () => void;
  onApproveOutOfLevel: (st: ValidatedStudentRow, targetClassId: string, reason: string) => void;
  onRejectOutOfLevel: (st: ValidatedStudentRow) => void;
  onInlineClassChange: (student: ValidatedStudentRow, targetClassTempId: string) => void;
  onDeleteStudentClick: (student: ValidatedStudentRow) => void;
}

export function BulkClassCardsGrid({
  activeTab,
  setActiveTab,
  studentRowsCount,
  belowCutoffList,
  totalInvalid,
  searchQuery,
  setSearchQuery,
  filterLevel,
  setFilterLevel,
  filterClass,
  setFilterClass,
  sortOption,
  setSortOption,
  sortedLevelPlans,
  allClassesList,
  allocationSuggestion,
  filteredValidRows,
  filteredInvalidRows,
  onExportInvalidRows,
  onApproveOutOfLevel,
  onRejectOutOfLevel,
  onInlineClassChange,
  onDeleteStudentClick,
}: BulkClassCardsGridProps) {
  return (
    <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col h-full min-h-[500px] lg:min-h-[680px]">
      {/* Thanh công cụ bảng: Tabs & Tìm kiếm & Xuất lỗi */}
      <div className="space-y-2.5 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* 3 Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl max-w-full overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("classes")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                activeTab === "classes"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Danh sách lớp học ({studentRowsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("out_of_level")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "out_of_level"
                  ? "bg-white text-amber-900 shadow-sm"
                  : "text-slate-600 hover:text-amber-900"
              }`}
            >
              Chưa được gán lớp
              {belowCutoffList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                  {belowCutoffList.length}
                </span>
              )}
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
              Dòng lỗi
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
                onClick={onExportInvalidRows}
                className="h-8 px-2.5 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 gap-1 font-medium"
              >
                <Download className="size-3.5" /> Xuất DS lỗi
              </Button>
            )}
          </div>
        </div>

        {/* Hàng bộ lọc đa năng */}
        {activeTab === "classes" && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px]">
              <Filter className="size-3.5 text-[#EA580C]" />
              <span>Lọc & Sắp xếp:</span>
            </div>

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

      {/* Data Grid Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-[420px] lg:min-h-[480px] mt-3 border border-slate-100 rounded-xl">
        {activeTab === "out_of_level" ? (
          <OutOfLevelTab
            students={belowCutoffList}
            allClasses={allClassesList}
            onApprove={onApproveOutOfLevel}
            onReject={onRejectOutOfLevel}
          />
        ) : activeTab === "classes" ? (
          <table className="w-full text-xs text-left min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">STT</th>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3 text-center">Điểm đầu vào</th>
                <th className="py-2.5 px-3">Trình độ & Trạng thái</th>
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
                        <div className="relative flex items-center">
                          <span className="size-2 rounded-full bg-[#EA580C] absolute left-3 z-10 pointer-events-none" />
                          <select
                            value={r.currentClass.tempId}
                            onChange={(e) => onInlineClassChange(r.student, e.target.value)}
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
                          onClick={() => onDeleteStudentClick(r.student)}
                          className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold transition inline-flex items-center gap-1 rounded-lg"
                          title="Xóa học sinh khỏi danh sách phân lớp"
                        >
                          <Trash2 className="size-3.5" />
                          Xóa
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
                <th className="py-2.5 px-3 text-center">Điểm đầu vào</th>
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
  );
}
