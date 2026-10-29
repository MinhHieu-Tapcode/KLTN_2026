"use client";

import React, { useState } from "react";
import { AlertTriangle, Award, BookOpen, Headphones, Mic, PenTool } from "lucide-react";
import { ReportHorizontalBars, ReportKpiCard } from "./report-shared-widgets";

export interface QuestionTypeStatItem {
  code: string;
  label: string;
  correctCount: number;
  totalCount: number;
  accuracyPercent: number | null;
  isLowData: boolean;
}

export interface CriteriaSubmissionItem {
  submissionId: string;
  assignmentTitle: string;
  taskOrPartLabel: string;
  submittedAt: string | null;
  overallBand: number;
  criteriaScores: Record<string, number>;
  feedback: string | null;
}

export interface StudentQuestionTypeAnalysisData {
  reading: QuestionTypeStatItem[];
  listening: QuestionTypeStatItem[];
  writing: {
    overallBand: number | null;
    task1Band: number | null;
    task2Band: number | null;
    criteriaBreakdown: Array<{
      code: string;
      label: string;
      shortLabel: string;
      averageBand: number | null;
    }>;
    submissions: CriteriaSubmissionItem[];
  };
  speaking: {
    part1Band: number | null;
    part2Band: number | null;
    part3Band: number | null;
    criteriaBreakdown: Array<{
      code: string;
      label: string;
      shortLabel: string;
      averageBand: number | null;
    }>;
    submissions: CriteriaSubmissionItem[];
  };
}

export function StudentQuestionTypesTab({
  analysis,
}: {
  analysis: StudentQuestionTypeAnalysisData;
}) {
  const [activeSkill, setActiveSkill] = useState<
    "READING" | "LISTENING" | "WRITING" | "SPEAKING"
  >("READING");

  const renderObjectiveSkill = (
    skillTitle: string,
    items: QuestionTypeStatItem[]
  ) => {
    const practiced = items.filter((i) => i.totalCount > 0);
    const weakTypes = practiced.filter(
      (i) => (i.accuracyPercent ?? 0) < 55
    );

    return (
      <div className="space-y-5">
        {weakTypes.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Các dạng bài {skillTitle} có tỷ lệ đúng thấp (&lt; 55%) cần ưu tiên luyện tập:
            </div>
            <p className="mt-1 text-slate-700">
              {weakTypes
                .map((w) => `${w.label} (${w.accuracyPercent}% — ${w.correctCount}/${w.totalCount} câu)`)
                .join(" • ")}
            </p>
          </div>
        )}

        <ReportHorizontalBars
          title={`Tỷ lệ đúng theo từng dạng câu hỏi ${skillTitle} (IELTS Academic)`}
          subtitle="Quy tắc BR-04: Các dạng bài có tổng số câu đã làm dưới 10 câu sẽ gắn nhãn 'Ít dữ liệu (< 10 câu)' để tránh kết luận vội vàng"
          items={items.map((item) => ({
            id: item.code,
            label: item.label,
            percent: item.accuracyPercent,
            isLowData: item.totalCount > 0 && item.isLowData,
            rightText:
              item.totalCount > 0
                ? `${item.accuracyPercent}% (${item.correctCount}/${item.totalCount} câu)`
                : "Chưa làm (0 câu)",
          }))}
        />
      </div>
    );
  };

  const renderSubjectiveSkill = (mode: "WRITING" | "SPEAKING") => {
    const isWriting = mode === "WRITING";
    const criteriaList = isWriting
      ? analysis.writing.criteriaBreakdown
      : analysis.speaking.criteriaBreakdown;
    const submissions = isWriting
      ? analysis.writing.submissions
      : analysis.speaking.submissions;

    return (
      <div className="space-y-5">
        {/* KPI theo Task / Part (BR-16) */}
        {isWriting ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ReportKpiCard
              label="Overall Writing Band (BR-16)"
              value={
                analysis.writing.overallBand !== null
                  ? `Band ${analysis.writing.overallBand.toFixed(1)}`
                  : "Chưa đủ Task 1 & 2"
              }
              subtext="Công thức chuẩn IELTS: (Task 1 + 2 × Task 2) / 3"
              tone="indigo"
            />
            <ReportKpiCard
              label="Điểm TB Writing Task 1"
              value={
                analysis.writing.task1Band !== null
                  ? `Band ${analysis.writing.task1Band.toFixed(1)}`
                  : "Chưa có điểm"
              }
              subtext="Trọng số 1/3 trong Overall Writing"
              tone="emerald"
            />
            <ReportKpiCard
              label="Điểm TB Writing Task 2"
              value={
                analysis.writing.task2Band !== null
                  ? `Band ${analysis.writing.task2Band.toFixed(1)}`
                  : "Chưa có điểm"
              }
              subtext="Trọng số 2/3 trong Overall Writing"
              tone="amber"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ReportKpiCard
              label="Speaking Part 1 (Interview)"
              value={
                analysis.speaking.part1Band !== null
                  ? `Band ${analysis.speaking.part1Band.toFixed(1)}`
                  : "Chưa có điểm"
              }
              subtext="Trung bình các bài Part 1 đã chấm"
              tone="indigo"
            />
            <ReportKpiCard
              label="Speaking Part 2 (Long Turn)"
              value={
                analysis.speaking.part2Band !== null
                  ? `Band ${analysis.speaking.part2Band.toFixed(1)}`
                  : "Chưa có điểm"
              }
              subtext="Trung bình các bài Part 2 đã chấm"
              tone="emerald"
            />
            <ReportKpiCard
              label="Speaking Part 3 (Discussion)"
              value={
                analysis.speaking.part3Band !== null
                  ? `Band ${analysis.speaking.part3Band.toFixed(1)}`
                  : "Chưa có điểm"
              }
              subtext="Trung bình các bài Part 3 đã chấm"
              tone="amber"
            />
          </div>
        )}

        {/* Biểu đồ 4 tiêu chí chấm điểm (BR-07) */}
        <ReportHorizontalBars
          title={`Điểm trung bình 4 tiêu chí chấm ${isWriting ? "Writing" : "Speaking"} (Thang Band 0.0 – 9.0)`}
          subtitle="Tổng hợp từ điểm thành phần giáo viên chấm ở từng bài tập (Quy tắc BR-07)"
          items={criteriaList.map((c) => ({
            id: c.code,
            label: c.label,
            percent: c.averageBand !== null ? Number(((c.averageBand / 9) * 100).toFixed(1)) : null,
            badgeText: c.shortLabel,
            rightText: c.averageBand !== null ? `Band ${c.averageBand.toFixed(1)} / 9.0` : "Chưa có bài chấm",
          }))}
        />

        {/* Bảng chi tiết từng bài nộp kèm điểm 4 tiêu chí & nhận xét */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Bảng chi tiết điểm 4 tiêu chí &amp; Nhận xét từng bài {isWriting ? "Writing" : "Speaking"}
              </h3>
              <p className="text-xs text-slate-500">
                Hiển thị điểm thành phần của từng bài đã được giáo viên chấm hoàn tất (GRADED)
              </p>
            </div>
          </div>

          {submissions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Chưa có bài {isWriting ? "Writing" : "Speaking"} nào được chấm điểm 4 tiêu chí trong kỳ này.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Bài tập</th>
                    <th className="px-4 py-3 text-center">Phần thi</th>
                    {criteriaList.map((c) => (
                      <th key={c.code} className="px-3 py-3 text-center">
                        {c.shortLabel}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center">Band Tổng</th>
                    <th className="px-4 py-3">Nhận xét của Giáo viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub, idx) => (
                    <tr key={`${sub.submissionId}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {sub.assignmentTitle}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{sub.taskOrPartLabel}</td>
                      {criteriaList.map((c) => (
                        <td key={c.code} className="px-3 py-3 text-center font-medium text-slate-700">
                          {sub.criteriaScores[c.code] !== undefined
                            ? sub.criteriaScores[c.code].toFixed(1)
                            : "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-bold text-indigo-600">
                        Band {sub.overallBand.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        {sub.feedback || "Không có ghi chú thêm"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Bộ chọn kỹ năng phân tích sâu (Mục 6.6) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSkill("READING")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeSkill === "READING"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Reading (10 dạng bài)
        </button>
        <button
          type="button"
          onClick={() => setActiveSkill("LISTENING")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeSkill === "LISTENING"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Headphones className="h-3.5 w-3.5" />
          Listening (6 dạng bài)
        </button>
        <button
          type="button"
          onClick={() => setActiveSkill("WRITING")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeSkill === "WRITING"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <PenTool className="h-3.5 w-3.5" />
          Writing (4 tiêu chí TA/TR, CC, LR, GRA)
        </button>
        <button
          type="button"
          onClick={() => setActiveSkill("SPEAKING")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            activeSkill === "SPEAKING"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          Speaking (4 tiêu chí FC, LR, GRA, P)
        </button>
      </div>

      {activeSkill === "READING" && renderObjectiveSkill("Reading", analysis.reading)}
      {activeSkill === "LISTENING" && renderObjectiveSkill("Listening", analysis.listening)}
      {activeSkill === "WRITING" && renderSubjectiveSkill("WRITING")}
      {activeSkill === "SPEAKING" && renderSubjectiveSkill("SPEAKING")}
    </div>
  );
}
