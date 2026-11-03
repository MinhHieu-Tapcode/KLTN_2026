"use client";

import React, { useMemo } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react";
import { REPORT_PERIOD_OPTIONS, ReportPeriodKey } from "@/lib/ielts-report-config";
import { ScopeOption } from "@/services/report.service";
import { ReportSelectDropdown } from "./report-select-dropdown";
import { SearchableCombobox } from "./searchable-combobox";

export type ReportLevel = "SCHOOL" | "CLASS" | "STUDENT";

export function ReportFilterBar({
  level,
  setLevel,
  periodKey,
  setPeriodKey,
  canViewSchool,
  isStudent,
  currentUserFullName,
  scopeOptions,
  selectedSchoolId,
  setSelectedSchoolId,
  selectedClassId,
  setSelectedClassId,
  selectedStudentId,
  setSelectedStudentId,
  onRefresh,
  onExportCsv,
}: {
  level: ReportLevel;
  setLevel: (lvl: ReportLevel) => void;
  periodKey: ReportPeriodKey;
  setPeriodKey: (pk: ReportPeriodKey) => void;
  canViewSchool: boolean;
  isStudent: boolean;
  currentUserFullName: string;
  scopeOptions: ScopeOption;
  selectedSchoolId: string;
  setSelectedSchoolId: (id: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
}) {
  const currentClassObj = useMemo(
    () =>
      scopeOptions.classes.find((c) => c.id === selectedClassId) ||
      scopeOptions.classes[0],
    [scopeOptions.classes, selectedClassId]
  );

  const filteredClasses = useMemo(
    () =>
      selectedSchoolId
        ? scopeOptions.classes.filter((c) => c.schoolId === selectedSchoolId)
        : scopeOptions.classes,
    [scopeOptions.classes, selectedSchoolId]
  );

  const studentsInSelectedClass = useMemo(
    () => currentClassObj?.students || [],
    [currentClassObj]
  );

  // Danh sách options combobox cho Trường, Lớp, Học sinh
  const schoolOptions = useMemo(
    () =>
      scopeOptions.schools.map((s) => ({
        value: s.id,
        label: `${s.code} — ${s.name}`,
        code: s.code,
      })),
    [scopeOptions.schools]
  );

  const classOptions = useMemo(
    () =>
      filteredClasses.map((c) => ({
        value: c.id,
        label: `${c.code} — ${c.name}`,
        code: c.code,
        subLabel: c.schoolName,
      })),
    [filteredClasses]
  );

  const studentOptions = useMemo(
    () =>
      studentsInSelectedClass.map((st) => ({
        value: st.id,
        label: `${st.fullName} (${st.username})`,
        code: st.username,
        subLabel: st.email || undefined,
      })),
    [studentsInSelectedClass]
  );

  const periodOptions = useMemo(
    () =>
      REPORT_PERIOD_OPTIONS.map((opt) => ({
        value: opt.key,
        label: opt.label,
      })),
    []
  );

  return (
    <div className="rp-context-bar">
      {/* 1 THANH DUY NHẤT (UNIFIED CONTROL BAR) - KHÔNG CHIA HÀNG RỜI RẠC */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* CỤM BÊN TRÁI: ĐIỀU HƯỚNG 3 CẤP + BỘ CHỌN PHẠM VI TÍCH HỢP LIỀN MẠCH */}
        <div className="flex flex-wrap items-center gap-2">
          {!isStudent ? (
            <>
              {/* Segmented Control 3 cấp mềm mại, không viền đen thô */}
              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-none">
                {canViewSchool && (
                  <button
                    type="button"
                    onClick={() => setLevel("SCHOOL")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs transition-all ${
                      level === "SCHOOL"
                        ? "bg-[#EA580C] text-white font-bold shadow-sm"
                        : "font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Cấp Trường</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLevel("CLASS")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs transition-all ${
                    level === "CLASS"
                      ? "bg-[#EA580C] text-white font-bold shadow-sm"
                      : "font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Cấp Lớp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLevel("STUDENT")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs transition-all ${
                    level === "STUDENT"
                      ? "bg-[#EA580C] text-white font-bold shadow-sm"
                      : "font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Cá nhân</span>
                </button>
              </div>

              {/* Dấu phân cách dọc nhẹ */}
              <div className="hidden sm:block h-5 w-px bg-slate-200" />

              {/* Nút quay lại cấp trên tiện lợi */}
              {level === "CLASS" && canViewSchool && (
                <button
                  type="button"
                  onClick={() => setLevel("SCHOOL")}
                  title="Quay lại Báo cáo Cấp Trường"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#EA580C] hover:text-[#EA580C] transition-all shadow-none"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#EA580C]" strokeWidth={1.75} />
                  <span>Cấp Trường</span>
                </button>
              )}
              {level === "STUDENT" && (
                <button
                  type="button"
                  onClick={() => setLevel("CLASS")}
                  title="Quay lại Báo cáo Cấp Lớp"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#EA580C] hover:text-[#EA580C] transition-all shadow-none"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#EA580C]" strokeWidth={1.75} />
                  <span>Cấp Lớp</span>
                </button>
              )}

              {/* Ô Dropdown Tìm kiếm thông minh tích hợp liền kề */}
              {level === "SCHOOL" && canViewSchool && (
                <SearchableCombobox
                  value={selectedSchoolId}
                  onChange={(sId) => {
                    setSelectedSchoolId(sId);
                    const firstCls = scopeOptions.classes.find((c) => c.schoolId === sId);
                    if (firstCls) {
                      setSelectedClassId(firstCls.id);
                      setSelectedStudentId(firstCls.students[0]?.id || "");
                    }
                  }}
                  options={schoolOptions}
                  prefix="Trường:"
                  placeholder="Chọn trường học..."
                  searchPlaceholder="Tìm mã hoặc tên trường..."
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  className="min-w-[200px]"
                />
              )}

              {level === "CLASS" && (
                <div className="flex items-center gap-1.5">
                  {canViewSchool && scopeOptions.schools.length > 1 && (
                    <SearchableCombobox
                      value={selectedSchoolId}
                      onChange={(sId) => {
                        setSelectedSchoolId(sId);
                        const firstCls = scopeOptions.classes.find((c) => c.schoolId === sId);
                        if (firstCls) {
                          setSelectedClassId(firstCls.id);
                          setSelectedStudentId(firstCls.students[0]?.id || "");
                        }
                      }}
                      options={schoolOptions}
                      prefix="Trường:"
                      placeholder="Chọn trường..."
                      searchPlaceholder="Tìm trường..."
                      icon={<Building2 className="h-3 w-3" />}
                      className="min-w-[150px] max-w-[180px]"
                    />
                  )}
                  <SearchableCombobox
                    value={selectedClassId}
                    onChange={(cId) => {
                      setSelectedClassId(cId);
                      const cls = scopeOptions.classes.find((c) => c.id === cId);
                      if (cls && cls.students[0]) {
                        setSelectedStudentId(cls.students[0].id);
                      }
                    }}
                    options={classOptions}
                    prefix="Lớp:"
                    placeholder="Chọn lớp..."
                    searchPlaceholder="Tìm mã hoặc tên lớp..."
                    icon={<Users className="h-3.5 w-3.5" />}
                    className="min-w-[210px]"
                  />
                </div>
              )}

              {level === "STUDENT" && (
                <div className="flex items-center gap-1.5">
                  <SearchableCombobox
                    value={selectedClassId}
                    onChange={(cId) => {
                      setSelectedClassId(cId);
                      const cls = scopeOptions.classes.find((c) => c.id === cId);
                      if (cls && cls.students[0]) {
                        setSelectedStudentId(cls.students[0].id);
                      }
                    }}
                    options={classOptions}
                    prefix="Lớp:"
                    placeholder="Chọn lớp..."
                    searchPlaceholder="Tìm lớp..."
                    icon={<Users className="h-3 w-3" />}
                    className="min-w-[170px] max-w-[200px]"
                  />
                  <SearchableCombobox
                    value={selectedStudentId}
                    onChange={(stId) => setSelectedStudentId(stId)}
                    options={studentOptions}
                    prefix="Học sinh:"
                    placeholder="Chọn học sinh..."
                    searchPlaceholder="Tìm theo tên học sinh..."
                    icon={<GraduationCap className="h-3.5 w-3.5" />}
                    className="min-w-[220px]"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rp-badge text-xs px-3 py-1.5 font-bold" data-tone="brand">
              <GraduationCap className="h-4 w-4" />
              <span>Báo cáo Kết quả Học tập Cá nhân — {currentUserFullName}</span>
            </div>
          )}
        </div>

        {/* CỤM BÊN PHẢI: THỜI GIAN, LÀM MỚI, XUẤT CSV MỀM MẠI, GỌN GÀNG */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ chọn mốc thời gian tùy biến mềm mại */}
          <ReportSelectDropdown
            value={periodKey}
            onChange={(val) => setPeriodKey(val as ReportPeriodKey)}
            options={periodOptions}
            icon={<Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" strokeWidth={1.75} />}
          />

          <button
            type="button"
            onClick={onRefresh}
            title="Tải lại số liệu mới nhất"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-none"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            title="Xuất bảng dữ liệu ra file Excel / CSV"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA580C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C] transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
