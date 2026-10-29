"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getClassReportAction,
  getReportScopeOptionsAction,
  getSchoolReportAction,
  getStudentReportAction,
} from "@/actions/reports";
import { ReportPeriodKey } from "@/lib/ielts-report-config";
import { ScopeOption } from "@/services/report.service";
import { ClassReportData, ClassReportView } from "./class-report-view";
import { ReportFilterBar, ReportLevel } from "./report-filter-bar";
import { ReportEmptyState } from "./report-shared-widgets";
import { SchoolReportData, SchoolReportView } from "./school-report-view";
import { StudentReportData, StudentReportView } from "./student-report-view";

export function ReportsPageView({
  currentUser,
}: {
  currentUser: {
    id?: string;
    username: string;
    fullName: string;
    role: string;
  };
}) {
  const canViewSchool =
    currentUser.role === "ADMIN" || currentUser.role === "SCHOOL_MANAGER";
  const isStudent = currentUser.role === "STUDENT";

  const [level, setLevel] = useState<ReportLevel>(
    isStudent ? "STUDENT" : canViewSchool ? "SCHOOL" : "CLASS"
  );
  const [periodKey, setPeriodKey] = useState<ReportPeriodKey>("30_DAYS");
  const [scopeOptions, setScopeOptions] = useState<ScopeOption>({
    schools: [],
    classes: [],
  });

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [schoolData, setSchoolData] = useState<{
    hasData: boolean;
    report: SchoolReportData | null;
  }>({ hasData: false, report: null });
  const [classData, setClassData] = useState<{
    hasData: boolean;
    report: ClassReportData | null;
  }>({ hasData: false, report: null });
  const [studentData, setStudentData] = useState<{
    hasData: boolean;
    report: StudentReportData | null;
  }>({ hasData: false, report: null });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await getReportScopeOptionsAction();
      if (!mounted) return;
      if (!res.success) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      const opts = res.data;
      setScopeOptions(opts);
      setSelectedSchoolId(opts.schools[0]?.id || "");
      setSelectedClassId(opts.classes[0]?.id || "");
      setSelectedStudentId(
        opts.classes[0]?.students[0]?.id || currentUser.id || ""
      );
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser.id]);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    if (level === "SCHOOL") {
      if (!selectedSchoolId) {
        setLoading(false);
        return;
      }
      const res = await getSchoolReportAction({
        schoolId: selectedSchoolId,
        periodKey,
      });
      if (!res.success) {
        setErrorMsg(res.error || "Không thể tải báo cáo cấp Trường");
      } else {
        setSchoolData({
          hasData: Boolean(res.hasData),
          report: (res.report as unknown as SchoolReportData) || null,
        });
      }
    } else if (level === "CLASS") {
      if (!selectedClassId) {
        setLoading(false);
        return;
      }
      const res = await getClassReportAction({
        classId: selectedClassId,
        periodKey,
      });
      if (!res.success) {
        setErrorMsg(res.error || "Không thể tải báo cáo cấp Lớp");
      } else {
        setClassData({
          hasData: Boolean(res.hasData),
          report: (res.report as unknown as ClassReportData) || null,
        });
      }
    } else {
      const targetStudentId = isStudent ? undefined : selectedStudentId;
      if (!isStudent && !targetStudentId) {
        setLoading(false);
        return;
      }
      const res = await getStudentReportAction({
        studentId: targetStudentId,
        classId: selectedClassId || null,
        periodKey,
      });
      if (!res.success) {
        setErrorMsg(res.error || "Không thể tải báo cáo Học sinh");
      } else {
        setStudentData({
          hasData: Boolean(res.hasData),
          report: (res.report as unknown as StudentReportData) || null,
        });
      }
    }

    setLoading(false);
  }, [level, selectedSchoolId, selectedClassId, selectedStudentId, periodKey, isStudent]);

  useEffect(() => {
    if (
      (level === "SCHOOL" && selectedSchoolId) ||
      (level === "CLASS" && selectedClassId) ||
      (level === "STUDENT" && (isStudent || selectedStudentId))
    ) {
      loadReportData();
    }
  }, [level, selectedSchoolId, selectedClassId, selectedStudentId, periodKey, isStudent, loadReportData]);

  const handleExportCsv = () => {
    const rows: string[][] = [];
    if (level === "SCHOOL" && schoolData.report) {
      rows.push(["Mã lớp", "Tên lớp", "Sĩ số", "Bài đã giao", "ĐTB (%)", "Tỷ lệ hoàn thành (%)", "HV cần hỗ trợ"]);
      for (const c of schoolData.report.classRows) {
        rows.push([
          c.classCode,
          c.className,
          String(c.studentCount),
          String(c.assignmentCount),
          c.averagePercent !== null ? String(c.averagePercent) : "Chưa có điểm",
          String(c.completionRatePercent),
          String(c.supportNeededCount),
        ]);
      }
    } else if (level === "CLASS" && classData.report) {
      rows.push(["Họ và tên", "Tài khoản", "Bài đã nộp", "Quá hạn", "Chờ chấm", "ĐTB (%)", "Cần hỗ trợ"]);
      for (const s of classData.report.studentRows) {
        rows.push([
          s.fullName,
          s.username,
          `${s.submittedCount}/${s.assignedCount}`,
          String(s.overdueCount),
          String(s.pendingGradingCount),
          s.averagePercent !== null ? String(s.averagePercent) : "Chưa có điểm",
          s.supportReasons.join("; ") || "Ổn định",
        ]);
      }
    } else if (level === "STUDENT" && studentData.report) {
      rows.push(["Bài tập", "Kỹ năng", "Lần làm", "Kết quả gốc", "% Chuẩn hóa", "Band ước tính", "Trạng thái"]);
      for (const h of studentData.report.submissionHistory) {
        rows.push([
          h.assignmentTitle,
          h.skill.toUpperCase(),
          String(h.attemptNumber),
          h.scoreDisplay,
          h.percentDisplay,
          h.estimatedBandDisplay,
          h.status,
        ]);
      }
    }
    if (rows.length === 0) return;
    const csvContent =
      "\uFEFF" +
      rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-ielts-${level.toLowerCase()}-${periodKey.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <ReportFilterBar
        level={level}
        setLevel={setLevel}
        periodKey={periodKey}
        setPeriodKey={setPeriodKey}
        canViewSchool={canViewSchool}
        isStudent={isStudent}
        currentUserFullName={currentUser.fullName}
        scopeOptions={scopeOptions}
        selectedSchoolId={selectedSchoolId}
        setSelectedSchoolId={setSelectedSchoolId}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        selectedStudentId={selectedStudentId}
        setSelectedStudentId={setSelectedStudentId}
        onRefresh={loadReportData}
        onExportCsv={handleExportCsv}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-xs font-medium text-slate-500 shadow-sm">
          Đang tổng hợp dữ liệu báo cáo IELTS Academic...
        </div>
      ) : errorMsg ? (
        <ReportEmptyState
          title="Không thể tải dữ liệu báo cáo"
          description={errorMsg}
          onResetPeriod={() => setPeriodKey("ALL")}
        />
      ) : level === "SCHOOL" && schoolData.report ? (
        <SchoolReportView
          report={schoolData.report}
          hasData={schoolData.hasData}
          onSelectClass={(classId) => {
            setSelectedClassId(classId);
            const cls = scopeOptions.classes.find((c) => c.id === classId);
            if (cls?.students[0]) setSelectedStudentId(cls.students[0].id);
            setLevel("CLASS");
          }}
          onSelectStudent={(classId, studentId) => {
            setSelectedClassId(classId);
            setSelectedStudentId(studentId);
            setLevel("STUDENT");
          }}
          onResetPeriod={() => setPeriodKey("ALL")}
        />
      ) : level === "CLASS" && classData.report ? (
        <ClassReportView
          report={classData.report}
          hasData={classData.hasData}
          userRole={currentUser.role}
          onSelectStudent={(studentId) => {
            setSelectedStudentId(studentId);
            setLevel("STUDENT");
          }}
          onResetPeriod={() => setPeriodKey("ALL")}
        />
      ) : level === "STUDENT" && studentData.report ? (
        <StudentReportView
          report={studentData.report}
          hasData={studentData.hasData}
          userRole={currentUser.role}
          onResetPeriod={() => setPeriodKey("ALL")}
        />
      ) : (
        <ReportEmptyState onResetPeriod={() => setPeriodKey("ALL")} />
      )}
    </div>
  );
}
