"use client";

import React from "react";
import {
  Building2,
  Calendar,
  ChevronRight,
  Download,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react";
import { REPORT_PERIOD_OPTIONS, ReportPeriodKey } from "@/lib/ielts-report-config";
import { ScopeOption } from "@/services/report.service";

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
  const currentClassObj =
    scopeOptions.classes.find((c) => c.id === selectedClassId) ||
    scopeOptions.classes[0];
  const filteredClasses = selectedSchoolId
    ? scopeOptions.classes.filter((c) => c.schoolId === selectedSchoolId)
    : scopeOptions.classes;
  const studentsInSelectedClass = currentClassObj?.students || [];

  return (
    <div className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isStudent ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {canViewSchool && (
              <button
                type="button"
                onClick={() => setLevel("SCHOOL")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  level === "SCHOOL" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" /> Cấp Trường
              </button>
            )}
            <button
              type="button"
              onClick={() => setLevel("CLASS")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                level === "CLASS" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Cấp Lớp
            </button>
            <button
              type="button"
              onClick={() => setLevel("STUDENT")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                level === "STUDENT" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" /> Chi tiết Học sinh
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
            <GraduationCap className="h-4 w-4" />
            Báo cáo Kết quả Học tập Cá nhân — {currentUserFullName}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value as ReportPeriodKey)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              {REPORT_PERIOD_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Làm mới
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Download className="h-3.5 w-3.5" /> Xuất Excel (CSV)
          </button>
        </div>
      </div>

      {!isStudent && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {canViewSchool && (
              <select
                value={selectedSchoolId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedSchoolId(sId);
                  const firstCls = scopeOptions.classes.find((c) => c.schoolId === sId);
                  if (firstCls) {
                    setSelectedClassId(firstCls.id);
                    setSelectedStudentId(firstCls.students[0]?.id || "");
                  }
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700"
              >
                {scopeOptions.schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    Trường: {s.code} — {s.name}
                  </option>
                ))}
              </select>
            )}

            {(level === "CLASS" || level === "STUDENT") && (
              <select
                value={selectedClassId}
                onChange={(e) => {
                  const cId = e.target.value;
                  setSelectedClassId(cId);
                  const cls = scopeOptions.classes.find((c) => c.id === cId);
                  if (cls && cls.students[0]) {
                    setSelectedStudentId(cls.students[0].id);
                  }
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700"
              >
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp: {c.code} — {c.name}
                  </option>
                ))}
              </select>
            )}

            {level === "STUDENT" && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700"
              >
                {studentsInSelectedClass.map((st) => (
                  <option key={st.id} value={st.id}>
                    Học sinh: {st.fullName} ({st.username})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            {canViewSchool && (
              <>
                <button
                  type="button"
                  onClick={() => setLevel("SCHOOL")}
                  className={level === "SCHOOL" ? "font-bold text-indigo-600" : "hover:underline"}
                >
                  Báo cáo Trường
                </button>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            <button
              type="button"
              onClick={() => setLevel("CLASS")}
              className={level === "CLASS" ? "font-bold text-indigo-600" : "hover:underline"}
            >
              Báo cáo Lớp
            </button>
            <ChevronRight className="h-3 w-3" />
            <button
              type="button"
              onClick={() => setLevel("STUDENT")}
              className={level === "STUDENT" ? "font-bold text-indigo-600" : "hover:underline"}
            >
              Chi tiết Học sinh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
